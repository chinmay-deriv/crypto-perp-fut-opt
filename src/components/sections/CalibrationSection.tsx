"use client";
import { useState } from "react";
import PlotlyChart from "../charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

interface Props { data: any }

const TABS = ["GARCH", "Heston", "Merton", "Bates"] as const;

export default function CalibrationSection({ data }: Props) {
  const { t } = useI18n();
  const [tab, setTab] = useState<string>("GARCH");
  if (!data) return <div className="card animate-pulse h-40" />;

  return (
    <section id="calibration" className="mb-12">
      <h2 className="section-title">{t("4. Model Calibration")}</h2>
      <p className="text-sm text-[var(--muted)] mb-4">
        {t("Each model is individually calibrated to the historical data. Parameters are estimated via maximum likelihood (GARCH), method of moments (Heston), jump catalog analysis (Merton), and combined assembly (Bates).")}
      </p>

      <div className="flex gap-1 mb-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="card">
        {tab === "GARCH" && <GarchTab data={data.garch} />}
        {tab === "Heston" && <HestonTab data={data.heston} />}
        {tab === "Merton" && <MertonTab data={data.merton} />}
        {tab === "Bates" && <BatesTab data={data.bates} spot={data.spot} />}
      </div>
    </section>
  );
}

function ParamTable({ rows }: { rows: { label: string; symbol: string; value: string; note?: string }[] }) {
  const { t } = useI18n();
  return (
    <table className="data-table mb-4">
      <thead><tr><th>{t("Parameter")}</th><th>{t("Symbol")}</th><th>{t("Value")}</th><th>{t("Interpretation")}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.symbol}><td className="font-semibold">{r.label}</td><td className="text-[var(--accent)]">{r.symbol}</td>
            <td className="text-[var(--accent-amber)]">{r.value}</td><td className="text-xs text-[var(--muted)]">{r.note}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

function GarchTab({ data }: { data: any }) {
  const { t } = useI18n();
  const p = data.params;
  const gjr = data.gjr_params;
  return (
    <>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("GARCH(1,1) with Student-t Innovations")}</h3>
      <ParamTable rows={[
        { label: t("Omega"), symbol: "ω", value: p.omega.toExponential(4), note: t("Baseline variance floor") },
        { label: t("Alpha"), symbol: "α", value: p.alpha.toFixed(4), note: `${(p.alpha * 100).toFixed(1)}% weight on yesterday's shock` },
        { label: t("Beta"), symbol: "β", value: p.beta.toFixed(4), note: `${(p.beta * 100).toFixed(1)}% weight on previous vol (memory)` },
        { label: t("Persistence"), symbol: "α+β", value: p.persistence.toFixed(4), note: p.persistence >= 0.999 ? t("IGARCH — shocks never fully decay") : t("Shocks gradually decay") },
        { label: t("Degrees of Freedom"), symbol: "ν", value: p.nu.toFixed(2), note: t("Student-t tail parameter (lower = fatter tails)") },
      ]} />
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("GJR-GARCH (Asymmetric Leverage)")}</h3>
      <ParamTable rows={[
        { label: t("Gamma"), symbol: "γ", value: gjr.gamma.toFixed(4), note: gjr.gamma < 0.05 ? "Weak leverage effect — BTC vol is symmetric" : "Significant leverage effect" },
        { label: t("Persistence"), symbol: "α+β+γ/2", value: gjr.persistence.toFixed(4) },
      ]} />
      <div style={{ height: 350 }}>
        <PlotlyChart
          data={[
            { x: data.cond_vol_timestamps, y: data.cond_vol_garch, type: "scatter", mode: "lines",
              line: { width: 0.8, color: "#3b82f6" }, name: "GARCH(1,1)" },
            { x: data.cond_vol_timestamps, y: data.cond_vol_gjr, type: "scatter", mode: "lines",
              line: { width: 0.8, color: "#ef4444" }, name: "GJR-GARCH" },
          ]}
          layout={{
            title: { text: "Conditional Volatility (Annualized %)", font: { size: 13 } },
            yaxis: { title: "Vol (%)" }, showlegend: true,
          }}
        />
      </div>
    </>
  );
}

