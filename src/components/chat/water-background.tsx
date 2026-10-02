const particles = [
  { left: "8%", top: "62%", delay: "0s" },
  { left: "19%", top: "73%", delay: "-6s" },
  { left: "32%", top: "67%", delay: "-11s" },
  { left: "76%", top: "57%", delay: "-3s" },
  { left: "87%", top: "71%", delay: "-9s" },
  { left: "94%", top: "63%", delay: "-15s" },
];

export function WaterBackground() {
  return (
    <div className="water-background pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="water-glow water-glow-top" />
      <div className="water-glow water-glow-bottom" />
      <svg className="water-waves" viewBox="0 0 1440 360" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="aquai-wave-fill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--primary)" stopOpacity="0.13" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="aquai-wave-line">
            <stop stopColor="var(--primary-light)" stopOpacity="0.55" />
            <stop offset="0.48" stopColor="var(--primary)" stopOpacity="0.08" />
            <stop offset="1" stopColor="var(--primary)" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g className="water-wave water-wave-front">
          <path d="M-240 176C-30 45 155 50 360 145S700 290 960 205 1250 75 1680 170V360H-240Z" fill="url(#aquai-wave-fill)" />
          <path d="M-240 176C-30 45 155 50 360 145S700 290 960 205 1250 75 1680 170" stroke="url(#aquai-wave-line)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
        </g>
        <g className="water-wave water-wave-back">
          <path d="M-240 260C30 160 120 85 375 200S730 325 970 250 1250 135 1680 290" stroke="var(--primary)" strokeOpacity="0.16" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {particles.map((particle) => (
        <span
          key={particle.left}
          className="water-particle"
          style={{ left: particle.left, top: particle.top, animationDelay: particle.delay }}
        />
      ))}
    </div>
  );
}
