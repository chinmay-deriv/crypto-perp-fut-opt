"use client";
import PlotlyChart from "../charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

const ESTIMATOR_COLORS: Record<string, string> = { CC: "#3b82f6", Parkinson: "#ef4444", GK: "#10b981", YZ: "#f59e0b" };

interface Props { data: any }

export default function VolatilitySection({ data }: Props) {
  const { t } = useI18n();
  if (!data) return <div className="card animate-pulse h-40" />;
  const { daily_vol, dates, summary, signature_plot, intraday } = data;

  return (
    <section id="volatility" className="mb-12">
      <h2 className="section-title">{t("2. Realized Volatility Estimation")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Four established estimators capture different aspects of price dynamics. The volatility signature plot reveals optimal sampling frequency, while intraday patterns show when markets are most active.")}
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {Object.entries(summary).map(([est, s]: [string, any]) => (
          <div key={est} className="card text-center">
            <p className="stat-label">{est} {t("Avg Vol")}</p>
            <p className="stat-value" style={{ color: ESTIMATOR_COLORS[est] }}>{s.mean.toFixed(1)}%</p>
            <p className="text-xs text-[var(--muted)]">Range: {s.min.toFixed(0)}% – {s.max.toFixed(0)}%</p>
          </div>
        ))}
      </div>

      {/* Daily vol time series */}
      <div className="card mb-4" style={{ height: 400 }}>
        <PlotlyChart
          data={Object.keys(daily_vol).map((est) => ({
            x: dates, y: daily_vol[est], type: "scatter" as const, mode: "lines+markers" as const,
            marker: { size: 3, color: ESTIMATOR_COLORS[est] },
            line: { width: 1.5, color: ESTIMATOR_COLORS[est] }, name: est,
          }))}
          layout={{
            title: { text: "Daily Annualized Volatility — Four Estimators", font: { size: 13 } },
            yaxis: { title: "Annualized Vol (%)" }, xaxis: { title: "Date" },
            showlegend: true,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Signature plot */}
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: signature_plot.labels, y: signature_plot.ann_vol,
              type: "scatter", mode: "lines+markers",
              marker: { size: 8, color: "#3b82f6" }, line: { width: 2, color: "#3b82f6" },
            }]}
            layout={{
              title: { text: "Volatility Signature Plot", font: { size: 13 } },
              xaxis: { title: "Sampling Frequency" }, yaxis: { title: "Annualized RV (%)" },
            }}
          />
        </div>

        {/* Intraday pattern */}
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: intraday.hours, y: intraday.ann_vol, type: "bar",
              marker: { color: intraday.ann_vol.map((v: number) => v > (intraday.ann_vol.reduce((a: number, b: number) => a + b, 0) / 24) ? "#3b82f6" : "#1e293b") },
            }]}
            layout={{
              title: { text: "Intraday Volatility Pattern (UTC)", font: { size: 13 } },
              xaxis: { title: "Hour (UTC)", dtick: 2 }, yaxis: { title: "Avg Annualized Vol (%)" },
            }}
          />
        </div>
      </div>

      <div className="card mt-4 border-l-4 border-l-[var(--accent-green)]">
        <p className="text-sm">
          <strong className="text-[var(--accent-green)]">{t("Key Insight:")}</strong> The signature plot stabilizes 
          around 5-minute sampling — this is the optimal frequency that avoids microstructure noise 
          while preserving genuine price variation. Intraday vol peaks during US market hours (13:00–17:00 UTC).
        </p>
      </div>
    </section>
  );
}
