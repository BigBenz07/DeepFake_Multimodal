import {
  ArrowRight,
  AudioLines,
  Download,
  FileCheck2,
  Files,
  Image as ImageIcon,
  ShieldAlert,
  Target,
  Video,
} from "lucide-react";
import type { DetectionRecord, NavSection } from "../types/forensics";
import { downloadForensicReport } from "../utils/reportExport";
import { formatBytes, formatShortDate } from "../utils/storage";
import PlotlyChart from "./PlotlyChart";
import { AnimatedCounter, VerdictBadge } from "./VisualWidgets";

interface DashboardViewProps {
  history: DetectionRecord[];
  reportFormat: "html" | "json";
  onNavigate: (section: NavSection) => void;
  onInspectRecord: (record: DetectionRecord) => void;
}

export default function DashboardView({
  history,
  reportFormat,
  onNavigate,
  onInspectRecord,
}: DashboardViewProps) {
  const totalAnalyzed = history.length;
  const aiCount = history.filter((r) => r.verdict === "AI-Generated").length;
  const authenticCount = history.filter((r) => r.verdict === "Authentic").length;
  const inconclusiveCount = history.filter((r) => r.verdict === "Inconclusive").length;
  const avgConfidence =
    totalAnalyzed > 0
      ? Math.round(history.reduce((sum, r) => sum + r.confidenceScore, 0) / totalAnalyzed)
      : 0;

  const imageCount = history.filter((r) => r.modality === "image").length;
  const audioCount = history.filter((r) => r.modality === "audio").length;
  const videoCount = history.filter((r) => r.modality === "video").length;

  const recentRecords = history.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="glow-border">
        <div className="glow-border-inner relative overflow-hidden p-7 sm:p-10">
          {/* Precision SVG Biometric Wireframe Backdrop */}
          <svg
            aria-hidden="true"
            viewBox="0 0 600 320"
            className="pointer-events-none absolute right-0 top-0 h-full w-auto max-w-[58%] opacity-45 hidden md:block"
          >
            <defs>
              <linearGradient id="heroRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.85" />
                <stop offset="55%" stopColor="#8B5CF6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FF3CAC" stopOpacity="0.4" />
              </linearGradient>
              <radialGradient id="heroGlow" cx="68%" cy="50%" r="48%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.22" />
                <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#080B16" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="600" height="320" fill="url(#heroGlow)" />
            <circle cx="410" cy="160" r="126" fill="none" stroke="url(#heroRing)" strokeWidth="1" strokeDasharray="5 6" />
            <circle cx="410" cy="160" r="94" fill="none" stroke="#00E5FF" strokeOpacity="0.32" strokeWidth="1.2" />
            <circle cx="410" cy="160" r="62" fill="none" stroke="#8B5CF6" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 4" />
            <path
              d="M270 160 Q340 96 410 96 Q480 96 550 160 Q480 224 410 224 Q340 224 270 160 Z"
              fill="rgba(0,229,255,0.04)"
              stroke="url(#heroRing)"
              strokeWidth="1.5"
            />
            <circle cx="410" cy="160" r="24" fill="rgba(0,229,255,0.12)" stroke="#00E5FF" strokeWidth="1.5" />
            <line x1="250" y1="160" x2="570" y2="160" stroke="#00E5FF" strokeOpacity="0.22" strokeWidth="1" />
            <line x1="410" y1="30" x2="410" y2="290" stroke="#8B5CF6" strokeOpacity="0.22" strokeWidth="1" />
            {/* Biometric telemetry nodes */}
            <circle cx="332" cy="126" r="3" fill="#00E5FF" />
            <circle cx="488" cy="126" r="3" fill="#FF3CAC" />
            <circle cx="332" cy="194" r="3" fill="#8B5CF6" />
            <circle cx="488" cy="194" r="3" fill="#00E5FF" />
          </svg>

          <div className="relative z-10 max-w-2xl space-y-4">
            <p className="text-xs font-medium tracking-wider text-[#00E5FF]">
              Multimodal Deepfake Detection Platform · Images · Audio · Videos
            </p>
            <h1 className="font-display text-3xl sm:text-5xl font-bold leading-[1.12] text-balance gradient-text">
              Detect the Fake. Reveal the Truth.
            </h1>
            <p className="text-base sm:text-lg text-[#A6B2D1] max-w-xl leading-relaxed">
              Advanced Multimodal Deepfake Detection Powered by Deep Learning. Inspect visual artifacts, acoustic vocoder traces, and spatio-temporal frame anomalies in real time.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate("image")}
                className="neon-button"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Analyze Image</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("audio")}
                className="neon-button-secondary"
              >
                <AudioLines className="w-4 h-4 text-[#00E5FF]" />
                <span>Analyze Audio</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("video")}
                className="neon-button-secondary"
              >
                <Video className="w-4 h-4 text-[#A78BFA]" />
                <span>Analyze Video</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Glowing Metric Cards */}
      <section aria-label="Detection Statistics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6B2D1]">Total Files Analyzed</span>
            <Files className="w-5 h-5 text-[#00E5FF]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#F5F7FF]">
            <AnimatedCounter value={totalAnalyzed} />
          </div>
          <p className="mt-1.5 text-xs text-[#6C7A9C]">
            {imageCount} images · {audioCount} audio · {videoCount} videos
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6B2D1]">AI-Generated Files</span>
            <ShieldAlert className="w-5 h-5 text-[#FF4B6E]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#FF4B6E]">
            <AnimatedCounter value={aiCount} />
          </div>
          <p className="mt-1.5 text-xs text-[#6C7A9C]">
            {totalAnalyzed > 0 ? `${Math.round((aiCount / totalAnalyzed) * 100)}% of scanned media` : "No detections recorded yet"}
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6B2D1]">Authentic Files</span>
            <FileCheck2 className="w-5 h-5 text-[#00E676]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#00E676]">
            <AnimatedCounter value={authenticCount} />
          </div>
          <p className="mt-1.5 text-xs text-[#6C7A9C]">
            {totalAnalyzed > 0 ? `${Math.round((authenticCount / totalAnalyzed) * 100)}% verified natural` : "Run a scan to populate"}
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A6B2D1]">Average Confidence</span>
            <Target className="w-5 h-5 text-[#8B5CF6]" aria-hidden="true" />
          </div>
          <div className="mt-3 text-3xl font-bold text-[#F5F7FF]">
            <AnimatedCounter value={avgConfidence} suffix="%" />
          </div>
          <p className="mt-1.5 text-xs text-[#6C7A9C]">
            {inconclusiveCount > 0 ? `${inconclusiveCount} inconclusive review${inconclusiveCount > 1 ? "s" : ""}` : "Calibrated neural certainty"}
          </p>
        </div>
      </section>

      {/* Plotly Analytics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="glass-card p-6 lg:col-span-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
                Detection Distribution
              </h2>
              <p className="text-xs text-[#6C7A9C]">Authentic vs. synthetic verdict share</p>
            </div>
          </div>

          {totalAnalyzed === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm text-[#A6B2D1]">No media analyzed yet.</p>
              <p className="mt-1 text-xs text-[#6C7A9C]">
                Upload an image, audio recording, or video clip to generate live Plotly distribution analytics.
              </p>
              <button
                type="button"
                onClick={() => onNavigate("image")}
                className="neon-button-secondary mt-4 text-xs"
              >
                <span>Start First Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <PlotlyChart
              height={260}
              data={[
                {
                  type: "pie",
                  hole: 0.62,
                  values: [authenticCount, aiCount, inconclusiveCount],
                  labels: ["Authentic", "AI-Generated", "Inconclusive"],
                  marker: {
                    colors: ["#00E676", "#FF4B6E", "#FFB020"],
                    line: { color: "#080B16", width: 2 },
                  },
                  textinfo: "percent",
                  textfont: { color: "#F5F7FF", family: "JetBrains Mono, monospace" },
                  hovertemplate: "%{label}: %{value} file(s) (%{percent})<extra></extra>",
                },
              ]}
              layout={{
                showlegend: true,
                legend: {
                  orientation: "h",
                  y: -0.1,
                  x: 0.5,
                  xanchor: "center",
                  font: { color: "#A6B2D1", size: 12 },
                },
                margin: { t: 10, r: 10, b: 36, l: 10 },
                annotations: [
                  {
                    text: `<b>${totalAnalyzed}</b><br><span style="font-size:11px;color:#A6B2D1">Scans</span>`,
                    showarrow: false,
                    font: { size: 20, color: "#F5F7FF", family: "JetBrains Mono, monospace" },
                  },
                ],
              }}
            />
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-7">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
                Recent AI Probability Trend
              </h2>
              <p className="text-xs text-[#6C7A9C]">Live backend detection scores across recent scans</p>
            </div>
          </div>

          {totalAnalyzed === 0 ? (
            <div className="h-[260px] flex flex-col items-center justify-center text-center px-6">
              <p className="text-sm text-[#A6B2D1]">Timeline awaiting real prediction records.</p>
              <p className="mt-1 text-xs text-[#6C7A9C]">
                Every completed analysis automatically appends its real synthetic and authenticity probabilities here.
              </p>
            </div>
          ) : (
            <PlotlyChart
              height={260}
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  name: "AI-Generated %",
                  x: [...history].reverse().slice(-12).map((_, idx) => `#${idx + 1}`),
                  y: [...history].reverse().slice(-12).map((r) => r.aiGeneratedPercent),
                  text: [...history].reverse().slice(-12).map((r) => `${r.fileName} (${r.modality})`),
                  line: { color: "#FF4B6E", width: 2.5, shape: "spline" },
                  marker: { color: "#FF4B6E", size: 8, line: { color: "#080B16", width: 1.5 } },
                  fill: "tozeroy",
                  fillcolor: "rgba(255, 75, 110, 0.12)",
                  hovertemplate: "%{text}<br>AI Probability: %{y}%<extra></extra>",
                },
                {
                  type: "scatter",
                  mode: "lines+markers",
                  name: "Authentic %",
                  x: [...history].reverse().slice(-12).map((_, idx) => `#${idx + 1}`),
                  y: [...history].reverse().slice(-12).map((r) => r.authenticPercent),
                  text: [...history].reverse().slice(-12).map((r) => `${r.fileName} (${r.modality})`),
                  line: { color: "#00E5FF", width: 2.5, shape: "spline" },
                  marker: { color: "#00E5FF", size: 7, line: { color: "#080B16", width: 1.5 } },
                  hovertemplate: "%{text}<br>Authentic: %{y}%<extra></extra>",
                },
              ]}
              layout={{
                yaxis: {
                  range: [0, 105],
                  gridcolor: "rgba(148, 163, 214, 0.1)",
                  ticksuffix: "%",
                  zeroline: false,
                },
                xaxis: {
                  gridcolor: "rgba(148, 163, 214, 0.06)",
                },
                legend: {
                  orientation: "h",
                  y: 1.14,
                  x: 1,
                  xanchor: "right",
                  font: { color: "#A6B2D1", size: 11 },
                },
                margin: { t: 28, r: 16, b: 32, l: 44 },
              }}
            />
          )}
        </div>
      </section>

      {/* Recent Detection Activities */}
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#94A3D6]/12">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
              Recent Detection Activities
            </h2>
            <p className="text-xs text-[#6C7A9C]">
              Click any entry to inspect forensic details or export its report
            </p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate("history")}
              className="text-xs font-medium text-[#00E5FF] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <span>View full history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentRecords.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-[#A6B2D1]">
              Your forensic activity ledger is clean. Select a detection module above to inspect your first media file.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate("image")}
                className="neon-button-secondary text-xs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Image Detection</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("audio")}
                className="neon-button-secondary text-xs"
              >
                <AudioLines className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>Audio Detection</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("video")}
                className="neon-button-secondary text-xs"
              >
                <Video className="w-3.5 h-3.5 text-[#FF3CAC]" />
                <span>Video Detection</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#94A3D6]/12 text-xs font-medium text-[#6C7A9C]">
                  <th className="py-3 pr-4">File</th>
                  <th className="py-3 px-4">Modality</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4 text-right">AI Score</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                  <th className="py-3 px-4">Analyzed</th>
                  <th className="py-3 pl-4 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#94A3D6]/10 text-sm">
                {recentRecords.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => onInspectRecord(rec)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pr-4 max-w-[240px]">
                      <div className="font-medium text-[#F5F7FF] truncate">{rec.fileName}</div>
                      <div className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                        {formatBytes(rec.fileSizeBytes)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#A6B2D1] capitalize">{rec.modality}</td>
                    <td className="py-3.5 px-4">
                      <VerdictBadge verdict={rec.verdict} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#F5F7FF]">
                      {rec.aiGeneratedPercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#00E5FF]">
                      {rec.confidenceScore}%
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#A6B2D1] whitespace-nowrap font-mono tabular-nums">
                      {formatShortDate(rec.timestamp)}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadForensicReport(rec, reportFormat);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#A6B2D1] hover:text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-colors cursor-pointer"
                        aria-label={`Download report for ${rec.fileName}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
