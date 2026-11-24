import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Search,
  Trash2,
} from "lucide-react";
import type {
  DetectionRecord,
  MediaModality,
  NavSection,
  VerdictType,
} from "../types/forensics";
import { downloadForensicReport, exportHistoryCsv } from "../utils/reportExport";
import { formatBytes, formatShortDate } from "../utils/storage";
import PlotlyChart from "./PlotlyChart";
import { VerdictBadge } from "./VisualWidgets";

interface HistoryViewProps {
  history: DetectionRecord[];
  reportFormat: "html" | "json";
  onInspectRecord: (record: DetectionRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
  onNavigate: (section: NavSection) => void;
}

export default function HistoryView({
  history,
  reportFormat,
  onInspectRecord,
  onDeleteRecord,
  onClearHistory,
  onNavigate,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState<"all" | MediaModality>("all");
  const [verdictFilter, setVerdictFilter] = useState<"all" | VerdictType>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    return history.filter((rec) => {
      if (modalityFilter !== "all" && rec.modality !== modalityFilter) return false;
      if (verdictFilter !== "all" && rec.verdict !== verdictFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.fileName.toLowerCase().includes(q) ||
          rec.summary.toLowerCase().includes(q) ||
          rec.modality.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [history, modalityFilter, verdictFilter, searchQuery]);

  const chronological = useMemo(() => [...filtered].reverse(), [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
            Detection History
          </h1>
          <p className="mt-1 text-sm text-[#A6B2D1]">
            Audit past multimodal inspections, compare probability trends, and export forensic reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => exportHistoryCsv(filtered)}
              className="neon-button-secondary text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Export CSV</span>
            </button>
          )}
          {history.length > 0 && !confirmClear && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="neon-button-secondary text-xs border-[#FF4B6E]/35 text-[#FFD4DC] hover:border-[#FF4B6E]"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#FF4B6E]" />
              <span>Clear History</span>
            </button>
          )}
          {confirmClear && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FF4B6E] text-[#080B16] cursor-pointer"
              >
                Confirm Delete All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#A6B2D1] hover:text-[#F5F7FF] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detection History Graph */}
      {chronological.length > 0 && (
        <section className="glass-card p-6">
          <div className="mb-2">
            <h2 className="font-display text-base font-semibold text-[#F5F7FF]">
              Historical Detection Scores
            </h2>
            <p className="text-xs text-[#6C7A9C]">
              AI-Generated probability and model confidence across {chronological.length} recorded file(s)
            </p>
          </div>
          <PlotlyChart
            height={250}
            data={[
              {
                type: "bar",
                name: "AI-Generated %",
                x: chronological.map((r, i) => `${i + 1}. ${r.fileName.slice(0, 14)}`),
                y: chronological.map((r) => r.aiGeneratedPercent),
                marker: {
                  color: chronological.map((r) =>
                    r.verdict === "AI-Generated"
                      ? "#FF4B6E"
                      : r.verdict === "Authentic"
                        ? "#00E676"
                        : "#FFB020"
                  ),
                },
                hovertemplate: "<b>%{x}</b><br>AI Probability: %{y}%<extra></extra>",
              },
              {
                type: "scatter",
                mode: "lines+markers",
                name: "Confidence %",
                x: chronological.map((r, i) => `${i + 1}. ${r.fileName.slice(0, 14)}`),
                y: chronological.map((r) => r.confidenceScore),
                line: { color: "#00E5FF", width: 2 },
                marker: { color: "#00E5FF", size: 7 },
                hovertemplate: "Confidence: %{y}%<extra></extra>",
              },
            ]}
            layout={{
              yaxis: {
                range: [0, 108],
                gridcolor: "rgba(148, 163, 214, 0.1)",
                ticksuffix: "%",
              },
              xaxis: {
                tickfont: { size: 11, color: "#A6B2D1" },
              },
              legend: {
                orientation: "h",
                y: 1.15,
                x: 1,
                xanchor: "right",
                font: { color: "#A6B2D1", size: 11 },
              },
              margin: { t: 26, r: 16, b: 48, l: 44 },
            }}
          />
        </section>
      )}

      {/* Filters & Table */}
      <section className="glass-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search
              className="w-4 h-4 text-[#6C7A9C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search file name or forensic summary..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#080B16]/85 border border-[#94A3D6]/18 text-sm text-[#F5F7FF] placeholder:text-[#6C7A9C] focus:outline-none focus:border-[#00E5FF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Modality Segmented Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080B16]/85 border border-[#94A3D6]/14">
              {(["all", "image", "audio", "video"] as const).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setModalityFilter(mod)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    modalityFilter === mod
                      ? "bg-[#00E5FF]/18 text-[#00E5FF]"
                      : "text-[#A6B2D1] hover:text-[#F5F7FF]"
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>

            {/* Verdict Segmented Filter */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080B16]/85 border border-[#94A3D6]/14">
              {(["all", "AI-Generated", "Authentic", "Inconclusive"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdictFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    verdictFilter === v
                      ? "bg-[#8B5CF6]/24 text-[#F5F7FF]"
                      : "text-[#A6B2D1] hover:text-[#F5F7FF]"
                  }`}
                >
                  {v === "all" ? "All Verdicts" : v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <p className="text-sm text-[#A6B2D1]">
              {history.length === 0
                ? "No detection history recorded yet."
                : "No records match your current filters."}
            </p>
            {history.length === 0 && (
              <button
                type="button"
                onClick={() => onNavigate("image")}
                className="neon-button text-xs"
              >
                Analyze Your First File
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#94A3D6]/14 text-xs font-medium text-[#6C7A9C]">
                  <th className="py-3 pr-4">File</th>
                  <th className="py-3 px-4">Modality</th>
                  <th className="py-3 px-4">Verdict</th>
                  <th className="py-3 px-4 text-right">AI %</th>
                  <th className="py-3 px-4 text-right">Authentic %</th>
                  <th className="py-3 px-4 text-right">Confidence</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#94A3D6]/10 text-sm">
                {filtered.map((rec) => (
                  <tr
                    key={rec.id}
                    onClick={() => onInspectRecord(rec)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 pr-4 max-w-[230px]">
                      <div className="font-medium text-[#F5F7FF] truncate">{rec.fileName}</div>
                      <div className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                        {formatBytes(rec.fileSizeBytes)} · {(rec.processingTimeMs / 1000).toFixed(1)}s
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#A6B2D1] capitalize">{rec.modality}</td>
                    <td className="py-3.5 px-4">
                      <VerdictBadge verdict={rec.verdict} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#FF4B6E]">
                      {rec.aiGeneratedPercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#00E676]">
                      {rec.authenticPercent}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#00E5FF]">
                      {rec.confidenceScore}%
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#A6B2D1] font-mono tabular-nums whitespace-nowrap">
                      {formatShortDate(rec.timestamp)}
                    </td>
                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadForensicReport(rec, reportFormat);
                        }}
                        className="p-1.5 rounded-lg text-[#A6B2D1] hover:text-[#00E5FF] hover:bg-[#00E5FF]/10 cursor-pointer"
                        aria-label={`Download report for ${rec.fileName}`}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRecord(rec.id);
                        }}
                        className="p-1.5 ml-1 rounded-lg text-[#6C7A9C] hover:text-[#FF4B6E] hover:bg-[#FF4B6E]/10 cursor-pointer"
                        aria-label={`Delete record ${rec.fileName}`}
                      >
                        <Trash2 className="w-4 h-4" />
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
