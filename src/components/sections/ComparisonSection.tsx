"use client";
import PlotlyChart from "../charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

const MODEL_COLORS: Record<string, string> = {
  GARCH: "#3b82f6", Heston: "#ef4444", Merton: "#10b981", Bates: "#f59e0b",
};

interface Props { data: any }

export default function ComparisonSection({ data }: Props) {
  const { t } = useI18n();
  if (!data) return <div className="card animate-pulse h-40" />;
  const { iv_smiles, moneyness, bs_flat_vol_pct, atm_table, models, maturities } = data;

  const displayMats = maturities.filter((_: string, i: number) => [0, 2, 4, 6].includes(i));

  return (
    <section id="comparison" className="mb-12">
      <h2 className="section-title">{t("6. Comparative Analysis")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Implied volatility smiles, ATM term structure, and price divergences reveal how each model captures different aspects of market behavior.")}
      </p>

      {/* IV smile charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {displayMats.map((mat: string) => (
          <div key={mat} className="card" style={{ height: 380 }}>
            <PlotlyChart
              data={[
                ...models.map((m: string) => ({
                  x: moneyness,
                  y: iv_smiles[m]?.[mat]?.map((v: number | null) => v != null ? v * 100 : null) ?? [],
                  type: "scatter" as const, mode: "lines" as const,
                  line: { width: 2, color: MODEL_COLORS[m] }, name: m,
                })),
                {
                  x: [moneyness[0], moneyness[moneyness.length - 1]],
                  y: [bs_flat_vol_pct, bs_flat_vol_pct],
                  type: "scatter" as const, mode: "lines" as const,
                  line: { width: 1.5, color: "#64748b", dash: "dash" as const }, name: "BS (flat)",
                },
              ]}
              layout={{
                title: { text: `IV Smile — ${mat}`, font: { size: 13 } },
                xaxis: { title: "Moneyness" }, yaxis: { title: "Implied Vol (%)" },
                showlegend: true, legend: { x: 0.6, y: 0.98, font: { size: 9 } },
              }}
            />
          </div>
        ))}
      </div>

      {/* ATM IV Table */}
      <div className="card mb-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">{t("ATM Implied Volatility by Model & Maturity")}</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Maturity</th><th>T (days)</th>
              {models.map((m: string) => <th key={m} style={{ color: MODEL_COLORS[m] }}>IV {m} (%)</th>)}
              {models.map((m: string) => <th key={`d_${m}`} style={{ color: MODEL_COLORS[m] }}>Δ from BS ({m})</th>)}
            </tr>
          </thead>
          <tbody>
            {atm_table.map((row: any) => (
              <tr key={row.maturity}>
                <td className="font-semibold">{row.maturity}</td>
                <td>{row.T_days.toFixed(2)}</td>
                {models.map((m: string) => (
                  <td key={m}>{row[`${m}_IV_atm`] != null ? row[`${m}_IV_atm`].toFixed(1) : "—"}</td>
                ))}
                {models.map((m: string) => {
                  const v = row[`${m}_pct_diff`];
                  return (
                    <td key={`d_${m}`} className={v > 0 ? "text-[var(--accent-green)]" : v < 0 ? "text-[var(--accent-red)]" : ""}>
                      {v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Price divergence chart */}
      <div className="card" style={{ height: 400 }}>
        <PlotlyChart
          data={models.map((m: string) => ({
            x: atm_table.map((r: any) => r.maturity),
            y: atm_table.map((r: any) => r[`${m}_pct_diff`]),
            type: "scatter" as const, mode: "lines+markers" as const,
            line: { width: 2, color: MODEL_COLORS[m] },
            marker: { size: 7, color: MODEL_COLORS[m] }, name: m,
          }))}
          layout={{
            title: { text: "ATM Call Price Divergence from Black-Scholes (%)", font: { size: 13 } },
            xaxis: { title: "Maturity" }, yaxis: { title: "% Difference from BS" },
            shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: 0, y1: 0, line: { color: "#64748b", dash: "dash", width: 1 } }],
            showlegend: true,
          }}
        />
      </div>

      {/* Smile steepness */}
      <div className="card mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-2">{t("Smile Steepness (IV₉₅% − IV₁₀₅%)")}</h3>
        <table className="data-table">
          <thead>
            <tr><th>Maturity</th>{models.map((m: string) => <th key={m} style={{ color: MODEL_COLORS[m] }}>{m}</th>)}</tr>
          </thead>
          <tbody>
            {atm_table.map((row: any) => (
              <tr key={row.maturity}>
                <td className="font-semibold">{row.maturity}</td>
                {models.map((m: string) => {
                  const v = row[`${m}_skew`];
                  return <td key={m}>{v != null ? `${v.toFixed(2)}%` : "—"}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
