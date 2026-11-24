import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AudioLines,
  Download,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ScanSearch,
  Sparkles,
  Upload,
} from "lucide-react";
import type {
  AppSettings,
  AudioAnalysisResult,
  DetectionRecord,
} from "../types/forensics";
import { createSampleAudioFile, decodeAudioPeaks } from "../utils/mediaTools";
import { downloadForensicReport } from "../utils/reportExport";
import { formatBytes, formatDuration } from "../utils/storage";
import PlotlyChart from "./PlotlyChart";
import { CircularGauge, VerdictBadge } from "./VisualWidgets";

interface AudioDetectionViewProps {
  settings: AppSettings;
  onRecordCreated: (record: DetectionRecord) => void;
}

export default function AudioDetectionView({
  settings,
  onRecordCreated,
}: AudioDetectionViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [durationSec, setDurationSec] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);
  const [lastRecord, setLastRecord] = useState<DetectionRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const handleFileSelected = useCallback(async (selected: File) => {
    if (!selected.type.startsWith("audio/") && selected.type !== "video/webm") {
      setError("Please select a valid audio file (WAV, MP3, OGG, M4A, WEBM).");
      return;
    }
    setError(null);
    setResult(null);
    setLastRecord(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setFile(selected);

    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selected);
    });

    try {
      const decoded = await decodeAudioPeaks(selected, 150);
      setPeaks(decoded.peaks);
      setDurationSec(decoded.durationSec);
      setSampleRate(decoded.sampleRate);
    } catch {
      // Fallback bars if browser cannot WebAudio-decode exotic codec
      setPeaks(Array.from({ length: 100 }, (_, i) => 0.25 + 0.45 * Math.abs(Math.sin(i * 0.28))));
      setDurationSec(0);
      setSampleRate(0);
    }
  }, []);

  const handleLoadSampleAudio = () => {
    const sample = createSampleAudioFile();
    handleFileSelected(sample);
  };

  // Draw interactive waveform with suspicious segment highlighting and playhead
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 960;
    const height = 180;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const effectiveDuration = durationSec || result?.durationSec || 1;

    // Highlight suspicious & borderline audio segments directly behind the waveform
    if (result?.segments) {
      result.segments.forEach((seg) => {
        if (seg.status === "Natural") return;
        const x1 = (seg.startSec / effectiveDuration) * width;
        const x2 = (seg.endSec / effectiveDuration) * width;
        ctx.fillStyle =
          seg.status === "Suspicious"
            ? "rgba(255, 75, 110, 0.22)"
            : "rgba(255, 176, 32, 0.16)";
        ctx.fillRect(x1, 0, Math.max(4, x2 - x1), height);

        ctx.fillStyle = seg.status === "Suspicious" ? "#FF4B6E" : "#FFB020";
        ctx.fillRect(x1, 0, Math.max(4, x2 - x1), 3);
      });
    }

    // Center hairline
    ctx.strokeStyle = "rgba(148, 163, 214, 0.16)";
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const barGap = width / peaks.length;
    const barWidth = Math.max(2, barGap * 0.66);
    const playProgress = effectiveDuration > 0 ? currentTime / effectiveDuration : 0;

    peaks.forEach((amp, idx) => {
      const x = idx * barGap;
      const barTime = (idx / peaks.length) * effectiveDuration;
      const barH = Math.max(6, amp * (height - 28));
      const y = (height - barH) / 2;

      let color = "#38BDF8";
      const seg = result?.segments.find((s) => barTime >= s.startSec && barTime <= s.endSec);
      if (seg?.status === "Suspicious") {
        color = "#FF4B6E";
      } else if (seg?.status === "Borderline") {
        color = "#FFB020";
      } else if (idx / peaks.length <= playProgress) {
        color = "#00E5FF";
      } else {
        color = "rgba(139, 92, 246, 0.65)";
      }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, 3);
      ctx.fill();
    });

    // Playhead cursor
    const headX = Math.max(0, Math.min(width, playProgress * width));
    ctx.strokeStyle = "#F5F7FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX, 0);
    ctx.lineTo(headX, height);
    ctx.stroke();
  }, [peaks, currentTime, durationSec, result]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(durationSec || audio.duration || 0, sec));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const total = durationSec || audioRef.current?.duration || 0;
    if (total > 0) seekTo(ratio * total);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    const startTime = performance.now();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("durationSec", String(durationSec || audioRef.current?.duration || 6));
      formData.append("threshold", String(settings.aiThresholdPercent));

      const response = await fetch("/api/analyze/audio", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Audio forensic analysis failed.");
      }

      const analysis = payload as AudioAnalysisResult;
      const elapsed = Math.round(performance.now() - startTime);
      setResult(analysis);

      const record: DetectionRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        modality: "audio",
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
      setError(err instanceof Error ? err.message : "Failed to analyze audio.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
            Audio Deepfake Detection
          </h1>
          <p className="mt-1 text-sm text-[#A6B2D1]">
            Detect neural voice cloning, vocoder harmonics, and synthetic audio splices across timeline segments.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLoadSampleAudio}
          className="neon-button-secondary text-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>Generate Test Audio (.wav)</span>
        </button>
      </div>

      {/* Upload + Interactive Waveform Panel */}
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
            className="upload-zone p-8 text-center flex flex-col items-center justify-center min-h-[195px]"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) handleFileSelected(picked);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/16 border border-[#8B5CF6]/40 flex items-center justify-center text-[#A78BFA] mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[#F5F7FF]">
              Drag and drop audio here, or browse files
            </p>
            <p className="mt-1 text-xs text-[#6C7A9C]">
              Supports WAV, MP3, OGG, M4A, WEBM · Up to 25 MB
            </p>
          </div>

          {file && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/14">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F5F7FF] truncate">{file.name}</p>
                <p className="text-xs text-[#6C7A9C] font-mono tabular-nums">
                  {formatBytes(file.size)}
                  {durationSec > 0 ? ` · ${formatDuration(durationSec)}` : ""}
                  {sampleRate > 0 ? ` · ${(sampleRate / 1000).toFixed(1)} kHz` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="neon-button shrink-0"
              >
                <ScanSearch className="w-4 h-4" />
                <span>{isAnalyzing ? "Scanning..." : "Analyze Audio"}</span>
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

        {/* Audio Waveform & Playback Studio */}
        <div className="analysis-panel lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-[#F5F7FF]">
                Audio Waveform & Suspicious Segment Map
              </h2>
              <p className="text-xs text-[#6C7A9C]">
                Click anywhere on the waveform to scrub playback · Red bands mark suspicious intervals
              </p>
            </div>
            {audioUrl && (
              <span className="font-mono text-xs tabular-nums text-[#00E5FF]">
                {formatDuration(currentTime)} / {formatDuration(durationSec)}
              </span>
            )}
          </div>

          {!audioUrl ? (
            <div className="h-[220px] rounded-xl bg-[#060913] border border-[#94A3D6]/12 flex flex-col items-center justify-center text-center p-6">
              <AudioLines className="w-8 h-8 text-[#6C7A9C] mb-3" />
              <p className="text-sm text-[#A6B2D1]">No audio loaded</p>
              <p className="mt-1 text-xs text-[#6C7A9C] max-w-sm">
                Upload a voice recording or generate the test audio file to visualize its real amplitude waveform.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) setDurationSec(d);
                }}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="heatmap-container relative p-3">
                <canvas
                  ref={waveformCanvasRef}
                  onClick={handleWaveformClick}
                  className="w-full h-[180px] cursor-pointer block"
                />
                {isAnalyzing && (
                  <>
                    <div className="scan-beam-trail" />
                    <div className="scan-beam" />
                  </>
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime - 5)}
                    className="p-2 rounded-lg bg-[#080B16]/80 border border-[#94A3D6]/16 text-[#A6B2D1] hover:text-[#F5F7FF] hover:border-[#00E5FF]/40 cursor-pointer"
                    aria-label="Rewind 5 seconds"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="neon-button py-2 px-4"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? "Pause" : "Play Audio"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(currentTime + 5)}
                    className="p-2 rounded-lg bg-[#080B16]/80 border border-[#94A3D6]/16 text-[#A6B2D1] hover:text-[#F5F7FF] hover:border-[#00E5FF]/40 cursor-pointer"
                    aria-label="Forward 5 seconds"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {[0.75, 1, 1.25].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (audioRef.current) audioRef.current.playbackRate = rate;
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono cursor-pointer transition-colors ${
                        playbackRate === rate
                          ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40"
                          : "bg-[#080B16]/70 text-[#A6B2D1] border border-white/10 hover:text-[#F5F7FF]"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-5 flex flex-col justify-between">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-5">
                Voice Authenticity Gauges
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
                  <div className="text-[#6C7A9C]">Prosody Naturalness</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#00E5FF]">
                    {result.signals.prosodyNaturalness}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Spectral Continuity</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#A78BFA]">
                    {result.signals.spectralContinuity}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Breathing Cadence</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#00E676]">
                    {result.signals.breathingPatterns}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B16]/70 border border-[#94A3D6]/12">
                  <div className="text-[#6C7A9C]">Noise Floor Match</div>
                  <div className="mt-1 font-mono text-base font-semibold text-[#F5F7FF]">
                    {result.signals.noiseFloorConsistency}%
                  </div>
                </div>
              </div>
            </div>

            {/* Plotly Segment Timeline */}
            <div className="glass-card p-6 lg:col-span-7">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F5F7FF]">
                    Segment Analysis Timeline
                  </h3>
                  <p className="text-xs text-[#6C7A9C]">
                    Click any bar to jump audio playback directly to that time window
                  </p>
                </div>
              </div>
              <PlotlyChart
                height={275}
                onPointClick={(pointIdx) => {
                  const seg = result.segments[pointIdx];
                  if (seg) {
                    seekTo(seg.startSec);
                    if (audioRef.current && audioRef.current.paused) {
                      audioRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }
                }}
                data={[
                  {
                    type: "bar",
                    x: result.segments.map(
                      (s) => `${formatDuration(s.startSec)}–${formatDuration(s.endSec)}`
                    ),
                    y: result.segments.map((s) => s.aiProbability),
                    text: result.segments.map((s) => `${s.aiProbability}%`),
                    textposition: "outside",
                    textfont: { color: "#F5F7FF", family: "JetBrains Mono, monospace", size: 11 },
                    marker: {
                      color: result.segments.map((s) =>
                        s.status === "Suspicious"
                          ? "#FF4B6E"
                          : s.status === "Borderline"
                            ? "#FFB020"
                            : "#00E5FF"
                      ),
                    },
                    customdata: result.segments.map((s) => s.note),
                    hovertemplate:
                      "<b>%{x}</b><br>AI Probability: %{y}%<br>%{customdata}<extra></extra>",
                  },
                ]}
                layout={{
                  yaxis: {
                    range: [0, 112],
                    gridcolor: "rgba(148, 163, 214, 0.1)",
                    ticksuffix: "%",
                    title: { text: "AI Probability", font: { size: 11, color: "#6C7A9C" } },
                  },
                  xaxis: {
                    tickfont: { size: 11, color: "#A6B2D1" },
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
                  margin: { t: 18, r: 16, b: 44, l: 48 },
                }}
              />
            </div>
          </div>

          {/* Segment Table + Acoustic Artifacts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="glass-card p-6 lg:col-span-7">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-4">
                Suspicious Segment Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#94A3D6]/12 text-[#6C7A9C]">
                      <th className="py-2.5 pr-3">Window</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">AI Prob.</th>
                      <th className="py-2.5 pl-3">Forensic Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#94A3D6]/10">
                    {result.segments.map((seg, idx) => (
                      <tr
                        key={idx}
                        onClick={() => seekTo(seg.startSec)}
                        className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                      >
                        <td className="py-3 pr-3 font-mono tabular-nums text-[#00E5FF] whitespace-nowrap">
                          {formatDuration(seg.startSec)} – {formatDuration(seg.endSec)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium">
                          <span
                            className={
                              seg.status === "Suspicious"
                                ? "text-[#FF4B6E]"
                                : seg.status === "Borderline"
                                  ? "text-[#FFB020]"
                                  : "text-[#00E676]"
                            }
                          >
                            {seg.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#F5F7FF]">
                          {seg.aiProbability}%
                        </td>
                        <td className="py-3 pl-3 text-[#A6B2D1]">{seg.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card p-6 lg:col-span-5">
              <h3 className="font-display text-base font-semibold text-[#F5F7FF] mb-4">
                Acoustic Biomarker Findings
              </h3>
              <div className="divide-y divide-[#94A3D6]/12">
                {result.artifacts.map((art, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[#F5F7FF]">{art.category}</span>
                      <span
                        className={`text-xs font-mono ${
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
                    <p className="mt-1 text-xs text-[#A6B2D1] leading-relaxed">
                      {art.observation}
                    </p>
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
