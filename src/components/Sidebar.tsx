import {
  AudioLines,
  History,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  Settings,
  Video,
  X,
} from "lucide-react";
import type { NavSection } from "../types/forensics";
import { BrandEmblem } from "./VisualWidgets";

interface SidebarProps {
  activeSection: NavSection;
  onSelect: (section: NavSection) => void;
  historyCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "image", label: "Image Detection", icon: ImageIcon },
  { id: "audio", label: "Audio Detection", icon: AudioLines },
  { id: "video", label: "Video Detection", icon: Video },
  { id: "history", label: "Detection History", icon: History },
  { id: "about", label: "About Project", icon: Info },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  activeSection,
  onSelect,
  historyCount,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleNav = (id: NavSection) => {
    onSelect(id);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#0A0F1F]/95 backdrop-blur-xl border-r border-[#94A3D6]/14">
      <div className="flex items-center justify-between px-5 h-16 border-b border-[#94A3D6]/12 shrink-0">
        <button
          type="button"
          onClick={() => handleNav("dashboard")}
          className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-[#00E5FF] rounded-lg"
        >
          <BrandEmblem size={34} />
          <div className="min-w-0">
            <span className="block font-display text-base font-bold tracking-tight text-[#F5F7FF] whitespace-nowrap">
              VeriSight AI
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-[#A6B2D1] hover:text-[#F5F7FF] hover:bg-white/5"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#00E5FF] ${
                isActive
                  ? "bg-gradient-to-r from-[#00E5FF]/18 via-[#8B5CF6]/14 to-transparent text-[#F5F7FF] border border-[#00E5FF]/35 shadow-[0_0_20px_rgba(0,229,255,0.12)]"
                  : "text-[#A6B2D1] border border-transparent hover:text-[#F5F7FF] hover:bg-white/[0.04] hover:border-white/10"
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                    isActive ? "text-[#00E5FF]" : "text-[#6C7A9C]"
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === "history" && historyCount > 0 && (
                <span className="font-mono text-xs tabular-nums text-[#00E5FF]">
                  {historyCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#94A3D6]/12 shrink-0">
        <div className="text-xs text-[#6C7A9C] leading-relaxed">
          <div className="font-medium text-[#A6B2D1]">Multimodal Deepfake Detection</div>
          <div className="mt-0.5">MSc IT Research Suite</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile slide-over sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10">{navContent}</aside>
        </div>
      )}
    </>
  );
}
