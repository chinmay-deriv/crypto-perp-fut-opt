"use client";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

/* eslint-disable @typescript-eslint/no-explicit-any */
interface PlotlyChartProps {
  data: any[];
  layout?: Record<string, any>;
  [key: string]: any;
}

const DARK_LAYOUT: Record<string, any> = {
  paper_bgcolor: "transparent",
  plot_bgcolor: "rgba(17,24,39,0.6)",
  font: { color: "#e2e8f0", family: "ui-monospace, monospace", size: 11 },
  xaxis: { gridcolor: "#1e293b", zerolinecolor: "#334155" },
  yaxis: { gridcolor: "#1e293b", zerolinecolor: "#334155" },
  margin: { l: 60, r: 30, t: 40, b: 50 },
  legend: { bgcolor: "transparent", font: { size: 10 } },
  autosize: true,
};

export default function PlotlyChart({ data, layout, ...rest }: PlotlyChartProps) {
  const merged = {
    ...DARK_LAYOUT,
    ...layout,
    xaxis: { ...DARK_LAYOUT.xaxis, ...(layout?.xaxis as object) },
    yaxis: { ...DARK_LAYOUT.yaxis, ...(layout?.yaxis as object) },
    font: { ...DARK_LAYOUT.font, ...(layout?.font as object) },
    margin: { ...DARK_LAYOUT.margin, ...(layout?.margin as object) },
  };

  return (
    <Plot
      data={data}
      layout={merged}
      config={{ responsive: true, displayModeBar: true, displaylogo: false }}
      useResizeHandler
      style={{ width: "100%", height: "100%" }}
      {...rest}
    />
  );
}
