import "dotenv/config";
import express, { type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, type GenerateContentResponse } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = "gemini-4-hydrogen";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 35 * 1024 * 1024, // 35 MB max per file
    files: 12,
  },
});

function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes("503") ||
        msg.includes("500") ||
        msg.includes("429") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("RESOURCE_EXHAUSTED");
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 900 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function clamp(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}

function deriveVerdict(
  aiPct: number,
  threshold = 50
): "AI-Generated" | "Authentic" | "Inconclusive" {
  if (Math.abs(aiPct - threshold) <= 6) return "Inconclusive";
  return aiPct >= threshold ? "AI-Generated" : "Authentic";
}

function parseApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("GEMINI_API_KEY")) {
    return { status: 503, message: raw };
  }
  if (raw.includes("API_KEY_INVALID") || raw.includes("PERMISSION_DENIED") || raw.includes("403")) {
    return {
      status: 403,
      message:
        "Gemini API authentication failed. Please verify your API key in Settings > Secrets.",
    };
  }
  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("429")) {
    return {
      status: 429,
      message:
        "Rate limit reached on the Gemini API. Please wait a moment and try again, or check your quota in Settings > Secrets.",
    };
  }
  return {
    status: 500,
    message: `Forensic analysis failed: ${raw}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "35mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      model: MODEL_NAME,
      configured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
      ),
    });
  });

  // =========================================================
  // 1. IMAGE FORENSIC ANALYSIS
  // =========================================================
  app.post(
    "/api/analyze/image",
    upload.single("file"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No image file uploaded." });
          return;
        }
        if (!file.mimetype.startsWith("image/")) {
          res.status(400).json({ error: "Uploaded file must be a valid image (PNG, JPG, WEBP)." });
          return;
        }

        const threshold = clamp(Number(req.body?.threshold ?? 50), 10, 90);
        const ai = createGeminiClient();
        const base64Data = file.buffer.toString("base64");

        const response: GenerateContentResponse = await callWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: file.mimetype,
                    data: base64Data,
                  },
                },
                {
                  text: `Perform a thorough deepfake and AI-generation forensic inspection of this image.
Evaluate visual cues including: skin pore texture vs over-smoothed diffusion sheen, iris/pupil reflections, ear/hairline/finger anatomy, lighting and shadow geometry, background warping, text distortion, and compression/noise consistency.
Provide realistic calibrated probabilities (aiGeneratedPercent from 0 to 100), confidenceScore (0 to 100), specific forensic artifacts, 4 signal scores (0-100 where higher = more authentic/natural), and 2 to 5 spatial suspiciousRegions with normalized 0-100 coordinates (x, y, width, height) highlighting the exact regions inspected or flagged for heatmap rendering.`,
                },
              ],
            },
            config: {
              systemInstruction:
                "You are an expert digital media forensics neural analyzer specializing in deepfake, GAN, and diffusion-model image detection. Return strictly calibrated, objective JSON forensic data without disclaimers.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  aiGeneratedPercent: {
                    type: Type.NUMBER,
                    description: "Estimated probability (0-100) that the image is AI-generated or deepfake manipulated.",
                  },
                  confidenceScore: {
                    type: Type.NUMBER,
                    description: "Forensic confidence (0-100) in the determination.",
                  },
                  summary: {
                    type: Type.STRING,
                    description: "Concise 2-3 sentence technical forensic conclusion.",
                  },
                  artifacts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        severity: { type: Type.STRING, description: "High, Medium, or Low" },
                        observation: { type: Type.STRING },
                      },
                      required: ["category", "severity", "observation"],
                    },
                  },
                  suspiciousRegions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        x: { type: Type.NUMBER, description: "Left coordinate 0-90 percent" },
                        y: { type: Type.NUMBER, description: "Top coordinate 0-90 percent" },
                        width: { type: Type.NUMBER, description: "Box width 8-60 percent" },
                        height: { type: Type.NUMBER, description: "Box height 8-60 percent" },
                        intensity: { type: Type.NUMBER, description: "Suspicion score 0-100" },
                        reason: { type: Type.STRING },
                      },
                      required: ["label", "x", "y", "width", "height", "intensity", "reason"],
                    },
                  },
                  signals: {
                    type: Type.OBJECT,
                    properties: {
                      lightingConsistency: { type: Type.NUMBER },
                      textureNaturalness: { type: Type.NUMBER },
                      edgeCoherence: { type: Type.NUMBER },
                      compressionIntegrity: { type: Type.NUMBER },
                    },
                    required: [
                      "lightingConsistency",
                      "textureNaturalness",
                      "edgeCoherence",
                      "compressionIntegrity",
                    ],
                  },
                },
                required: [
                  "aiGeneratedPercent",
                  "confidenceScore",
                  "summary",
                  "artifacts",
                  "suspiciousRegions",
                  "signals",
                ],
              },
            },
          })
        );

        const rawText = (response.text ?? "").trim();
        const parsed = JSON.parse(rawText);

        const aiGeneratedPercent = clamp(Number(parsed.aiGeneratedPercent), 0, 100);
        const authenticPercent = 100 - aiGeneratedPercent;
        const confidenceScore = clamp(Number(parsed.confidenceScore), 40, 99);

        const result = {
          aiGeneratedPercent,
          authenticPercent,
          confidenceScore,
          verdict: deriveVerdict(aiGeneratedPercent, threshold),
          summary: String(parsed.summary || "Forensic image evaluation complete."),
          artifacts: Array.isArray(parsed.artifacts)
            ? parsed.artifacts.slice(0, 6).map((a: Record<string, unknown>) => ({
                category: String(a.category || "Visual Cue"),
                severity:
                  a.severity === "High" || a.severity === "Medium" || a.severity === "Low"
                    ? a.severity
                    : "Medium",
                observation: String(a.observation || ""),
              }))
            : [],
          suspiciousRegions: Array.isArray(parsed.suspiciousRegions)
            ? parsed.suspiciousRegions.slice(0, 6).map((r: Record<string, unknown>) => ({
                label: String(r.label || "Region"),
                x: clamp(Number(r.x), 2, 85),
                y: clamp(Number(r.y), 2, 85),
                width: clamp(Number(r.width), 10, 55),
                height: clamp(Number(r.height), 10, 55),
                intensity: clamp(Number(r.intensity), 5, 100),
                reason: String(r.reason || "Inspected spatial anomaly"),
              }))
            : [],
          signals: {
            lightingConsistency: clamp(Number(parsed.signals?.lightingConsistency ?? 50), 0, 100),
            textureNaturalness: clamp(Number(parsed.signals?.textureNaturalness ?? 50), 0, 100),
            edgeCoherence: clamp(Number(parsed.signals?.edgeCoherence ?? 50), 0, 100),
            compressionIntegrity: clamp(Number(parsed.signals?.compressionIntegrity ?? 50), 0, 100),
          },
        };

        res.json(result);
      } catch (err) {
        const { status, message } = parseApiError(err);
        res.status(status).json({ error: message });
      }
    }
  );

  // =========================================================
  // 2. AUDIO FORENSIC ANALYSIS
  // =========================================================
  app.post(
    "/api/analyze/audio",
    upload.single("file"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: "No audio file uploaded." });
          return;
        }
        if (!file.mimetype.startsWith("audio/") && file.mimetype !== "video/webm") {
          res.status(400).json({ error: "Uploaded file must be a valid audio file (WAV, MP3, OGG, M4A, WEBM)." });
          return;
        }

        const durationSec = Math.max(1, Number(req.body?.durationSec) || 10);
        const threshold = clamp(Number(req.body?.threshold ?? 50), 10, 90);
        const ai = createGeminiClient();
        const base64Data = file.buffer.toString("base64");
        const normalizedMime = file.mimetype === "video/webm" ? "audio/webm" : file.mimetype;

        const response: GenerateContentResponse = await callWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMime,
                    data: base64Data,
                  },
                },
                {
                  text: `Perform an audio deepfake, neural voice-cloning, and synthetic speech forensic analysis on this audio recording (total duration: ${durationSec.toFixed(1)} seconds).
Inspect acoustic biomarkers including: pitch/prosody naturalness, vocoder metallic buzzing or phase artifacts, breathing and micro-pause cadence, harmonic overtone continuity, splicing boundaries, and background noise floor consistency.
Divide the ${durationSec.toFixed(1)}s timeline into 5 to 8 consecutive non-overlapping segments covering 0 to ${durationSec.toFixed(1)} seconds, each with startSec, endSec, label, aiProbability (0-100), status ("Suspicious", "Borderline", or "Natural"), and forensic note.`,
                },
              ],
            },
            config: {
              systemInstruction:
                "You are an expert acoustic forensics analyzer specializing in synthetic speech, TTS vocoder artifacts, and voice-cloning deepfake detection. Return calibrated, objective structured JSON.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  aiGeneratedPercent: { type: Type.NUMBER },
                  confidenceScore: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                  segments: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        startSec: { type: Type.NUMBER },
                        endSec: { type: Type.NUMBER },
                        label: { type: Type.STRING },
                        aiProbability: { type: Type.NUMBER },
                        status: { type: Type.STRING, description: "Suspicious, Borderline, or Natural" },
                        note: { type: Type.STRING },
                      },
                      required: ["startSec", "endSec", "label", "aiProbability", "status", "note"],
                    },
                  },
                  artifacts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        severity: { type: Type.STRING },
                        observation: { type: Type.STRING },
                      },
                      required: ["category", "severity", "observation"],
                    },
                  },
                  signals: {
                    type: Type.OBJECT,
                    properties: {
                      prosodyNaturalness: { type: Type.NUMBER },
                      spectralContinuity: { type: Type.NUMBER },
                      breathingPatterns: { type: Type.NUMBER },
                      noiseFloorConsistency: { type: Type.NUMBER },
                    },
                    required: [
                      "prosodyNaturalness",
                      "spectralContinuity",
                      "breathingPatterns",
                      "noiseFloorConsistency",
                    ],
                  },
                },
                required: [
                  "aiGeneratedPercent",
                  "confidenceScore",
                  "summary",
                  "segments",
                  "artifacts",
                  "signals",
                ],
              },
            },
          })
        );

        const parsed = JSON.parse((response.text ?? "").trim());
        const aiGeneratedPercent = clamp(Number(parsed.aiGeneratedPercent), 0, 100);
        const authenticPercent = 100 - aiGeneratedPercent;
        const confidenceScore = clamp(Number(parsed.confidenceScore), 40, 99);

        const rawSegments = Array.isArray(parsed.segments) ? parsed.segments : [];
        const segments = rawSegments.slice(0, 10).map((s: Record<string, unknown>, idx: number) => {
          const prob = clamp(Number(s.aiProbability), 0, 100);
          const start = Math.max(0, Math.min(durationSec, Number(s.startSec) || (idx * durationSec) / Math.max(1, rawSegments.length)));
          const end = Math.max(start + 0.1, Math.min(durationSec, Number(s.endSec) || ((idx + 1) * durationSec) / Math.max(1, rawSegments.length)));
          const status =
            prob >= threshold
              ? "Suspicious"
              : prob >= Math.max(25, threshold - 15)
                ? "Borderline"
                : "Natural";
          return {
            startSec: Number(start.toFixed(2)),
            endSec: Number(end.toFixed(2)),
            label: String(s.label || `Segment ${idx + 1}`),
            aiProbability: prob,
            status,
            note: String(s.note || "Acoustic spectral inspection."),
          };
        });

        res.json({
          aiGeneratedPercent,
          authenticPercent,
          confidenceScore,
          verdict: deriveVerdict(aiGeneratedPercent, threshold),
          summary: String(parsed.summary || "Acoustic forensic evaluation complete."),
          durationSec,
          segments,
          artifacts: Array.isArray(parsed.artifacts)
            ? parsed.artifacts.slice(0, 6).map((a: Record<string, unknown>) => ({
                category: String(a.category || "Acoustic Signal"),
                severity:
                  a.severity === "High" || a.severity === "Medium" || a.severity === "Low"
                    ? a.severity
                    : "Medium",
                observation: String(a.observation || ""),
              }))
            : [],
          signals: {
            prosodyNaturalness: clamp(Number(parsed.signals?.prosodyNaturalness ?? 50), 0, 100),
            spectralContinuity: clamp(Number(parsed.signals?.spectralContinuity ?? 50), 0, 100),
            breathingPatterns: clamp(Number(parsed.signals?.breathingPatterns ?? 50), 0, 100),
            noiseFloorConsistency: clamp(Number(parsed.signals?.noiseFloorConsistency ?? 50), 0, 100),
          },
        });
      } catch (err) {
        const { status, message } = parseApiError(err);
        res.status(status).json({ error: message });
      }
    }
  );

  // =========================================================
  // 3. VIDEO FORENSIC ANALYSIS (Frame-Sequence Spatio-Temporal)
  // =========================================================
  app.post(
    "/api/analyze/video",
    upload.array("frames", 10),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const files = (req.files as Express.Multer.File[]) || [];
        if (files.length === 0) {
          res.status(400).json({ error: "No extracted video frames provided for analysis." });
          return;
        }

        const durationSec = Math.max(1, Number(req.body?.durationSec) || files.length);
        const threshold = clamp(Number(req.body?.threshold ?? 50), 10, 90);
        let timestamps: number[] = [];
        try {
          timestamps = JSON.parse(String(req.body?.timestamps || "[]"));
        } catch {
          timestamps = [];
        }

        const ai = createGeminiClient();
        const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

        files.forEach((frame, idx) => {
          const ts = Number.isFinite(timestamps[idx])
            ? Number(timestamps[idx]).toFixed(2)
            : ((idx * durationSec) / Math.max(1, files.length)).toFixed(2);
          parts.push({ text: `Frame ${idx} (Timestamp ${ts}s):` });
          parts.push({
            inlineData: {
              mimeType: frame.mimetype || "image/jpeg",
              data: frame.buffer.toString("base64"),
            },
          });
        });

        parts.push({
          text: `Perform a spatio-temporal video deepfake forensic analysis across these ${files.length} sequential frames extracted from a ${durationSec.toFixed(1)}s video.
Inspect face-swap boundary blending, jawline flickering, unnatural eye-blinking or gaze stability, lip/mouth articulation coherence, skin texture temporal drift, lighting/shadow consistency across frames, and generative video morphing artifacts.
Return an entry in frameAnalyses for EVERY frame index from 0 to ${files.length - 1}, including its aiProbability (0-100), status ("Suspicious", "Borderline", or "Natural"), forensic note, and 1 to 3 spatial heatmapRegions (normalized 0-100 coordinates x, y, width, height, intensity, label, reason) marking the inspected areas on that frame.`,
        });

        const response: GenerateContentResponse = await callWithRetry(() =>
          ai.models.generateContent({
            model: MODEL_NAME,
            contents: { parts },
            config: {
              systemInstruction:
                "You are an expert spatio-temporal video deepfake forensics engine. Analyze every frame carefully for temporal inconsistencies and generative synthesis artifacts. Return strictly valid JSON.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  aiGeneratedPercent: { type: Type.NUMBER },
                  confidenceScore: { type: Type.NUMBER },
                  summary: { type: Type.STRING },
                  frameAnalyses: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        frameIndex: { type: Type.INTEGER },
                        aiProbability: { type: Type.NUMBER },
                        status: { type: Type.STRING },
                        note: { type: Type.STRING },
                        heatmapRegions: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: { type: Type.STRING },
                              x: { type: Type.NUMBER },
                              y: { type: Type.NUMBER },
                              width: { type: Type.NUMBER },
                              height: { type: Type.NUMBER },
                              intensity: { type: Type.NUMBER },
                              reason: { type: Type.STRING },
                            },
                            required: ["label", "x", "y", "width", "height", "intensity", "reason"],
                          },
                        },
                      },
                      required: ["frameIndex", "aiProbability", "status", "note", "heatmapRegions"],
                    },
                  },
                  artifacts: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        severity: { type: Type.STRING },
                        observation: { type: Type.STRING },
                      },
                      required: ["category", "severity", "observation"],
                    },
                  },
                  signals: {
                    type: Type.OBJECT,
                    properties: {
                      lipSyncCoherence: { type: Type.NUMBER },
                      blinkNaturalness: { type: Type.NUMBER },
                      temporalStability: { type: Type.NUMBER },
                      lightingContinuity: { type: Type.NUMBER },
                    },
                    required: [
                      "lipSyncCoherence",
                      "blinkNaturalness",
                      "temporalStability",
                      "lightingContinuity",
                    ],
                  },
                },
                required: [
                  "aiGeneratedPercent",
                  "confidenceScore",
                  "summary",
                  "frameAnalyses",
                  "artifacts",
                  "signals",
                ],
              },
            },
          })
        );

        const parsed = JSON.parse((response.text ?? "").trim());
        const aiGeneratedPercent = clamp(Number(parsed.aiGeneratedPercent), 0, 100);
        const authenticPercent = 100 - aiGeneratedPercent;
        const confidenceScore = clamp(Number(parsed.confidenceScore), 40, 99);

        const byIndex = new Map<number, Record<string, unknown>>();
        if (Array.isArray(parsed.frameAnalyses)) {
          for (const item of parsed.frameAnalyses) {
            const idx = Number(item.frameIndex);
            if (Number.isInteger(idx)) byIndex.set(idx, item);
          }
        }

        const frameAnalyses = files.map((_, idx) => {
          const item = byIndex.get(idx) || (Array.isArray(parsed.frameAnalyses) ? parsed.frameAnalyses[idx] : undefined) || {};
          const prob = clamp(Number((item as Record<string, unknown>).aiProbability ?? aiGeneratedPercent), 0, 100);
          const status =
            prob >= threshold
              ? "Suspicious"
              : prob >= Math.max(25, threshold - 15)
                ? "Borderline"
                : "Natural";
          const ts = Number.isFinite(timestamps[idx])
            ? Number(timestamps[idx])
            : Number(((idx * durationSec) / Math.max(1, files.length)).toFixed(2));
          const rawRegions = Array.isArray((item as Record<string, unknown>).heatmapRegions)
            ? ((item as Record<string, unknown>).heatmapRegions as Record<string, unknown>[])
            : [];

          return {
            frameIndex: idx,
            timestampSec: Number(ts.toFixed(2)),
            aiProbability: prob,
            status,
            note: String((item as Record<string, unknown>).note || "Frame-level spatio-temporal inspection."),
            heatmapRegions: rawRegions.slice(0, 4).map((r) => ({
              label: String(r.label || "Frame Region"),
              x: clamp(Number(r.x), 2, 85),
              y: clamp(Number(r.y), 2, 85),
              width: clamp(Number(r.width), 10, 55),
              height: clamp(Number(r.height), 10, 55),
              intensity: clamp(Number(r.intensity), 5, 100),
              reason: String(r.reason || "Temporal boundary check"),
            })),
          };
        });

        res.json({
          aiGeneratedPercent,
          authenticPercent,
          confidenceScore,
          verdict: deriveVerdict(aiGeneratedPercent, threshold),
          summary: String(parsed.summary || "Spatio-temporal video forensic analysis complete."),
          durationSec,
          framesAnalyzed: files.length,
          frameAnalyses,
          artifacts: Array.isArray(parsed.artifacts)
            ? parsed.artifacts.slice(0, 6).map((a: Record<string, unknown>) => ({
                category: String(a.category || "Temporal Cue"),
                severity:
                  a.severity === "High" || a.severity === "Medium" || a.severity === "Low"
                    ? a.severity
                    : "Medium",
                observation: String(a.observation || ""),
              }))
            : [],
          signals: {
            lipSyncCoherence: clamp(Number(parsed.signals?.lipSyncCoherence ?? 50), 0, 100),
            blinkNaturalness: clamp(Number(parsed.signals?.blinkNaturalness ?? 50), 0, 100),
            temporalStability: clamp(Number(parsed.signals?.temporalStability ?? 50), 0, 100),
            lightingContinuity: clamp(Number(parsed.signals?.lightingContinuity ?? 50), 0, 100),
          },
        });
      } catch (err) {
        const { status, message } = parseApiError(err);
        res.status(status).json({ error: message });
      }
    }
  );

  // =========================================================
  // VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
  // =========================================================
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeriSight AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
