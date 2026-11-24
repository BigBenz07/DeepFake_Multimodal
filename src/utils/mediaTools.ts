export interface ExtractedFrame {
  blob: Blob;
  dataUrl: string;
  timestampSec: number;
}

export interface VideoExtractionResult {
  frames: ExtractedFrame[];
  durationSec: number;
  width: number;
  height: number;
}

/**
 * Optimizes large images (> 900 KB or > 1600px) into a crisp high-quality JPEG
 * so uploads stay fast and never trigger reverse-proxy payload limits.
 */
export async function prepareImageForAnalysis(file: File): Promise<File> {
  const MAX_BYTES = 900 * 1024;
  const MAX_DIM = 1600;

  if (file.size <= MAX_BYTES && (file.type === "image/jpeg" || file.type === "image/webp")) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image."));
      el.src = objectUrl;
    });

    const needsResize = img.naturalWidth > MAX_DIM || img.naturalHeight > MAX_DIM;
    if (!needsResize && file.size <= MAX_BYTES) {
      return file;
    }

    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(64, Math.round(img.naturalWidth * scale));
    const h = Math.max(64, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Extracts evenly spaced JPEG keyframes from any HTML5-playable video file.
 */
export async function extractVideoFrames(
  file: File,
  targetCount = 8
): Promise<VideoExtractionResult> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error("Could not decode this video format in browser."));
      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });
    });

    const durationSec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 360;
    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const cw = Math.max(160, Math.round(vw * scale));
    const ch = Math.max(90, Math.round(vh * scale));

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable.");

    const count = Math.max(4, Math.min(targetCount, 8));
    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < count; i++) {
      const ratio = count === 1 ? 0.5 : (i + 0.5) / count;
      const targetTime = Math.min(Math.max(0.05, durationSec * ratio), Math.max(0.05, durationSec - 0.05));

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(resolve, 1600);
        const onSeeked = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = targetTime;
      });

      ctx.drawImage(video, 0, 0, cw, ch);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.84);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Frame encoding failed."))),
          "image/jpeg",
          0.84
        );
      });

      frames.push({
        blob,
        dataUrl,
        timestampSec: Number(targetTime.toFixed(2)),
      });
    }

    return { frames, durationSec, width: vw, height: vh };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Decodes real audio amplitude peaks using the Web Audio API for waveform visualization.
 */
export async function decodeAudioPeaks(
  file: File,
  barCount = 140
): Promise<{ peaks: number[]; durationSec: number; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.max(1, Math.floor(channelData.length / barCount));
    const peaks: number[] = [];

    for (let i = 0; i < barCount; i++) {
      const start = i * blockSize;
      const end = Math.min(channelData.length, start + blockSize);
      let maxAmp = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(channelData[j]);
        if (v > maxAmp) maxAmp = v;
      }
      peaks.push(Math.max(0.04, Math.min(1, maxAmp)));
    }

    return {
      peaks,
      durationSec: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
    };
  } finally {
    await ctx.close();
  }
}

/**
 * Synthesizes a procedural test PNG File specimen so evaluators can run live forensic tests without hunting for files.
 */
export async function createSampleImageFile(variant: "synthetic" | "natural"): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  if (variant === "synthetic") {
    // Stylized synthetic portrait geometry with unnatural iridescent symmetry & glossy sheen
    const bg = ctx.createLinearGradient(0, 0, 768, 512);
    bg.addColorStop(0, "#0b1026");
    bg.addColorStop(0.5, "#1d1248");
    bg.addColorStop(1, "#0d2b45");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 768, 512);

    // Neon rim halo
    const glow = ctx.createRadialGradient(384, 240, 20, 384, 240, 230);
    glow.addColorStop(0, "rgba(0, 229, 255, 0.35)");
    glow.addColorStop(0.55, "rgba(255, 60, 172, 0.22)");
    glow.addColorStop(1, "rgba(8, 11, 22, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 768, 512);

    // Stylized synthetic head silhouette with glossy skin gradients
    const faceGrad = ctx.createRadialGradient(365, 205, 18, 384, 235, 130);
    faceGrad.addColorStop(0, "#ffe4d6");
    faceGrad.addColorStop(0.65, "#d8a393");
    faceGrad.addColorStop(1, "#5c3b5e");
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(384, 235, 102, 132, 0, 0, Math.PI * 2);
    ctx.fill();

    // Over-symmetrical glowing irises (classic synthetic artifact)
    [342, 426].forEach((ex) => {
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.ellipse(ex, 215, 20, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00E5FF";
      ctx.beginPath();
      ctx.arc(ex, 215, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#080B16";
      ctx.beginPath();
      ctx.arc(ex, 215, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Subtle GAN checkerboard artifact pattern around cheek & jawline
    ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
    ctx.lineWidth = 1;
    for (let x = 280; x <= 488; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 120; y <= 360; y += 16) {
      ctx.beginPath();
      ctx.moveTo(280, y);
      ctx.lineTo(488, y);
      ctx.stroke();
    }

    // Shoulders
    ctx.fillStyle = "#121a36";
    ctx.beginPath();
    ctx.ellipse(384, 465, 190, 115, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    // Clean natural architectural daylight scene with organic film grain
    const sky = ctx.createLinearGradient(0, 0, 0, 340);
    sky.addColorStop(0, "#4a7ab5");
    sky.addColorStop(1, "#c7ddf2");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 768, 512);

    // Distant hills
    ctx.fillStyle = "#6c8299";
    ctx.beginPath();
    ctx.moveTo(0, 320);
    ctx.quadraticCurveTo(220, 240, 440, 305);
    ctx.quadraticCurveTo(610, 260, 768, 315);
    ctx.lineTo(768, 512);
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();

    // Concrete building with crisp perspective shadows
    ctx.fillStyle = "#d8d3ca";
    ctx.fillRect(140, 150, 230, 260);
    ctx.fillStyle = "#9c968d";
    ctx.fillRect(370, 150, 110, 260);

    // Windows
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillStyle = "#2d3c4d";
        ctx.fillRect(168 + col * 62, 178 + row * 52, 40, 30);
      }
    }

    // Ground plaza
    ctx.fillStyle = "#5c6066";
    ctx.fillRect(0, 405, 768, 107);

    // Realistic fine sensor noise
    const imgData = ctx.getImageData(0, 0, 768, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 14;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain));
    }
    ctx.putImageData(imgData, 0, 0);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/png");
  });

  const name =
    variant === "synthetic"
      ? "synthetic_portrait_specimen.png"
      : "architectural_daylight_specimen.png";
  return new File([blob], name, { type: "image/png" });
}

