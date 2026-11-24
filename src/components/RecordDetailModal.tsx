import { Download, X } from "lucide-react";
import type { DetectionRecord } from "../types/forensics";
import { downloadForensicReport } from "../utils/reportExport";
import { formatBytes, formatShortDate } from "../utils/storage";
import { CircularGauge, VerdictBadge } from "./VisualWidgets";

interface RecordDetailModalProps {
  record: DetectionRecord | null;
  reportFormat: "html" | "json";
  onClose: () => void;
}

export default function RecordDetailModal({
  record,
  reportFormat,
  onClose,
}: RecordDetailModalProps) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto glass-card p-6 sm:p-7 space-y-6 bg-[#0C1326]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#94A3D6]/14">
          <div className="min-w-0">
            <h2
              id="record-detail-title"
              className="font-display text-xl font-bold text-[#F5F7FF] truncate"
            >
              {record.fileName}
            </h2>
            <p className="mt-1 text-xs text-[#A6B2D1] font-mono tabular-nums">
              {record.modality.toUpperCase()} · {formatBytes(record.fileSizeBytes)} ·{" "}
              {formatShortDate(record.timestamp)} · {(record.processingTimeMs / 1000).toFixed(2)}s
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#A6B2D1] hover:text-[#F5F7FF] hover:bg-white/5 cursor-pointer"
            aria-label="Close inspection details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <VerdictBadge verdict={record.verdict} />
          <button
            type="button"
            onClick={() => downloadForensicReport(record, reportFormat)}
            className="neon-button text-xs py-2 px-3.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Report</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 justify-items-center py-2">
          <CircularGauge
            percentage={record.aiGeneratedPercent}
            label="AI-Generated"
            color="#FF4B6E"
            size={104}
          />
          <CircularGauge
            percentage={record.authenticPercent}
            label="Authentic"
            color="#00E676"
            size={104}
          />
          <CircularGauge
            percentage={record.confidenceScore}
            label="Confidence"
            color="#00E5FF"
            size={104}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[#00E5FF]">Forensic Summary</h3>
          <p className="text-sm text-[#A6B2D1] leading-relaxed">{record.summary}</p>
        </div>

        {record.details.artifacts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#A78BFA]">Observed Forensic Artifacts</h3>
            <div className="divide-y divide-[#94A3D6]/12">
              {record.details.artifacts.map((art, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F5F7FF]">{art.category}</span>
                    <span
                      className={`font-mono ${
                        art.severity === "High"
                          ? "text-[#FF4B6E]"
                          : art.severity === "Medium"
                            ? "text-[#FFB020]"
                            : "text-[#00E676]"
                      }`}
                    >
                      {art.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#A6B2D1]">{art.observation}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
