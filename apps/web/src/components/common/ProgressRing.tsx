type Props = {
  percent: number; // 0..100
  size?: number;
  stroke?: number;
};

export function ProgressRing({ percent, size = 120, stroke = 10 }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F2EAD3"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E0AC4C"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="num text-3xl text-bark">{clamped.toFixed(clamped < 10 ? 1 : 0)}%</span>
        <span className="text-[10px] tracking-widest text-bark-soft">PROGRESS</span>
      </div>
    </div>
  );
}
