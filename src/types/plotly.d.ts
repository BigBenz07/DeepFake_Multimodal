declare module "plotly.js-dist-min" {
  export interface PlotlyHTMLElement extends HTMLElement {
    on?: (eventName: string, handler: (data: { points: Array<{ pointIndex: number; x: unknown; y: unknown }> }) => void) => void;
    removeAllListeners?: (eventName: string) => void;
  }

  const Plotly: {
    react: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<PlotlyHTMLElement>;
    purge: (root: HTMLElement) => void;
    Plots: {
      resize: (root: HTMLElement) => void;
    };
  };

  export default Plotly;
}