function HestonTab({ data }: { data: any }) {
  const { t } = useI18n();
  const p = data.params;
  return (
    <>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Heston Stochastic Volatility")}</h3>
      <ParamTable rows={[
        { label: t("Mean-Reversion Speed"), symbol: "κ", value: p.kappa.toFixed(1), note: `Half-life ≈ ${(Math.log(2) / p.kappa * 365.25 * 24).toFixed(1)} hours` },
        { label: t("Long-Run Variance"), symbol: "θ", value: p.theta.toFixed(4), note: `Long-run vol = ${p.theta_vol_pct.toFixed(1)}%` },
        { label: t("Vol-of-Vol"), symbol: "ξ", value: p.xi.toFixed(1), note: t("How volatile is volatility itself") },
        { label: t("Correlation"), symbol: "ρ", value: p.rho.toFixed(4), note: p.rho > 0 ? "Positive — rallies slightly increase vol" : "Negative — drops increase vol" },
        { label: t("Initial Variance"), symbol: "v₀", value: p.v0.toFixed(4), note: `Current vol = ${p.v0_vol_pct.toFixed(1)}%` },
        { label: t("Feller Condition"), symbol: "2κθ/ξ²", value: p.feller.toFixed(4), note: p.feller >= 1 ? t("Satisfied — variance stays positive") : t("Not satisfied — variance can hit zero") },
      ]} />
      <div style={{ height: 350 }}>
        <PlotlyChart
          data={[
            { y: data.validation.empirical_vol, type: "scatter", mode: "lines",
              line: { width: 0.8, color: "#3b82f6" }, name: "Empirical (hourly RV)", opacity: 0.7 },
            { y: data.validation.simulated_vol, type: "scatter", mode: "lines",
              line: { width: 0.8, color: "#f59e0b" }, name: "Simulated (Heston)", opacity: 0.7 },
          ]}
          layout={{
            title: { text: "Heston Validation: Empirical vs Simulated Vol", font: { size: 13 } },
            yaxis: { title: "Annualized Vol (%)" }, xaxis: { title: "Hour Index" },
            shapes: [{ type: "line", x0: 0, x1: data.validation.empirical_vol.length, y0: data.validation.long_run_vol, y1: data.validation.long_run_vol, line: { color: "#ef4444", dash: "dash", width: 1 } }],
            showlegend: true,
          }}
        />
      </div>
    </>
  );
}

function MertonTab({ data }: { data: any }) {
  const { t } = useI18n();
  const p = data.params;
  return (
    <>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Merton Jump-Diffusion")}</h3>
      <ParamTable rows={[
        { label: t("Diffusion Vol"), symbol: "σ", value: `${p.sigma_diffusion_pct.toFixed(1)}%`, note: t("Smooth random walk component") },
        { label: t("Jump Intensity"), symbol: "λ", value: `${p.lambda_per_day.toFixed(2)}/day`, note: `${p.lambda_annual.toFixed(0)} per year` },
        { label: t("Mean Jump Size"), symbol: "μ_J", value: p.mu_J.toFixed(6), note: t("Near zero — jumps unbiased") },
        { label: t("Jump Size Vol"), symbol: "σ_J", value: p.sigma_J.toFixed(6), note: `Typical jump ≈ ±${(p.sigma_J * 100).toFixed(2)}%` },
        { label: t("Total Vol"), symbol: "", value: `${p.total_vol_pct.toFixed(1)}%`, note: t("Combined diffusion + jumps") },
        { label: t("Jump Vol Component"), symbol: "", value: `${p.jump_vol_pct.toFixed(1)}%`, note: t("Contribution from jumps alone") },
      ]} />
      <div style={{ height: 350 }}>
        <PlotlyChart
          data={[
            { x: data.pdf_overlay.x, y: data.pdf_overlay.merton_pdf, type: "scatter", mode: "lines",
              line: { width: 2, color: "#ef4444" }, name: "Merton JD" },
            { x: data.pdf_overlay.x, y: data.pdf_overlay.normal_pdf, type: "scatter", mode: "lines",
              line: { width: 1.5, color: "#10b981", dash: "dash" }, name: "Normal" },
          ]}
          layout={{
            title: { text: "1-Min Returns: Merton vs Normal Density", font: { size: 13 } },
            xaxis: { title: "Log Return", range: [-0.015, 0.015] }, yaxis: { title: "Density" },
            showlegend: true,
          }}
        />
      </div>
    </>
  );
}

function BatesTab({ data, spot }: { data: any; spot: number }) {
  const { t } = useI18n();
  const p = data.params;
  return (
    <>
      <h3 className="text-sm font-semibold text-[var(--accent)] mb-3">{t("Bates Model (Heston + Merton)")}</h3>
      <p className="text-xs text-[var(--muted)] mb-3">{data.description}</p>
      <ParamTable rows={[
        { label: t("Mean-Reversion Speed"), symbol: "κ", value: p.kappa.toFixed(1), note: t("From Heston calibration") },
        { label: t("Long-Run Variance"), symbol: "θ", value: `${p.theta_vol_pct.toFixed(1)}% vol`, note: t("From Heston calibration") },
        { label: t("Vol-of-Vol"), symbol: "ξ", value: p.xi.toFixed(1), note: t("From Heston calibration") },
        { label: t("Correlation"), symbol: "ρ", value: p.rho.toFixed(4), note: t("From Heston calibration") },
        { label: t("Initial Vol"), symbol: "v₀", value: `${p.v0_vol_pct.toFixed(1)}%`, note: t("Current market condition") },
        { label: t("Jump Intensity"), symbol: "λ", value: `${p.lambda_per_day.toFixed(2)}/day`, note: t("From Merton calibration") },
        { label: t("Mean Jump Size"), symbol: "μ_J", value: p.mu_J.toFixed(6), note: t("From Merton calibration") },
        { label: t("Jump Size Vol"), symbol: "σ_J", value: p.sigma_J.toFixed(6), note: t("From Merton calibration") },
      ]} />
      <div className="card border-l-4 border-l-[var(--accent-purple)]">
        <p className="text-sm">
          <strong className="text-[var(--accent-purple)]">Bates captures both phenomena simultaneously:</strong> stochastic 
          volatility (vol wanders randomly, mean-reverts) and jumps (sudden price discontinuities). 
          This is the industry-standard model for FX and crypto options pricing. Spot: ${spot?.toLocaleString()}.
        </p>
      </div>
    </>
  );
}
