"use client";
import { useI18n } from "../../lib/i18n";

interface Props {
  calibData: any;
  jumpData: any;
  volData: any;
}

export default function MiscSection({ calibData, jumpData, volData }: Props) {
  const { t } = useI18n();
  if (!calibData || !jumpData) return <div className="card animate-pulse h-40" />;

  const heston = calibData?.heston?.params;
  const merton = calibData?.merton?.params;
  const garch = calibData?.garch?.params;

  return (
    <section id="miscellaneous" className="mb-12">
      <h2 className="section-title">{t("7. Additional Insights")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Variance decomposition, regime analysis, and theoretical considerations for practitioners.")}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Variance decomposition */}
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Variance Decomposition")}</h3>
          <p className="text-xs text-[var(--muted)] mb-3">{t("How total variance splits between smooth diffusion and discontinuous jumps.")}</p>
          {merton && (
            <div className="space-y-3">
              <VarBar label={t("Total Annualized Vol")} value={merton.total_vol_pct} maxVal={merton.total_vol_pct * 1.2} color="var(--accent)" />
              <VarBar label={t("Diffusion Component")} value={merton.sigma_diffusion_pct} maxVal={merton.total_vol_pct * 1.2} color="var(--accent-green)" />
              <VarBar label={t("Jump Component")} value={merton.jump_vol_pct} maxVal={merton.total_vol_pct * 1.2} color="var(--accent-red)" />
              <p className="text-xs text-[var(--muted)]">
                Jumps account for ~{((merton.jump_vol_pct ** 2) / (merton.total_vol_pct ** 2) * 100).toFixed(0)}% of total variance 
                and ~{(merton.jump_vol_pct / merton.total_vol_pct * 100).toFixed(0)}% of total vol.
              </p>
            </div>
          )}
        </div>

        {/* Feller condition */}
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Feller Condition Analysis")}</h3>
          <p className="text-xs text-[var(--muted)] mb-3">
            {t("The Feller condition (2κθ ≥ ξ²) ensures variance stays strictly positive in the Heston/Bates model.")}
          </p>
          {heston && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><p className="stat-label">2κθ</p><p className="stat-value text-[var(--accent-green)]">{(2 * heston.kappa * heston.theta).toFixed(2)}</p></div>
                <div><p className="stat-label">ξ²</p><p className="stat-value text-[var(--accent-red)]">{(heston.xi ** 2).toFixed(2)}</p></div>
                <div><p className="stat-label">Ratio</p><p className="stat-value" style={{ color: heston.feller >= 1 ? "var(--accent-green)" : "var(--accent-amber)" }}>{heston.feller.toFixed(4)}</p></div>
              </div>
              <div className={`p-3 rounded-lg text-xs ${heston.feller >= 1 ? "bg-green-900/20 text-green-400" : "bg-amber-900/20 text-amber-400"}`}>
                {heston.feller >= 1
                  ? t("Feller condition satisfied. Variance process never touches zero — continuous paths guaranteed.")
                  : t("Feller condition NOT satisfied. The variance process can reach zero, requiring absorption/reflection boundary. This is common for crypto (high vol-of-vol) and handled via full truncation in MC simulation.")}
              </div>
            </>
          )}
        </div>

        {/* GARCH regime analysis */}
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Volatility Regime Analysis")}</h3>
          {garch && (
            <>
              <p className="text-xs text-[var(--muted)] mb-3">
                GARCH persistence = {garch.persistence.toFixed(4)} — 
                {garch.persistence >= 0.999
                  ? " effectively IGARCH. Volatility shocks are permanent; vol clusters persist indefinitely."
                  : garch.persistence >= 0.99
                    ? " near-IGARCH. Very long memory in volatility."
                    : " moderate persistence. Shocks decay at a reasonable rate."}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#1e293b] rounded-lg">
                  <p className="stat-label">{t("Long-Run 5min Vol")}</p>
                  <p className="stat-value text-[var(--accent)]">{Math.sqrt(garch.omega / Math.max(1 - garch.persistence, 0.001) * (365.25 * 288)).toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-[#1e293b] rounded-lg">
                  <p className="stat-label">{t("Half-Life of Shocks")}</p>
                  <p className="stat-value text-[var(--accent-amber)]">{(Math.log(2) / -Math.log(Math.min(garch.persistence, 0.9999)) / 288).toFixed(1)} days</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Model sensitivity */}
        <div className="card">
          <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Parameter Sensitivity Notes")}</h3>
          <ul className="text-xs text-[var(--muted)] space-y-2">
            <li><span className="text-[var(--accent-green)] font-semibold">Short maturities (&lt;1 day):</span> Jump parameters (λ, σ_J) dominate pricing. Merton and Bates diverge most from BS here.</li>
            <li><span className="text-[var(--accent-amber)] font-semibold">Medium maturities (1–7 days):</span> Stochastic volatility (ξ, ρ) and jump effects both material. Bates offers best coverage.</li>
            <li><span className="text-[var(--accent-red)] font-semibold">Longer maturities (14–30 days):</span> Mean reversion (κ, θ) smooths out jumps. Heston and GARCH converge toward BS.</li>
            <li><span className="text-[var(--accent-purple)] font-semibold">Vol-of-vol (ξ):</span> Higher ξ → wider IV smile → higher OTM option prices. Critical for risk management.</li>
            <li><span className="text-[var(--accent)] font-semibold">Correlation (ρ):</span> Controls IV smile asymmetry. Negative ρ creates heavier left tail (downside protection costs more).</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function VarBar({ label, value, maxVal, color }: { label: string; value: number; maxVal: number; color: string }) {
  const pct = Math.min(value / maxVal * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--muted)]">{label}</span>
        <span className="font-mono" style={{ color }}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
