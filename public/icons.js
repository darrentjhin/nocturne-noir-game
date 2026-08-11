// NOCTURNE — hand-drawn SVG noir art. No external assets, no image-gen
// credits: everything here is inline vector line art in the site palette.
const ICONS = {
  // ---- Locations (Detective A) ----
  theatre: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 30 A22 22 0 0 1 54 30" stroke="currentColor" stroke-width="2"/>
    <circle cx="10" cy="30" r="2.2" fill="currentColor"/>
    <circle cx="20.5" cy="14.5" r="2.2" fill="currentColor"/>
    <circle cx="32" cy="10.5" r="2.2" fill="currentColor"/>
    <circle cx="43.5" cy="14.5" r="2.2" fill="currentColor"/>
    <circle cx="54" cy="30" r="2.2" fill="currentColor"/>
    <rect x="16" y="30" width="32" height="24" rx="1" stroke="currentColor" stroke-width="2"/>
    <path d="M24 54 V38 L32 33 L40 38 V54" stroke="currentColor" stroke-width="2"/>
    <path d="M16 40 L10 54 M48 40 L54 54" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>
  </svg>`,
  studio: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="26" r="17" stroke="currentColor" stroke-width="2"/>
    <circle cx="32" cy="26" r="4.5" stroke="currentColor" stroke-width="2"/>
    <circle cx="32" cy="15" r="2.4" fill="currentColor"/>
    <circle cx="41.5" cy="21.5" r="2.4" fill="currentColor"/>
    <circle cx="41.5" cy="30.5" r="2.4" fill="currentColor"/>
    <circle cx="22.5" cy="30.5" r="2.4" fill="currentColor"/>
    <circle cx="22.5" cy="21.5" r="2.4" fill="currentColor"/>
    <path d="M23 41 L18 54 M32 43 L32 56 M41 41 L46 54" stroke="currentColor" stroke-width="1.6" opacity="0.7"/>
  </svg>`,
  apartment: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="10" width="36" height="44" stroke="currentColor" stroke-width="2"/>
    <path d="M32 10 V54 M14 32 H50" stroke="currentColor" stroke-width="2"/>
    <path d="M14 10 L8 16 V54 H14" stroke="currentColor" stroke-width="1.4" opacity="0.6"/>
    <path d="M40 20 Q46 26 40 32" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
  </svg>`,
  docks: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="18" width="36" height="26" rx="1" stroke="currentColor" stroke-width="2"/>
    <path d="M14 26 H50 M14 34 H50 M22 18 V44 M32 18 V44 M42 18 V44" stroke="currentColor" stroke-width="1.3" opacity="0.6"/>
    <path d="M32 44 V50 M26 56 Q32 60 38 56 M32 50 L26 53 M32 50 L38 53" stroke="currentColor" stroke-width="2"/>
    <circle cx="32" cy="46" r="2" stroke="currentColor" stroke-width="1.6"/>
  </svg>`,

  // ---- People (Detective B) — simple bust silhouettes, each distinct ----
  victor: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="22" r="11" fill="currentColor" opacity="0.9"/>
    <path d="M14 54 C14 40 21 33 32 33 C43 33 50 40 50 54" fill="currentColor" opacity="0.9"/>
    <path d="M28 33 L32 46 L36 33" stroke="var(--bg-panel)" stroke-width="2.4"/>
  </svg>`,
  ivy: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="22" r="11" fill="currentColor" opacity="0.9"/>
    <path d="M14 54 C14 40 21 33 32 33 C43 33 50 40 50 54" fill="currentColor" opacity="0.9"/>
    <circle cx="27" cy="22" r="3.6" stroke="var(--bg-panel)" stroke-width="1.6"/>
    <circle cx="37" cy="22" r="3.6" stroke="var(--bg-panel)" stroke-width="1.6"/>
    <path d="M30.6 22 H33.4" stroke="var(--bg-panel)" stroke-width="1.6"/>
  </svg>`,
  sal: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="24" r="11" fill="currentColor" opacity="0.9"/>
    <path d="M14 54 C14 40 21 33 32 33 C43 33 50 40 50 54" fill="currentColor" opacity="0.9"/>
    <path d="M19 16 Q32 4 45 16 L45 19 L19 19 Z" fill="currentColor"/>
    <rect x="24" y="10" width="16" height="6" rx="1" fill="currentColor"/>
  </svg>`,
  dane: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="22" r="11" fill="currentColor" opacity="0.9"/>
    <path d="M14 54 C14 40 21 33 32 33 C43 33 50 40 50 54" fill="currentColor" opacity="0.9"/>
    <path d="M22 15 Q32 9 43 16 Q36 12 22 15Z" fill="var(--bg-panel)"/>
    <path d="M28 33 L32 44 L36 33" stroke="var(--bg-panel)" stroke-width="2.4"/>
  </svg>`,

  // Small magnifying-glass kicker used generically
  magnifier: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="2"/>
    <path d="M15 15 L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`
};

