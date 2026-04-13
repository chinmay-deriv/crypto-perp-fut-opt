"use client";
import PlotlyChart from "../charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

interface Props { data: any }

export default function JumpsSection({ data }: Props) {
  const { t } = useI18n();
  if (!data) return <div className="card animate-pulse h-40" />;
  const { daily_stats, n_significant_days, total_days, avg_jump_pct, threshold, jump_histogram, jump_scatter, merton_params } = data;

  return (
    <section id="jumps" className="mb-12">
      <h2 className="section-title">{t("3. Jump Detection")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Identifying sudden discontinuous price movements using Bipower Variation (BNS test) and threshold-based detection. These jumps are critical for short-maturity option pricing.")}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatBox label={t("Significant Jump Days")} value={`${n_significant_days} / ${total_days}`} color="var(--accent-red)" />
        <StatBox label={t("Avg Jump % of RV")} value={`${avg_jump_pct.toFixed(1)}%`} color="var(--accent-amber)" />
        <StatBox label={t("Threshold Jumps")} value={threshold.jumps_detected.toLocaleString()} color="var(--accent)" />
        <StatBox label={t("Avg Jumps/Day")} value={threshold.avg_per_day.toFixed(1)} color="var(--accent-purple)" />
        <StatBox label={t("Up / Down")} value={`${threshold.up_jumps} / ${threshold.down_jumps}`} color="var(--accent-green)" />
      </div>

      {/* RV vs BV chart */}
      <div className="card mb-4" style={{ height: 420 }}>
        <PlotlyChart
          data={[
            { x: daily_stats.map((d: any) => d.date), y: daily_stats.map((d: any) => d.RV),
              type: "bar", name: "Realized Variance", marker: { color: "#3b82f6", opacity: 0.6 } },
            { x: daily_stats.map((d: any) => d.date), y: daily_stats.map((d: any) => d.BV),
              type: "bar", name: "Bipower Variation", marker: { color: "#f59e0b", opacity: 0.6 } },
          ]}
          layout={{
            title: { text: "Daily RV vs BV (gap = jump component)", font: { size: 13 } },
            barmode: "group", yaxis: { title: "Variance" }, xaxis: { title: "Date" },
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Jump contribution with significance coloring */}
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: daily_stats.map((d: any) => d.date),
              y: daily_stats.map((d: any) => d.jump_pct_of_rv),
              type: "bar",
              marker: { color: daily_stats.map((d: any) => d.jump_significant ? "#ef4444" : "#3b82f6") },
            }]}
            layout={{
              title: { text: "Jump % of Daily Variance (red = significant)", font: { size: 13 } },
              yaxis: { title: "Jump % of RV" }, xaxis: { title: "Date" },
            }}
          />
        </div>

        {/* Jump size distribution */}
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: jump_histogram.centers, y: jump_histogram.counts, type: "bar",
              marker: { color: jump_histogram.centers.map((c: number) => c > 0 ? "#10b981" : "#ef4444") },
            }]}
            layout={{
              title: { text: `Jump Size Distribution (${threshold.jumps_detected} jumps)`, font: { size: 13 } },
              xaxis: { title: "Percentage Return (%)" }, yaxis: { title: "Count" },
              shapes: [{ type: "line", x0: 0, x1: 0, y0: 0, y1: 1, yref: "paper", line: { color: "white", width: 1, dash: "dash" } }],
            }}
          />
        </div>
      </div>

      {/* Merton parameters */}
      <div className="card mt-4">
        <h3 className="text-sm font-semibold text-[var(--accent-purple)] mb-2">{t("Merton Jump Parameters (from threshold detection)")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="stat-label">λ (jumps/day)</p><p className="stat-value">{merton_params.lambda_per_day.toFixed(2)}</p></div>
          <div><p className="stat-label">λ (annualized)</p><p className="stat-value">{merton_params.lambda_annual.toFixed(0)}</p></div>
          <div><p className="stat-label">μ_J (mean jump)</p><p className="stat-value">{merton_params.mu_J.toFixed(6)}</p></div>
          <div><p className="stat-label">σ_J (jump vol)</p><p className="stat-value">{merton_params.sigma_J.toFixed(6)}</p></div>
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card text-center">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
    </div>
  );
}
