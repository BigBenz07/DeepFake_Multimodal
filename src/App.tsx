import { useEffect, useState } from "react";
import { Menu, ScanSearch } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import AboutView from "./components/AboutView";
import AudioDetectionView from "./components/AudioDetectionView";
import DashboardView from "./components/DashboardView";
import HistoryView from "./components/HistoryView";
import ImageDetectionView from "./components/ImageDetectionView";
import RecordDetailModal from "./components/RecordDetailModal";
import SettingsView from "./components/SettingsView";
import Sidebar from "./components/Sidebar";
import VideoDetectionView from "./components/VideoDetectionView";
import type {
  AppSettings,
  DetectionRecord,
  NavSection,
} from "./types/forensics";
import {
  loadHistory,
  loadSettings,
  saveHistory,
  saveSettings,
} from "./utils/storage";

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: "Dashboard Overview",
  image: "Image Detection",
  audio: "Audio Detection",
  video: "Video Detection",
  history: "Detection History",
  about: "About Project",
  settings: "Settings",
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState<DetectionRecord[]>(() => loadHistory());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [inspectedRecord, setInspectedRecord] = useState<DetectionRecord | null>(null);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleRecordCreated = (record: DetectionRecord) => {
    setHistory((prev) => [record, ...prev]);
  };

  const handleDeleteRecord = (id: string) => {
    setHistory((prev) => prev.filter((r) => r.id !== id));
    if (inspectedRecord?.id === id) setInspectedRecord(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setInspectedRecord(null);
  };

  return (
    <div
      className={`min-h-screen flex text-[#F5F7FF] ${
        settings.ambientGridEnabled ? "cyber-grid-bg" : "cyber-grid-minimal"
      }`}
    >
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        historyCount={history.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Single-Row Top Header */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 flex items-center justify-between gap-6 bg-[#080B16]/80 backdrop-blur-xl border-b border-[#94A3D6]/12">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#A6B2D1] hover:text-[#F5F7FF] hover:bg-white/5 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[#6C7A9C] hidden sm:inline whitespace-nowrap">
                VeriSight AI
              </span>
              <span className="text-[#6C7A9C] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-[#F5F7FF] truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() =>
                setActiveSection(activeSection === "image" ? "video" : "image")
              }
              className="neon-button text-xs py-2 px-3.5"
            >
              <ScanSearch className="w-3.5 h-3.5" />
              <span>{activeSection === "image" ? "Scan Video" : "New Scan"}</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeSection === "dashboard" && (
                <DashboardView
                  history={history}
                  reportFormat={settings.reportFormat}
                  onNavigate={setActiveSection}
                  onInspectRecord={setInspectedRecord}
                />
              )}

              {activeSection === "image" && (
                <ImageDetectionView
                  settings={settings}
                  onRecordCreated={handleRecordCreated}
                />
              )}

              {activeSection === "audio" && (
                <AudioDetectionView
                  settings={settings}
                  onRecordCreated={handleRecordCreated}
                />
              )}

              {activeSection === "video" && (
                <VideoDetectionView
                  settings={settings}
                  onRecordCreated={handleRecordCreated}
                />
              )}

              {activeSection === "history" && (
                <HistoryView
                  history={history}
                  reportFormat={settings.reportFormat}
                  onInspectRecord={setInspectedRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onClearHistory={handleClearHistory}
                  onNavigate={setActiveSection}
                />
              )}

              {activeSection === "about" && <AboutView />}

              {activeSection === "settings" && (
                <SettingsView
                  settings={settings}
                  historyCount={history.length}
                  onUpdateSettings={setSettings}
                  onClearHistory={handleClearHistory}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <RecordDetailModal
        record={inspectedRecord}
        reportFormat={settings.reportFormat}
        onClose={() => setInspectedRecord(null)}
      />
    </div>
  );
}
