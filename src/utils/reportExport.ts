import type {
  AudioAnalysisResult,
  DetectionRecord,
  ImageAnalysisResult,
  VideoAnalysisResult,
} from "../types/forensics";
import { formatBytes, formatDuration } from "./storage";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function triggerDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadForensicReport(
  record: DetectionRecord,
  format: "html" | "json" = "html"
): void {
  const safeBase = record.fileName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  const stamp = new Date(record.timestamp).toISOString().slice(0, 19).replace(/[:T]/g, "-");

  if (format === "json") {
    const clean = {
      reportVersion: "1.0",
      system: "VeriSight AI — Multimodal Deepfake Detection",
      generatedAt: new Date().toISOString(),
      ...record,
      details:
        record.modality === "video" && "frameAnalyses" in record.details
          ? {
              ...record.details,
              frameAnalyses: record.details.frameAnalyses.map((f) => ({
                ...f,
                thumbnailDataUrl: undefined,
              })),
            }
          : record.details,
    };
    triggerDownload(
      `VeriSight_Report_${safeBase}_${stamp}.json`,
      JSON.stringify(clean, null, 2),
      "application/json"
    );
    return;
  }

  const verdictColor =
    record.verdict === "Authentic"
      ? "#00E676"
      : record.verdict === "AI-Generated"
        ? "#FF4B6E"
        : "#FFB020";

  let modalitySection = "";
  if (record.modality === "image") {
    const d = record.details as ImageAnalysisResult;
    modalitySection = `
      <h2>Spatial Signal Breakdown</h2>
      <ul>
        <li>Lighting Consistency: ${d.signals.lightingConsistency}%</li>
        <li>Texture Naturalness: ${d.signals.textureNaturalness}%</li>
        <li>Edge Coherence: ${d.signals.edgeCoherence}%</li>
        <li>Compression Integrity: ${d.signals.compressionIntegrity}%</li>
      </ul>
      <h2>Flagged Spatial Regions</h2>
      <table>
        <thead><tr><th>Region</th><th>Coordinates (x, y, w, h %)</th><th>Intensity</th><th>Finding</th></tr></thead>
        <tbody>
          ${d.suspiciousRegions
            .map(
              (r) =>
                `<tr><td>${escapeHtml(r.label)}</td><td>${r.x}%, ${r.y}%, ${r.width}%, ${r.height}%</td><td>${r.intensity}%</td><td>${escapeHtml(r.reason)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  } else if (record.modality === "audio") {
    const d = record.details as AudioAnalysisResult;
    modalitySection = `
      <h2>Acoustic Signal Breakdown</h2>
      <ul>
        <li>Prosody Naturalness: ${d.signals.prosodyNaturalness}%</li>
        <li>Spectral Continuity: ${d.signals.spectralContinuity}%</li>
        <li>Breathing Patterns: ${d.signals.breathingPatterns}%</li>
        <li>Noise Floor Consistency: ${d.signals.noiseFloorConsistency}%</li>
      </ul>
      <h2>Segment Timeline Analysis</h2>
      <table>
        <thead><tr><th>Segment</th><th>Window</th><th>AI Probability</th><th>Status</th><th>Notes</th></tr></thead>
        <tbody>
          ${d.segments
            .map(
              (s) =>
                `<tr><td>${escapeHtml(s.label)}</td><td>${formatDuration(s.startSec)} – ${formatDuration(s.endSec)}</td><td>${s.aiProbability}%</td><td>${escapeHtml(s.status)}</td><td>${escapeHtml(s.note)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  } else {
    const d = record.details as VideoAnalysisResult;
    modalitySection = `
      <h2>Spatio-Temporal Signal Breakdown</h2>
      <ul>
        <li>Lip-Sync Coherence: ${d.signals.lipSyncCoherence}%</li>
        <li>Blink Naturalness: ${d.signals.blinkNaturalness}%</li>
        <li>Temporal Stability: ${d.signals.temporalStability}%</li>
        <li>Lighting Continuity: ${d.signals.lightingContinuity}%</li>
      </ul>
      <h2>Frame-Level Analysis (${d.framesAnalyzed} Keyframes)</h2>
      <table>
        <thead><tr><th>Frame</th><th>Timestamp</th><th>AI Probability</th><th>Status</th><th>Forensic Note</th></tr></thead>
        <tbody>
          ${d.frameAnalyses
            .map(
              (f) =>
                `<tr><td>#${f.frameIndex + 1}</td><td>${formatDuration(f.timestampSec)}</td><td>${f.aiProbability}%</td><td>${escapeHtml(f.status)}</td><td>${escapeHtml(f.note)}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Forensic Report — ${escapeHtml(record.fileName)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #080B16; color: #F5F7FF; padding: 36px; line-height: 1.6; }
  .wrap { max-width: 900px; margin: 0 auto; background: #10172B; border: 1px solid rgba(0,229,255,0.22); border-radius: 16px; padding: 32px; }
  h1 { margin: 0 0 8px; color: #00E5FF; font-size: 26px; }
  h2 { margin: 28px 0 12px; color: #A78BFA; font-size: 16px; border-bottom: 1px solid rgba(148,163,214,0.18); padding-bottom: 6px; }
  .meta { color: #A6B2D1; font-size: 13px; margin-bottom: 24px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 20px 0; }
  .kpi { background: rgba(8,11,22,0.75); border: 1px solid rgba(148,163,214,0.16); border-radius: 12px; padding: 14px; }
  .kpi-label { font-size: 12px; color: #A6B2D1; }
  .kpi-value { font-size: 22px; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid rgba(148,163,214,0.14); }
  th { color: #00E5FF; font-weight: 600; }
  ul { padding-left: 20px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>VeriSight AI — Forensic Detection Report</h1>
    <div class="meta">
      File: <strong>${escapeHtml(record.fileName)}</strong> &middot;
      Modality: ${escapeHtml(record.modality.toUpperCase())} &middot;
      Size: ${formatBytes(record.fileSizeBytes)} &middot;
      Analyzed: ${escapeHtml(new Date(record.timestamp).toLocaleString())} &middot;
      Processing: ${(record.processingTimeMs / 1000).toFixed(2)}s
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kpi-label">Verdict</div><div class="kpi-value" style="color:${verdictColor}">${escapeHtml(record.verdict)}</div></div>
      <div class="kpi"><div class="kpi-label">AI-Generated</div><div class="kpi-value" style="color:#FF4B6E">${record.aiGeneratedPercent}%</div></div>
      <div class="kpi"><div class="kpi-label">Authentic</div><div class="kpi-value" style="color:#00E676">${record.authenticPercent}%</div></div>
      <div class="kpi"><div class="kpi-label">Confidence</div><div class="kpi-value" style="color:#00E5FF">${record.confidenceScore}%</div></div>
    </div>
    <h2>Executive Forensic Summary</h2>
    <p>${escapeHtml(record.summary)}</p>
    <h2>Observed Forensic Artifacts</h2>
    <table>
      <thead><tr><th>Category</th><th>Severity</th><th>Observation</th></tr></thead>
      <tbody>
        ${record.details.artifacts
          .map(
            (a) =>
              `<tr><td>${escapeHtml(a.category)}</td><td>${escapeHtml(a.severity)}</td><td>${escapeHtml(a.observation)}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
    ${modalitySection}
  </div>
</body>
</html>`;

  triggerDownload(`VeriSight_Report_${safeBase}_${stamp}.html`, html, "text/html");
}

export function exportHistoryCsv(records: DetectionRecord[]): void {
  const header = [
    "ID",
    "Timestamp",
    "Modality",
    "File Name",
    "Size (Bytes)",
    "Verdict",
    "AI-Generated (%)",
    "Authentic (%)",
    "Confidence (%)",
    "Processing (ms)",
    "Summary",
  ];
  const rows = records.map((r) => [
    r.id,
    r.timestamp,
    r.modality,
    `"${r.fileName.replace(/"/g, '""')}"`,
    r.fileSizeBytes,
    r.verdict,
    r.aiGeneratedPercent,
    r.authenticPercent,
    r.confidenceScore,
    r.processingTimeMs,
    `"${r.summary.replace(/"/g, '""')}"`,
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  triggerDownload(
    `VeriSight_Detection_History_${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
    "text/csv"
  );
}
