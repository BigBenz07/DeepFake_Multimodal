import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type DetectionRecord,
} from "../types/forensics";

const HISTORY_KEY = "verisight_detection_history_v1";
const SETTINGS_KEY = "verisight_settings_v1";

export function loadHistory(): DetectionRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: DetectionRecord[]): void {
  try {
    // Strip large frame thumbnail data URLs when storing history to stay well within localStorage quota
    const compact = records.slice(0, 60).map((rec) => {
      if (rec.modality === "video" && "frameAnalyses" in rec.details) {
        return {
          ...rec,
          details: {
            ...rec.details,
            frameAnalyses: rec.details.frameAnalyses.map((f) => ({
              ...f,
              thumbnailDataUrl: undefined,
            })),
          },
        };
      }
      return rec;
    });
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(compact));
  } catch {
    // If quota exceeded, retain the 20 most recent records
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 20)));
    } catch {
      // Ignore storage failures silently
    }
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${mm}:${ss}.${tenths}`;
}

export function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
