"use client";
import { useI18n } from "../../lib/i18n";

interface Props { calibData: any; comparisonData: any }

const MODEL_META = [
  {
    name: "Black-Scholes", features: "Constant vol, no jumps", strengths: "Analytical, fast, universal baseline",
    weaknesses: "Flat IV smile, misprices tails", best_for: "Quick benchmarking",
  },
  {
    name: "GARCH", features: "Time-varying vol, clustering", strengths: "Captures vol persistence, discrete-time",
    weaknesses: "No stochastic vol, no jumps", best_for: "Short-term vol forecasting",
  },
  {
    name: "Heston", features: "Stochastic vol, mean-reverting, correlated", strengths: "IV smile, semi-analytical, fast calibration",
    weaknesses: "No jumps, Feller often violated in crypto", best_for: "Medium-term (7-30 day) options",
  },
  {
    name: "Merton", features: "Constant vol + Poisson jumps", strengths: "Fat tails, crash risk pricing",
    weaknesses: "No vol clustering, constant between jumps", best_for: "Short-maturity (<1 day) options",
  },
  {
    name: "Bates", features: "Stochastic vol + jumps (8 params)", strengths: "Most realistic, captures all features",
    weaknesses: "Hardest to calibrate, most parameters", best_for: "Full-spectrum pricing (1hr–30 days)",
  },
];

const INSIGHTS = [
  { title: "Extreme Fat Tails", text: "BTC 1-second returns show kurtosis >50, far exceeding the normal distribution's value of 3. This means catastrophic moves occur routinely — every option pricing model must account for this.", color: "var(--accent-red)" },
  { title: "Jumps Dominate Short Maturities", text: "For options expiring in <1 day, jump risk is the primary pricing factor. Merton and Bates price these 20-50% higher than Black-Scholes, correctly reflecting the true risk.", color: "var(--accent-amber)" },
  { title: "Vol-of-Vol Creates Smile", text: "The IV smile (higher implied vol for OTM options) is primarily driven by stochastic volatility (Heston's ξ parameter). Without it, models produce flat smiles that underestimate tail risk.", color: "var(--accent-green)" },
  { title: "Convergence at Long Maturities", text: "As maturity increases to 14-30 days, all models converge toward Black-Scholes pricing. Mean reversion smooths out short-term effects, and the Central Limit Theorem begins to apply.", color: "var(--accent)" },
  { title: "Bates = Industry Standard", text: "The Bates model (Heston + Merton) provides the best coverage across all maturities, correctly pricing both the IV smile and fat tails. It is the standard for crypto options desks at institutional firms.", color: "var(--accent-purple)" },
];

export default function ConclusionsSection({ calibData, comparisonData }: Props) {
  const { t } = useI18n();
  return (
    <section id="conclusions" className="mb-12">
      <h2 className="section-title">{t("8. Final Comparison & Conclusions")}</h2>

      {/* Model comparison table */}
      <div className="card mb-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Model Feature Comparison")}</h3>
        <table className="data-table">
          <thead>
            <tr><th>{t("Model")}</th><th>{t("Features")}</th><th>{t("Strengths")}</th><th>{t("Weaknesses")}</th><th>{t("Best For")}</th></tr>
          </thead>
          <tbody>
            {MODEL_META.map((m) => (
              <tr key={m.name}>
                <td className="font-semibold text-[var(--accent)]">{m.name}</td>
                <td className="text-xs">{t(m.features)}</td>
                <td className="text-xs text-[var(--accent-green)]">{t(m.strengths)}</td>
                <td className="text-xs text-[var(--accent-red)]">{t(m.weaknesses)}</td>
                <td className="text-xs text-[var(--accent-amber)] font-semibold">{t(m.best_for)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key findings */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Key Research Findings")}</h3>
        <div className="space-y-3">
          {INSIGHTS.map((ins, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm" 
                    style={{ background: ins.color, color: "#0b0e17" }}>
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: ins.color }}>{t(ins.title)}</p>
                <p className="text-xs text-[var(--muted)]">{t(ins.text)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation by maturity */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Recommended Model by Maturity Horizon")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RecBox horizon={t("Short (< 1 day)")} model={t("Merton / Bates")} color="var(--accent-red)"
            reason={t("Jumps dominate. Need explicit jump modeling for accurate pricing.")} />
          <RecBox horizon={t("Medium (1-7 days)")} model="Bates" color="var(--accent-amber)"
            reason={t("Both stochastic vol and jumps material. Bates captures both.")} />
          <RecBox horizon={t("Longer (7-30 days)")} model={t("Heston / Bates")} color="var(--accent-green)"
            reason={t("Jumps smooth out. Stochastic vol still important for smile.")} />
        </div>
      </div>

      {/* Limitations */}
      <div className="card border-l-4 border-l-[var(--muted)]">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">{t("Limitations & Next Steps")}</h3>
        <ul className="text-xs text-[var(--muted)] space-y-1 list-disc pl-4">
          <li>{t("Calibration uses method-of-moments (fast but less precise than MLE or joint calibration to IV surface).")}</li>
          <li>{t("No market IV data — all IVs are model-implied. Live option market data would allow proper calibration.")}</li>
          <li>{t("Constant risk-free rate assumed. In crypto, funding rates and lending rates are highly variable.")}</li>
          <li>{t("No transaction costs, margin requirements, or market impact modeled.")}</li>
          <li>{t("Bates model parameters are assembled (Heston + Merton separately); joint calibration would be ideal.")}</li>
          <li><strong>Next:</strong> Add rough volatility models (rBergomi), include live Deribit option data for calibration.</li>
        </ul>
      </div>
    </section>
  );
}

function RecBox({ horizon, model, color, reason }: { horizon: string; model: string; color: string; reason: string }) {
  return (
    <div className="p-4 bg-[#1e293b] rounded-lg border-t-2" style={{ borderTopColor: color }}>
      <p className="text-xs text-[var(--muted)]">{horizon}</p>
      <p className="font-semibold text-lg" style={{ color }}>{model}</p>
      <p className="text-xs text-[var(--muted)] mt-1">{reason}</p>
    </div>
  );
}
