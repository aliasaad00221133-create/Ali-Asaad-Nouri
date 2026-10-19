import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type CameraPreset = 'cinematic' | 'hero' | 'top' | 'core';
export type ColorTheme = 'blue' | 'purple' | 'emerald' | 'amber';

interface ThreeCanvasProps {
  theme: ColorTheme;
  explodedFactor?: number; // 0 to 1
  cameraPreset?: CameraPreset;
  rotationSpeed?: number; // 0 to 3
  isCinemaMode?: boolean;
}

// Pre-allocated math objects for zero garbage collection during 60fps render loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _color = new THREE.Color();

// Procedural procedural canvas texture generator for marble and academy crest
function createProceduralMarbleTexture(theme: ColorTheme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 1024, 1024);
  if (theme === 'purple') {
    bgGrad.addColorStop(0, '#0f0c29');
    bgGrad.addColorStop(0.5, '#1b1442');
    bgGrad.addColorStop(1, '#090714');
  } else if (theme === 'emerald') {
    bgGrad.addColorStop(0, '#06201b');
    bgGrad.addColorStop(0.5, '#0b352c');
    bgGrad.addColorStop(1, '#020d0b');
  } else if (theme === 'amber') {
    bgGrad.addColorStop(0, '#241400');
    bgGrad.addColorStop(0.5, '#3b2203');
    bgGrad.addColorStop(1, '#120a00');
  } else {
    // Royal Blue
    bgGrad.addColorStop(0, '#07162c');
    bgGrad.addColorStop(0.5, '#0f294a');
    bgGrad.addColorStop(1, '#030b17');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle marble veins
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 35; i++) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.03 + Math.random() * 0.08})`;
    ctx.beginPath();
    let x = Math.random() * 1024;
    let y = Math.random() * 1024;
    ctx.moveTo(x, y);
    for (let j = 0; j < 8; j++) {
      x += (Math.random() - 0.5) * 220;
      y += (Math.random() - 0.5) * 220;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Concentric geometric academy dials
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(512, 512, 450, 0, Math.PI * 2);
  ctx.arc(512, 512, 410, 0, Math.PI * 2);
  ctx.arc(512, 512, 280, 0, Math.PI * 2);
  ctx.stroke();

  // Tick marks
  for (let a = 0; a < 360; a += 10) {
    const rad = (a * Math.PI) / 180;
    const inner = 410;
    const outer = a % 30 === 0 ? 440 : 425;
    ctx.beginPath();
    ctx.moveTo(512 + Math.cos(rad) * inner, 512 + Math.sin(rad) * inner);
    ctx.lineTo(512 + Math.cos(rad) * outer, 512 + Math.sin(rad) * outer);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Procedural soft radial contact shadow texture
function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(256, 256, 10, 256, 256, 250);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.55)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  theme = 'blue',
  explodedFactor = 0,
  cameraPreset = 'cinematic',
  rotationSpeed = 1,
  isCinemaMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable refs to keep animation loop decoupled from React state renders
  const stateRef = useRef({
    theme,
    explodedFactor,
    cameraPreset,
    rotationSpeed,
    isCinemaMode,
    targetExploded: explodedFactor,
    currentExploded: explodedFactor,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    manualRotation: { x: 0, y: 0 },
  });

  const renderSingleFrameRef = useRef<(() => void) | null>(null);

  // Keep stateRef in sync with props
  useEffect(() => {
    stateRef.current.theme = theme;
    stateRef.current.targetExploded = explodedFactor;
    stateRef.current.cameraPreset = cameraPreset;
    stateRef.current.rotationSpeed = rotationSpeed;
    stateRef.current.isCinemaMode = isCinemaMode;
    if (renderSingleFrameRef.current) {
      renderSingleFrameRef.current();
    }
  }, [theme, explodedFactor, cameraPreset, rotationSpeed, isCinemaMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup & Atmosphere
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.0018);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4, 18);

    // 3. Renderer with ACESFilmicToneMapping & SRGBColorSpace
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugInfo ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGL = /SwiftShader|llvmpipe|Software/i.test(rendererStr);
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (Boolean(navigator.webdriver) || /HeadlessChrome/i.test(navigator.userAgent) || isSoftwareGL);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Studio Environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig (Warm Key + Cool Fill + Rim)
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.4);
    keyLight.position.set(8, 16, 10);
    if (!isHeadless) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 40;
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x020617, 1.4);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    rimLight.position.set(-10, 8, -10);
    scene.add(rimLight);

    // 6. Assembly: Procedural 3-12 Part Hero Subject: The Royal University Monument
    const monumentGroup = new THREE.Group();
    monumentGroup.position.set(0, -1.2, 0);
    scene.add(monumentGroup);

    // Part 1: Stepped Marble Foundation (Octagonal Tier 1 & Round Tier 2)
    const foundationGroup = new THREE.Group();
    const marbleTex = createProceduralMarbleTexture(theme);
    marbleTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const baseMat = new THREE.MeshStandardMaterial({
      map: marbleTex,
      roughness: 0.35,
      metalness: 0.15,
    });

    const tier1Geo = new THREE.CylinderGeometry(5.2, 5.8, 0.7, 8);
    const tier1 = new THREE.Mesh(tier1Geo, baseMat);
    tier1.position.y = -2.85;
    tier1.receiveShadow = true;
    tier1.castShadow = true;
    foundationGroup.add(tier1);

    const tier2Geo = new THREE.CylinderGeometry(4.4, 4.8, 0.5, 32);
    const tier2 = new THREE.Mesh(tier2Geo, baseMat);
    tier2.position.y = -2.3;
    tier2.receiveShadow = true;
    tier2.castShadow = true;
    foundationGroup.add(tier2);

    monumentGroup.add(foundationGroup);

    // Part 2: Colonnade of Fluted Pillars (8 circular columns)
    const colonnadeGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.2,
    });
    const capitalMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Golden Capital
      roughness: 0.2,
      metalness: 0.85,
    });

    const pillarRadius = 3.4;
    const pillarCount = 8;
    const pillarMeshes: THREE.Group[] = [];

    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const px = Math.cos(angle) * pillarRadius;
      const pz = Math.sin(angle) * pillarRadius;

      const pGroup = new THREE.Group();
      pGroup.position.set(px, -0.6, pz);

      // Shaft
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.28, 2.8, 16),
        pillarMat
      );
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      pGroup.add(shaft);

      // Base
      const baseRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.4, 0.2, 16),
        capitalMat
      );
      baseRing.position.y = -1.4;
      pGroup.add(baseRing);

      // Capital (Top)
      const topRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.32, 0.25, 16),
        capitalMat
      );
      topRing.position.y = 1.4;
      pGroup.add(topRing);

      colonnadeGroup.add(pGroup);
      pillarMeshes.push(pGroup);
    }
    monumentGroup.add(colonnadeGroup);

    // Part 3: Golden Architrave Ring
    const architraveGeo = new THREE.TorusGeometry(3.4, 0.3, 16, 64);
    architraveGeo.rotateX(Math.PI / 2);
    const architrave = new THREE.Mesh(architraveGeo, capitalMat);
    architrave.position.y = 0.95;
    architrave.castShadow = true;
    monumentGroup.add(architrave);

    // Part 4: Gimbal Armillary Rings (Outer, Mid, Inner)
    const armillaryGroup = new THREE.Group();
    armillaryGroup.position.y = 0.4;

    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.15,
    });
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.1,
    });
    const ringMat3 = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.85,
      roughness: 0.2,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.08, 16, 64), ringMat1);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.07, 16, 64), ringMat2);
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.06, 16, 64), ringMat3);

    armillaryGroup.add(ring1);
    armillaryGroup.add(ring2);
    armillaryGroup.add(ring3);
    monumentGroup.add(armillaryGroup);

    // Part 5: Luminescent Royal Knowledge Crystal (Hero Core)
    const crystalGeo = new THREE.OctahedronGeometry(0.85, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa,
      emissive: 0x1e3a8a,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.85,
      ior: 1.55,
      thickness: 1.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 0.4;
    monumentGroup.add(crystal);

    // Part 6: Spire & Beacon of Wisdom (Apex)
    const spireGroup = new THREE.Group();
    spireGroup.position.y = 1.1;

    const spireGeo = new THREE.ConeGeometry(0.5, 2.2, 16);
    const spireMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
    });
    const spire = new THREE.Mesh(spireGeo, spireMat);
    spire.position.y = 1.1;
    spire.castShadow = true;
    spireGroup.add(spire);

    // Beacon subtle glow column
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.6, 12, 16);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 7.5;
    spireGroup.add(beacon);

    monumentGroup.add(spireGroup);

    // Part 7: Radial Contact Shadow Plane (Grounding)
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: createRadialShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = -3.22;
    contactShadow.renderOrder = 0;
    scene.add(contactShadow);

    // Part 8: Faculty Constellation Nodes (InstancedMesh: 40 orbiting knowledge nodes)
    const nodeCount = 42;
    const nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.8,
    });
    const instancedNodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    instancedNodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize node positions & varied colors (Zero-Pill / Distinct Faculty Colors)
    const nodeOrbits: { radius: number; speed: number; yBase: number; phase: number }[] = [];
    const colors = [
      new THREE.Color(0x38bdf8), // IT & AI
      new THREE.Color(0xf59e0b), // Engineering
      new THREE.Color(0x10b981), // Medicine & Health
      new THREE.Color(0xa855f7), // Arts & Law
    ];

    for (let i = 0; i < nodeCount; i++) {
      const radius = 3.8 + Math.random() * 3.5;
      const speed = (0.2 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1);
      const yBase = -1.5 + Math.random() * 4.0;
      const phase = Math.random() * Math.PI * 2;
      nodeOrbits.push({ radius, speed, yBase, phase });

      _tempMatrix.setPosition(Math.cos(phase) * radius, yBase, Math.sin(phase) * radius);
      instancedNodes.setMatrixAt(i, _tempMatrix);
      instancedNodes.setColorAt(i, colors[i % colors.length]);
    }
    instancedNodes.instanceMatrix.needsUpdate = true;
    if (instancedNodes.instanceColor) instancedNodes.instanceColor.needsUpdate = true;
    monumentGroup.add(instancedNodes);

    // 7. Mouse and Drag Interactions
    const onMouseDown = (e: MouseEvent) => {
      stateRef.current.isDragging = true;
      stateRef.current.dragStart.x = e.clientX;
      stateRef.current.dragStart.y = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      stateRef.current.mouse.targetX = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      stateRef.current.mouse.targetY = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);

      if (stateRef.current.isDragging) {
        const dx = e.clientX - stateRef.current.dragStart.x;
        const dy = e.clientY - stateRef.current.dragStart.y;
        stateRef.current.manualRotation.y += dx * 0.005;
        stateRef.current.manualRotation.x += dy * 0.005;
        stateRef.current.dragStart.x = e.clientX;
        stateRef.current.dragStart.y = e.clientY;
      }
    };

    const onMouseUp = () => {
      stateRef.current.isDragging = false;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 8. Resize Handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // Pre-warm shader pipeline once
    renderer.compile(scene, camera);

    // 9. Damped 60fps Animation Loop with zero GC (On-demand in headless CPU WebGL)
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const stepAndRender = (isStaticSnap = false) => {
      const delta = isStaticSnap ? 0.5 : Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const current = stateRef.current;

      // Update Theme Colors dynamically
      const themeName = current.theme;
      if (themeName === 'purple') {
        ringMat1.color.setHex(0xc084fc);
        crystalMat.color.setHex(0xa855f7);
        crystalMat.emissive.setHex(0x581c87);
        beaconMat.color.setHex(0xc084fc);
      } else if (themeName === 'emerald') {
        ringMat1.color.setHex(0x34d399);
        crystalMat.color.setHex(0x10b981);
        crystalMat.emissive.setHex(0x064e3b);
        beaconMat.color.setHex(0x34d399);
      } else if (themeName === 'amber') {
        ringMat1.color.setHex(0xfbbf24);
        crystalMat.color.setHex(0xf59e0b);
        crystalMat.emissive.setHex(0x78350f);
        beaconMat.color.setHex(0xfbbf24);
      } else {
        // Royal Blue
        ringMat1.color.setHex(0x38bdf8);
        crystalMat.color.setHex(0x60a5fa);
        crystalMat.emissive.setHex(0x1e3a8a);
        beaconMat.color.setHex(0x38bdf8);
      }

      // Smooth exponential damping for Exploded View separation
      if (isStaticSnap) {
        current.currentExploded = current.targetExploded;
      } else {
        current.currentExploded += (current.targetExploded - current.currentExploded) * (1 - Math.exp(-6 * delta));
      }
      const exp = current.currentExploded;

      // Adjust positions based on exploded factor
      foundationGroup.position.y = -exp * 1.8;
      architrave.position.y = 0.95 + exp * 1.5;
      spireGroup.position.y = 1.1 + exp * 3.2;
      crystal.position.y = 0.4 + exp * 0.8;
      colonnadeGroup.position.y = -exp * 0.4;

      // Expand colonnade radially during exploded view
      for (let i = 0; i < pillarMeshes.length; i++) {
        const angle = (i / pillarMeshes.length) * Math.PI * 2;
        const rad = pillarRadius + exp * 1.2;
        pillarMeshes[i].position.x = Math.cos(angle) * rad;
        pillarMeshes[i].position.z = Math.sin(angle) * rad;
      }

      // Continuous mechanical rotations
      const speed = current.rotationSpeed;
      ring1.rotation.x += 0.015 * speed;
      ring1.rotation.y += 0.01 * speed;
      ring2.rotation.y += 0.02 * speed;
      ring2.rotation.z += 0.012 * speed;
      ring3.rotation.z += 0.025 * speed;
      ring3.rotation.x += 0.018 * speed;

      crystal.rotation.y += 0.012 * speed;
      crystal.rotation.x = Math.sin(elapsed * 1.5) * 0.15;

      // Auto-rotation of monument unless user is actively dragging
      if (!current.isDragging) {
        current.manualRotation.y += 0.003 * speed;
        current.manualRotation.x *= 0.96; // return to level
      }

      monumentGroup.rotation.y = current.manualRotation.y;
      monumentGroup.rotation.x = current.manualRotation.x;

      // Update Instanced Nodes orbit
      for (let i = 0; i < nodeCount; i++) {
        const orbit = nodeOrbits[i];
        const a = orbit.phase + elapsed * orbit.speed * speed;
        const x = Math.cos(a) * orbit.radius;
        const z = Math.sin(a) * orbit.radius;
        const y = orbit.yBase + Math.sin(elapsed * 2 + orbit.phase) * 0.35 + exp * 1.0;

        _tempMatrix.setPosition(x, y, z);
        instancedNodes.setMatrixAt(i, _tempMatrix);
      }
      instancedNodes.instanceMatrix.needsUpdate = true;

      // Camera preset coordinates with smooth exponential damping
      const preset = current.cameraPreset;
      if (preset === 'hero') {
        _targetCamPos.set(0, 1.2, 9);
        _targetLookAt.set(0, 0.4, 0);
      } else if (preset === 'top') {
        _targetCamPos.set(0, 16, 0.001);
        _targetLookAt.set(0, 0, 0);
      } else if (preset === 'core') {
        _targetCamPos.set(0, 0.4, 5.2);
        _targetLookAt.set(0, 0.4, 0);
      } else {
        // Cinematic default orbit
        const camOrbitRadius = 15;
        const camY = 3.5 + Math.sin(elapsed * 0.2) * 1.5;
        _targetCamPos.set(
          Math.sin(elapsed * 0.08) * camOrbitRadius,
          camY,
          Math.cos(elapsed * 0.08) * camOrbitRadius
        );
        _targetLookAt.set(0, 0.2, 0);
      }

      if (isStaticSnap) {
        camera.position.copy(_targetCamPos);
      } else {
        camera.position.x += (_targetCamPos.x - camera.position.x) * (1 - Math.exp(-4 * delta));
        camera.position.y += (_targetCamPos.y - camera.position.y) * (1 - Math.exp(-4 * delta));
        camera.position.z += (_targetCamPos.z - camera.position.z) * (1 - Math.exp(-4 * delta));
      }

      camera.lookAt(_targetLookAt);

      renderer.render(scene, camera);
    };

    renderSingleFrameRef.current = () => stepAndRender(true);

    const animate = () => {
      stepAndRender(false);
      if (!isHeadless) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    stepAndRender(true);
    if (!isHeadless) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      renderSingleFrameRef.current = null;
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);

      // Clean up WebGL resources
      renderer.dispose();
      marbleTex.dispose();
      tier1Geo.dispose();
      tier2Geo.dispose();
      baseMat.dispose();
      architraveGeo.dispose();
      capitalMat.dispose();
      pillarMat.dispose();
      crystalGeo.dispose();
      crystalMat.dispose();
      spireGeo.dispose();
      spireMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="three-canvas-container"
      className={`fixed inset-0 ${isCinemaMode ? 'pointer-events-auto' : 'pointer-events-none'} z-0 overflow-hidden`}
      style={{
        width: '100vw',
        height: '100vh',
      }}
    />
  );
};
