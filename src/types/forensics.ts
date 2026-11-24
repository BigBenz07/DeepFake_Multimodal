export type MediaModality = "image" | "audio" | "video";

export type VerdictType = "AI-Generated" | "Authentic" | "Inconclusive";

export type NavSection =
  | "dashboard"
  | "image"
  | "audio"
  | "video"
  | "history"
  | "about"
  | "settings";

export interface ForensicArtifact {
  category: string;
  severity: "High" | "Medium" | "Low";
  observation: string;
}

export interface HeatmapRegion {
  label: string;
  x: number; // 0-100 percentage from left
  y: number; // 0-100 percentage from top
  width: number; // 0-100 percentage
  height: number; // 0-100 percentage
  intensity: number; // 0-100 suspicion intensity
  reason: string;
}

export interface ImageAnalysisResult {
  aiGeneratedPercent: number;
  authenticPercent: number;
  confidenceScore: number;
  verdict: VerdictType;
  summary: string;
  artifacts: ForensicArtifact[];
  suspiciousRegions: HeatmapRegion[];
  signals: {
    lightingConsistency: number;
    textureNaturalness: number;
    edgeCoherence: number;
    compressionIntegrity: number;
  };
}

export interface AudioSegmentAnalysis {
  startSec: number;
  endSec: number;
  label: string;
  aiProbability: number;
  status: "Suspicious" | "Natural" | "Borderline";
  note: string;
}

export interface AudioAnalysisResult {
  aiGeneratedPercent: number;
  authenticPercent: number;
  confidenceScore: number;
  verdict: VerdictType;
  summary: string;
  durationSec: number;
  segments: AudioSegmentAnalysis[];
  artifacts: ForensicArtifact[];
  signals: {
    prosodyNaturalness: number;
    spectralContinuity: number;
    breathingPatterns: number;
    noiseFloorConsistency: number;
  };
}

export interface VideoFrameAnalysis {
  frameIndex: number;
  timestampSec: number;
  aiProbability: number;
  status: "Suspicious" | "Natural" | "Borderline";
  note: string;
  heatmapRegions: HeatmapRegion[];
  thumbnailDataUrl?: string;
}

export interface VideoAnalysisResult {
  aiGeneratedPercent: number;
  authenticPercent: number;
  confidenceScore: number;
  verdict: VerdictType;
  summary: string;
  durationSec: number;
  framesAnalyzed: number;
  frameAnalyses: VideoFrameAnalysis[];
  artifacts: ForensicArtifact[];
  signals: {
    lipSyncCoherence: number;
    blinkNaturalness: number;
    temporalStability: number;
    lightingContinuity: number;
  };
}

export interface DetectionRecord {
  id: string;
  timestamp: string; // ISO string
  modality: MediaModality;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  aiGeneratedPercent: number;
  authenticPercent: number;
  confidenceScore: number;
  verdict: VerdictType;
  summary: string;
  processingTimeMs: number;
  details: ImageAnalysisResult | AudioAnalysisResult | VideoAnalysisResult;
}

export type HeatmapPalette = "cyber" | "thermal" | "inferno";

export interface AppSettings {
  aiThresholdPercent: number;
  heatmapPalette: HeatmapPalette;
  defaultHeatmapOpacity: number;
  reportFormat: "html" | "json";
  ambientGridEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  aiThresholdPercent: 50,
  heatmapPalette: "cyber",
  defaultHeatmapOpacity: 0.65,
  reportFormat: "html",
  ambientGridEnabled: true,
};