/**
 * Generates a real playable 6-second WAV audio clip with a synthetic vocoder-like splice segment
 * in the middle so users can test the Audio Detection pipeline end-to-end immediately.
 */
export function createSampleAudioFile(): File {
  const sampleRate = 16000;
  const durationSec = 6;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const isSyntheticZone = t >= 2.1 && t <= 4.2;
    let sample = 0;

    if (isSyntheticZone) {
      // Metallic robotic quantized vocoder buzz
      const carrier = Math.sin(2 * Math.PI * 195 * t) * 0.45;
      const metallic = Math.sin(2 * Math.PI * 1170 * t) * 0.25 * Math.sign(Math.sin(2 * Math.PI * 18 * t));
      const quant = Math.round((carrier + metallic) * 8) / 8;
      sample = quant;
    } else {
      // Smoother natural formant-modulated tone with gentle breathing envelope
      const env = 0.35 + 0.3 * Math.sin(2 * Math.PI * 1.4 * t);
      const f0 = 155 + 14 * Math.sin(2 * Math.PI * 2.1 * t);
      const harmonic =
        Math.sin(2 * Math.PI * f0 * t) * 0.55 +
        Math.sin(2 * Math.PI * f0 * 2 * t) * 0.22 +
        Math.sin(2 * Math.PI * f0 * 3 * t) * 0.1;
      const ambientNoise = (Math.random() - 0.5) * 0.03;
      sample = harmonic * env + ambientNoise;
    }

    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return new File([buffer], "voice_forensic_sample_6s.wav", { type: "audio/wav" });
}

/**
 * Records a crisp 3.5-second animated WebM test video in-browser via Canvas + MediaRecorder
 * so evaluators can test the Video Detection pipeline with real frame extraction immediately.
 */
export async function createSampleVideoFile(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(24);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
    ? "video/webm;codecs=vp8"
    : "video/webm";
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });

  recorder.start();
  const totalMs = 3400;
  const start = performance.now();

  await new Promise<void>((resolve) => {
    const drawFrame = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(1, elapsed / totalMs);
      const glitchWindow = p > 0.42 && p < 0.72;

      ctx.fillStyle = "#0a0f22";
      ctx.fillRect(0, 0, 480, 270);

      // Background broadcast studio lines
      ctx.strokeStyle = "rgba(0, 229, 255, 0.14)";
      for (let x = 0; x < 480; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 270);
        ctx.stroke();
      }

      // Animated face subject with synthetic jitter during mid-clip
      const cx = 240 + Math.sin(p * Math.PI * 2) * 18 + (glitchWindow ? (Math.random() - 0.5) * 8 : 0);
      const cy = 128;

      const grad = ctx.createRadialGradient(cx - 10, cy - 12, 8, cx, cy, 62);
      grad.addColorStop(0, "#f5d7c6");
      grad.addColorStop(1, "#9a6b5c");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 48, 60, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#080B16";
      ctx.beginPath();
      ctx.arc(cx - 16, cy - 10, 5, 0, Math.PI * 2);
      ctx.arc(cx + 16, cy - 10, 5, 0, Math.PI * 2);
      ctx.fill();

      // Animated mouth speaking
      const mouthOpen = 4 + Math.abs(Math.sin(p * 18)) * 9;
      ctx.fillStyle = "#4a2228";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, 14, mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();

      // Synthetic face-swap boundary artifact ring during glitchWindow
      if (glitchWindow) {
        ctx.strokeStyle = "rgba(255, 60, 172, 0.65)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx + 4, cy + 2, 51, 63, 0.08, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Timestamp overlay
      ctx.fillStyle = "rgba(245, 247, 255, 0.85)";
      ctx.font = "12px monospace";
      ctx.fillText(`REC 00:0${(elapsed / 1000).toFixed(1)}`, 16, 24);

      if (elapsed < totalMs) {
        requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
        resolve();
      }
    };
    requestAnimationFrame(drawFrame);
  });

  const blob = await done;
  return new File([blob], "spatiotemporal_clip_sample.webm", { type: "video/webm" });
}
