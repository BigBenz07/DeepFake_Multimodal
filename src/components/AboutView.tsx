import {
  AudioLines,
  Cpu,
  Download,
  FolderTree,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Video,
} from "lucide-react";

const STREAMLIT_CSS_KIT = `/* VeriSight AI — Futuristic Deepfake Detection CSS Design System
 * Drop into multimodal_deepfake_detection/assets/style.css for Streamlit st.markdown injection
 */
:root {
  --bg-canvas: #080B16;
  --bg-card: rgba(18, 25, 45, 0.75);
  --primary-neon: #00E5FF;
  --secondary-neon: #8B5CF6;
  --accent: #FF3CAC;
  --success: #00E676;
  --danger: #FF4B6E;
  --text: #F5F7FF;
}

.stApp {
  background-color: #080B16;
  color: #F5F7FF;
}

.glass-card {
  background: rgba(18, 25, 45, 0.75);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(148, 163, 214, 0.14);
  border-radius: 16px;
  padding: 1.5rem;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.glass-card:hover {
  border-color: rgba(0, 229, 255, 0.3);
  box-shadow: 0 12px 30px -12px rgba(0, 229, 255, 0.18);
}

.neon-button {
  background: linear-gradient(135deg, #00E5FF 0%, #38BDF8 55%, #8B5CF6 100%);
  color: #060913;
  font-weight: 600;
  border-radius: 10px;
  padding: 0.65rem 1.35rem;
  box-shadow: 0 0 22px rgba(0, 229, 255, 0.35);
}

.glow-border {
  border-radius: 18px;
  padding: 1px;
  background: linear-gradient(125deg, #00E5FF, #8B5CF6, #FF3CAC);
}

.gradient-text {
  background: linear-gradient(120deg, #F5F7FF 0%, #00E5FF 48%, #A78BFA 88%, #FF3CAC 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.upload-zone {
  border: 1.5px dashed rgba(0, 229, 255, 0.38);
  border-radius: 16px;
  background: rgba(13, 20, 38, 0.7);
}

.metric-card {
  background: rgba(18, 25, 45, 0.78);
  border: 1px solid rgba(148, 163, 214, 0.14);
  border-radius: 16px;
  padding: 1.25rem;
}

.analysis-panel {
  background: rgba(15, 22, 40, 0.82);
  border: 1px solid rgba(148, 163, 214, 0.15);
  border-radius: 16px;
  padding: 1.5rem;
}

.detection-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
}

.heatmap-container {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(0, 229, 255, 0.22);
}
`;

export default function AboutView() {
  const handleDownloadCssKit = () => {
    const blob = new Blob([STREAMLIT_CSS_KIT], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "style.css";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
            About Project
          </h1>
          <p className="mt-1 text-sm text-[#A6B2D1]">
            MSc IT Research Project — Multimodal Deepfake Detection Using Deep Learning for Images, Audio, and Videos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCssKit}
          className="neon-button-secondary text-xs"
        >
          <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
          <span>Download Reusable style.css</span>
        </button>
      </div>

      {/* Multimodal Pipeline Architecture */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-6 space-y-3">
          <ImageIcon className="w-6 h-6 text-[#00E5FF]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
            01. Spatial Visual Forensics
          </h2>
          <p className="text-sm text-[#A6B2D1] leading-relaxed">
            Evaluates pixel-level texture smoothness, iris specular symmetry, anatomical proportions, compression noise residuals, and generates localized suspicious region heatmaps.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <AudioLines className="w-6 h-6 text-[#8B5CF6]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
            02. Acoustic Spectral Pipeline
          </h2>
          <p className="text-sm text-[#A6B2D1] leading-relaxed">
            Decodes real audio waveforms via Web Audio API and audits vocoder harmonics, pitch prosody, breathing cadence, and splicing anomalies across time-indexed segments.
          </p>
        </div>

        <div className="glass-card p-6 space-y-3">
          <Video className="w-6 h-6 text-[#FF3CAC]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
            03. Spatio-Temporal Video Engine
          </h2>
          <p className="text-sm text-[#A6B2D1] leading-relaxed">
            Extracts sequential video keyframes with exact timestamps to identify face-swap blending boundaries, temporal lighting flicker, lip-sync drift, and frame-level heatmaps.
          </p>
        </div>
      </section>

      {/* Viva Architecture & Design System Reference */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="glass-card p-6 lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <FolderTree className="w-5 h-5 text-[#00E5FF]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
              Modular Project Architecture
            </h2>
          </div>
          <p className="text-xs text-[#A6B2D1]">
            Structured cleanly for academic demonstration and viva defense, separating presentation styles, reusable UI components, modality detection modules, and forensic report export.
          </p>
          <pre className="p-4 rounded-xl bg-[#060913] border border-[#94A3D6]/14 text-xs text-[#A6B2D1] overflow-x-auto leading-relaxed">
{`multimodal_deepfake_detection/
├── server.ts                    # Multimodal Forensic API Engine
├── src/
│   ├── index.css                # Reusable Cybersecurity Design System
│   ├── types/forensics.ts       # Typed Multimodal Prediction Schemas
│   ├── utils/
│   │   ├── mediaTools.ts        # Keyframe Extraction & Audio Peak Decoder
│   │   ├── reportExport.ts      # Forensic HTML, JSON & CSV Reports
│   │   └── storage.ts           # Persistent Detection History Store
│   └── components/
│       ├── Sidebar.tsx          # Responsive Cyber Navigation
│       ├── DashboardView.tsx    # KPI Overview & Plotly Analytics
│       ├── ImageDetectionView.tsx
│       ├── AudioDetectionView.tsx
│       ├── VideoDetectionView.tsx
│       ├── HistoryView.tsx
│       ├── PlotlyChart.tsx      # Interactive Plotly Visual Wrapper
│       └── VisualWidgets.tsx    # Circular Gauges & Heatmap Canvas`}
          </pre>
        </div>

        <div className="glass-card p-6 lg:col-span-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#8B5CF6]" aria-hidden="true" />
            <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
              Reusable CSS Class System
            </h2>
          </div>
          <p className="text-xs text-[#A6B2D1]">
            Consistent glassmorphism and neon visual tokens implemented across every module:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              [".glass-card", "Frosted navy surface with subtle hover luminance"],
              [".neon-button", "Cyan-to-violet primary action CTA with glow"],
              [".glow-border", "Animated multi-stop gradient frame"],
              [".gradient-text", "High-contrast hero typographic gradient"],
              [".upload-zone", "Dashed cyan drag-and-drop media intake area"],
              [".metric-card", "Elevated statistic tile with tabular counters"],
              [".analysis-panel", "Primary forensic inspection workspace shell"],
              [".detection-badge", "Icon + text semantic verdict indicator"],
              [".heatmap-container", "Interactive thermal overlay & scan stage"],
            ].map(([cls, desc]) => (
              <div
                key={cls}
                className="p-3 rounded-xl bg-[#080B16]/75 border border-[#94A3D6]/12"
              >
                <div className="font-mono text-[#00E5FF] font-medium">{cls}</div>
                <div className="mt-1 text-[#A6B2D1] leading-snug">{desc}</div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-[#A6B2D1]">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#00E5FF]" />
              <span>Real Server-Side Multimodal Inference</span>
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#00E676]" />
              <span>Zero Hardcoded Predictions</span>
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
