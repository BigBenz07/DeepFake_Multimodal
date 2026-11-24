import { useState } from "react";
import { RotateCcw, Sliders, Trash2 } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type HeatmapPalette,
} from "../types/forensics";

interface SettingsViewProps {
  settings: AppSettings;
  historyCount: number;
  onUpdateSettings: (next: AppSettings) => void;
  onClearHistory: () => void;
}

export default function SettingsView({
  settings,
  historyCount,
  onUpdateSettings,
  onClearHistory,
}: SettingsViewProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F5F7FF]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#A6B2D1]">
          Calibrate forensic decision thresholds, heatmap visualization styles, and report export preferences.
        </p>
      </div>

      {/* Classification Sensitivity */}
      <section className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#00E5FF]" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
            Detection Calibration
          </h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="threshold-slider" className="font-medium text-[#F5F7FF]">
              AI-Generated Classification Threshold
            </label>
            <span className="font-mono tabular-nums text-[#00E5FF] font-semibold">
              {settings.aiThresholdPercent}%
            </span>
          </div>
          <input
            id="threshold-slider"
            type="range"
            min={25}
            max={80}
            value={settings.aiThresholdPercent}
            onChange={(e) => update("aiThresholdPercent", Number(e.target.value))}
            className="w-full accent-[#00E5FF] cursor-pointer"
          />
          <p className="text-xs text-[#6C7A9C]">
            Media scoring above this threshold is flagged as AI-Generated. Scores within ±6% of this threshold are marked Inconclusive for manual analyst review.
          </p>
        </div>
      </section>

      {/* Heatmap & Interface Preferences */}
      <section className="glass-card p-6 space-y-6">
        <h2 className="font-display text-lg font-semibold text-[#F5F7FF]">
          Heatmap & Visual Preferences
        </h2>

        <div className="space-y-2.5">
          <div className="text-sm font-medium text-[#F5F7FF]">Heatmap Color Spectrum</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                {
                  id: "cyber" as HeatmapPalette,
                  name: "Cyber Neon",
                  gradient: "from-[#00E5FF] via-[#8B5CF6] to-[#FF3CAC]",
                },
                {
                  id: "thermal" as HeatmapPalette,
                  name: "Thermal Spectrum",
                  gradient: "from-[#00E5FF] via-[#FFB020] to-[#FF4B6E]",
                },
                {
                  id: "inferno" as HeatmapPalette,
                  name: "Classic Inferno",
                  gradient: "from-[#8B5CF6] via-[#F97316] to-[#FDE68A]",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => update("heatmapPalette", opt.id)}
                className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                  settings.heatmapPalette === opt.id
                    ? "bg-[#00E5FF]/10 border-[#00E5FF]"
                    : "bg-[#080B16]/75 border-[#94A3D6]/14 hover:border-[#94A3D6]/35"
                }`}
              >
                <div className={`h-2.5 w-full rounded-full bg-gradient-to-r ${opt.gradient} mb-2.5`} />
                <div className="text-xs font-medium text-[#F5F7FF]">{opt.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <label htmlFor="opacity-slider" className="font-medium text-[#F5F7FF]">
              Default Heatmap Opacity
            </label>
            <span className="font-mono tabular-nums text-[#A78BFA] font-semibold">
              {Math.round(settings.defaultHeatmapOpacity * 100)}%
            </span>
          </div>
          <input
            id="opacity-slider"
            type="range"
            min={20}
            max={100}
            value={Math.round(settings.defaultHeatmapOpacity * 100)}
            onChange={(e) => update("defaultHeatmapOpacity", Number(e.target.value) / 100)}
            className="w-full accent-[#8B5CF6] cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#94A3D6]/12">
          <div>
            <div className="text-sm font-medium text-[#F5F7FF]">Subtle Cyber Grid Backdrop</div>
            <div className="text-xs text-[#6C7A9C]">
              Toggle the subtle coordinate grid pattern behind dashboard panels
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.ambientGridEnabled}
            onClick={() => update("ambientGridEnabled", !settings.ambientGridEnabled)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              settings.ambientGridEnabled
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/45"
                : "bg-[#080B16]/80 text-[#A6B2D1] border border-[#94A3D6]/20"
            }`}
          >
            {settings.ambientGridEnabled ? "Enabled" : "Minimal"}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#94A3D6]/12">
          <div>
            <div className="text-sm font-medium text-[#F5F7FF]">Default Forensic Report Format</div>
            <div className="text-xs text-[#6C7A9C]">
              Choose between formatted visual HTML reports or machine-readable JSON exports
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080B16]/85 border border-[#94A3D6]/14">
            <button
              type="button"
              onClick={() => update("reportFormat", "html")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                settings.reportFormat === "html"
                  ? "bg-[#00E5FF]/20 text-[#00E5FF]"
                  : "text-[#A6B2D1] hover:text-[#F5F7FF]"
              }`}
            >
              HTML Report
            </button>
            <button
              type="button"
              onClick={() => update("reportFormat", "json")}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                settings.reportFormat === "json"
                  ? "bg-[#00E5FF]/20 text-[#00E5FF]"
                  : "text-[#A6B2D1] hover:text-[#F5F7FF]"
              }`}
            >
              JSON Data
            </button>
          </div>
        </div>
      </section>

      {/* Data & Reset */}
      <section className="glass-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-[#F5F7FF]">
            Workspace Maintenance
          </h2>
          <p className="text-xs text-[#6C7A9C] mt-0.5">
            {historyCount} detection record(s) currently saved in local browser storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
            className="neon-button-secondary text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              disabled={historyCount === 0}
              onClick={() => setConfirmClear(true)}
              className="neon-button-secondary text-xs border-[#FF4B6E]/35 text-[#FFD4DC] disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#FF4B6E]" />
              <span>Clear Detection History</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#FF4B6E] text-[#080B16] cursor-pointer"
              >
                Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-2 text-xs text-[#A6B2D1] hover:text-[#F5F7FF] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
