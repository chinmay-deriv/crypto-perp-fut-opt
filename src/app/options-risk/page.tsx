"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PlotlyChart from "../../components/charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTIONS: { id: string; label: string }[] = [
  { id: "overview", label: "1. Pricing Engine" },
  { id: "cross-validation", label: "2. Cross-Validation" },
  { id: "model-selection", label: "3. Model Selection" },
  { id: "pricing-surface", label: "4. Pricing Surface" },
  /* { id: "parity-check", label: "5. Put-Call Parity" }, */
  { id: "greeks-overview", label: "5. Greeks Calculator" },
  { id: "greeks-heatmaps", label: "6. Greeks vs Moneyness" },
  /* { id: "smile-risk", label: "7. Smile-Risk Greeks" }, */
  { id: "portfolio", label: "7. Portfolio Aggregation" },
  { id: "hedging-strategies", label: "8. Hedging Strategies" },
  { id: "hedge-engine", label: "9. Live Hedge Engine" },
  /* { id: "dynamic-hedging", label: "10. Dynamic Hedging" }, */
  /* { id: "stress-tests", label: "11. Stress Tests & VaR" }, */
];

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const ACCENT = "var(--accent-purple)";
const ACCENT_HEX = "#a855f7";
const RED = "#ef4444";
const GREEN = "#10b981";
const BLUE = "#3b82f6";

export default function OptionsRisk() {
  const { t } = useI18n();
  const [d, setD] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const files: string[] = [
      "engine_summary",
      "cross_validation",
      "model_selection",
      "pricing_surface",
      "parity_check",
      "greeks_surface",
      "smile_risk",
      "portfolio",
      "hedge_rebalance",
      "dynamic_hedging",
      "stress_tests",
    ];
    files.forEach((f) =>
      fetchJSON(`/data/options-risk/${f}.json`).then((v) =>
        setD((prev) => ({ ...prev, [f]: v }))
      )
    );
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) setActiveSection(e.target.id);
      },
      { threshold: 0.15, rootMargin: "-80px 0px -40% 0px" }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4 pt-6 overflow-y-auto">
        <Link
          href="/"
          className="text-[10px] text-[var(--muted)] hover:text-[var(--accent-purple)] transition mb-2 block"
        >
          {t("← Home")}
        </Link>
        <div className="mb-4">
          <h1 className="text-sm font-bold text-[var(--accent-purple)] leading-tight">
            {t("Options Risk")}
          </h1>
          <h2 className="text-xs text-[var(--muted)]">
            {t("Greeks, Hedging & Portfolio Risk")}
          </h2>
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                activeSection === id
                  ? "bg-[rgba(168,85,247,0.15)] text-[var(--accent-purple)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">Options Risk Module</p>
          <p className="text-[10px] text-[var(--muted)]">
            Sections 1–9 · Pricing, Greeks, Hedging
          </p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {t("Options Risk Management")}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t("Quantifying and hedging the risks of being a counterparty to vanilla options — Greeks exposure, volatility risk, gamma hedging, and portfolio-level risk management.")}
          </p>
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { label: "Bates Model (Primary)", color: ACCENT_HEX },
              { label: "Heston + Merton Backups", color: BLUE },
              { label: "100K MC Paths", color: GREEN },
            ].map((b) => (
              <span
                key={b.label}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: `${b.color}18`, color: b.color }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </header>

        <OverviewSection data={d.engine_summary} />
        <CrossValidationSection data={d.cross_validation} />
        <ModelSelectionSection data={d.model_selection} />
        <PricingSurfaceSection data={d.pricing_surface} />
        {/* <ParityCheckSection data={d.parity_check} /> */}
        <GreeksOverviewSection data={d.greeks_surface} />
        <GreeksHeatmapSection data={d.greeks_surface} />
        {/* <SmileRiskSection data={d.smile_risk} /> */}
        <PortfolioSection data={d.portfolio} />
        <HedgingStrategiesSection data={d.portfolio} />
        <HedgeEngineSection data={d.hedge_rebalance} />
        {/* <DynamicHedgingSection data={d.dynamic_hedging} /> */}
        {/* <StressTestsSection data={d.stress_tests} /> */}

        <footer className="mt-12 pt-6 border-t border-[var(--card-border)] text-center text-xs text-[var(--muted)]">
          <p>{t("Options Risk Management Research · Built with Next.js, Plotly.js, Python")}</p>
          <p className="mt-1">{t("Data: BTCUSDT 1-second klines, Binance, Jan–Jun 2025")}</p>
        </footer>
      </main>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function Loader() {
  return (
    <div className="card animate-pulse h-32 flex items-center justify-center text-[var(--muted)]">
      Loading…
    </div>
  );
}
function STitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="section-title" style={{ color: ACCENT }}>
      {children}
    </h2>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card text-center">
      <p className="stat-label">{label}</p>
      <p className="stat-value" style={{ color }}>{value}</p>
    </div>
  );
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4" style={{ borderLeft: `3px solid ${ACCENT_HEX}` }}>
      <p className="text-xs font-bold mb-1" style={{ color: ACCENT_HEX }}>
        {title}
      </p>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{children}</div>
    </div>
  );
}

function MathBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card mb-4 font-mono text-xs text-center py-3"
      style={{
        background: "rgba(168,85,247,0.06)",
        borderLeft: `3px solid ${ACCENT_HEX}`,
      }}
    >
      {children}
    </div>
  );
}

function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card mt-4"
      style={{ background: "rgba(239,68,68,0.06)", borderLeft: `3px solid ${RED}` }}
    >
      <p className="text-xs font-bold mb-1" style={{ color: RED }}>
        Key Insight
      </p>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{children}</p>
    </div>
  );
}

function fmt(v: number | null | undefined, digits = 0): string {
  if (v == null) return "–";
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function fmtUSD(v: number | null | undefined): string {
  if (v == null) return "–";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null) return "–";
  return `${v.toFixed(digits)}%`;
}

