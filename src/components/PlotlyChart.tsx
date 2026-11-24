import { useEffect, useRef } from "react";
import Plotly, { type PlotlyHTMLElement } from "plotly.js-dist-min";

interface PlotlyChartProps {
  data: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  config?: Record<string, unknown>;
  className?: string;
  height?: number;
  onPointClick?: (pointIndex: number) => void;
}

export default function PlotlyChart({
  data,
  layout = {},
  config = {},
  className = "",
  height = 280,
  onPointClick,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const mergedLayout: Record<string, unknown> = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: {
        family: "Plus Jakarta Sans, sans-serif",
        color: "#A6B2D1",
        size: 12,
      },
      autosize: true,
      height,
      margin: { t: 24, r: 18, b: 36, l: 42 },
      hoverlabel: {
        bgcolor: "#10172B",
        bordercolor: "#00E5FF",
        font: { color: "#F5F7FF", family: "JetBrains Mono, monospace", size: 12 },
      },
      ...layout,
    };

    const mergedConfig: Record<string, unknown> = {
      responsive: true,
      displayModeBar: false,
      ...config,
    };

    let chartEl: PlotlyHTMLElement | null = null;
    const clickHandler = (ev: { points: Array<{ pointIndex: number }> }) => {
      if (onPointClick && ev.points && ev.points.length > 0) {
        onPointClick(ev.points[0].pointIndex);
      }
    };

    Plotly.react(el, data, mergedLayout, mergedConfig).then((plotDiv) => {
      chartEl = plotDiv;
      if (onPointClick && plotDiv.on) {
        plotDiv.removeAllListeners?.("plotly_click");
        plotDiv.on("plotly_click", clickHandler);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (el) {
        try {
          Plotly.Plots.resize(el);
        } catch {
          // Ignore resize during unmount
        }
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      if (chartEl?.removeAllListeners) {
        chartEl.removeAllListeners("plotly_click");
      }
    };
  }, [data, layout, config, height, onPointClick]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) {
        try {
          Plotly.purge(el);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return <div ref={containerRef} className={`w-full ${className}`} style={{ minHeight: height }} />;
}
