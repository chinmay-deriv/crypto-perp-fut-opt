"use client";
import { useState } from "react";
import PlotlyChart from "../charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

interface Props { data: any }

const COLORS = ["#3b82f6", "#ef4444"];

export default function ReturnsSection({ data }: Props) {
  const { t } = useI18n();
  const horizons: string[] = data?.horizons ?? [];
  const [sel, setSel] = useState(horizons[3] ?? "1min");

  if (!data) return <Loading />;

  const summary = data.summary as any[];
  const hist = data.histograms?.[sel];
  const qq = data.qq_plots?.[sel];
  const selStats = summary.find((s: any) => s.horizon === sel);

  return (
    <section id="returns" className="mb-12">
      <h2 className="section-title">{t("1. Log Returns Distribution")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Multi-horizon log-return analysis revealing fat tails, skewness, and departures from normality that drive the need for advanced option pricing models.")}
      </p>

      {/* Summary table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr><th>{t("Horizon")}</th><th>{t("Count")}</th><th>{t("Mean")}</th><th>{t("Std Dev")}</th><th>{t("Skewness")}</th><th>{t("Kurtosis")}</th><th>{t("Min")}</th><th>{t("Max")}</th></tr>
          </thead>
          <tbody>
            {summary.map((r: any) => (
              <tr key={r.horizon} className={r.horizon === sel ? "!bg-[rgba(59,130,246,0.1)]" : ""}>
                <td className="font-semibold cursor-pointer text-[var(--accent)]" onClick={() => setSel(r.horizon)}>{r.horizon}</td>
                <td>{r.count.toLocaleString()}</td>
                <td>{r.mean.toExponential(3)}</td>
                <td>{r.std.toExponential(3)}</td>
                <td className={r.skewness < 0 ? "text-[var(--accent-red)]" : "text-[var(--accent-green)]"}>{r.skewness.toFixed(3)}</td>
                <td className="text-[var(--accent-amber)] font-semibold">{r.kurtosis.toFixed(1)}</td>
                <td>{r.min.toExponential(2)}</td>
                <td>{r.max.toExponential(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Horizon selector */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {horizons.map((h: string) => (
          <button key={h} className={`tab-btn ${sel === h ? "active" : ""}`} onClick={() => setSel(h)}>{h}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Histogram */}
        {hist && (
          <div className="card" style={{ height: 420 }}>
            <PlotlyChart
              data={[
                { x: hist.bin_centers, y: hist.counts, type: "bar", marker: { color: "#3b82f6", opacity: 0.7 }, name: "Empirical" },
                { x: hist.normal_x, y: hist.normal_y, type: "scatter", mode: "lines", line: { color: "#ef4444", width: 2 }, name: "Normal" },
              ]}
              layout={{
                title: { text: `${sel} Returns vs Normal`, font: { size: 13 } },
                xaxis: { title: "Log Return", range: hist.xlim },
                yaxis: { title: "Density" },
                showlegend: true, legend: { x: 0.75, y: 0.95 },
                bargap: 0,
              }}
            />
          </div>
        )}

        {/* QQ Plot */}
        {qq && (
          <div className="card" style={{ height: 420 }}>
            <PlotlyChart
              data={[
                { x: qq.theoretical, y: qq.sample, type: "scatter", mode: "markers",
                  marker: { color: "#3b82f6", size: 2, opacity: 0.3 }, name: "Data" },
                { x: [qq.theoretical[0], qq.theoretical[qq.theoretical.length - 1]],
                  y: [qq.intercept + qq.slope * qq.theoretical[0], qq.intercept + qq.slope * qq.theoretical[qq.theoretical.length - 1]],
                  type: "scatter", mode: "lines", line: { color: "#ef4444", width: 2, dash: "dash" }, name: "Reference" },
              ]}
              layout={{
                title: { text: `QQ Plot — ${sel}`, font: { size: 13 } },
                xaxis: { title: "Theoretical Quantiles" }, yaxis: { title: "Sample Quantiles" },
                showlegend: true, legend: { x: 0.05, y: 0.95 },
              }}
            />
          </div>
        )}
      </div>

      {/* Key insight */}
      {selStats && (
        <div className="card mt-4 border-l-4 border-l-[var(--accent-amber)]">
          <p className="text-sm">
            <strong className="text-[var(--accent-amber)]">{t("Key Insight:")}</strong> At the <strong>{sel}</strong> horizon, 
            excess kurtosis = <strong>{selStats.kurtosis.toFixed(1)}</strong> (normal = 0). 
            {selStats.kurtosis > 3 ? " Extreme moves happen far more often than a bell curve predicts — this is why exchanges use mark price for liquidations and why Black-Scholes systematically underprices options." : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function Loading() { return <div className="card animate-pulse h-40 flex items-center justify-center text-[var(--muted)]">Loading returns data...</div>; }
