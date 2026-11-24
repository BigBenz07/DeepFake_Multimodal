import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Download,
  Film,
  Layers,
  ScanSearch,
  Sparkles,
  Upload,
  Video as VideoIcon,
} from "lucide-react";
import type {
  AppSettings,
  DetectionRecord,
  VideoAnalysisResult,
} from "../types/forensics";
import { createSampleVideoFile, extractVideoFrames } from "../utils/mediaTools";
import { downloadForensicReport } from "../utils/reportExport";
import { formatBytes, formatDuration } from "../utils/storage";
import PlotlyChart from "./PlotlyChart";
import { CircularGauge, HeatmapOverlay, VerdictBadge } from "./VisualWidgets";

interface VideoDetectionViewProps {
  settings: AppSettings;
  onRecordCreated: (record: DetectionRecord) => void;
}

export default function VideoDetectionView({
  settings,
  onRecordCreated,
}: VideoDetectionViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStage, setScanStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoAnalysisResult | null>(null);
  const [lastRecord, setLastRecord] = useState<DetectionRecord | null>(null);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleFileSelected = useCallback((selected: File) => {
    if (!selected.type.startsWith("video/")) {
      setError("Please select a valid video file (MP4, WEBM, MOV).");
      return;
    }
    setError(null);
    setResult(null);
    setLastRecord(null);
    setSelectedFrameIdx(0);
    setFile(selected);
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });
  }, []);

  const handleGenerateSampleVideo = async () => {
    setIsGeneratingSample(true);
    setError(null);
    try {
      const sample = await createSampleVideoFile();
      handleFileSelected(sample);
    } catch {
      setError("Could not generate test video clip in this browser.");
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const jumpToFrame = (idx: number) => {
    setSelectedFrameIdx(idx);
    const frame = result?.frameAnalyses[idx];
    if (frame && videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = frame.timestampSec;
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setScanStage("Extracting sequential keyframes from video...");
    const startTime = performance.now();

    try {
      const extracted = await extractVideoFrames(file, 8);
      setScanStage(`Running spatio-temporal deepfake inspection on ${extracted.frames.length} frames...`);

      const formData = new FormData();
      extracted.frames.forEach((f, idx) => {
        formData.append("frames", f.blob, `frame_${idx}.jpg`);
      });
      formData.append(
        "timestamps",
        JSON.stringify(extracted.frames.map((f) => f.timestampSec))
      );
      formData.append("durationSec", String(extracted.durationSec));
      formData.append("threshold", String(settings.aiThresholdPercent));

      const response = await fetch("/api/analyze/video", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Video forensic analysis failed.");
      }

      const rawResult = payload as VideoAnalysisResult;
      const mergedFrames = rawResult.frameAnalyses.map((fa, idx) => ({
        ...fa,
        thumbnailDataUrl: extracted.frames[idx]?.dataUrl,
      }));
      const finalResult: VideoAnalysisResult = {
        ...rawResult,
        frameAnalyses: mergedFrames,
      };

      const elapsed = Math.round(performance.now() - startTime);
      setResult(finalResult);

      // Automatically select the most suspicious frame
      let maxIdx = 0;
      mergedFrames.forEach((f, idx) => {
        if (f.aiProbability > (mergedFrames[maxIdx]?.aiProbability ?? -1)) {
          maxIdx = idx;
        }
      });
      setSelectedFrameIdx(maxIdx);

      const record: DetectionRecord = {
        id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        modality: "video",
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        aiGeneratedPercent: finalResult.aiGeneratedPercent,
        authenticPercent: finalResult.authenticPercent,
        confidenceScore: finalResult.confidenceScore,
        verdict: finalResult.verdict,
        summary: finalResult.summary,
        processingTimeMs: elapsed,
        details: finalResult,
      };
      setLastRecord(record);
      onRecordCreated(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze video.");
    } finally {
      setIsAnalyzing(false);
      setScanStage("");
    }
  };

  const activeFrame = result?.frameAnalyses[selectedFrameIdx];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
            Video Deepfake Detection
          </h1>
          <p className="mt-1 text-sm text-[#A6B2D1]">
            Extract keyframes for spatio-temporal face-swap detection, lip-sync auditing, and frame-level heatmaps.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateSampleVideo}
          disabled={isGeneratingSample}
          className="neon-button-secondary text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#FF3CAC]" />
          <span>{isGeneratingSample ? "Rendering Sample..." : "Generate Test Video (.webm)"}</span>
        </button>
      </div>

      {/* Upload + Video Preview Player */}
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
            className="upload-zone p-8 text-center flex flex-col items-center justify-center min-h-[200px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleFileSelected(picked);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#FF3CAC]/14 border border-[#FF3CAC]/38 flex items-center justify-center text-[#FF3CAC] mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#F5F7FF]">
              Drag and drop a video clip here, or browse files
            </p>
            <p className="mt-1 text-xs text-[#6C7A9C]">
              Supports MP4, WEBM, MOV · Client keyframe extraction handles large clips
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/14">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F7FF] truncate">{file.name}</p>
                <p className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                  {formatBytes(file.size)} · {file.type || "video"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="neon-button shrink-0"
              >
                <ScanSearch className="w-4 h-4" />
                <span>{isAnalyzing ? "Scanning..." : "Analyze Video"}</span>
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

        {/* Video Preview Player */}
        <div className="analysis-panel lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#F5F7FF]">
              Video Preview Player
            </h2>
            {result && (
              <span className="text-xs font-mono tabular-nums text-[#00E5FF]">
                {result.framesAnalyzed} keyframes · {formatDuration(result.durationSec)}
              </span>
            )}
          </div>

          {!videoUrl ? (
            <div className="aspect-video rounded-xl bg-[#060913] border border-[#94A3D6]/12 flex flex-col items-center justify-center text-center p-6">
              <VideoIcon className="w-8 h-8 text-[#6C7A9C] mb-3" />
              <p className="text-sm text-[#A6B2D1]">No video loaded</p>
              <p className="mt-1 text-xs text-[#6C7A9C] max-w-sm">
                Upload a video or generate the in-browser test clip to preview playback and extract frames for forensic scanning.
              </p>
            </div>
          ) : (
            <div className="heatmap-container relative aspect-video">
              <video
                ref={videoPlayerRef}
                src={videoUrl}
                controls
                playsInline
                className="w-full h-full object-contain bg-[#060913]"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-[#080B16]/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-center px-6">
                  <div className="scan-beam-trail" />
                  <div className="scan-beam" />
                  <Film className="w-8 h-8 text-[#00E5FF] mb-3" />
                  <p className="text-sm font-semibold text-[#F5F7FF]">{scanStage}</p>
                  <p className="text-xs text-[#A6B2D1] mt-1">
                    Evaluating facial boundaries, temporal stability, and lighting continuity
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Area */}
      {result && (
        <div className="space-y-6">
          {/* Gauges + Frame Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-5 flex flex-col justify-between">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-5">
                Video Deepfake Assessment
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

              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Lip-Sync Coherence</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#00E5FF]">
                    {result.signals.lipSyncCoherence}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Blink Naturalness</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#A78BFA]">
                    {result.signals.blinkNaturalness}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Temporal Stability</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#00E676]">
                    {result.signals.temporalStability}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Lighting Continuity</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#F5F7FF]">
                    {result.signals.lightingContinuity}%
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 lg:col-span-7">
              <div className="mb-2">
                <h3 className="font-display text-base font-semibold text-[#F5F7FF]">
                  Frame-by-Frame Analysis Timeline
                </h3>
                <p className="text-xs text-[#6C7A9C]">
                  Click any frame marker to inspect its heatmap and seek the video player
                </p>
              </div>
              <PlotlyChart
                height={275}
                onPointClick={(idx) => jumpToFrame(idx)}
                data={[
                  {
                    type: "scatter",
                    mode: "lines+markers",
                    name: "AI Probability",
                    x: result.frameAnalyses.map((f) => formatDuration(f.timestampSec)),
                    y: result.frameAnalyses.map((f) => f.aiProbability),
                    line: { color: "#00E5FF", width: 2.5, shape: "spline" },
                    marker: {
                      size: 11,
                      color: result.frameAnalyses.map((f) =>
                        f.status === "Suspicious"
                          ? "#FF4B6E"
                          : f.status === "Borderline"
                            ? "#FFB020"
                            : "#00E676"
                      ),
                      line: { color: "#080B16", width: 2 },
                    },
                    fill: "tozeroy",
                    fillcolor: "rgba(0, 229, 255, 0.1)",
                    customdata: result.frameAnalyses.map((f) => f.note),
                    hovertemplate:
                      "<b>Frame @ %{x}</b><br>AI Probability: %{y}%<br>%{customdata}<extra></extra>",
                  },
                ]}
                layout={{
                  yaxis: {
                    range: [0, 108],
                    gridcolor: "rgba(148, 163, 214, 0.1)",
                    ticksuffix: "%",
                  },
                  xaxis: {
                    gridcolor: "rgba(148, 163, 214, 0.06)",
                    title: { text: "Timestamp", font: { size: 11, color: "#6C7A9C" } },
                  },
                  shapes: [
                    {
                      type: "line",
                      xref: "paper",
                      x0: 0,
                      x1: 1,
                      y0: settings.aiThresholdPercent,
                      y1: settings.aiThresholdPercent,
                      line: { color: "#FF3CAC", width: 1.5, dash: "dot" },
                    },
                  ],
                  margin: { t: 18, r: 16, b: 44, l: 44 },
                }}
              />
            </div>
          </div>

          {/* Suspicious Frame Gallery + Selected Frame-Level Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-[#F5F7FF]">
                  Suspicious Frame Gallery
                </h3>
                <span className="text-xs text-[#6C7A9C]">
                  Select a frame to inspect heatmap
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                {result.frameAnalyses.map((frame, idx) => {
                  const isSelected = idx === selectedFrameIdx;
                  const accent =
                    frame.status === "Suspicious"
                      ? "text-[#FF4B6E]"
                      : frame.status === "Borderline"
                        ? "text-[#FFB020]"
                        : "text-[#00E676]";

                  return (
                    <button
                      key={frame.frameIndex}
                      type="button"
                      onClick={() => jumpToFrame(idx)}
                      className={`group rounded-xl overflow-hidden text-left border transition-all cursor-pointer bg-[#080B16]/80 ${
                        isSelected
                          ? "border-[#00E5FF] shadow-[0_0_16px_rgba(0,229,255,0.28)]"
                          : "border-[#94A3D6]/14 hover:border-[#00E5FF]/45"
                      }`}
                    >
                      <div className="aspect-video bg-[#060913] overflow-hidden">
                        {frame.thumbnailDataUrl ? (
                          <img
                            src={frame.thumbnailDataUrl}
                            alt={`Frame ${idx + 1} at ${formatDuration(frame.timestampSec)}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[#6C7A9C]">
                            #{idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                          <span className="text-[#A6B2D1]">
                            {formatDuration(frame.timestampSec)}
                          </span>
                          <span className={`font-semibold ${accent}`}>{frame.aiProbability}%</span>
                        </div>
                        <div className="text-[11px] text-[#6C7A9C] truncate mt-0.5">
                          {frame.status}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {result.artifacts.length > 0 && (
                <div className="pt-4 border-t border-[#94A3D6]/12">
                  <h4 className="text-xs font-semibold text-[#A6B2D1] mb-2.5">
                    Temporal Forensic Findings
                  </h4>
                  <div className="space-y-2">
                    {result.artifacts.map((art, idx) => (
                      <div key={idx} className="text-xs text-[#A6B2D1]">
                        <span className="font-medium text-[#F5F7FF]">{art.category}:</span>{" "}
                        {art.observation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Frame-Level Heatmap Inspector */}
            <div className="glass-card p-6 lg:col-span-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F5F7FF]">
                    Frame-Level Heatmap Inspector
                  </h3>
                  {activeFrame && (
                    <p className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                      Frame #{activeFrame.frameIndex + 1} · Timestamp{" "}
                      {formatDuration(activeFrame.timestampSec)} · AI {activeFrame.aiProbability}%
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowBoxes((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#00E5FF] hover:underline cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showBoxes ? "Hide Boxes" : "Show Boxes"}</span>
                </button>
              </div>

              {activeFrame?.thumbnailDataUrl ? (
                <>
                  <HeatmapOverlay
                    imageSrc={activeFrame.thumbnailDataUrl}
                    regions={activeFrame.heatmapRegions}
                    opacity={settings.defaultHeatmapOpacity}
                    palette={settings.heatmapPalette}
                    showBoxes={showBoxes}
                    alt={`Heatmap for video frame ${activeFrame.frameIndex + 1}`}
                  />
                  <p className="text-xs text-[#A6B2D1] leading-relaxed">
                    <span className="font-semibold text-[#F5F7FF]">Frame Finding:</span>{" "}
                    {activeFrame.note}
                  </p>
                </>
              ) : (
                <div className="aspect-[16/10] rounded-xl bg-[#060913] border border-[#94A3D6]/12 flex items-center justify-center text-xs text-[#6C7A9C]">
                  Select a frame from the gallery to view its heatmap.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