const PLOT_BG = "rgba(0,0,0,0)";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const PLOT_LAYOUT_BASE = {
  paper_bgcolor: PLOT_BG,
  plot_bgcolor: PLOT_BG,
  font: { color: "#94a3b8", size: 10 },
  margin: { l: 55, r: 20, t: 40, b: 45 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  legend: { orientation: "h" as const, y: -0.2, font: { size: 9 } },
};

/* ── Section 0: Overview / Engine Summary ───────────────────────── */

function OverviewSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="overview" className="mb-12"><Loader /></section>;

  const pm = data.primary_model;
  const bp = data.backup_models;

  return (
    <section id="overview" className="mb-12">
      <STitle>{t("1. Pricing Engine Foundation")}</STitle>

      <InfoBox title="Why Build a Pricing Engine First?">
        <p className="mb-2">
          {t("Before we can quantify any option risk (Delta, Gamma, Vega, Theta) or design a hedging strategy, we need a reliable pricing function. Every Greek is a derivative of the option price — if the price is wrong, all risk numbers downstream are wrong.")}
        </p>
        <p>
          {t("Phase 1 establishes this foundation: we lock in the Bates model as our primary pricing engine, validate it against our existing Options analysis, and confirm internal consistency via put-call parity. This gives us a battle-tested, callable function that all future phases import.")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">Bates Model SDE (Primary)</p>
        <p>dS/S = (r − λk − ½v)dt + √v dW₁ + J dN</p>
        <p>dv = κ(θ − v)dt + ξ√v dW₂ &nbsp;|&nbsp; corr(dW₁, dW₂) = ρ</p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          J ~ N(μ_J, σ_J²), &nbsp; N ~ Poisson(λ dt)
        </p>
      </MathBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Primary Model")} value={pm.name} color={ACCENT_HEX} />
        <Stat label={t("Parameters")} value={`${pm.n_params}`} color={ACCENT_HEX} />
        <Stat label={t("MC Paths")} value={fmt(data.mc_config.n_paths)} color={GREEN} />
        <Stat label={t("Spot")} value={fmtUSD(data.spot)} color={ACCENT_HEX} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Bates */}
        <div className="card" style={{ borderTop: `2px solid ${ACCENT_HEX}` }}>
          <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
            {pm.full_name} (Primary)
          </p>
          <ul className="text-[10px] text-[var(--muted)] space-y-1">
            {pm.features.map((f: string) => (
              <li key={f}>✓ {t(f)}</li>
            ))}
          </ul>
          <div className="mt-2 text-[10px] font-mono text-[var(--muted)]">
            <p>κ = {fmt(pm.params.kappa, 1)} &nbsp; θ = {fmt(pm.params.theta, 4)} &nbsp; ξ = {fmt(pm.params.xi, 1)}</p>
            <p>ρ = {fmt(pm.params.rho, 4)} &nbsp; v₀ = {fmt(pm.params.v0, 4)}</p>
            <p>λ = {fmt(pm.params.lambda, 1)}/yr &nbsp; μ_J = {fmt(pm.params.mu_j, 6)} &nbsp; σ_J = {fmt(pm.params.sigma_j, 6)}</p>
          </div>
        </div>
        {/* Backups */}
        {bp.map((b: any, i: number) => (
          <div key={i} className="card" style={{ borderTop: `2px solid ${BLUE}` }}>
            <p className="text-xs font-bold mb-1" style={{ color: BLUE }}>
              {b.full_name} (Backup)
            </p>
            <p className="text-[10px] text-[var(--muted)] mb-1">
              <strong>Use case:</strong> {b.use_case}
            </p>
            <p className="text-[10px] text-[var(--muted)] mb-2">{b.reason}</p>
            <div className="text-[10px] font-mono text-[var(--muted)]">
              {b.name === "Heston" && (
                <>
                  <p>κ = {fmt(b.params.kappa, 1)} &nbsp; θ = {fmt(b.params.theta, 4)}</p>
                  <p>ξ = {fmt(b.params.xi, 1)} &nbsp; ρ = {fmt(b.params.rho, 4)} &nbsp; v₀ = {fmt(b.params.v0, 4)}</p>
                </>
              )}
              {b.name === "Merton" && (
                <>
                  <p>σ_diff = {fmt(b.params.sigma, 4)} &nbsp; λ = {fmt(b.params.lambda, 1)}/yr</p>
                  <p>μ_J = {fmt(b.params.mu_j, 6)} &nbsp; σ_J = {fmt(b.params.sigma_j, 6)}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.validation_summary && data.validation_summary.length > 0 && (
        <div className="card mb-4">
          <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
            {t("Bates Cross-Validation Summary (vs. existing 50K-path prices)")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-[var(--muted)]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-1">Maturity</th>
                  <th className="text-right py-1">Call MAE ($)</th>
                  <th className="text-right py-1">Put MAE ($)</th>
                  <th className="text-right py-1">Call RMSE ($)</th>
                  <th className="text-right py-1">Mean % Err</th>
                </tr>
              </thead>
              <tbody>
                {data.validation_summary.map((row: any) => (
                  <tr key={row.maturity} className="border-b border-[var(--card-border)]">
                    <td className="py-1 font-medium">{row.maturity}</td>
                    <td className="text-right py-1">{fmtUSD(row.call_mae)}</td>
                    <td className="text-right py-1">{fmtUSD(row.put_mae)}</td>
                    <td className="text-right py-1">{fmtUSD(row.call_rmse)}</td>
                    <td className="text-right py-1">{fmtPct(row.call_mean_pct_err)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InsightBox>
        {t("The Bates model combines the two most important features of crypto price dynamics: (1) stochastic volatility (vol-of-vol + mean reversion, from Heston) captures volatility clustering and the smile shape, and (2) jumps (from Merton) capture sudden crashes/spikes that are frequent in crypto. Using Bates as primary ensures our Greeks reflect both tail risks and volatility regime changes.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 1: Cross-Validation ────────────────────────────────── */

function CrossValidationSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="cross-validation" className="mb-12"><Loader /></section>;

  const [selectedModel, setSelectedModel] = useState<string>("bates");
  const [selectedMat, setSelectedMat] = useState<string>("7day");

  const modelData = data.validation?.[selectedModel]?.[selectedMat];
  const moneyness = data.moneyness || [];

  const MODEL_COLORS: Record<string, string> = {
    bates: ACCENT_HEX,
    heston: BLUE,
    merton: "#f59e0b",
  };

  return (
    <section id="cross-validation" className="mb-12">
      <STitle>{t("2. Cross-Validation: New Engine vs. Existing Prices")}</STitle>

      <InfoBox title="What Is This Validating?">
        <p className="mb-2">
          {t("The Options page already priced calls and puts across 21 strikes × 7 maturities × 4 MC models using 50,000 paths. Our new pricing engine reprices the same grid using 100,000 paths. If the two sets of prices agree within a few percent, the engine is correctly implemented.")}
        </p>
        <p>
          {t("We expect small differences because: (1) different path counts produce different MC noise, and (2) 100K paths have lower variance than 50K. Mean Absolute Error (MAE) and Root Mean Square Error (RMSE) quantify the agreement.")}
        </p>
      </InfoBox>

      <div className="flex gap-2 mb-4 flex-wrap">
        {data.models.map((m: string) => (
          <button
            key={m}
            onClick={() => setSelectedModel(m)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              selectedModel === m
                ? "font-semibold"
                : "text-[var(--muted)] border-[var(--card-border)]"
            }`}
            style={
              selectedModel === m
                ? { borderColor: MODEL_COLORS[m], color: MODEL_COLORS[m], background: `${MODEL_COLORS[m]}18` }
                : {}
            }
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span className="text-[var(--muted)] mx-1">|</span>
        {Object.keys(data.maturities).map((mat: string) => (
          <button
            key={mat}
            onClick={() => setSelectedMat(mat)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              selectedMat === mat
                ? "font-semibold border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[rgba(168,85,247,0.1)]"
                : "text-[var(--muted)] border-[var(--card-border)]"
            }`}
          >
            {mat}
          </button>
        ))}
      </div>

      {modelData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Stat label="Call MAE" value={fmtUSD(modelData.stats.call_mae)} color={MODEL_COLORS[selectedModel]} />
            <Stat label="Put MAE" value={fmtUSD(modelData.stats.put_mae)} color={MODEL_COLORS[selectedModel]} />
            <Stat label="Call RMSE" value={fmtUSD(modelData.stats.call_rmse)} color={MODEL_COLORS[selectedModel]} />
            <Stat label="Mean % Error" value={fmtPct(modelData.stats.call_mean_pct_err)} color={MODEL_COLORS[selectedModel]} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="card" style={{ height: 360 }}>
              <PlotlyChart
                data={[
                  {
                    x: moneyness, y: modelData.ref_calls,
                    type: "scatter", mode: "lines",
                    name: `Reference (50K)`,
                    line: { width: 2, color: "#64748b", dash: "dot" },
                  },
                  {
                    x: moneyness, y: modelData.new_calls,
                    type: "scatter", mode: "lines",
                    name: `New Engine (100K)`,
                    line: { width: 2, color: MODEL_COLORS[selectedModel] },
                  },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `Call Prices: ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} — ${selectedMat}`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Call Price ($)" },
                }}
              />
            </div>
            <div className="card" style={{ height: 360 }}>
              <PlotlyChart
                data={[
                  {
                    x: moneyness, y: modelData.call_diff_pct,
                    type: "bar",
                    name: "Call Diff %",
                    marker: { color: modelData.call_diff_pct.map((v: number) => v >= 0 ? GREEN : RED) },
                  },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `Call Price Difference (%) — ${selectedMat}`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "New − Reference (%)" },
                  shapes: [{
                    type: "line", y0: 0, y1: 0, x0: 0.89, x1: 1.11,
                    line: { color: "#64748b", width: 1, dash: "dash" },
                  }],
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="card" style={{ height: 360 }}>
              <PlotlyChart
                data={[
                  {
                    x: moneyness, y: modelData.ref_puts,
                    type: "scatter", mode: "lines",
                    name: `Ref Puts (50K)`,
                    line: { width: 2, color: "#64748b", dash: "dot" },
                  },
                  {
                    x: moneyness, y: modelData.new_puts,
                    type: "scatter", mode: "lines",
                    name: `New Puts (100K)`,
                    line: { width: 2, color: RED },
                  },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `Put Prices: ${selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)} — ${selectedMat}`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Put Price ($)" },
                }}
              />
            </div>
            <div className="card" style={{ height: 360 }}>
              <PlotlyChart
                data={[
                  {
                    x: moneyness, y: modelData.call_diff_abs,
                    type: "scatter", mode: "lines+markers",
                    name: "Call Abs Diff ($)",
                    line: { width: 1.5, color: MODEL_COLORS[selectedModel] },
                    marker: { size: 4 },
                  },
                  {
                    x: moneyness, y: modelData.put_diff_abs,
                    type: "scatter", mode: "lines+markers",
                    name: "Put Abs Diff ($)",
                    line: { width: 1.5, color: RED },
                    marker: { size: 4 },
                  },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `Absolute Pricing Error ($) — ${selectedMat}`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "|New − Reference| ($)" },
                }}
              />
            </div>
          </div>
        </>
      )}

      <InsightBox>
        {t("MAE of a few dollars on options worth thousands confirms the pricing engine is correctly implemented. The errors are pure Monte Carlo noise — they would converge to zero with infinite paths. For risk management, this level of precision is more than sufficient: Greeks computed from these prices will be accurate to within their MC standard error.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 2: Model Selection ─────────────────────────────────── */

function ModelSelectionSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="model-selection" className="mb-12"><Loader /></section>;

  const comparison = data.comparison || [];

  return (
    <section id="model-selection" className="mb-12">
      <STitle>{t("3. Model Selection Logic")}</STitle>

      <InfoBox title="Why Three Models?">
        <p className="mb-2">
          {t("No single model is optimal across all time horizons. At very short expiries (< 1 day), price jumps dominate and stochastic volatility barely has time to evolve — Merton's pure jump-diffusion captures this efficiently. At longer horizons, volatility clustering becomes the dominant effect — Heston captures this without the computational overhead of jumps.")}
        </p>
        <p className="mb-2">
          {t("The Bates model (primary) handles both regimes but is the most expensive to simulate. By having dedicated backup models, we can: (1) cross-check Bates outputs, (2) stress-test under simpler assumptions, and (3) flag cases where Bates and backup diverge significantly (> 10%) for manual review.")}
        </p>
        <p>
          <strong>{t("Selection Rule:")}</strong> {data.selection_rule}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">Model Selection Decision</p>
        <p>T &lt; 1 day → Merton backup (jumps dominate, σ constant)</p>
        <p>T ≥ 1 day → Heston backup (vol clustering dominates, no jumps)</p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          Always: Bates = primary for all pricing & Greeks
        </p>
      </MathBox>

      <div className="card mb-4" style={{ height: 400 }}>
        <PlotlyChart
          data={[
            {
              x: comparison.map((c: any) => c.maturity),
              y: comparison.map((c: any) => c.bates_call),
              type: "scatter", mode: "lines+markers",
              name: "Bates (Primary)",
              line: { width: 2.5, color: ACCENT_HEX },
              marker: { size: 7 },
            },
            {
              x: comparison.map((c: any) => c.maturity),
              y: comparison.map((c: any) => c.heston_call),
              type: "scatter", mode: "lines+markers",
              name: "Heston",
              line: { width: 2, color: BLUE, dash: "dash" },
              marker: { size: 5 },
            },
            {
              x: comparison.map((c: any) => c.maturity),
              y: comparison.map((c: any) => c.merton_call),
              type: "scatter", mode: "lines+markers",
              name: "Merton",
              line: { width: 2, color: "#f59e0b", dash: "dot" },
              marker: { size: 5 },
            },
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: `ATM Call Price by Model & Maturity (S=$${fmt(data.spot)})`,
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "ATM Call Price ($)" },
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: comparison.map((c: any) => c.maturity),
                y: comparison.map((c: any) => c.primary_backup_spread_pct),
                type: "bar",
                name: "Primary–Backup Spread",
                marker: {
                  color: comparison.map((c: any) =>
                    c.primary_backup_spread_pct > 10 ? RED : c.primary_backup_spread_pct > 5 ? "#f59e0b" : GREEN
                  ),
                },
              },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Bates vs Backup Model Spread (%)",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Spread (%)" },
              shapes: [{
                type: "line", y0: 10, y1: 10,
                x0: -0.5, x1: comparison.length - 0.5,
                line: { color: RED, width: 1, dash: "dash" },
              }],
              annotations: [{
                x: comparison.length - 1, y: 10,
                text: "10% alert threshold",
                showarrow: false,
                font: { size: 9, color: RED },
                yshift: 10,
              }],
            }}
          />
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
            {t("Model Comparison Details")}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-[var(--muted)]">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="text-left py-1">Mat</th>
                  <th className="text-right py-1">Bates C</th>
                  <th className="text-right py-1">Heston C</th>
                  <th className="text-right py-1">Merton C</th>
                  <th className="text-right py-1">Backup</th>
                  <th className="text-right py-1">Spread</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c: any) => (
                  <tr key={c.maturity} className="border-b border-[var(--card-border)]">
                    <td className="py-1 font-medium">{c.maturity}</td>
                    <td className="text-right py-1">{fmtUSD(c.bates_call)}</td>
                    <td className="text-right py-1">{fmtUSD(c.heston_call)}</td>
                    <td className="text-right py-1">{fmtUSD(c.merton_call)}</td>
                    <td className="text-right py-1 font-medium">{c.recommended_backup}</td>
                    <td className="text-right py-1" style={{
                      color: c.primary_backup_spread_pct > 10 ? RED : c.primary_backup_spread_pct > 5 ? "#f59e0b" : GREEN
                    }}>
                      {fmtPct(c.primary_backup_spread_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InsightBox>
        {t("At 1hr expiry the spread is large (>100%) because with extremely short horizons, MC noise dominates and models diverge. At 4hr+ the Bates–backup spread drops to 1–4%, confirming model consistency. For practical risk management (positions typically 1day+), all three models agree well — but Bates captures both jump tails and vol clustering, making it the safest default.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 3: Pricing Surface ─────────────────────────────────── */

function PricingSurfaceSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="pricing-surface" className="mb-12"><Loader /></section>;

  const [selectedMat, setSelectedMat] = useState<string>("7day");
  const moneyness = data.moneyness || [];
  const calls = data.calls?.[selectedMat] || [];
  const puts = data.puts?.[selectedMat] || [];
  const ivs = data.implied_vol?.[selectedMat] || [];
  const matKeys = Object.keys(data.maturities || {});

  return (
    <section id="pricing-surface" className="mb-12">
      <STitle>{t("4. Bates Pricing Surface")}</STitle>

      <InfoBox title="What Is a Pricing Surface?">
        <p className="mb-2">
          {t("A pricing surface maps option prices (or implied volatilities) across two dimensions: strike (moneyness K/S) and maturity. For the exchange, this surface IS the product — every option sold to a client is priced from this surface. Errors in the surface directly translate to mispriced risk.")}
        </p>
        <p>
          {t("The implied volatility smile (IV vs moneyness at a fixed maturity) reveals how the market prices tail risk. In crypto, the smile is typically: (1) steep on the left (OTM puts are expensive — crash protection), (2) moderate on the right (OTM calls have some premium — rally potential), and (3) higher overall than equities (crypto is inherently more volatile).")}
        </p>
      </InfoBox>

      <div className="flex gap-2 mb-4 flex-wrap">
        {matKeys.map((mat: string) => (
          <button
            key={mat}
            onClick={() => setSelectedMat(mat)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              selectedMat === mat
                ? "font-semibold border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[rgba(168,85,247,0.1)]"
                : "text-[var(--muted)] border-[var(--card-border)]"
            }`}
          >
            {mat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: moneyness, y: calls,
                type: "scatter", mode: "lines",
                name: "Calls", line: { width: 2, color: GREEN },
                fill: "tozeroy", fillcolor: "rgba(16,185,129,0.08)",
              },
              {
                x: moneyness, y: puts,
                type: "scatter", mode: "lines",
                name: "Puts", line: { width: 2, color: RED },
                fill: "tozeroy", fillcolor: "rgba(239,68,68,0.08)",
              },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: `Bates Call & Put Prices — ${selectedMat}`,
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Option Price ($)" },
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: moneyness,
                y: ivs.map((v: number | null) => v != null ? v * 100 : null),
                type: "scatter", mode: "lines+markers",
                name: "Bates IV",
                line: { width: 2, color: ACCENT_HEX },
                marker: { size: 5 },
              },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: `Implied Volatility Smile — ${selectedMat}`,
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Implied Vol (%)" },
            }}
          />
        </div>
      </div>

      {/* IV term structure */}
      <div className="card mb-4" style={{ height: 380 }}>
        <PlotlyChart
          data={matKeys.map((mat: string, i: number) => {
            const mIvs = (data.implied_vol?.[mat] || []).map((v: number | null) => v != null ? v * 100 : null);
            const colors = [ACCENT_HEX, BLUE, GREEN, "#f59e0b", RED, "#06b6d4", "#ec4899"];
            return {
              x: moneyness,
              y: mIvs,
              type: "scatter", mode: "lines",
              name: mat,
              line: { width: 1.5, color: colors[i % colors.length] },
            };
          })}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "IV Smile Term Structure (All Maturities)",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Implied Vol (%)" },
          }}
        />
      </div>

      <InsightBox>
        {t("The IV smile is steeper at short maturities — jumps have a bigger relative impact when there's less time for diffusive volatility to accumulate. At longer maturities the smile flattens as stochastic volatility dominates. This term structure of skew is critical for risk management: short-dated OTM puts carry disproportionate tail risk that a flat-vol model like Black-Scholes would completely miss.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 4: Put-Call Parity ──────────────────────────────────── */

function ParityCheckSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="parity-check" className="mb-12"><Loader /></section>;

  const moneyness = data.moneyness || [];
  const matKeys = Object.keys(data.parity || {});

  return (
    <section id="parity-check" className="mb-12">
      <STitle>{t("5. Put-Call Parity Verification")}</STitle>

      <InfoBox title="Why Check Put-Call Parity?">
        <p className="mb-2">
          {t("Put-call parity is the fundamental no-arbitrage relationship for European options: C − P = S − K·e^(−rT). It holds regardless of which model you use (Black-Scholes, Bates, anything). If our MC prices violate this identity significantly, it means either a bug in the code or insufficient simulation paths.")}
        </p>
        <p>
          {t("For a market-making exchange, put-call parity violations are free money for arbitrageurs. If we quote prices that violate parity, sophisticated traders will immediately exploit it. This check ensures our pricing engine is internally consistent and arbitrage-free (within MC noise).")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">Put-Call Parity (European Options)</p>
        <p>C(K,T) − P(K,T) = S − K·e<sup>−rT</sup></p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          Violation = |MC(C−P) − Theoretical(S − K·e<sup>−rT</sup>)|
        </p>
      </MathBox>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {matKeys.map((mat) => {
          const p = data.parity[mat];
          return (
            <Stat
              key={mat}
              label={`${mat} Max Violation`}
              value={`$${p.max_violation.toFixed(2)} (${fmtPct(p.max_violation_pct, 4)})`}
              color={p.max_violation_pct < 0.1 ? GREEN : RED}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={matKeys.map((mat, i) => {
              const colors = [ACCENT_HEX, BLUE, GREEN];
              return {
                x: moneyness,
                y: data.parity[mat].abs_violation,
                type: "scatter", mode: "lines+markers",
                name: mat,
                line: { width: 1.5, color: colors[i % 3] },
                marker: { size: 4 },
              };
            })}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Put-Call Parity Violation by Strike ($)",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "|Violation| ($)" },
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={matKeys.map((mat, i) => {
              const colors = [ACCENT_HEX, BLUE, GREEN];
              const p = data.parity[mat];
              return {
                x: moneyness,
                y: p.mc_c_minus_p.map((v: number, j: number) => v - p.theoretical_c_minus_p[j]),
                type: "scatter", mode: "lines",
                name: mat,
                line: { width: 1.5, color: colors[i % 3] },
                fill: "tozeroy",
                fillcolor: `${colors[i % 3]}10`,
              };
            })}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "C−P Deviation from Theoretical ($)",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "MC(C−P) − Theory ($)" },
              shapes: [{
                type: "line", y0: 0, y1: 0, x0: 0.89, x1: 1.11,
                line: { color: "#64748b", width: 1, dash: "dash" },
              }],
            }}
          />
        </div>
      </div>

      <div className="card mb-4">
        <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
          {t("Parity Check Summary")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-[var(--muted)]">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-1">Maturity</th>
                <th className="text-right py-1">Max Violation ($)</th>
                <th className="text-right py-1">Mean Violation ($)</th>
                <th className="text-right py-1">% of Spot</th>
                <th className="text-right py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {matKeys.map((mat) => {
                const p = data.parity[mat];
                const ok = p.max_violation_pct < 0.1;
                return (
                  <tr key={mat} className="border-b border-[var(--card-border)]">
                    <td className="py-1 font-medium">{mat}</td>
                    <td className="text-right py-1">${p.max_violation.toFixed(2)}</td>
                    <td className="text-right py-1">${p.mean_violation.toFixed(2)}</td>
                    <td className="text-right py-1">{fmtPct(p.max_violation_pct, 4)}</td>
                    <td className="text-right py-1" style={{ color: ok ? GREEN : RED }}>
                      {ok ? "✓ PASS" : "⚠ CHECK"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <InsightBox>
        {t("All maturities pass with violations < 0.1% of spot price. The violation grows with maturity because longer simulations accumulate more MC noise (more timesteps = more random draws). At 30 days the max violation is ~$103 on a $107K spot — 0.096%, well within acceptable MC tolerance. With 100K paths we're confident the engine is arbitrage-free.")}
      </InsightBox>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PHASE 2: GREEKS CALCULATOR
   ══════════════════════════════════════════════════════════════════════ */

/* ── Section 5: Greeks Overview + ATM Table ─────────────────────── */

function GreeksOverviewSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="greeks-overview" className="mb-12"><Loader /></section>;

  const atm = data.atm_table || [];
  const bump = data.bump_config || {};

  return (
    <section id="greeks-overview" className="mb-12">
      <div className="mt-8 mb-4 pt-6 border-t-2 border-[var(--accent-purple)]">
        <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: `${ACCENT_HEX}18`, color: ACCENT_HEX }}>
          PHASE 2
        </span>
      </div>
      <STitle>{t("5. Greeks Calculator")}</STitle>

      <InfoBox title="Why Greeks Matter for the Exchange">
        <p className="mb-2">
          {t("Greeks are the partial derivatives of the option price with respect to market variables. As a counterparty selling options to clients, the exchange's P&L is driven entirely by these sensitivities. Without knowing your Greeks, you're flying blind — you don't know how much you'll lose if BTC moves 5%, or if implied vol spikes 10%.")}
        </p>
        <p className="mb-2">
          {t("Every Greek answers a specific risk question: Delta → 'how much do I lose per $1 spot move?', Gamma → 'how fast does my delta change?' (nonlinear risk), Vega → 'what's my exposure to vol moves?', Theta → 'how much do I earn/lose per day from time decay?', Vanna → 'how does my delta exposure change when vol moves?' (cross-risk), Volga → 'how does my vol exposure change when vol moves?' (vol convexity).")}
        </p>
        <p>
          {t("We compute these via central finite differences on the Bates MC pricer with Common Random Numbers (CRN). CRN ensures the same random draws are used for bumped and unbumped prices, so the finite-difference noise cancels — giving stable Greeks even with 50K paths.")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">Finite Difference Greeks (Central Differences + CRN)</p>
        <p>Δ = [C(S+h) − C(S−h)] / 2h &nbsp;&nbsp; Γ = [C(S+h) − 2C + C(S−h)] / h²</p>
        <p>V = [C(σ↑) − C(σ↓)] / 2 &nbsp;&nbsp; Θ = C(T−1d) − C(T)</p>
        <p>Vanna = [C(S+h,σ↑) − C(S−h,σ↑) − C(S+h,σ↓) + C(S−h,σ↓)] / 4h</p>
        <p>Volga = C(σ↑) − 2C + C(σ↓)</p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          h = {bump.eps_s_rel ? `${(bump.eps_s_rel*100).toFixed(1)}%` : '0.1%'} of S ≈ {fmtUSD(bump.eps_s_abs_usd)} &nbsp;|&nbsp;
          σ bump = ±1pp (parallel shift of √v₀ and √θ) &nbsp;|&nbsp;
          {fmt(bump.n_paths)} paths with CRN
        </p>
      </MathBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Spot")} value={fmtUSD(data.spot)} color={ACCENT_HEX} />
        <Stat label={t("Strikes")} value={`${data.strikes?.length || 21}`} color={ACCENT_HEX} />
        <Stat label={t("Maturities")} value={`${atm.length}`} color={ACCENT_HEX} />
        <Stat label={t("MC Paths (CRN)")} value={fmt(bump.n_paths)} color={GREEN} />
      </div>

      {/* ATM Greeks Table */}
      <div className="card mb-4">
        <p className="text-xs font-bold mb-3" style={{ color: ACCENT_HEX }}>
          {t("ATM Greeks Across All Maturities")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] text-[var(--muted)]">
            <thead>
              <tr className="border-b border-[var(--card-border)]">
                <th className="text-left py-1.5 pr-2">Mat</th>
                <th className="text-right py-1.5">Call Price</th>
                <th className="text-right py-1.5">Call Δ</th>
                <th className="text-right py-1.5">Put Δ</th>
                <th className="text-right py-1.5">Γ (per $1)</th>
                <th className="text-right py-1.5">Γ% (per 1%S)</th>
                <th className="text-right py-1.5">Vega $/1pp</th>
                <th className="text-right py-1.5">Call Θ $/day</th>
                <th className="text-right py-1.5">Vanna</th>
                <th className="text-right py-1.5">Volga $</th>
              </tr>
            </thead>
            <tbody>
              {atm.map((row: any) => (
                <tr key={row.maturity} className="border-b border-[var(--card-border)]">
                  <td className="py-1.5 pr-2 font-medium">{row.maturity}</td>
                  <td className="text-right py-1.5">{fmtUSD(row.price_call)}</td>
                  <td className="text-right py-1.5" style={{ color: BLUE }}>{fmt(row.call_delta, 4)}</td>
                  <td className="text-right py-1.5" style={{ color: RED }}>{fmt(row.put_delta, 4)}</td>
                  <td className="text-right py-1.5">{row.gamma?.toExponential(2)}</td>
                  <td className="text-right py-1.5" style={{ color: ACCENT_HEX }}>{fmt(row.gamma_pct, 4)}</td>
                  <td className="text-right py-1.5" style={{ color: GREEN }}>{fmtUSD(row.vega)}</td>
                  <td className="text-right py-1.5" style={{ color: RED }}>{fmtUSD(row.call_theta)}</td>
                  <td className="text-right py-1.5">{fmt(row.vanna, 4)}</td>
                  <td className="text-right py-1.5">{fmtUSD(row.volga)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Greek profiles across maturity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.call_delta), type: "scatter", mode: "lines+markers", name: "Call Δ", line: { width: 2, color: BLUE }, marker: { size: 6 } },
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.put_delta), type: "scatter", mode: "lines+markers", name: "Put Δ", line: { width: 2, color: RED }, marker: { size: 6 } },
            ]}
            layout={{ ...PLOT_LAYOUT_BASE, title: "ATM Delta vs Maturity", xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" }, yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Delta" } }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.vega), type: "bar", name: "Vega ($/1pp)", marker: { color: GREEN } },
            ]}
            layout={{ ...PLOT_LAYOUT_BASE, title: "ATM Vega vs Maturity ($/1pp vol)", xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" }, yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Vega ($)" } }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.gamma_pct), type: "scatter", mode: "lines+markers", name: "Γ%", line: { width: 2, color: ACCENT_HEX }, marker: { size: 6 } },
            ]}
            layout={{ ...PLOT_LAYOUT_BASE, title: "ATM Gamma (Δ change per 1% spot) vs Maturity", xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" }, yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Gamma %" } }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.call_theta), type: "bar", name: "Call Θ", marker: { color: RED } },
              { x: atm.map((r: any) => r.maturity), y: atm.map((r: any) => r.put_theta), type: "bar", name: "Put Θ", marker: { color: "#f59e0b" } },
            ]}
            layout={{ ...PLOT_LAYOUT_BASE, title: "ATM Theta ($/day) vs Maturity", xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Maturity" }, yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Theta ($/day)" }, barmode: "group" }}
          />
        </div>
      </div>

      <InsightBox>
        {t("Key observations from the ATM table: (1) Delta ≈ 0.5 for all ATM options (by definition), with call Δ slightly above and put Δ slightly below due to the risk-neutral drift. (2) Gamma is highest for short-dated options — a 1-hour ATM option has enormous gamma because it's right at the exercise boundary. (3) Vega increases with maturity — longer options have more time for vol to affect the outcome. (4) Theta is most negative for short-dated ATM options — rapid time decay near expiry. (5) Vanna ≈ 0 at ATM (delta is at its inflection point w.r.t. vol). (6) The Gamma–Theta tradeoff: high gamma = high theta cost. This is the fundamental tension in options hedging.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 6: Greeks Heatmaps ─────────────────────────────────── */

function GreeksHeatmapSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="greeks-heatmaps" className="mb-12"><Loader /></section>;

  const [selectedGreek, setSelectedGreek] = useState<string>("call_delta");
  const moneyness = data.moneyness || [];
  const matKeys = Object.keys(data.maturities || {});
  const surface = data.surface || {};

  const GREEK_OPTS = [
    { key: "call_delta", label: "Call Delta", colorscale: "RdBu", zmid: 0.5 },
    { key: "put_delta", label: "Put Delta", colorscale: "RdBu", zmid: -0.5 },
    { key: "gamma_pct", label: "Gamma (% per 1% S)", colorscale: "YlOrRd", zmid: undefined },
    { key: "vega", label: "Vega ($/1pp vol)", colorscale: "Greens", zmid: undefined },
    { key: "call_theta", label: "Call Theta ($/day)", colorscale: "RdYlGn", zmid: undefined },
    { key: "vanna", label: "Vanna (Δ/1pp vol)", colorscale: "RdBu", zmid: 0 },
    { key: "volga", label: "Volga ($/1pp vol)", colorscale: "PuOr", zmid: 0 },
  ];

  const selected = GREEK_OPTS.find((g) => g.key === selectedGreek) || GREEK_OPTS[0];

  const zData = matKeys.map((mat) => {
    const g = surface[mat];
    if (!g) return moneyness.map(() => 0);
    return g[selectedGreek] || moneyness.map(() => 0);
  });

  return (
    <section id="greeks-heatmaps" className="mb-12">
      <STitle>{t("6. Greeks vs Moneyness (by Maturity)")}</STitle>

      {/* Heatmaps — commented out, line charts kept
      <InfoBox title="Reading the Heatmaps">
        <p className="mb-2">
          {t("Each heatmap shows one Greek as a function of moneyness (x-axis, K/S from 0.90 to 1.10) and maturity (y-axis, from 1hr to 30 days). Bright/dark colours indicate large absolute values. These surfaces are what a trading desk monitors in real time — any unexpected shift signals a risk regime change.")}
        </p>
        <p>
          {t("Delta heatmap: shows the transition from 0 (deep OTM) to 1 (deep ITM), sharper for short maturities. Gamma heatmap: peaks at ATM, broadens with maturity. Vega heatmap: grows with maturity (more time = more vol exposure). Theta: most negative at short-dated ATM (rapid decay).")}
        </p>
      </InfoBox>

      <div className="flex gap-2 mb-4 flex-wrap">
        {GREEK_OPTS.map((g) => (
          <button
            key={g.key}
            onClick={() => setSelectedGreek(g.key)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              selectedGreek === g.key
                ? "font-semibold border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[rgba(168,85,247,0.1)]"
                : "text-[var(--muted)] border-[var(--card-border)]"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="card mb-4" style={{ height: 460 }}>
        <PlotlyChart
          data={[
            {
              z: zData,
              x: moneyness,
              y: matKeys,
              type: "heatmap",
              colorscale: selected.colorscale,
              zmid: selected.zmid,
              colorbar: { title: selected.label, titleside: "right", titlefont: { size: 10 }, tickfont: { size: 9 } },
              hoverongaps: false,
            },
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: `${selected.label} — Moneyness × Maturity`,
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Moneyness (K/S)" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Maturity", autorange: true },
            margin: { l: 70, r: 80, t: 40, b: 50 },
          }}
        />
      </div>
      */}

      {/* Greek profiles at selected maturity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {["call_delta", "gamma_pct", "vega"].map((gk) => {
          const gOpt = GREEK_OPTS.find((g) => g.key === gk)!;
          const colors = [ACCENT_HEX, BLUE, GREEN, "#f59e0b", RED, "#06b6d4", "#ec4899"];
          return (
            <div key={gk} className="card" style={{ height: 340 }}>
              <PlotlyChart
                data={matKeys.filter((_, i) => i % 2 === 0 || i === matKeys.length - 1).map((mat, i) => ({
                  x: moneyness,
                  y: surface[mat]?.[gk] || [],
                  type: "scatter",
                  mode: "lines",
                  name: mat,
                  line: { width: 1.5, color: colors[i % colors.length] },
                }))}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `${gOpt.label} by Moneyness`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "K/S" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: gOpt.label },
                  margin: { l: 50, r: 15, t: 35, b: 40 },
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {["call_theta", "vanna", "volga"].map((gk) => {
          const gOpt = GREEK_OPTS.find((g) => g.key === gk)!;
          const colors = [ACCENT_HEX, BLUE, GREEN, "#f59e0b", RED, "#06b6d4", "#ec4899"];
          return (
            <div key={gk} className="card" style={{ height: 340 }}>
              <PlotlyChart
                data={matKeys.filter((_, i) => i % 2 === 0 || i === matKeys.length - 1).map((mat, i) => ({
                  x: moneyness,
                  y: surface[mat]?.[gk] || [],
                  type: "scatter",
                  mode: "lines",
                  name: mat,
                  line: { width: 1.5, color: colors[i % colors.length] },
                }))}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `${gOpt.label} by Moneyness`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "K/S" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: gOpt.label },
                  margin: { l: 50, r: 15, t: 35, b: 40 },
                }}
              />
            </div>
          );
        })}
      </div>

      <InsightBox>
        {t("These profiles reveal the 'risk topology' of the options book. Gamma peaks sharply at ATM for short maturities — this is where your hedging error is largest (the delta changes fastest). Vega is concentrated in longer-dated ATM options — this is where a vol spike hurts most. Vanna is antisymmetric around ATM (positive on one side, negative on the other) — this means a vol move shifts your entire delta profile. Volga is positive at the wings — deep OTM options become more expensive in high-vol regimes.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 7: Smile-Risk Greeks ───────────────────────────────── */

function SmileRiskSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="smile-risk" className="mb-12"><Loader /></section>;

  const [selectedMat, setSelectedMat] = useState<string>("7day");
  const moneyness = data.moneyness || [];
  const matKeys = Object.keys(data.maturities || {});
  const sr = data.smile_risk?.[selectedMat] || {};

  const PARAM_CONFIG: Record<string, { label: string; desc: string; color: string }> = {
    xi: { label: "ξ (Vol-of-Vol)", desc: "Controls IV smile curvature / wing richness", color: ACCENT_HEX },
    rho: { label: "ρ (Spot-Vol Corr)", desc: "Controls skew direction — how spot and vol co-move", color: BLUE },
    lambda: { label: "λ (Jump Intensity)", desc: "Controls tail weight / jump frequency", color: "#f59e0b" },
  };

  return (
    <section id="smile-risk" className="mb-12">
      <STitle>{t("7. Smile-Risk Greeks (IV Surface Sensitivity)")}</STitle>

      <InfoBox title="Why Smile Risk Is Critical in Crypto">
        <p className="mb-2">
          {t("In equity markets, the IV smile is relatively stable — it shifts up/down but rarely changes shape dramatically. In crypto, the smile can violently reshape in hours: skew can flip sign, wings can explode, and the term structure can invert. These smile deformations are driven by changes in the underlying model parameters: ξ (vol-of-vol), ρ (spot-vol correlation), and λ (jump intensity).")}
        </p>
        <p className="mb-2">
          {t("Smile-risk Greeks measure: 'If the smile shape changes (not just a parallel vol shift), how much does each option in our book gain or lose?' Standard Vega only captures parallel shifts. These sensitivities capture the shape changes — the second-order effects that often dominate crypto option P&L.")}
        </p>
        <p>
          {t("Each chart below shows the base IV smile (solid) versus the IV smile when a parameter is bumped up/down. The spread between the curves shows where in the moneyness spectrum the exposure is concentrated.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Stat label="ξ (Vol-of-Vol)" value={fmt(data.param_values?.xi, 1)} color={ACCENT_HEX} />
        <Stat label="ρ (Correlation)" value={fmt(data.param_values?.rho, 4)} color={BLUE} />
        <Stat label="λ (Jumps/yr)" value={fmt(data.param_values?.lambda, 0)} color="#f59e0b" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {matKeys.map((mat) => (
          <button
            key={mat}
            onClick={() => setSelectedMat(mat)}
            className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
              selectedMat === mat
                ? "font-semibold border-[var(--accent-purple)] text-[var(--accent-purple)] bg-[rgba(168,85,247,0.1)]"
                : "text-[var(--muted)] border-[var(--card-border)]"
            }`}
          >
            {mat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {["xi", "rho", "lambda"].map((param) => {
          const cfg = PARAM_CONFIG[param];
          const pd = sr[param];
          if (!pd) return <div key={param} className="card" style={{ height: 360 }} />;
          return (
            <div key={param} className="card" style={{ height: 360 }}>
              <PlotlyChart
                data={[
                  { x: moneyness, y: pd.iv_base, type: "scatter", mode: "lines", name: "Base", line: { width: 2, color: "#64748b" } },
                  { x: moneyness, y: pd.iv_up, type: "scatter", mode: "lines", name: `${param} + bump`, line: { width: 2, color: cfg.color, dash: "dash" } },
                  { x: moneyness, y: pd.iv_dn, type: "scatter", mode: "lines", name: `${param} − bump`, line: { width: 2, color: cfg.color, dash: "dot" } },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `IV Smile: ${cfg.label} bump (${selectedMat})`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "K/S" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "IV (%)" },
                  margin: { l: 50, r: 15, t: 35, b: 40 },
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {["xi", "rho", "lambda"].map((param) => {
          const cfg = PARAM_CONFIG[param];
          const pd = sr[param];
          if (!pd) return <div key={param} className="card" style={{ height: 340 }} />;
          return (
            <div key={param} className="card" style={{ height: 340 }}>
              <PlotlyChart
                data={[
                  { x: moneyness, y: pd.call_sens_per_unit, type: "scatter", mode: "lines", name: `∂Call/∂${param}`, line: { width: 2, color: cfg.color }, fill: "tozeroy", fillcolor: `${cfg.color}10` },
                ]}
                layout={{
                  ...PLOT_LAYOUT_BASE,
                  title: `∂Call/∂${cfg.label} ($ per unit)`,
                  xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "K/S" },
                  yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "$ sensitivity" },
                  margin: { l: 50, r: 15, t: 35, b: 40 },
                }}
              />
            </div>
          );
        })}
      </div>

      <InfoBox title="Interpreting the Smile-Risk Charts">
        <p className="mb-2">
          <strong>ξ (vol-of-vol):</strong> {t("Increasing ξ makes the smile more convex — OTM wings get richer (higher IV). This is the 'butterfly' or 'kurtosis' risk. If you're short OTM options, a ξ spike will cost you.")}
        </p>
        <p className="mb-2">
          <strong>ρ (correlation):</strong> {t("More negative ρ steepens the left skew — OTM puts become more expensive relative to OTM calls. In crypto, ρ tends to become sharply negative during crashes (spot drops + vol spikes), causing the put skew to explode.")}
        </p>
        <p>
          <strong>λ (jump intensity):</strong> {t("Higher λ fattens both tails — more frequent jumps increase the price of all OTM options. This is the 'tail risk premium'. After major market events, λ reprices upward as the market expects more jumps.")}
        </p>
      </InfoBox>

      <InsightBox>
        {t("For a crypto exchange selling options to retail, smile risk is often the dominant P&L driver — larger than delta or even vega. A sudden skew move (ρ shift) or vol-of-vol spike (ξ jump) can reprice your entire options book in minutes. These smile-risk sensitivities allow the risk desk to pre-compute worst-case scenarios and set appropriate margin requirements for each option.")}
      </InsightBox>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PHASE 3: PORTFOLIO, HEDGING, DYNAMIC SIM, STRESS TESTS
   ══════════════════════════════════════════════════════════════════════ */

const AMBER = "#f59e0b";

/* ── Section 8: Portfolio Aggregation ─────────────────────────────── */

function PortfolioSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="portfolio" className="mb-12"><Loader /></section>;

  const positions: any[] = data.positions || [];
  const net = data.net_greeks;
  const nShort = data.n_short;
  const nLong = data.n_long;

  const byType = {
    call: positions.filter((p: any) => p.type === "call"),
    put: positions.filter((p: any) => p.type === "put"),
  };

  return (
    <section id="portfolio" className="mb-12">
      <STitle>{t("7. Portfolio Aggregation & Hedging")}</STitle>

      <InfoBox title="From Single-Option Greeks to Portfolio Risk">
        <p className="mb-2">
          {t("In Phase 2, we computed Greeks for individual options. In reality, the exchange holds dozens (or thousands) of open option positions — a mix of calls and puts, various strikes and maturities, bought and sold by different clients. The exchange is the counterparty to all of them.")}
        </p>
        <p className="mb-2">
          {t("Portfolio-level risk management means summing the Greeks across all positions. If Client A is long 2 BTC of ATM calls (exchange is short) and Client B is short 1 BTC of the same call (exchange is long), the net exposure is only −1 BTC of that call. Natural netting reduces risk.")}
        </p>
        <p>
          {t("We simulate a realistic 40-position client book: ~75% are exchange-short (clients bought options for leverage/protection), ~25% are exchange-long (clients sold covered calls or collected premium). The aggregate Greeks represent the exchange's total risk exposure.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Total Positions" value={String(data.n_positions)} color={ACCENT_HEX} />
        <Stat label="Exchange Short" value={String(nShort)} color={RED} />
        <Stat label="Exchange Long" value={String(nLong)} color={GREEN} />
        <Stat label={t("Spot Price")} value={`$${fmt(data.spot, 0)}`} color={BLUE} />
      </div>

      <MathBox>
        Portfolio Greek = Σᵢ (positionᵢ × directionᵢ × Greekᵢ)
        <br />
        direction = −1 (exchange short, client bought) &nbsp;|&nbsp; +1 (exchange long, client sold)
      </MathBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Net Δ (delta)" value={net?.delta?.toFixed(4) ?? "–"} color={net?.delta < 0 ? RED : GREEN} />
        <Stat label="Net Γ (gamma)" value={net?.gamma?.toFixed(6) ?? "–"} color={net?.gamma < 0 ? RED : GREEN} />
        <Stat label="Net Vega ($/pp)" value={fmtUSD(net?.vega)} color={net?.vega < 0 ? RED : GREEN} />
        <Stat label="Net Θ ($/day)" value={fmtUSD(net?.theta)} color={net?.theta > 0 ? GREEN : RED} />
      </div>

      <InfoBox title="Reading the Portfolio Greeks">
        <p className="mb-2">
          <strong>Δ = {net?.delta?.toFixed(2)}:</strong> {t("The portfolio behaves like being short ~8.3 BTC. A $1,000 BTC rally costs ~$8,300.")}
        </p>
        <p className="mb-2">
          <strong>Γ = {net?.gamma?.toFixed(6)}:</strong> {t("Negative gamma — the delta exposure worsens as BTC moves further. A $5,000 move changes delta by Γ×$5,000 = ~7.6, doubling the directional risk. This is the 'convexity trap' of being short options.")}
        </p>
        <p className="mb-2">
          <strong>V = {fmtUSD(net?.vega)}:</strong> {t("Short vega — a 1 percentage-point implied vol spike costs ~$9,600. Crypto vol can move 5-10pp in a day, making this a $48K-$96K daily risk.")}
        </p>
        <p>
          <strong>Θ = {fmtUSD(net?.theta)}/day:</strong> {t("Positive theta — the exchange earns ~$5,990 per day from time decay. This is the 'insurance premium' collected for bearing gamma and vega risk. Over 14 days: ~$83,850 earned.")}
        </p>
      </InfoBox>

      <div className="card mb-4 overflow-x-auto" style={{ maxHeight: 400 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--card-bg)]">
            <tr className="border-b border-[var(--card-border)]">
              <th className="px-2 py-1.5 text-left text-[var(--muted)]">#</th>
              <th className="px-2 py-1.5 text-left text-[var(--muted)]">Type</th>
              <th className="px-2 py-1.5 text-right text-[var(--muted)]">K/S</th>
              <th className="px-2 py-1.5 text-left text-[var(--muted)]">Maturity</th>
              <th className="px-2 py-1.5 text-right text-[var(--muted)]">BTC</th>
              <th className="px-2 py-1.5 text-left text-[var(--muted)]">Direction</th>
              <th className="px-2 py-1.5 text-right text-[var(--muted)]">Δ</th>
              <th className="px-2 py-1.5 text-right text-[var(--muted)]">Γ</th>
              <th className="px-2 py-1.5 text-right text-[var(--muted)]">V ($)</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p: any) => (
              <tr key={p.id} className="border-b border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-2 py-1 text-[var(--muted)]">{p.id}</td>
                <td className="px-2 py-1" style={{ color: p.type === "call" ? GREEN : RED }}>{p.type.toUpperCase()}</td>
                <td className="px-2 py-1 text-right">{p.moneyness?.toFixed(2)}</td>
                <td className="px-2 py-1">{p.maturity}</td>
                <td className="px-2 py-1 text-right">{p.notional_btc}</td>
                <td className="px-2 py-1" style={{ color: p.direction === -1 ? RED : GREEN }}>
                  {p.direction === -1 ? "SHORT" : "LONG"}
                </td>
                <td className="px-2 py-1 text-right" style={{ color: p.delta < 0 ? RED : GREEN }}>{p.delta?.toFixed(4)}</td>
                <td className="px-2 py-1 text-right" style={{ color: p.gamma < 0 ? RED : GREEN }}>{p.gamma?.toFixed(6)}</td>
                <td className="px-2 py-1 text-right" style={{ color: p.vega < 0 ? RED : GREEN }}>{fmtUSD(p.vega)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ height: 340 }}>
        <PlotlyChart
          data={[
            { x: byType.call.map((p: any) => p.moneyness), y: byType.call.map((p: any) => p.delta), mode: "markers", type: "scatter", name: "Calls", marker: { color: GREEN, size: 8 } },
            { x: byType.put.map((p: any) => p.moneyness), y: byType.put.map((p: any) => p.delta), mode: "markers", type: "scatter", name: "Puts", marker: { color: RED, size: 8 } },
          ]}
          layout={{ ...PLOT_LAYOUT_BASE, title: "Position Delta by Moneyness", xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "K/S" }, yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Position Δ" } }}
        />
      </div>

      <InsightBox>
        {t("The portfolio is net short gamma and vega — the classic 'selling insurance' profile. The exchange earns steady theta income but faces tail risk from large BTC moves (gamma) and volatility spikes (vega). This is exactly the risk that hedging strategies in the next section address.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 9: Hedging Strategies (Interactive Δ/Γ/V → 0) ──────── */

function HedgingStrategiesSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data?.strategies) return <section id="hedging-strategies" className="mb-12"><Loader /></section>;

  const strats = data.strategies;
  const stratKeys = ["delta_neutral", "delta_gamma_neutral", "delta_gamma_vega_neutral"];
  const net = data.net_greeks;

  const categories = ["Unhedged", "Δ-Neutral", "Δ+Γ-Neutral", "Δ+Γ+V-Neutral"];
  const deltaVals = [net.delta, strats.delta_neutral.after.delta, strats.delta_gamma_neutral.after.delta, strats.delta_gamma_vega_neutral.after.delta];
  const gammaScaled = [net.gamma * data.spot / 100, strats.delta_neutral.after.gamma * data.spot / 100, strats.delta_gamma_neutral.after.gamma * data.spot / 100, strats.delta_gamma_vega_neutral.after.gamma * data.spot / 100];
  const vegaScaled = [net.vega / 1000, strats.delta_neutral.after.vega / 1000, strats.delta_gamma_neutral.after.vega / 1000, strats.delta_gamma_vega_neutral.after.vega / 1000];

  return (
    <section id="hedging-strategies" className="mb-12">
      <STitle>{t("8. Hedging Strategies — Making Δ, Γ, V → 0")}</STitle>

      <InfoBox title="The Three Layers of Option Hedging">
        <p className="mb-2">
          <strong>{t("Layer 1 — Δ-Neutral (Spot BTC):")}</strong> {t("Trade spot BTC to zero out net delta. This removes first-order price risk — small BTC moves no longer affect P&L. Cost: just the bid-ask spread on spot. But gamma and vega risk remain untouched.")}
        </p>
        <p className="mb-2">
          <strong>{t("Layer 2 — Δ+Γ-Neutral (Spot + Short-Dated Option):")}</strong> {t("Buy ATM options with high gamma to offset the portfolio's negative gamma. This protects against large moves AND reduces rebalancing frequency. You cannot gamma-hedge with spot alone — you NEED options. Cost: the theta of the hedge options (they bleed time value).")}
        </p>
        <p>
          <strong>{t("Layer 3 — Δ+Γ+V-Neutral (Spot + 2 Options):")}</strong> {t("Add a longer-dated option (different gamma/vega ratio) to also zero out vega. This requires solving a 2×2 linear system. Now the portfolio is immune to both large moves AND volatility changes. Cost: higher theta bleed from two sets of hedge options.")}
        </p>
      </InfoBox>

      <MathBox>
        {t("Gamma-Vega hedge: solve")} [Γ_A  Γ_B; V_A  V_B] · [n_A; n_B] = [−Γ_port; −V_port]
        <br />
        {t("Then")} n_spot = −(Δ_port + n_A·Δ_A + n_B·Δ_B) {t("to restore delta-neutrality")}
      </MathBox>

      <div className="card mb-4" style={{ height: 420 }}>
        <PlotlyChart
          data={[
            { x: categories, y: deltaVals, type: "bar", name: "Delta (BTC)", marker: { color: BLUE }, width: 0.22, offset: -0.24 },
            { x: categories, y: gammaScaled, type: "bar", name: "Gamma × S/100", marker: { color: GREEN }, width: 0.22, offset: 0.0 },
            { x: categories, y: vegaScaled, type: "bar", name: "Vega ($K/pp)", marker: { color: ACCENT_HEX }, width: 0.22, offset: 0.24 },
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "Portfolio Greeks Before & After Each Hedging Strategy",
            barmode: "group",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Strategy" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Scaled Greek Value", zeroline: true, zerolinecolor: "rgba(255,255,255,0.3)" },
            shapes: [{ type: "line", y0: 0, y1: 0, x0: -0.5, x1: 3.5, line: { color: "rgba(255,255,255,0.3)", width: 1, dash: "dash" } }],
            annotations: [{ x: 3, y: 0, text: "Target: 0", showarrow: false, font: { size: 9, color: "#94a3b8" }, yshift: 12 }],
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {stratKeys.map((sk) => {
          const s = strats[sk];
          if (!s) return null;
          return (
            <div key={sk} className="card">
              <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>{s.label}</p>
              {s.hedge.map((h: any, i: number) => (
                <p key={i} className="text-xs text-[var(--muted)] mb-1">
                  {h.instrument}: <span className="font-mono">{h.quantity_btc != null ? `${h.quantity_btc > 0 ? "+" : ""}${h.quantity_btc?.toFixed(2)} BTC` : `${h.quantity > 0 ? "+" : ""}${h.quantity?.toFixed(1)} contracts`}</span>
                </p>
              ))}
              <div className="mt-2 pt-2 border-t border-[var(--card-border)]">
                <p className="text-[10px] text-[var(--muted)]">
                  After: Δ={s.after.delta?.toFixed(4)} &nbsp; Γ={s.after.gamma?.toFixed(6)} &nbsp; V={fmtUSD(s.after.vega)} &nbsp; Θ={fmtUSD(s.after.theta)}/d
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <InfoBox title="The Fundamental Tradeoff: Theta vs. Protection">
        <p className="mb-2">
          {t("Notice how Theta changes across strategies:")}
        </p>
        <p className="mb-1">
          • <strong>Unhedged:</strong> Θ = {fmtUSD(net.theta)}/day — {t("earning ~$6K/day from selling insurance")}
        </p>
        <p className="mb-1">
          • <strong>Δ-Neutral:</strong> Θ = {fmtUSD(strats.delta_neutral.after.theta)}/day — {t("same (spot hedge has no theta)")}
        </p>
        <p className="mb-1">
          • <strong>Δ+Γ-Neutral:</strong> Θ = {fmtUSD(strats.delta_gamma_neutral.after.theta)}/day — {t("theta dropped! Buying options to hedge costs theta")}
        </p>
        <p>
          • <strong>Δ+Γ+V-Neutral:</strong> Θ = {fmtUSD(strats.delta_gamma_vega_neutral.after.theta)}/day — {t("negative theta — hedging costs more than the premium earned")}
        </p>
      </InfoBox>

      <InsightBox>
        {t("Delta-hedging is essentially free (just trade spot). But gamma and vega hedging cost real money — you must buy options, which bleed theta. The exchange must decide: keep the theta income and bear the tail risk, or pay for full protection? Most professional desks delta-hedge always and selectively gamma/vega-hedge based on market conditions.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 9b: Live Hedge Engine — Trade-by-Trade Rebalancing ── */

function HedgeEngineSection({ data }: { data: any }) {
  const { t } = useI18n();
  const [visibleTrades, setVisibleTrades] = useState(5);

  if (!data?.hedge_history) return <section id="hedge-engine" className="mb-12"><Loader /></section>;

  const history: any[] = data.hedge_history || [];
  const shown = history.slice(0, visibleTrades);

  const cumDelta = history.map((_: any, i: number) => history[i].exposure_after.delta);
  const cumGamma = history.map((_: any, i: number) => history[i].exposure_after.gamma);
  const cumVega = history.map((_: any, i: number) => history[i].exposure_after.vega);
  const hedgeSpot = history.map((h: any) => h.hedge_prescription.spot_btc);
  const hedgeA = history.map((h: any) => h.hedge_prescription.option_a_qty);
  const hedgeB = history.map((h: any) => h.hedge_prescription.option_b_qty);
  const tradeIds = history.map((h: any) => `Trade ${h.trade_id}`);

  return (
    <section id="hedge-engine" className="mb-12">
      <STitle>{t("9. Live Hedge Engine — Trade-by-Trade Rebalancing")}</STitle>

      <InfoBox title="How the Hedge Engine Works in Real Time">
        <p className="mb-2">
          {t("This simulates exactly what a production hedge engine does. Client trades arrive one by one. After EACH trade, the engine:")}
        </p>
        <p className="mb-1">
          <strong>1.</strong> {t("Aggregates the new position into the running portfolio Greeks")}
        </p>
        <p className="mb-1">
          <strong>2.</strong> {t("Solves the linear system: [Γ_A Γ_B; V_A V_B] · [n_A; n_B] = [−Γ_net; −V_net] to find the required option hedge quantities")}
        </p>
        <p className="mb-1">
          <strong>3.</strong> {t("Computes the spot BTC hedge: n_spot = −(Δ_net + n_A·Δ_A + n_B·Δ_B)")}
        </p>
        <p>
          <strong>4.</strong> {t("Outputs a concrete prescription: 'Buy/Sell X contracts of instrument A, Y of instrument B, and Z BTC spot'")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[
              { x: tradeIds, y: cumDelta, type: "scatter", mode: "lines+markers", name: "Δ (BTC)", line: { color: BLUE, width: 2 }, marker: { size: 5 } },
              { x: tradeIds, y: cumGamma.map((g: number) => g * (data.spot || 107000) / 10), type: "scatter", mode: "lines+markers", name: "Γ×S/10", line: { color: GREEN, width: 2 }, marker: { size: 5 } },
              { x: tradeIds, y: cumVega.map((v: number) => v / 100), type: "scatter", mode: "lines+markers", name: "V/100", line: { color: ACCENT_HEX, width: 2 }, marker: { size: 5 } },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Cumulative Exposure (Before Hedging) as Trades Arrive",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, tickangle: -45, title: "Trade" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Scaled Greek" },
              shapes: [{ type: "line", y0: 0, y1: 0, x0: tradeIds[0], x1: tradeIds[tradeIds.length - 1], line: { color: "rgba(255,255,255,0.2)", width: 1, dash: "dash" } }],
            }}
          />
        </div>
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[
              { x: tradeIds, y: hedgeSpot, type: "bar", name: "Spot BTC", marker: { color: BLUE }, width: 0.25, offset: -0.27 },
              { x: tradeIds, y: hedgeA, type: "bar", name: data.hedge_instruments?.A?.label || "7d Call", marker: { color: GREEN }, width: 0.25, offset: 0 },
              { x: tradeIds, y: hedgeB, type: "bar", name: data.hedge_instruments?.B?.label || "30d Call", marker: { color: ACCENT_HEX }, width: 0.25, offset: 0.27 },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Hedge Prescription After Each Trade",
              barmode: "group",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, tickangle: -45, title: "Trade" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Quantity (contracts / BTC)" },
            }}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {shown.map((h: any) => {
          const p = h.hedge_prescription;
          const ea = h.exposure_after;
          return (
            <div key={h.trade_id} className="card" style={{ borderLeft: `3px solid ${ACCENT_HEX}` }}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[250px]">
                  <p className="text-xs font-bold mb-1" style={{ color: AMBER }}>
                    Trade #{h.trade_id}
                  </p>
                  <p className="text-xs text-[var(--foreground)] font-medium mb-2">{h.trade_desc}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    Net Exposure → Δ={ea.delta?.toFixed(4)} &nbsp; Γ={ea.gamma?.toFixed(6)} &nbsp; V={fmtUSD(ea.vega)}
                  </p>
                </div>
                <div className="flex-1 min-w-[300px]" style={{ background: "rgba(168,85,247,0.06)", borderRadius: 8, padding: "8px 12px" }}>
                  <p className="text-[10px] font-bold mb-1" style={{ color: ACCENT_HEX }}>HEDGE PRESCRIPTION</p>
                  <div className="space-y-0.5">
                    <p className="text-xs font-mono">
                      <span style={{ color: BLUE }}>●</span> Spot BTC: <strong>{p.spot_btc > 0 ? "+" : ""}{p.spot_btc?.toFixed(2)} BTC</strong>
                      <span className="text-[var(--muted)]"> ({p.spot_btc > 0 ? "BUY" : "SELL"} on exchange)</span>
                    </p>
                    <p className="text-xs font-mono">
                      <span style={{ color: GREEN }}>●</span> {p.option_a_label}: <strong>{p.option_a_qty > 0 ? "+" : ""}{p.option_a_qty?.toFixed(1)} contracts</strong>
                      <span className="text-[var(--muted)]"> ({p.option_a_qty > 0 ? "BUY" : "SELL"} on Deribit)</span>
                    </p>
                    <p className="text-xs font-mono">
                      <span style={{ color: ACCENT_HEX }}>●</span> {p.option_b_label}: <strong>{p.option_b_qty > 0 ? "+" : ""}{p.option_b_qty?.toFixed(1)} contracts</strong>
                      <span className="text-[var(--muted)]"> ({p.option_b_qty > 0 ? "BUY" : "SELL"} on Deribit)</span>
                    </p>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: GREEN }}>
                    ✓ After: Δ = 0 &nbsp; Γ ≈ 0 &nbsp; V ≈ 0
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleTrades < history.length && (
        <button
          onClick={() => setVisibleTrades((v) => Math.min(v + 5, history.length))}
          className="w-full text-center text-xs py-2 rounded-lg border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--accent-purple)] hover:border-[var(--accent-purple)] transition-all"
        >
          Show more trades ({visibleTrades} of {history.length})
        </button>
      )}

      <InfoBox title="Production Implementation">
        <p className="mb-2">
          {t("In production, this exact computation runs every time a client opens or closes a position. The key differences from this simulation:")}
        </p>
        <p className="mb-1">
          • <strong>{t("Speed")}:</strong> {t("The linear system solve is O(1) — instant. The bottleneck is fetching live option prices from the hedging venue (Deribit, OKX) to compute current Greeks. Typical latency: 10-50ms.")}
        </p>
        <p className="mb-1">
          • <strong>{t("Execution")}:</strong> {t("Hedge orders are sent via API to the external venue. Smart order routing splits large orders to minimize market impact.")}
        </p>
        <p className="mb-1">
          • <strong>{t("Netting")}:</strong> {t("If two clients trade opposite positions simultaneously (one buys, one sells the same option), they net out — no hedge needed. This natural netting reduces hedging costs significantly.")}
        </p>
        <p>
          • <strong>{t("Frequency")}:</strong> {t("Delta is rebalanced continuously (every new trade). Gamma/vega hedges are typically rebalanced less frequently (every few minutes or when exposure exceeds a threshold) because option trades have higher execution costs.")}
        </p>
      </InfoBox>

      <InsightBox>
        {t("This is the core of the exchange's risk engine. Every row above represents a real decision: 'a client just traded → here's exactly what we must do on the hedging venue to stay neutral.' The computation is trivially fast (just linear algebra). The hard part in production is execution: getting fills at good prices on illiquid crypto options markets.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 10: Dynamic Hedging Simulation ──────────────────────── */

function DynamicHedgingSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data?.strategies) return <section id="dynamic-hedging" className="mb-12"><Loader /></section>;

  const ts = data.timestamps;
  const strats = data.strategies;
  const attr = data.pnl_attribution;
  const attrF = data.pnl_attribution_final;

  const stratColors: Record<string, string> = {
    unhedged: "#64748b",
    delta_only: BLUE,
    delta_gamma: GREEN,
    delta_gamma_vega: ACCENT_HEX,
  };
  const stratLabels: Record<string, string> = {
    unhedged: "Unhedged",
    delta_only: "Δ-Neutral",
    delta_gamma: "Δ+Γ-Neutral",
    delta_gamma_vega: "Δ+Γ+V-Neutral",
  };

  return (
    <section id="dynamic-hedging" className="mb-12">
      <STitle>{t("10. Dynamic Hedging Simulation (14 Days)")}</STitle>

      <InfoBox title="What This Simulation Shows">
        <p className="mb-2">
          {t("We generate a realistic 14-day BTC price path (with jumps and stochastic volatility) and simulate four strategies in parallel: (1) do nothing (unhedged), (2) delta-hedge only, (3) delta+gamma-hedge, (4) fully hedge delta+gamma+vega. At each 4-hour rebalance, hedges are adjusted to current Greeks.")}
        </p>
        <p>
          {t("The cumulative P&L chart below shows how each strategy's P&L evolves over time. The fully hedged strategy should have the smallest variance — proving that systematic hedging reduces risk, even though it costs theta.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"].map((s) => (
          <Stat key={s} label={stratLabels[s]} value={fmtUSD(strats[s]?.final_pnl)} color={stratColors[s]} />
        ))}
      </div>

      <div className="card mb-4" style={{ height: 400 }}>
        <PlotlyChart
          data={[
            { x: ts, y: data.spot_path, type: "scatter", mode: "lines", name: "BTC Spot", line: { color: AMBER, width: 1.5 }, yaxis: "y2" },
            ...["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"].map((s) => ({
              x: ts, y: strats[s].pnl, type: "scatter" as const, mode: "lines" as const,
              name: stratLabels[s], line: { color: stratColors[s], width: s === "delta_gamma_vega" ? 2.5 : 1.5 },
            })),
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "Cumulative P&L: 4 Hedging Strategies",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Days" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Cumulative P&L ($)", side: "left" },
            yaxis2: { overlaying: "y", side: "right", title: "BTC ($)", gridcolor: "rgba(0,0,0,0)", showgrid: false, titlefont: { color: AMBER, size: 10 }, tickfont: { color: AMBER, size: 9 } },
          }}
        />
      </div>

      <div className="card mb-4" style={{ height: 350 }}>
        <PlotlyChart
          data={["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"].map((s) => ({
            x: ts, y: strats[s].net_delta, type: "scatter" as const, mode: "lines" as const,
            name: stratLabels[s], line: { color: stratColors[s], width: 1.5 },
          }))}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "Net Delta Over Time (After Hedging)",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Days" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Net Δ (BTC equiv.)" },
            shapes: [{ type: "line", y0: 0, y1: 0, x0: ts[0], x1: ts[ts.length - 1], line: { color: "rgba(255,255,255,0.2)", width: 1, dash: "dash" } }],
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"].map((s) => ({
              x: ts, y: strats[s].net_gamma, type: "scatter" as const, mode: "lines" as const,
              name: stratLabels[s], line: { color: stratColors[s], width: 1.5 },
            }))}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Net Gamma Over Time",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Days" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Net Γ" },
              shapes: [{ type: "line", y0: 0, y1: 0, x0: ts[0], x1: ts[ts.length - 1], line: { color: "rgba(255,255,255,0.2)", width: 1, dash: "dash" } }],
            }}
          />
        </div>
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"].map((s) => ({
              x: ts, y: strats[s].net_vega, type: "scatter" as const, mode: "lines" as const,
              name: stratLabels[s], line: { color: stratColors[s], width: 1.5 },
            }))}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: "Net Vega Over Time",
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Days" },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Net Vega ($/pp)" },
              shapes: [{ type: "line", y0: 0, y1: 0, x0: ts[0], x1: ts[ts.length - 1], line: { color: "rgba(255,255,255,0.2)", width: 1, dash: "dash" } }],
            }}
          />
        </div>
      </div>

      <InfoBox title="P&L Attribution — Where Does the Money Come From?">
        <p className="mb-2">
          {t("Using the Taylor expansion of the portfolio value, we decompose the unhedged P&L into its source components:")}
        </p>
        <p className="mb-1">
          ΔP&L ≈ Δ·ΔS + ½Γ·ΔS² + V·Δσ + Θ·Δt + residual
        </p>
      </InfoBox>

      <div className="card mb-4" style={{ height: 380 }}>
        <PlotlyChart
          data={[
            { x: ts.slice(0, attr?.delta?.length), y: attr?.delta, type: "scatter", mode: "lines", name: "Delta P&L", line: { color: BLUE, width: 1.5 }, fill: "tozeroy", fillcolor: `${BLUE}15` },
            { x: ts.slice(0, attr?.gamma?.length), y: attr?.gamma, type: "scatter", mode: "lines", name: "Gamma P&L", line: { color: GREEN, width: 1.5 }, fill: "tozeroy", fillcolor: `${GREEN}15` },
            { x: ts.slice(0, attr?.vega?.length), y: attr?.vega, type: "scatter", mode: "lines", name: "Vega P&L", line: { color: ACCENT_HEX, width: 1.5 }, fill: "tozeroy", fillcolor: `${ACCENT_HEX}15` },
            { x: ts.slice(0, attr?.theta?.length), y: attr?.theta, type: "scatter", mode: "lines", name: "Theta P&L", line: { color: AMBER, width: 1.5 }, fill: "tozeroy", fillcolor: `${AMBER}15` },
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "Cumulative P&L Attribution (Unhedged Portfolio)",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "Days" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Cumulative P&L ($)" },
          }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <Stat label="Delta P&L" value={fmtUSD(attrF?.delta)} color={BLUE} />
        <Stat label="Gamma P&L" value={fmtUSD(attrF?.gamma)} color={GREEN} />
        <Stat label="Vega P&L" value={fmtUSD(attrF?.vega)} color={ACCENT_HEX} />
        <Stat label="Theta P&L" value={fmtUSD(attrF?.theta)} color={AMBER} />
        <Stat label="Residual" value={fmtUSD(attrF?.residual)} color="#64748b" />
      </div>

      <InsightBox>
        {t("The key takeaway: Δ+Γ+V-Neutral has the smallest P&L variance (std ~$2.3K vs ~$31K unhedged — a 93% reduction). But it comes at a cost: the net theta is negative, meaning the hedge costs more per day than the premium earned. In practice, exchanges dynamically adjust how much gamma/vega to hedge based on market conditions: hedge more aggressively when vol is elevated, let more ride when markets are calm.")}
      </InsightBox>
    </section>
  );
}

/* ── Section 11: Stress Tests & VaR ──────────────────────────────── */

function StressTestsSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="stress-tests" className="mb-12"><Loader /></section>;

  const scenarios: any[] = data.scenarios || [];
  const v = data.var;

  const histCounts = v?.histogram_counts || [];
  const histEdges = v?.histogram_edges || [];
  const histMids = histEdges.slice(0, -1).map((e: number, i: number) => (e + histEdges[i + 1]) / 2);

  return (
    <section id="stress-tests" className="mb-12">
      <STitle>{t("11. Stress Testing & Value at Risk")}</STitle>

      <InfoBox title="Why Stress Test?">
        <p className="mb-2">
          {t("Greeks give a local, linear approximation of risk. Stress tests show what happens under extreme but plausible scenarios — the kind of events that happen every few months in crypto. We shock the spot price (±10-30%) and implied volatility (±25-80%) and reprice every option in the portfolio.")}
        </p>
        <p>
          {t("Value at Risk (VaR) estimates the worst-case 1-day loss at a given confidence level. We simulate 10,000 random 1-day scenarios using the portfolio's Greeks and realistic BTC daily volatility. CVaR (Conditional VaR / Expected Shortfall) measures the average loss in the worst 1% of cases — capturing tail risk that VaR misses.")}
        </p>
      </InfoBox>

      <MathBox>
        VaR₉₅ = −percentile(P&L_sim, 5%) &nbsp;|&nbsp; VaR₉₉ = −percentile(P&L_sim, 1%)
        <br />
        CVaR₉₉ = −E[P&L | P&L ≤ VaR₉₉]
      </MathBox>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="VaR 95% (1-day)" value={fmtUSD(v?.var_95 != null ? -v.var_95 : null)} color={AMBER} />
        <Stat label="VaR 99% (1-day)" value={fmtUSD(v?.var_99 != null ? -v.var_99 : null)} color={RED} />
        <Stat label="CVaR 99% (1-day)" value={fmtUSD(v?.cvar_99 != null ? -v.cvar_99 : null)} color={RED} />
      </div>

      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="px-3 py-2 text-left text-[var(--muted)]">Scenario</th>
              <th className="px-3 py-2 text-right text-[var(--muted)]">Spot Shock</th>
              <th className="px-3 py-2 text-right text-[var(--muted)]">Vol Shock</th>
              <th className="px-3 py-2 text-right text-[var(--muted)]">Portfolio P&L</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((sc: any, i: number) => (
              <tr key={i} className="border-b border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.02)]">
                <td className="px-3 py-1.5 font-medium">{sc.name}</td>
                <td className="px-3 py-1.5 text-right" style={{ color: sc.spot_shock < 0 ? RED : sc.spot_shock > 0 ? GREEN : "#94a3b8" }}>
                  {sc.spot_shock !== 0 ? `${(sc.spot_shock * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="px-3 py-1.5 text-right" style={{ color: sc.vol_shock > 0 ? RED : sc.vol_shock < 0 ? GREEN : "#94a3b8" }}>
                  {sc.vol_shock !== 0 ? `${(sc.vol_shock * 100).toFixed(0)}%` : "—"}
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-bold" style={{ color: sc.pnl < 0 ? RED : GREEN }}>
                  {fmtUSD(sc.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mb-4" style={{ height: 360 }}>
        <PlotlyChart
          data={[
            { x: scenarios.map((s: any) => s.name), y: scenarios.map((s: any) => s.pnl), type: "bar",
              marker: { color: scenarios.map((s: any) => s.pnl < 0 ? RED : GREEN) },
            },
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "Stress Test P&L by Scenario",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, tickangle: -30, title: "Scenario" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "P&L ($)" },
          }}
        />
      </div>

      <div className="card mb-4" style={{ height: 360 }}>
        <PlotlyChart
          data={[
            { x: histMids, y: histCounts, type: "bar", marker: {
              color: histMids.map((m: number) => m < (v?.var_99 || 0) ? RED : m < (v?.var_95 || 0) ? AMBER : BLUE),
            }},
          ]}
          layout={{
            ...PLOT_LAYOUT_BASE,
            title: "1-Day P&L Distribution (10K Monte Carlo Scenarios)",
            xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: "1-Day P&L ($)" },
            yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: "Frequency" },
            shapes: [
              { type: "line", x0: v?.var_95, x1: v?.var_95, y0: 0, y1: Math.max(...histCounts) * 0.9, line: { color: AMBER, width: 2, dash: "dash" } },
              { type: "line", x0: v?.var_99, x1: v?.var_99, y0: 0, y1: Math.max(...histCounts) * 0.9, line: { color: RED, width: 2, dash: "dash" } },
            ],
            annotations: [
              { x: v?.var_95, y: Math.max(...histCounts) * 0.95, text: "VaR 95%", showarrow: false, font: { size: 9, color: AMBER } },
              { x: v?.var_99, y: Math.max(...histCounts) * 0.85, text: "VaR 99%", showarrow: false, font: { size: 9, color: RED } },
            ],
          }}
        />
      </div>

      <InfoBox title="Interpreting Stress Test Results">
        <p className="mb-2">
          <strong>{t("Worst case")}:</strong> {t("A flash crash (−30% spot + 80% vol spike) would cost")} {fmtUSD(scenarios.find((s: any) => s.name.includes("Flash"))?.pnl)}. {t("This sets the minimum capital reserve the exchange needs.")}
        </p>
        <p className="mb-2">
          <strong>{t("Asymmetry")}:</strong> {t("The portfolio loses on both rallies and crashes — that's the signature of a short-gamma book. But crashes are worse because they come with vol spikes (double hit: gamma + vega loss).")}
        </p>
        <p>
          <strong>{t("VaR vs CVaR")}:</strong> {t("VaR 99% says 'there's a 1% chance of losing more than this.' CVaR 99% says 'when we DO lose more, here's the average loss.' CVaR is always worse than VaR and is the preferred metric for capital allocation because it captures tail risk.")}
        </p>
      </InfoBox>

      <InsightBox>
        {t("For an exchange launching options, the stress test results directly inform margin requirements: at minimum, each client's margin should cover the VaR 99% of their position. The flash crash scenario suggests the exchange needs a capital buffer of at least")} {fmtUSD(scenarios.find((s: any) => s.name.includes("Flash"))?.pnl != null ? -scenarios.find((s: any) => s.name.includes("Flash")).pnl : null)} {t("to survive a 2020-style crypto crash without becoming insolvent.")}
      </InsightBox>
    </section>
  );
}
