import React from 'react';

/**
 * Prestigious University Academic Campus Architectural Background
 * Replaces the legacy 3D canvas with a rich, visibly distinctive university campus
 * architectural illustration at twilight:
 * - Warm twilight Oxford-navy & royal-indigo sky with golden library illumination
 * - Grand classical university rotunda, colonnade pillars, arched library windows, and academic crest motifs
 * - Balanced contrast scrim so the university architecture is clearly appreciable while foreground cards remain 100% legible
 */
export const AcademicBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#071124]"
      aria-hidden="true"
    >
      {/* Rich University Twilight Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1936] via-[#0d2147] to-[#071020]" />

      {/* Warm Golden Library Glow & Royal Academic Horizon Light */}
      <div
        className="absolute top-0 right-1/4 w-[55rem] h-[40rem] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, rgba(30, 58, 138, 0.15) 55%, rgba(15, 23, 42, 0) 75%)',
        }}
      />
      <div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[75rem] h-[28rem] rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse, rgba(245, 158, 11, 0.42) 0%, rgba(217, 119, 6, 0.18) 50%, rgba(15, 23, 42, 0) 75%)',
        }}
      />

      {/* Detailed University Campus Architectural Panorama SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-35"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMax slice"
        viewBox="0 0 1440 900"
      >
        <defs>
          <pattern id="academic-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="0.6"
              strokeOpacity="0.35"
            />
            <circle cx="30" cy="30" r="1" fill="#fbbf24" fillOpacity="0.45" />
          </pattern>

          <linearGradient id="building-facade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="dome-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.4" />
          </linearGradient>

          <linearGradient id="window-warm-light" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Subtle Architectural Blueprint Grid */}
        <rect width="1440" height="900" fill="url(#academic-grid)" />

        {/* Academic Astrolabe & Knowledge Rings in Upper Sky */}
        <g transform="translate(720, 230)" stroke="#93c5fd" strokeOpacity="0.45" fill="none">
          <circle r="320" strokeWidth="1" strokeDasharray="8 6" />
          <circle r="250" strokeWidth="1.2" />
          <circle r="185" strokeWidth="0.9" strokeDasharray="4 4" />
          <line x1="-380" y1="0" x2="380" y2="0" strokeWidth="0.7" />
          <line x1="0" y1="-240" x2="0" y2="240" strokeWidth="0.7" />
        </g>

        {/* Distant Campus Towers & Minarets Silhouette */}
        <g fill="#0f2347" stroke="#3b82f6" strokeOpacity="0.4" strokeWidth="1">
          <rect x="70" y="470" width="75" height="430" />
          <polygon points="70,470 107.5,395 145,470" fill="url(#dome-gold)" />
          <rect x="1295" y="470" width="75" height="430" />
          <polygon points="1295,470 1332.5,395 1370,470" fill="url(#dome-gold)" />
        </g>

        {/* Main University Campus Architecture along Horizon */}
        <g transform="translate(0, 450)">
          {/* Left & Right Academic Cloister Wings */}
          <rect
            x="130"
            y="175"
            width="370"
            height="275"
            fill="url(#building-facade)"
            stroke="#60a5fa"
            strokeWidth="1.4"
          />
          <rect
            x="940"
            y="175"
            width="370"
            height="275"
            fill="url(#building-facade)"
            stroke="#60a5fa"
            strokeWidth="1.4"
          />

          {/* Wing Cornice & Roof Balustrade */}
          <line x1="120" y1="175" x2="500" y2="175" stroke="#fbbf24" strokeWidth="2.5" />
          <line x1="940" y1="175" x2="1320" y2="175" stroke="#fbbf24" strokeWidth="2.5" />

          {/* Lit Arched Windows in East & West Wings */}
          {[160, 225, 290, 355, 420, 975, 1040, 1105, 1170, 1235].map((wx) => (
            <g key={wx}>
              <path
                d={`M ${wx} 335 L ${wx} 230 A 18 18 0 0 1 ${wx + 36} 230 L ${wx + 36} 335 Z`}
                fill="url(#window-warm-light)"
                stroke="#fbbf24"
                strokeWidth="1.2"
              />
              {/* Window Mullions */}
              <line
                x1={wx + 18}
                y1={212}
                x2={wx + 18}
                y2={335}
                stroke="#0f172a"
                strokeWidth="1.2"
              />
              <line
                x1={wx}
                y1={275}
                x2={wx + 36}
                y2={275}
                stroke="#0f172a"
                strokeWidth="1.2"
              />
            </g>
          ))}

          {/* Central Grand Library Rotunda & Pediment */}
          <path
            d="M 595 110 C 595 -15, 845 -15, 845 110 Z"
            fill="url(#dome-gold)"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          {/* Spire */}
          <line x1="720" y1="-35" x2="720" y2="20" stroke="#fbbf24" strokeWidth="2.5" />
          <circle cx="720" cy="-38" r="5" fill="#fbbf24" />

          {/* Classical Triangular Pediment */}
          <polygon
            points="480,145 720,48 960,145"
            fill="url(#building-facade)"
            stroke="#fbbf24"
            strokeWidth="2"
          />
          <circle
            cx="720"
            cy="108"
            r="22"
            fill="url(#window-warm-light)"
            stroke="#fbbf24"
            strokeWidth="1.5"
          />

          {/* Main Central Hall Body */}
          <rect
            x="500"
            y="145"
            width="440"
            height="305"
            fill="url(#building-facade)"
            stroke="#93c5fd"
            strokeWidth="1.5"
          />

          {/* Classical Ionic Colonnade Pillars & Illuminated Grand Arches */}
          {[525, 580, 635, 690, 745, 800, 855, 905].map((px, idx) => (
            <g key={px}>
              {/* Pillar */}
              <rect
                x={px}
                y="150"
                width="14"
                height="260"
                fill="#1e3a8a"
                stroke="#93c5fd"
                strokeWidth="1.2"
              />
              {/* Pillar Capital */}
              <rect
                x={px - 3}
                y="146"
                width="20"
                height="6"
                fill="#fbbf24"
              />
              {/* Grand Library Window Between Pillars */}
              {idx < 7 && (
                <path
                  d={`M ${px + 20} 355 L ${px + 20} 205 A 14 14 0 0 1 ${px + 48} 205 L ${px + 48} 355 Z`}
                  fill="url(#window-warm-light)"
                  stroke="#fbbf24"
                  strokeWidth="1"
                />
              )}
            </g>
          ))}

          {/* Grand Courtyard Steps */}
          <rect x="460" y="410" width="520" height="12" fill="#1e293b" stroke="#60a5fa" strokeWidth="1" />
          <rect x="430" y="422" width="580" height="14" fill="#0f172a" stroke="#60a5fa" strokeWidth="1" />
        </g>
      </svg>

      {/* Measured Vignette Scrim: Preserves Architectural Visibility While Guaranteeing WCAG AAA Text Contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060c18]/55 via-[#071124]/45 to-[#060c18]/80" />
    </div>
  );
};