// ---- Landing / briefing hero art: skyline + a lone detective at dusk ----
// Contrast is the whole trick here: near-black silhouettes cut against a
// narrow warm glow band at the horizon, everything else stays dark so the
// shapes actually read. Rain is handled separately by #rain-overlay.
const HERO_SVG = `
<svg viewBox="0 0 900 420" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0908"/>
      <stop offset="60%" stop-color="#0a0908"/>
      <stop offset="100%" stop-color="#0a0908"/>
    </linearGradient>
    <radialGradient id="glow" cx="68%" cy="78%" r="42%">
      <stop offset="0%" stop-color="#8f2438" stop-opacity="0.5"/>
      <stop offset="60%" stop-color="#8f2438" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#8f2438" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="900" height="420" fill="url(#skyGrad)"/>
  <rect width="900" height="420" fill="url(#glow)"/>

  <!-- distant skyline, silhouetted against the glow band -->
  <g fill="#050403">
    <rect x="0" y="300" width="40" height="120"/>
    <rect x="45" y="270" width="30" height="150"/>
    <rect x="80" y="310" width="50" height="110"/>
    <rect x="135" y="245" width="34" height="175"/>
    <rect x="175" y="290" width="46" height="130"/>
    <rect x="600" y="255" width="40" height="165"/>
    <rect x="645" y="300" width="55" height="120"/>
    <rect x="705" y="230" width="32" height="190"/>
    <rect x="742" y="285" width="58" height="135"/>
    <rect x="805" y="260" width="40" height="160"/>
    <rect x="850" y="300" width="50" height="120"/>
  </g>
  <!-- lit windows -->
  <g fill="#c9a24b" opacity="0.75">
    <rect x="8" y="320" width="4" height="6"/>
    <rect x="18" y="340" width="4" height="6"/>
    <rect x="52" y="290" width="4" height="6"/>
    <rect x="142" y="270" width="4" height="6"/>
    <rect x="152" y="310" width="4" height="6"/>
    <rect x="612" y="280" width="4" height="6"/>
    <rect x="656" y="320" width="4" height="6"/>
    <rect x="714" y="250" width="4" height="6"/>
    <rect x="754" y="310" width="4" height="6"/>
    <rect x="814" y="285" width="4" height="6"/>
  </g>

  <!-- the detective, three-quarter, standing off-center against the glow -->
  <g fill="#050403">
    <path d="M600 420 C600 330 615 300 645 292 C650 270 660 258 672 258 C684 258 694 270 698 292 C728 300 744 330 744 420 Z"/>
    <path d="M652 250 Q672 232 694 250 L700 262 Q672 250 646 262 Z"/>
    <path d="M636 258 Q672 244 710 258 L706 266 Q672 254 640 266 Z"/>
    <path d="M600 340 Q580 360 584 400 L594 400 Q592 366 606 348 Z"/>
    <path d="M744 340 Q764 360 760 400 L750 400 Q752 366 738 348 Z"/>
  </g>

  <!-- ground haze so the base blends out rather than hard-cutting -->
  <rect x="0" y="400" width="900" height="20" fill="#0a0908"/>
</svg>`;
