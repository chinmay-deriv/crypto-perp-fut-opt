"use client";
import { useState, useMemo } from "react";
import PlotlyChart from "../charts/PlotlyChart";
import { computeBSGrid, MATURITIES } from "../../lib/pricing";
import { useI18n } from "../../lib/i18n";

const MODEL_COLORS: Record<string, string> = {
  BS: "#64748b", GARCH: "#3b82f6", Heston: "#ef4444", Merton: "#10b981", Bates: "#f59e0b",
};

const MAT_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

interface Props { data: any; spot: number; riskFree: number; sigma: number }

export default function PricingSection({ data, spot, riskFree, sigma }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState("BS");
  const moneyness: number[] = data?.moneyness ?? [];

  const liveBSPrices = useMemo(
    () => moneyness.length > 0 ? computeBSGrid(spot, riskFree, sigma, moneyness, MATURITIES) : {},
    [spot, riskFree, sigma, moneyness]
  );

  if (!data) return <div className="card animate-pulse h-40" />;

  const maturities = Object.keys(data.maturities);

  const getPrices = (model: string) => {
    if (model === "BS") return liveBSPrices;
    return data.mc_prices[model] ?? {};
  };

  const prices = getPrices(tab);

  return (
    <section id="pricing" className="mb-12">
      <h2 className="section-title">{t("5. Option Pricing")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Prices across 21 strikes and 7 maturities. BS is computed in real-time from your inputs — adjust parameters above to see instant recalculation. Other models use 100,000 Monte Carlo paths.")}
      </p>

      <div className="flex gap-1 mb-2 flex-wrap">
        {data.models.map((m: string) => (
          <button key={m} className={`tab-btn ${tab === m ? "active" : ""}`} onClick={() => setTab(m)}>
            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: MODEL_COLORS[m] }} />
            {m}{m === "BS" ? " (Live)" : " (MC)"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Calls */}
        <div className="card" style={{ height: 440 }}>
          <PlotlyChart
            data={maturities.map((mat, i) => ({
              x: moneyness, y: prices[mat]?.calls || [],
              type: "scatter" as const, mode: "lines" as const,
              line: { width: 2, color: MAT_COLORS[i % 7] },
              name: mat,
            }))}
            layout={{
              title: { text: `${tab} — Call Prices vs Moneyness`, font: { size: 13 } },
              xaxis: { title: "Moneyness (K/S)" }, yaxis: { title: "Call Price ($)" },
              showlegend: true, legend: { x: 0.02, y: 0.98 },
            }}
          />
        </div>

        {/* Puts */}
        <div className="card" style={{ height: 440 }}>
          <PlotlyChart
            data={maturities.map((mat, i) => ({
              x: moneyness, y: prices[mat]?.puts || [],
              type: "scatter" as const, mode: "lines" as const,
              line: { width: 2, color: MAT_COLORS[i % 7] },
              name: mat,
            }))}
            layout={{
              title: { text: `${tab} — Put Prices vs Moneyness`, font: { size: 13 } },
              xaxis: { title: "Moneyness (K/S)" }, yaxis: { title: "Put Price ($)" },
              showlegend: true, legend: { x: 0.7, y: 0.98 },
            }}
          />
        </div>
      </div>

      {/* ATM table */}
      <div className="card mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">{t("ATM Call Prices by Maturity")}</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t("Maturity")}</th>
              {data.models.map((m: string) => <th key={m} style={{ color: MODEL_COLORS[m] }}>{m}</th>)}
            </tr>
          </thead>
          <tbody>
            {maturities.map((mat) => (
              <tr key={mat}>
                <td className="font-semibold">{mat}</td>
                {data.models.map((m: string) => {
                  const p = m === "BS" ? liveBSPrices : data.mc_prices[m];
                  const v = p?.[mat]?.calls?.[data.atm_idx];
                  return <td key={m}>${v != null ? v.toFixed(2) : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
