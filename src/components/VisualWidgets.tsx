import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { HeatmapPalette, HeatmapRegion, VerdictType } from "../types/forensics";

export function BrandEmblem({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="vsShield" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="55%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#FF3CAC" />
        </linearGradient>
        <radialGradient id="vsCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      <path
        d="M24 4L40 10.5V22.5C40 33.2 33.1 41.2 24 44C14.9 41.2 8 33.2 8 22.5V10.5L24 4Z"
        fill="rgba(18, 25, 45, 0.9)"
        stroke="url(#vsShield)"
        strokeWidth="2.2"
      />
      <path
        d="M14 23.5C16.8 18.8 20.1 16.5 24 16.5C27.9 16.5 31.2 18.8 34 23.5C31.2 28.2 27.9 30.5 24 30.5C20.1 30.5 16.8 28.2 14 23.5Z"
        stroke="#00E5FF"
        strokeWidth="1.7"
        fill="rgba(0, 229, 255, 0.08)"
      />
      <circle cx="24" cy="23.5" r="4.2" fill="url(#vsCore)" stroke="#F5F7FF" strokeWidth="1.2" />
    </svg>
  );
}

export function AnimatedCounter({
  value,
  suffix = "",
  durationMs = 650,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  return (
    <span className="font-mono tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export function CircularGauge({
  percentage,
  label,
  color,
  size = 128,
}: {
  percentage: number;
  label: string;
  color: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-label={`${label}: ${clamped}%`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(148, 163, 214, 0.14)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            fill="none"
            style={{
              transition: "stroke-dashoffset 650ms cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0 0 8px ${color}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-[#F5F7FF] font-mono tabular-nums">
            <AnimatedCounter value={clamped} suffix="%" />
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-[#A6B2D1] whitespace-nowrap">{label}</span>
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict: VerdictType }) {
  if (verdict === "Authentic") {
    return (
      <span className="detection-badge detection-badge-authentic">
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>Authentic</span>
      </span>
    );
  }
  if (verdict === "AI-Generated") {
    return (
      <span className="detection-badge detection-badge-fake">
        <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>AI-Generated</span>
      </span>
    );
  }
  return (
    <span className="detection-badge detection-badge-inconclusive">
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Inconclusive</span>
    </span>
  );
}

function getPaletteStops(palette: HeatmapPalette): [string, string, string] {
  if (palette === "thermal") {
    return ["rgba(255, 75, 110, 0.95)", "rgba(255, 176, 32, 0.6)", "rgba(0, 229, 255, 0.0)"];
  }
  if (palette === "inferno") {
    return ["rgba(255, 230, 128, 0.95)", "rgba(249, 115, 22, 0.6)", "rgba(139, 92, 246, 0.0)"];
  }
  return ["rgba(255, 60, 172, 0.92)", "rgba(139, 92, 246, 0.55)", "rgba(0, 229, 255, 0.0)"];
}

export function HeatmapOverlay({
  imageSrc,
  regions,
  opacity = 0.65,
  palette = "cyber",
  showBoxes = true,
  alt = "Analyzed media heatmap",
}: {
  imageSrc: string;
  regions: HeatmapRegion[];
  opacity?: number;
  palette?: HeatmapPalette;
  showBoxes?: boolean;
  alt?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = 800;
    const h = 520;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    const [hot, mid, cool] = getPaletteStops(palette);

    regions.forEach((r) => {
      const cx = ((r.x + r.width / 2) / 100) * w;
      const cy = ((r.y + r.height / 2) / 100) * h;
      const radius = Math.max(44, ((Math.max(r.width, r.height) / 100) * Math.max(w, h)) * 0.72);
      const strength = Math.max(0.25, Math.min(1, r.intensity / 100));

      const grad = ctx.createRadialGradient(cx, cy, radius * 0.08, cx, cy, radius);
      grad.addColorStop(0, hot);
      grad.addColorStop(0.45, mid);
      grad.addColorStop(1, cool);

      ctx.save();
      ctx.globalAlpha = opacity * strength;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, [regions, opacity, palette]);

  return (
    <div className="heatmap-container relative w-full aspect-[16/10] select-none">
      <img
        src={imageSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain bg-[#060913]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
      />
      {showBoxes &&
        regions.map((region, idx) => {
          const isHigh = region.intensity >= 65;
          const borderCol = isHigh ? "#FF4B6E" : region.intensity >= 40 ? "#FFB020" : "#00E5FF";
          return (
            <button
              key={`${region.label}-${idx}`}
              type="button"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onFocus={() => setHoveredIdx(idx)}
              onBlur={() => setHoveredIdx(null)}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
                borderColor: borderCol,
              }}
              className="absolute border rounded-md transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-[#00E5FF]"
              aria-label={`${region.label}: ${region.intensity}% suspicion — ${region.reason}`}
            >
              <span
                style={{ backgroundColor: "rgba(8, 11, 22, 0.88)", color: borderCol }}
                className="absolute -top-6 left-0 px-1.5 py-0.5 text-[11px] font-mono rounded whitespace-nowrap border border-white/10"
              >
                {region.label} · {region.intensity}%
              </span>
            </button>
          );
        })}

      {hoveredIdx !== null && regions[hoveredIdx] && (
        <div className="absolute bottom-3 left-3 right-3 px-3.5 py-2.5 rounded-lg bg-[#080B16]/92 border border-[#00E5FF]/35 text-xs text-[#F5F7FF] backdrop-blur-md">
          <span className="font-semibold text-[#00E5FF]">{regions[hoveredIdx].label}</span>
          <span className="mx-2 text-[#6C7A9C]">·</span>
          <span className="font-mono text-[#FF4B6E]">Intensity {regions[hoveredIdx].intensity}%</span>
          <p className="mt-1 text-[#A6B2D1]">{regions[hoveredIdx].reason}</p>
        </div>
      )}
    </div>
  );
}
