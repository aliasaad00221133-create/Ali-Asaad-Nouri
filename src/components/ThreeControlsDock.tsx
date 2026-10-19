import React, { useState } from 'react';
import { CameraPreset, ColorTheme } from './ThreeCanvas.tsx';
import { Camera, ChevronDown, ChevronUp, Eye, Layers, Palette, RotateCw, Maximize2, Minimize2 } from 'lucide-react';

interface ThreeControlsDockProps {
  theme: ColorTheme;
  onThemeChange: (t: ColorTheme) => void;
  explodedFactor: number;
  onExplodedChange: (v: number) => void;
  cameraPreset: CameraPreset;
  onCameraChange: (c: CameraPreset) => void;
  rotationSpeed: number;
  onSpeedChange: (s: number) => void;
  isCinemaMode: boolean;
  onToggleCinema: () => void;
}

export const ThreeControlsDock: React.FC<ThreeControlsDockProps> = ({
  theme,
  onThemeChange,
  explodedFactor,
  onExplodedChange,
  cameraPreset,
  onCameraChange,
  rotationSpeed,
  onSpeedChange,
  isCinemaMode,
  onToggleCinema,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 transition-transform duration-300 pointer-events-none w-full px-3"
      style={{
        maxWidth: '920px',
        transform: `translate(-50%, ${isCollapsed ? 'calc(100% - 32px)' : '0'})`,
      }}
      dir="rtl"
    >
      {/* Collapse/Expand Drawer Toggle Button */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="pointer-events-auto bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-4 py-1 rounded-t-xl text-xs font-bold flex items-center gap-1.5 shadow-xl transition-colors cursor-pointer"
        >
          {isCollapsed ? (
            <>
              <ChevronUp size={14} />
              <span>إظهار لوحة تحكم الصرح 3D</span>
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              <span>طي لوحة التحكم 3D</span>
            </>
          )}
        </button>
      </div>

      {/* Dock Container: Solid rgba surfaces without backdrop-filter over WebGL */}
      <div className="pointer-events-auto bg-slate-950/95 border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left Side: Cinema View & Camera Presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleCinema}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              isCinemaMode
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title="الوضع السينمائي بكامل الشاشة لإخفاء البطاقات والتركيز على الصرح 3D"
          >
            {isCinemaMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isCinemaMode ? 'إلغاء السينما' : 'صرح 3D سينمائي'}</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          {/* Camera Angles */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-bold hidden sm:inline flex items-center gap-1">
              <Camera size={13} /> الكاميرا:
            </span>
            {(
              [
                { id: 'cinematic', label: 'مدار سينمائي' },
                { id: 'hero', label: 'واجهة الصرح' },
                { id: 'top', label: 'مخطط علوي' },
                { id: 'core', label: 'قلب المعرفة' },
              ] as const
            ).map((cam) => (
              <button
                key={cam.id}
                type="button"
                onClick={() => onCameraChange(cam.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  cameraPreset === cam.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Exploded View Slider */}
        <div className="flex items-center gap-2 flex-1 min-w-[170px] max-w-[260px]">
          <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0">
            <Layers size={13} className="text-cyan-400" /> تفكيك الصرح:
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={explodedFactor}
            onChange={(e) => onExplodedChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="text-slate-400 font-mono text-[10px] w-8">
            {Math.round(explodedFactor * 100)}%
          </span>
        </div>

        {/* Right Side: Theme Swatches & Speed */}
        <div className="flex items-center gap-2">
          {/* Rotation Speed */}
          <div className="flex items-center gap-1">
            <RotateCw size={13} className="text-slate-400" />
            <select
              value={rotationSpeed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-slate-900 text-slate-300 border border-slate-800 rounded-lg px-1.5 py-1 text-[11px] font-bold"
            >
              <option value="0">إيقاف الدوران</option>
              <option value="0.5">سرعة هادئة (0.5x)</option>
              <option value="1">سرعة عادية (1x)</option>
              <option value="2">دوران سريع (2x)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Theme Colors */}
          <div className="flex items-center gap-1">
            <Palette size={13} className="text-slate-400" />
            {(
              [
                { id: 'blue', label: 'كحلي', color: '#38bdf8' },
                { id: 'purple', label: 'نيون', color: '#c084fc' },
                { id: 'emerald', label: 'زمردي', color: '#34d399' },
                { id: 'amber', label: 'ذهبي', color: '#fbbf24' },
              ] as const
            ).map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => onThemeChange(th.id)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  theme === th.id
                    ? 'scale-110 border-white shadow-md'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: th.color }}
                title={`ثيم ${th.label}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
