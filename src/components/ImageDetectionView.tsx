import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Columns2,
  Download,
  Eye,
  Flame,
  Image as ImageIcon,
  Layers,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";
import type {
  AppSettings,
  DetectionRecord,
  ImageAnalysisResult,
} from "../types/forensics";
import { createSampleImageFile } from "../utils/mediaTools";
import { downloadForensicReport } from "../utils/reportExport";
import { formatBytes } from "../utils/storage";
import PlotlyChart from "./PlotlyChart";
import { CircularGauge, HeatmapOverlay, VerdictBadge } from "./VisualWidgets";

interface ImageDetectionViewProps {
  settings: AppSettings;
  onRecordCreated: (record: DetectionRecord) => void;
}

export default function ImageDetectionView({
  settings,
  onRecordCreated,
}: ImageDetectionViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [lastRecord, setLastRecord] = useState<DetectionRecord | null>(null);

  const [viewMode, setViewMode] = useState<"compare" | "heatmap">("compare");
  const [compareSplit, setCompareSplit] = useState(52);
  const [heatmapOpacity, setHeatmapOpacity] = useState(settings.defaultHeatmapOpacity);
  const [showBoxes, setShowBoxes] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHeatmapOpacity(settings.defaultHeatmapOpacity);
  }, [settings.defaultHeatmapOpacity]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelected = useCallback((selected: File) => {
    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WEBP, GIF).");
      return;
    }
    setError(null);
    setResult(null);
    setLastRecord(null);
    setFile(selected);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }, []);

  const handleLoadSpecimen = async (variant: "synthetic" | "natural") => {
    try {
      const specimen = await createSampleImageFile(variant);
      handleFileSelected(specimen);
    } catch {
      setError("Could not generate test specimen image.");
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("threshold", String(settings.aiThresholdPercent));

      const response = await fetch("/api/analyze/image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Image forensic analysis failed.");
      }

      const analysis = payload as ImageAnalysisResult;
      const elapsed = Math.round(performance.now() - startTime);
      setResult(analysis);

      const record: DetectionRecord = {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        modality: "image",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        aiGeneratedPercent: analysis.aiGeneratedPercent,
        authenticPercent: analysis.authenticPercent,
        confidenceScore: analysis.confidenceScore,
        verdict: analysis.verdict,
        summary: analysis.summary,
        processingTimeMs: elapsed,
        details: analysis,
      };
      setLastRecord(record);
      onRecordCreated(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
            Image Deepfake Detection
          </h1>
          <p className="mt-1 text-sm text-[#A6B2D1]">
            Inspect diffusion textures, lighting physics, anatomical symmetry, and spatial manipulation heatmaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleLoadSpecimen("synthetic")}
            className="neon-button-secondary text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF3CAC]" />
            <span>Load Synthetic Test Image</span>
          </button>
          <button
            type="button"
            onClick={() => handleLoadSpecimen("natural")}
            className="neon-button-secondary text-xs"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Load Natural Test Image</span>
          </button>
        </div>
      </div>

      {/* Upload + Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="analysis-panel lg:col-span-5 space-y-5">
          <div
            role="button"
            tabIndex={0}
            data-dragging={isDragging}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileSelected(dropped);
            }}
            className="upload-zone p-8 text-center flex flex-col items-center justify-center min-h-[210px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleFileSelected(picked);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/12 border border-[#00E5FF]/35 flex items-center justify-center text-[#00E5FF] mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#F5F7FF]">
              Drag and drop an image here, or browse files
            </p>
            <p className="mt-1 text-xs text-[#6C7A9C]">
              Supports PNG, JPG, JPEG, WEBP · Up to 20 MB
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/14">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F7FF] truncate">{file.name}</p>
                <p className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                  {formatBytes(file.size)} · {file.type}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="neon-button shrink-0"
              >
                <ScanSearch className="w-4 h-4" />
                <span>{isAnalyzing ? "Scanning..." : "Analyze Image"}</span>
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#FF4B6E]/12 border border-[#FF4B6E]/40 text-xs text-[#FFD4DC]"
            >
              <AlertCircle className="w-4 h-4 text-[#FF4B6E] shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="space-y-4 pt-2 border-t border-[#94A3D6]/12">
              <div className="flex items-center justify-between">
                <VerdictBadge verdict={result.verdict} />
                {lastRecord && (
                  <button
                    type="button"
                    onClick={() => downloadForensicReport(lastRecord, settings.reportFormat)}
                    className="neon-button-secondary text-xs py-1.5 px-3"
                  >
                    <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
                    <span>Download Report</span>
                  </button>
                )}
              </div>
              <p className="text-sm text-[#A6B2D1] leading-relaxed">{result.summary}</p>
            </div>
          )}
        </div>

        {/* Visual Preview / Scanning / Comparison / Heatmap Stage */}
        <div className="analysis-panel lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-[#F5F7FF]">
              {result
                ? viewMode === "compare"
                  ? "Original vs. Analyzed Comparison"
                  : "Suspicious Region Heatmap"
                : "Image Inspection Viewport"}
            </h2>

            {result && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080B16]/80 border border-[#94A3D6]/14">
                <button
                  type="button"
                  onClick={() => setViewMode("compare")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === "compare"
                      ? "bg-[#00E5FF]/18 text-[#00E5FF]"
                      : "text-[#A6B2D1] hover:text-[#F5F7FF]"
                  }`}
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Comparison</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("heatmap")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === "heatmap"
                      ? "bg-[#FF3CAC]/20 text-[#FF3CAC]"
                      : "text-[#A6B2D1] hover:text-[#F5F7FF]"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Heatmap</span>
                </button>
              </div>
            )}
          </div>

          {!previewUrl ? (
            <div className="aspect-[16/10] rounded-xl bg-[#060913] border border-[#94A3D6]/12 flex flex-col items-center justify-center text-center p-6">
              <Eye className="w-8 h-8 text-[#6C7A9C] mb-3" />
              <p className="text-sm text-[#A6B2D1]">No image loaded yet</p>
              <p className="mt-1 text-xs text-[#6C7A9C] max-w-sm">
                Upload an image or load one of the test specimens above to preview and run spatial deepfake inspection.
              </p>
            </div>
          ) : isAnalyzing ? (
            <div className="heatmap-container relative aspect-[16/10] flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Image under forensic scan"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain opacity-80"
              />
              <div className="scan-beam-trail" />
              <div className="scan-beam" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080B16]/85 via-transparent to-[#080B16]/45 flex flex-col items-center justify-end pb-6 px-4 text-center">
                <p className="text-sm font-semibold text-[#00E5FF]">
                  Running Multimodal Spatial Forensic Scan...
                </p>
                <p className="text-xs text-[#A6B2D1] mt-1">
                  Inspecting pixel noise residuals, lighting vectors, and generative textures
                </p>
              </div>
            </div>
          ) : result && viewMode === "compare" ? (
            <div className="space-y-3">
              <div className="heatmap-container relative aspect-[16/10] select-none overflow-hidden">
                {/* Base layer: Analyzed heatmap */}
                <div className="absolute inset-0">
                  <HeatmapOverlay
                    imageSrc={previewUrl}
                    regions={result.suspiciousRegions}
                    opacity={heatmapOpacity}
                    palette={settings.heatmapPalette}
                    showBoxes={showBoxes}
                    alt="Analyzed image with suspicious regions"
                  />
                </div>
                {/* Clipped left layer: Original untouched image */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - compareSplit}% 0 0)` }}
                >
                  <img
                    src={previewUrl}
                    alt="Original uploaded image"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain bg-[#060913]"
                  />
                </div>
                {/* Vertical split divider */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#00E5FF] shadow-[0_0_12px_#00E5FF] pointer-events-none"
                  style={{ left: `${compareSplit}%` }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#080B16]/85 text-[11px] font-medium text-[#F5F7FF] border border-white/10">
                  Original
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded bg-[#080B16]/85 text-[11px] font-medium text-[#00E5FF] border border-[#00E5FF]/30">
                  Analyzed Heatmap
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#A6B2D1]">
                <label className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <span className="whitespace-nowrap">Comparison Split</span>
                  <input
                    type="range"
                    min={5}
                    max={95}
                    value={compareSplit}
                    onChange={(e) => setCompareSplit(Number(e.target.value))}
                    className="w-full accent-[#00E5FF] cursor-pointer"
                  />
                  <span className="font-mono tabular-nums w-9 text-right">{compareSplit}%</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowBoxes((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#00E5FF] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showBoxes ? "Hide Region Boxes" : "Show Region Boxes"}</span>
                </button>
              </div>
            </div>
          ) : result && viewMode === "heatmap" ? (
            <div className="space-y-3">
              <HeatmapOverlay
                imageSrc={previewUrl}
                regions={result.suspiciousRegions}
                opacity={heatmapOpacity}
                palette={settings.heatmapPalette}
                showBoxes={showBoxes}
                alt="Suspicious region heatmap"
              />
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#A6B2D1]">
                <label className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <span className="whitespace-nowrap">Heatmap Intensity</span>
                  <input
                    type="range"
                    min={15}
                    max={100}
                    value={Math.round(heatmapOpacity * 100)}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value) / 100)}
                    className="w-full accent-[#FF3CAC] cursor-pointer"
                  />
                  <span className="font-mono tabular-nums w-9 text-right">
                    {Math.round(heatmapOpacity * 100)}%
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowBoxes((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#00E5FF] hover:underline cursor-pointer whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showBoxes ? "Hide Region Boxes" : "Show Region Boxes"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="heatmap-container relative aspect-[16/10]">
              <img
                src={previewUrl}
                alt="Uploaded image preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-[#060913]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Results Breakdown Section */}
      {result && (
        <div className="space-y-6">
          {/* Circular Gauges + Plotly Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-5 flex flex-col justify-between">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-5">
                Detection Probability Indicators
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center justify-items-center py-2">
                <CircularGauge
                  percentage={result.aiGeneratedPercent}
                  label="AI-Generated"
                  color="#FF4B6E"
                  size={112}
                />
                <CircularGauge
                  percentage={result.authenticPercent}
                  label="Authentic"
                  color="#00E676"
                  size={112}
                />
                <CircularGauge
                  percentage={result.confidenceScore}
                  label="Confidence"
                  color="#00E5FF"
                  size={112}
                />
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs text-[#A6B2D1]">
                  <span>Synthetic Risk Meter</span>
                  <span className="font-mono tabular-nums text-[#F5F7FF]">
                    {result.aiGeneratedPercent}%
                  </span>
                </div>
                <div className="neon-progress-track">
                  <div
                    className="neon-progress-fill bg-gradient-to-r from-[#00E676] via-[#8B5CF6] to-[#FF4B6E]"
                    style={{ transform: `scaleX(${Math.max(0.02, result.aiGeneratedPercent / 100)})` }}
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-6 lg:col-span-7">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-2">
                Spatial Authenticity Signal Profile
              </h3>
              <PlotlyChart
                height={250}
                data={[
                  {
                    type: "bar",
                    orientation: "h",
                    y: [
                      "Compression Integrity",
                      "Edge Coherence",
                      "Texture Naturalness",
                      "Lighting Consistency",
                    ],
                    x: [
                      result.signals.compressionIntegrity,
                      result.signals.edgeCoherence,
                      result.signals.textureNaturalness,
                      result.signals.lightingConsistency,
                    ],
                    marker: {
                      color: ["#8B5CF6", "#38BDF8", "#00E5FF", "#00E676"],
                      line: { width: 0 },
                    },
                    text: [
                      `${result.signals.compressionIntegrity}%`,
                      `${result.signals.edgeCoherence}%`,
                      `${result.signals.textureNaturalness}%`,
                      `${result.signals.lightingConsistency}%`,
                    ],
                    textposition: "outside",
                    textfont: { color: "#F5F7FF", family: "JetBrains Mono, monospace", size: 12 },
                    hovertemplate: "%{y}: %{x}% authenticity score<extra></extra>",
                  },
                ]}
                layout={{
                  xaxis: {
                    range: [0, 112],
                    gridcolor: "rgba(148, 163, 214, 0.1)",
                    ticksuffix: "%",
                  },
                  yaxis: {
                    automargin: true,
                    tickfont: { color: "#A6B2D1", size: 12 },
                  },
                  margin: { t: 10, r: 42, b: 32, l: 150 },
                }}
              />
            </div>
          </div>

          {/* Forensic Artifacts & Suspicious Regions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-4">
                Forensic Artifact Findings
              </h3>
              <div className="divide-y divide-[#94A3D6]/12">
                {result.artifacts.map((art, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[#F5F7FF]">{art.category}</span>
                      <span
                        className={`text-xs font-mono font-medium ${
                          art.severity === "High"
                            ? "text-[#FF4B6E]"
                            : art.severity === "Medium"
                              ? "text-[#FFB020]"
                              : "text-[#00E676]"
                        }`}
                      >
                        {art.severity} Severity
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#A6B2D1] leading-relaxed">
                      {art.observation}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-4">
                Inspected Heatmap Regions ({result.suspiciousRegions.length})
              </h3>
              <div className="divide-y divide-[#94A3D6]/12">
                {result.suspiciousRegions.map((reg, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[#F5F7FF]">{reg.label}</span>
                      <span className="font-mono text-xs tabular-nums text-[#00E5FF]">
                        Intensity {reg.intensity}% · ({reg.x}%, {reg.y}%)
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#A6B2D1] leading-relaxed">{reg.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
