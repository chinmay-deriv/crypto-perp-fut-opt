"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PlotlyChart from "../../components/charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTIONS: { id: string; label: string }[] = [
  { id: "overview", label: "1. Unified Portfolio" },
  { id: "risk-dashboard", label: "2. Risk Dashboard" },
  { id: "hedge-engine", label: "3. Unified Hedge Engine" },
  /* { id: "netting", label: "4. Cross-Product Netting" }, */
  /* { id: "dynamic-sim", label: "5. Dynamic Simulation" }, */
  /* { id: "stress-tests", label: "6. Stress Tests & VaR" }, */
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

const ACCENT = "var(--accent-red, #ef4444)";
const ACCENT_HEX = "#ef4444";
const ORANGE = "#f59e0b";
const BLUE = "#3b82f6";
const GREEN = "#10b981";
const PURPLE = "#a855f7";
const TEAL = "#14b8a6";

export default function UnifiedRisk() {
  const { t } = useI18n();
  const [d, setD] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const files = ["portfolio", "hedge_rebalance", "netting_benefit", "dynamic_sim", "stress_tests"];
    files.forEach((f) =>
      fetchJSON(`/data/unified-risk/${f}.json`).then((v) =>
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
        for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id);
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
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4 pt-6 overflow-y-auto">
        <Link href="/" className="text-[10px] text-[var(--muted)] hover:text-[#ef4444] transition mb-2 block">
          {t("← Home")}
        </Link>
        <div className="mb-4">
          <h1 className="text-sm font-bold text-[#ef4444] leading-tight">{t("Unified Risk")}</h1>
          <h2 className="text-xs text-[var(--muted)]">{t("Perps + Options Combined")}</h2>
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                activeSection === id
                  ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">Unified Risk Engine</p>
          <p className="text-[10px] text-[var(--muted)]">Sections 1–3 · Perps + Options</p>
        </div>
      </nav>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {t("Unified Risk Engine")}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t("Combined perpetual futures & vanilla options risk management — unified Greek exposure, cross-product netting, and a single hedge engine for the entire derivatives book.")}
          </p>
          <div className="flex gap-3 mt-3 flex-wrap">
            {[
              { label: "Perpetual Futures", color: GREEN },
              { label: "Vanilla Options", color: PURPLE },
              { label: "Hybrid Greeks", color: ORANGE },
              { label: "DGV-Neutral Hedging", color: ACCENT_HEX },
            ].map((b) => (
              <span key={b.label} className="text-[10px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: `${b.color}18`, color: b.color }}>
                {b.label}
              </span>
            ))}
          </div>
        </header>

        <OverviewSection data={d.portfolio} />
        <RiskDashboardSection data={d.portfolio} />
        <HedgeEngineSection data={d.hedge_rebalance} />
        {/* <NettingSection data={d.netting_benefit} /> */}
        {/* <DynamicSimSection data={d.dynamic_sim} /> */}
        {/* <StressTestsSection data={d.stress_tests} /> */}

        <footer className="mt-12 pt-6 border-t border-[var(--card-border)] text-center text-xs text-[var(--muted)]">
          <p>{t("Unified Risk Engine · Built with Next.js, Plotly.js, Python")}</p>
          <p className="mt-1">{t("Data: BTCUSDT 1-second klines, Binance, Jan–Jun 2025")}</p>
        </footer>
      </main>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */
function Loader() {
  return <div className="card animate-pulse h-32 flex items-center justify-center text-[var(--muted)]">Loading…</div>;
}
function STitle({ children }: { children: React.ReactNode }) {
  return <h2 className="section-title" style={{ color: ACCENT_HEX }}>{children}</h2>;
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
      <p className="text-xs font-bold mb-1" style={{ color: ACCENT_HEX }}>{title}</p>
      <div className="text-xs text-[var(--muted)] leading-relaxed">{children}</div>
    </div>
  );
}
function MathBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mb-4 font-mono text-xs text-center py-3"
      style={{ background: "rgba(239,68,68,0.06)", borderLeft: `3px solid ${ACCENT_HEX}` }}>
      {children}
    </div>
  );
}
function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="card mt-4" style={{ background: "rgba(239,68,68,0.06)", borderLeft: `3px solid ${ORANGE}` }}>
      <p className="text-xs font-bold mb-1" style={{ color: ORANGE }}>Key Insight</p>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{children}</p>
    </div>
  );
}
function fmt(v: number | null | undefined, d = 0): string {
  if (v == null) return "–";
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtUSD(v: number | null | undefined): string {
  if (v == null) return "–";
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const PLOT_BG = "rgba(0,0,0,0)";
const GRID_COLOR = "rgba(255,255,255,0.06)";
const PLOT_LAYOUT_BASE: Record<string, any> = {
  paper_bgcolor: PLOT_BG, plot_bgcolor: PLOT_BG,
  font: { color: "#94a3b8", size: 10 },
  margin: { l: 55, r: 20, t: 40, b: 45 },
  xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR },
  legend: { orientation: "h" as const, y: -0.2, font: { size: 9 } },
};

/* ═══════════ SECTION 1: Unified Portfolio Overview ═══════════════ */
function OverviewSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="overview" className="mb-12"><Loader /></section>;

  const pg = data.perp_greeks;
  const og = data.option_greeks;
  const cg = data.combined_greeks;

  return (
    <section id="overview" className="mb-12">
      <STitle>{t("1. Unified Portfolio — Perps + Options")}</STitle>

      <InfoBox title={t("Why a Unified View?")}>
        <p className="mb-2">
          {t("When the exchange offers both perpetual futures and vanilla options, clients trading either product create risk exposure for the exchange. A perpetual future is a linear instrument — it only creates Delta (directional) exposure. An option is nonlinear — it creates Delta, Gamma, Vega, and Theta exposure simultaneously.")}
        </p>
        <p>
          {t("A unified risk engine aggregates Greeks across both product types into a single vector. This is essential because a client going long a perp and another client selling a call may partially offset each other's Delta — the exchange should not hedge both separately.")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">{t("Greeks by Instrument Type")}</p>
        <p>Perp (long 1 BTC): Δ = +1, Γ = 0, V = 0, Θ = 0</p>
        <p>Perp (short 1 BTC): Δ = −1, Γ = 0, V = 0, Θ = 0</p>
        <p className="mt-1">Option: Δ = ∂C/∂S, Γ = ∂²C/∂S², V = ∂C/∂σ, Θ = ∂C/∂t</p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">Net Δ_total = Σ Δ_perps + Σ Δ_options</p>
      </MathBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Perp Positions")} value={`${data.n_perps}`} color={GREEN} />
        <Stat label={t("Option Positions")} value={`${data.n_options}`} color={PURPLE} />
        <Stat label={t("Total Positions")} value={`${data.n_total}`} color={ACCENT_HEX} />
        <Stat label={t("Spot")} value={`$${fmt(data.spot)}`} />
      </div>

      {/* Greek decomposition table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--muted)] border-b border-[var(--card-border)]">
              <th className="text-left py-2 px-2">{t("Source")}</th>
              <th className="text-right py-2 px-2">Δ (Delta)</th>
              <th className="text-right py-2 px-2">Γ (Gamma)</th>
              <th className="text-right py-2 px-2">V (Vega $)</th>
              <th className="text-right py-2 px-2">Θ (Theta $/day)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--card-border)]">
              <td className="py-2 px-2 font-medium" style={{ color: GREEN }}>Perpetual Futures</td>
              <td className="text-right py-2 px-2">{pg.delta.toFixed(2)}</td>
              <td className="text-right py-2 px-2 text-[var(--muted)]">0.0000</td>
              <td className="text-right py-2 px-2 text-[var(--muted)]">$0.00</td>
              <td className="text-right py-2 px-2 text-[var(--muted)]">$0.00</td>
            </tr>
            <tr className="border-b border-[var(--card-border)]">
              <td className="py-2 px-2 font-medium" style={{ color: PURPLE }}>Vanilla Options</td>
              <td className="text-right py-2 px-2">{og.delta.toFixed(4)}</td>
              <td className="text-right py-2 px-2">{og.gamma.toFixed(6)}</td>
              <td className="text-right py-2 px-2">{fmtUSD(og.vega)}</td>
              <td className="text-right py-2 px-2">{fmtUSD(og.theta)}</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2 px-2" style={{ color: ACCENT_HEX }}>Combined</td>
              <td className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{cg.delta.toFixed(4)}</td>
              <td className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{cg.gamma.toFixed(6)}</td>
              <td className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{fmtUSD(cg.vega)}</td>
              <td className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{fmtUSD(cg.theta)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delta stacked bar */}
      <PlotlyChart
        data={[
          { x: ["Delta"], y: [pg.delta], type: "bar", name: "Perps Δ", marker: { color: GREEN } },
          { x: ["Delta"], y: [og.delta], type: "bar", name: "Options Δ", marker: { color: PURPLE } },
        ]}
        layout={{ ...PLOT_LAYOUT_BASE, title: { text: t("Delta Decomposition: Perps vs Options"), font: { size: 12 } },
          barmode: "stack", height: 250,
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Delta (BTC)" } } }}
      />

      <InsightBox>
        {t(`The exchange holds ${data.n_perps} perp positions contributing Δ=${pg.delta.toFixed(2)} BTC and ${data.n_options} option positions contributing Δ=${og.delta.toFixed(2)} BTC. Combined net Delta is ${cg.delta.toFixed(2)} BTC ($${fmt(cg.delta * data.spot)} exposure). Critically, Gamma and Vega come entirely from the options book — perps are purely linear instruments.`)}
      </InsightBox>
    </section>
  );
}

/* ═══════════ SECTION 2: Risk Dashboard ═══════════════════════════ */
function RiskDashboardSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="risk-dashboard" className="mb-12"><Loader /></section>;

  const cg = data.combined_greeks;
  const S = data.spot;

  return (
    <section id="risk-dashboard" className="mb-12">
      <STitle>{t("2. Real-Time Risk Dashboard")}</STitle>

      <InfoBox title={t("What Does the Exchange See?")}>
        <p className="mb-2">
          {t("The risk dashboard shows the exchange's net exposure across the entire derivatives book at a glance. The key numbers are: net Delta (how much does the exchange gain/lose per $1 BTC move), net Gamma (how fast does Delta change — critical for large moves), and net Vega (how much does the exchange gain/lose per 1 percentage-point change in implied volatility).")}
        </p>
        <p>
          {t("For the combined book, Gamma and Vega are nonzero only because of the options positions. If the exchange only offered perps, risk management would be purely about Delta — the moment options are introduced, Gamma and Vega become dominant risk factors.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Net Delta (BTC)")} value={cg.delta.toFixed(2)} color={ACCENT_HEX} />
        <Stat label={t("Net Gamma")} value={cg.gamma.toFixed(6)} color={ORANGE} />
        <Stat label={t("Net Vega ($)")} value={fmtUSD(cg.vega)} color={PURPLE} />
        <Stat label={t("Net Theta ($/day)")} value={fmtUSD(cg.theta)} color={GREEN} />
      </div>

      {/* Impact scenarios */}
      <div className="card mb-4">
        <p className="text-xs font-bold mb-3" style={{ color: ACCENT_HEX }}>{t("Instant P&L Impact Estimates")}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)" }}>
            <p className="font-medium mb-2">BTC +1% (${fmt(S * 0.01)})</p>
            <p>Delta P&L: {fmtUSD(cg.delta * S * 0.01)}</p>
            <p>Gamma P&L: {fmtUSD(0.5 * cg.gamma * (S * 0.01) ** 2)}</p>
            <p className="font-bold mt-1">Total ≈ {fmtUSD(cg.delta * S * 0.01 + 0.5 * cg.gamma * (S * 0.01) ** 2)}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.06)" }}>
            <p className="font-medium mb-2">BTC −5% (${fmt(S * 0.05)})</p>
            <p>Delta P&L: {fmtUSD(-cg.delta * S * 0.05)}</p>
            <p>Gamma P&L: {fmtUSD(0.5 * cg.gamma * (S * 0.05) ** 2)}</p>
            <p className="font-bold mt-1">Total ≈ {fmtUSD(-cg.delta * S * 0.05 + 0.5 * cg.gamma * (S * 0.05) ** 2)}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(168,85,247,0.06)" }}>
            <p className="font-medium mb-2">Vol +1 pp</p>
            <p>Vega P&L: {fmtUSD(cg.vega)}</p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "rgba(16,185,129,0.06)" }}>
            <p className="font-medium mb-2">1 Day Passes</p>
            <p>Theta P&L: {fmtUSD(cg.theta)}</p>
          </div>
        </div>
      </div>

      {/* Greek source pie */}
      <PlotlyChart
        data={[{
          type: "pie",
          labels: ["Perp Delta", "Option Delta", "Option Gamma", "Option Vega"],
          values: [
            Math.abs(data.perp_greeks.delta * S),
            Math.abs(data.option_greeks.delta * S),
            Math.abs(data.option_greeks.gamma * S * S * 0.01),
            Math.abs(data.option_greeks.vega),
          ],
          marker: { colors: [GREEN, PURPLE, ORANGE, BLUE] },
          textinfo: "label+percent",
          hole: 0.45,
        }]}
        layout={{ ...PLOT_LAYOUT_BASE, title: { text: t("Risk Contribution by Source ($)"), font: { size: 12 } }, height: 300, showlegend: false }}
      />

      <InsightBox>
        {t(`The exchange has net long Delta of ${cg.delta.toFixed(2)} BTC ($${fmt(cg.delta * S)} exposure) — a $${fmt(cg.delta * S * 0.01)} gain per 1% BTC rally. The negative Gamma (${cg.gamma.toFixed(6)}) means large moves in either direction accelerate losses. Negative Vega (${fmtUSD(cg.vega)}) means the exchange loses money if implied volatility rises — typical of a short-options book. Positive Theta (${fmtUSD(cg.theta)}/day) is the premium collected for bearing these risks.`)}
      </InsightBox>
    </section>
  );
}

/* ═══════════ SECTION 3: Unified Hedge Engine ═════════════════════ */
function HedgeEngineSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="hedge-engine" className="mb-12"><Loader /></section>;

  const hh = data.hedge_history || [];
  const trades = data.trades || [];

  const ids = hh.map((_: any, i: number) => i + 1);
  const cum_delta = hh.map((h: any) => h.exposure_after.delta);
  const cum_gamma = hh.map((h: any) => h.exposure_after.gamma * data.spot * 100);
  const cum_vega = hh.map((h: any) => h.exposure_after.vega);
  const h_spot = hh.map((h: any) => h.hedge_prescription.spot_btc);
  const h_a = hh.map((h: any) => h.hedge_prescription.option_a_qty);
  const h_b = hh.map((h: any) => h.hedge_prescription.option_b_qty);

  const perp_trades = trades.filter((t: any) => t.instrument === "perp").length;
  const opt_trades = trades.filter((t: any) => t.instrument === "option").length;

  return (
    <section id="hedge-engine" className="mb-12">
      <STitle>{t("3. Unified Hedge Engine — Trade-by-Trade")}</STitle>

      <InfoBox title={t("One Engine for All Derivatives")}>
        <p className="mb-2">
          {t("As client trades arrive — whether perpetual futures or vanilla options — the engine updates the aggregate Greek vector and computes the DGV-neutral hedge prescription. This is the operational core: after every trade, the risk desk knows exactly what positions to open or close.")}
        </p>
        <p>
          {t("The key insight: a perp trade only changes Delta, so the hedge engine only needs to adjust the spot position. An option trade changes Delta, Gamma, and Vega simultaneously, requiring adjustments to both spot and the two hedge options.")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">{t("DGV-Neutral Solve (2×2 + spot)")}</p>
        <p>[Γ_A V_B − V_A Γ_B] · n_A = −Γ_net · V_B + V_net · Γ_B</p>
        <p>[Γ_A V_B − V_A Γ_B] · n_B = −V_net · Γ_A + Γ_net · V_A</p>
        <p className="mt-1">n_spot = −(Δ_net + n_A · Δ_A + n_B · Δ_B)</p>
      </MathBox>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label={t("Perp Trades")} value={`${perp_trades}`} color={GREEN} />
        <Stat label={t("Option Trades")} value={`${opt_trades}`} color={PURPLE} />
        <Stat label={t("Total Trades")} value={`${trades.length}`} color={ACCENT_HEX} />
      </div>

      {/* Cumulative exposure */}
      <PlotlyChart
        data={[
          { x: ids, y: cum_delta, type: "scatter", mode: "lines", name: "Δ (BTC)", line: { color: ACCENT_HEX } },
          { x: ids, y: cum_gamma, type: "scatter", mode: "lines", name: "Γ×S×1%", line: { color: ORANGE } },
          { x: ids, y: cum_vega, type: "scatter", mode: "lines", name: "Vega ($)", line: { color: PURPLE }, yaxis: "y2" },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("Cumulative Greek Exposure as Trades Arrive"), font: { size: 12 } },
          height: 300,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "Trade #" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Delta / Gamma" } },
          yaxis2: { overlaying: "y", side: "right", gridcolor: GRID_COLOR, title: { text: "Vega ($)" } },
        }}
      />

      {/* Hedge prescription */}
      <PlotlyChart
        data={[
          { x: ids, y: h_spot, type: "bar", name: "Spot BTC", marker: { color: GREEN } },
          { x: ids, y: h_a, type: "bar", name: "7d ATM Call", marker: { color: PURPLE } },
          { x: ids, y: h_b, type: "bar", name: "30d ATM Call", marker: { color: BLUE } },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("Hedge Prescription After Each Trade"), font: { size: 12 } },
          barmode: "group", height: 300,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: t("Trade #") } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: t("Quantity") } },
        }}
      />

      {/* Trade-by-trade cards */}
      <div className="card mt-4 max-h-[500px] overflow-y-auto">
        <p className="text-xs font-bold mb-3" style={{ color: ACCENT_HEX }}>{t("Trade Log (scroll)")}</p>
        {hh.map((h: any, i: number) => {
          const isPerpTrade = trades[i]?.instrument === "perp";
          return (
            <div key={i} className="mb-3 p-3 rounded-lg text-xs" style={{
              background: isPerpTrade ? "rgba(16,185,129,0.05)" : "rgba(168,85,247,0.05)",
              borderLeft: `3px solid ${isPerpTrade ? GREEN : PURPLE}`,
            }}>
              <p className="font-medium mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded mr-2" style={{
                  background: isPerpTrade ? `${GREEN}22` : `${PURPLE}22`,
                  color: isPerpTrade ? GREEN : PURPLE,
                }}>{isPerpTrade ? "PERP" : "OPT"}</span>
                #{h.trade_id}: {h.trade_desc}
              </p>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--muted)]">
                <div>
                  <span className="font-medium">Hedge:</span> Spot {h.hedge_prescription.spot_btc > 0 ? "+" : ""}{h.hedge_prescription.spot_btc.toFixed(2)} BTC
                </div>
                <div>
                  7d Call: {h.hedge_prescription.option_a_qty > 0 ? "+" : ""}{h.hedge_prescription.option_a_qty.toFixed(2)}
                </div>
                <div>
                  30d Call: {h.hedge_prescription.option_b_qty > 0 ? "+" : ""}{h.hedge_prescription.option_b_qty.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <InsightBox>
        {t(`Notice how perp trades (green) only shift the spot hedge quantity — they don't affect the option hedge positions because perps have zero Gamma and Vega. Option trades (purple) change all three hedge quantities simultaneously. This is why the unified engine is more efficient than running two separate hedging systems.`)}
      </InsightBox>
    </section>
  );
}

/* ═══════════ SECTION 4: Cross-Product Netting Benefit ════════════ */
function NettingSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="netting" className="mb-12"><Loader /></section>;

  const vc = data.var_comparison;

  return (
    <section id="netting" className="mb-12">
      <STitle>{t("4. Cross-Product Netting Benefit")}</STitle>

      <InfoBox title={t("Why Netting Matters")}>
        <p className="mb-2">
          {t("If the exchange hedges perps and options separately, it might be buying spot BTC to hedge a long perp book while simultaneously selling spot BTC to hedge a negative-delta options book. This is wasteful — the two Deltas partially cancel each other.")}
        </p>
        <p>
          {t("Cross-product netting computes the combined Greeks first, then hedges the net exposure. The saving comes from: (1) Delta offsets between linear and nonlinear products, and (2) diversification in VaR — losses in one product may be partially offset by the other.")}
        </p>
      </InfoBox>

      <MathBox>
        <p className="text-[10px] text-[var(--muted)] mb-1">{t("Netting Principle")}</p>
        <p>Δ_net = Δ_perps + Δ_options &nbsp; (may partially cancel)</p>
        <p>VaR_combined ≤ VaR_perps + VaR_options &nbsp; (subadditivity)</p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">Saving = (hedge_separate − hedge_combined) / hedge_separate</p>
      </MathBox>

      {/* Greek comparison table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--muted)] border-b border-[var(--card-border)]">
              <th className="text-left py-2 px-2">{t("Greek")}</th>
              <th className="text-right py-2 px-2" style={{ color: GREEN }}>{t("Perps")}</th>
              <th className="text-right py-2 px-2" style={{ color: PURPLE }}>{t("Options")}</th>
              <th className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{t("Combined")}</th>
              <th className="text-right py-2 px-2">{t("Offset")}</th>
            </tr>
          </thead>
          <tbody>
            {(["delta", "gamma", "vega", "theta"] as const).map((k) => {
              const pv = data.perp_greeks[k];
              const ov = data.option_greeks[k];
              const cv = data.combined_greeks[k];
              const offset = Math.abs(pv) + Math.abs(ov) - Math.abs(cv);
              return (
                <tr key={k} className="border-b border-[var(--card-border)]">
                  <td className="py-2 px-2 font-medium capitalize">{k}</td>
                  <td className="text-right py-2 px-2">{k === "vega" || k === "theta" ? fmtUSD(pv) : pv.toFixed(4)}</td>
                  <td className="text-right py-2 px-2">{k === "vega" || k === "theta" ? fmtUSD(ov) : ov.toFixed(4)}</td>
                  <td className="text-right py-2 px-2 font-bold" style={{ color: ACCENT_HEX }}>{k === "vega" || k === "theta" ? fmtUSD(cv) : cv.toFixed(4)}</td>
                  <td className="text-right py-2 px-2" style={{ color: offset > 0.001 ? GREEN : "var(--muted)" }}>
                    {k === "vega" || k === "theta" ? fmtUSD(offset) : offset.toFixed(4)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VaR comparison */}
      <PlotlyChart
        data={[
          {
            x: ["Perps VaR99", "Options VaR99", "Sum (Separate)", "Combined VaR99"],
            y: [Math.abs(vc.perp.var_99), Math.abs(vc.option.var_99), vc.separate_var99_sum, vc.combined_var99],
            type: "bar",
            marker: { color: [GREEN, PURPLE, ORANGE, ACCENT_HEX] },
          },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("VaR 99% — Separate vs Combined"), font: { size: 12 } },
          height: 280,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "Component" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "VaR ($)" } },
          showlegend: false,
        }}
      />

      <InsightBox>
        {t(`Diversification benefit: the combined 99% VaR ($${fmt(vc.combined_var99)}) is ${vc.diversification_benefit_pct.toFixed(1)}% lower than the sum of separate VaRs ($${fmt(vc.separate_var99_sum)}). This means the exchange needs $${fmt(vc.diversification_benefit_usd)} less capital when managing risk through a single unified engine versus two independent systems.`)}
      </InsightBox>
    </section>
  );
}

/* ═══════════ SECTION 5: Dynamic Simulation ═══════════════════════ */
function DynamicSimSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="dynamic-sim" className="mb-12"><Loader /></section>;

  const ts = data.timestamps;
  const strats = data.strategies;

  return (
    <section id="dynamic-sim" className="mb-12">
      <STitle>{t("5. Dynamic Hedging Simulation (14 Days)")}</STitle>

      <InfoBox title={t("Simulating the Real World")}>
        <p className="mb-2">
          {t("This simulation runs a 14-day window with BTC prices following a stochastic volatility + jump process (Bates-like). Every 4 hours, the hedge engine rebalances the entire book. We compare three strategies: (1) Unhedged — do nothing, (2) Delta-only — hedge Delta with spot BTC, and (3) Full DGV-neutral — hedge Delta, Gamma, and Vega using spot + two ATM options.")}
        </p>
        <p>
          {t("The mixed book includes both perp positions (constant Delta throughout) and option positions (time-decaying, vol-sensitive). The funding rate impact on perps is tracked separately.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label={t("Unhedged P&L")} value={fmtUSD(strats.unhedged.final_pnl)}
          color={strats.unhedged.final_pnl >= 0 ? GREEN : ACCENT_HEX} />
        <Stat label={t("Delta-Only P&L")} value={fmtUSD(strats.delta_only.final_pnl)}
          color={strats.delta_only.final_pnl >= 0 ? GREEN : ACCENT_HEX} />
        <Stat label={t("DGV-Neutral P&L")} value={fmtUSD(strats.delta_gamma_vega.final_pnl)}
          color={strats.delta_gamma_vega.final_pnl >= 0 ? GREEN : ACCENT_HEX} />
      </div>

      {/* Spot path + P&L */}
      <PlotlyChart
        data={[
          { x: ts, y: data.spot_path, type: "scatter", mode: "lines", name: "BTC Price", line: { color: "#94a3b8", width: 1 }, yaxis: "y2" },
          { x: ts, y: strats.unhedged.pnl, type: "scatter", mode: "lines", name: "Unhedged", line: { color: ACCENT_HEX, width: 1.5 } },
          { x: ts, y: strats.delta_only.pnl, type: "scatter", mode: "lines", name: "Δ-only", line: { color: ORANGE, width: 1.5 } },
          { x: ts, y: strats.delta_gamma_vega.pnl, type: "scatter", mode: "lines", name: "Δ+Γ+V", line: { color: GREEN, width: 2 } },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("BTC Price & Cumulative P&L by Strategy"), font: { size: 12 } },
          height: 350,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "Day" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "P&L ($)" } },
          yaxis2: { overlaying: "y", side: "right", gridcolor: "transparent", title: { text: "BTC ($)" } },
        }}
      />

      {/* Delta decomposition over time */}
      <PlotlyChart
        data={[
          { x: ts, y: data.perp_delta, type: "scatter", mode: "lines", name: "Perp Delta", line: { color: GREEN }, fill: "tozeroy", fillcolor: `${GREEN}15` },
          { x: ts, y: data.option_delta, type: "scatter", mode: "lines", name: "Option Delta", line: { color: PURPLE }, fill: "tozeroy", fillcolor: `${PURPLE}15` },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("Delta Decomposition Over Time (Perps vs Options)"), font: { size: 12 } },
          height: 280,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: t("Days") } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Delta (BTC)" } },
        }}
      />

      {/* Net Greeks over time for DGV strategy */}
      <PlotlyChart
        data={[
          { x: ts, y: strats.delta_gamma_vega.net_delta, type: "scatter", mode: "lines", name: "Net Δ", line: { color: ACCENT_HEX } },
          { x: ts, y: strats.delta_gamma_vega.net_gamma.map((g: number) => g * data.spot_path[0] * 100), type: "scatter", mode: "lines", name: "Net Γ×S×1%", line: { color: ORANGE } },
          { x: ts, y: strats.delta_gamma_vega.net_vega, type: "scatter", mode: "lines", name: "Net Vega ($)", line: { color: PURPLE }, yaxis: "y2" },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("Residual Greeks — DGV-Neutral Strategy"), font: { size: 12 } },
          height: 280,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "Day" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Δ / Γ" } },
          yaxis2: { overlaying: "y", side: "right", gridcolor: "transparent", title: { text: "Vega ($)" } },
        }}
      />

      {/* P&L attribution */}
      {data.pnl_attribution && (
        <>
          <InfoBox title={t("P&L Attribution (Unhedged Book)")}>
            <p>{t("Breaking down the total P&L into its Greek components shows which risk factor drove the largest gains or losses:")}</p>
            <p className="mt-1">
              {t("ΔP&L ≈ Δ·dS + ½Γ·dS² + V·dσ + Θ·dt + Residual")}
            </p>
          </InfoBox>

          <PlotlyChart
            data={[
              { x: ts.slice(1), y: data.pnl_attribution.delta, type: "scatter", mode: "lines", name: "Delta", line: { color: ACCENT_HEX }, fill: "tozeroy", fillcolor: `${ACCENT_HEX}10` },
              { x: ts.slice(1), y: data.pnl_attribution.gamma, type: "scatter", mode: "lines", name: "Gamma", line: { color: ORANGE }, fill: "tozeroy", fillcolor: `${ORANGE}10` },
              { x: ts.slice(1), y: data.pnl_attribution.vega, type: "scatter", mode: "lines", name: "Vega", line: { color: PURPLE }, fill: "tozeroy", fillcolor: `${PURPLE}10` },
              { x: ts.slice(1), y: data.pnl_attribution.theta, type: "scatter", mode: "lines", name: "Theta", line: { color: GREEN }, fill: "tozeroy", fillcolor: `${GREEN}10` },
            ]}
            layout={{
              ...PLOT_LAYOUT_BASE,
              title: { text: t("Cumulative P&L Attribution (Book)"), font: { size: 12 } },
              height: 300,
              xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "Day" } },
              yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "P&L ($)" } },
            }}
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {["delta", "gamma", "vega", "theta", "residual"].map((k) => (
              <Stat key={k} label={`${k.charAt(0).toUpperCase() + k.slice(1)} P&L`}
                value={fmtUSD(data.pnl_attribution_final[k])}
                color={data.pnl_attribution_final[k] >= 0 ? GREEN : ACCENT_HEX} />
            ))}
          </div>
        </>
      )}

      <InsightBox>
        {t(`The DGV-neutral strategy (${fmtUSD(strats.delta_gamma_vega.final_pnl)}) dramatically reduces P&L volatility compared to unhedged (${fmtUSD(strats.unhedged.final_pnl)}). Notice in the Delta decomposition chart how perp Delta remains constant (no time decay) while option Delta shifts as BTC price moves and options age — this is why the hedge needs constant rebalancing.`)}
      </InsightBox>
    </section>
  );
}

/* ═══════════ SECTION 6: Stress Tests & VaR ═══════════════════════ */
function StressTestsSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="stress-tests" className="mb-12"><Loader /></section>;

  const sc = data.scenarios || [];
  const v = data.var;

  return (
    <section id="stress-tests" className="mb-12">
      <STitle>{t("6. Stress Testing & Combined VaR")}</STitle>

      <InfoBox title={t("Why Stress Test the Combined Book?")}>
        <p className="mb-2">
          {t("Stress testing the combined book reveals how perps and options interact under extreme conditions. In a crash, the exchange loses on long perp exposure (linear) AND loses on short gamma positions (nonlinear, accelerating losses). In a vol spike, only the options book is affected. Understanding these cross-product dynamics is essential for setting capital reserves.")}
        </p>
      </InfoBox>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label={t("1-day VaR 95%")} value={fmtUSD(Math.abs(v.var_95))} color={ORANGE} />
        <Stat label={t("1-day VaR 99%")} value={fmtUSD(Math.abs(v.var_99))} color={ACCENT_HEX} />
        <Stat label={t("1-day CVaR 99%")} value={fmtUSD(Math.abs(v.cvar_99))} color={ACCENT_HEX} />
      </div>

      {/* Scenario table with per-product breakdown */}
      <div className="card mb-4 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[var(--muted)] border-b border-[var(--card-border)]">
              <th className="text-left py-2 px-2">{t("Scenario")}</th>
              <th className="text-right py-2 px-2" style={{ color: GREEN }}>{t("Perp P&L")}</th>
              <th className="text-right py-2 px-2" style={{ color: PURPLE }}>{t("Option P&L")}</th>
              <th className="text-right py-2 px-2" style={{ color: ACCENT_HEX }}>{t("Total P&L")}</th>
            </tr>
          </thead>
          <tbody>
            {sc.map((s: any, i: number) => (
              <tr key={i} className="border-b border-[var(--card-border)]">
                <td className="py-2 px-2 font-medium">{s.name}</td>
                <td className="text-right py-2 px-2" style={{ color: s.perp_pnl >= 0 ? GREEN : ACCENT_HEX }}>
                  {fmtUSD(s.perp_pnl)}
                </td>
                <td className="text-right py-2 px-2" style={{ color: s.option_pnl >= 0 ? GREEN : ACCENT_HEX }}>
                  {fmtUSD(s.option_pnl)}
                </td>
                <td className="text-right py-2 px-2 font-bold" style={{ color: s.total_pnl >= 0 ? GREEN : ACCENT_HEX }}>
                  {fmtUSD(s.total_pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stacked bar for stress */}
      <PlotlyChart
        data={[
          { x: sc.map((s: any) => s.name), y: sc.map((s: any) => s.perp_pnl), type: "bar", name: "Perp P&L", marker: { color: GREEN } },
          { x: sc.map((s: any) => s.name), y: sc.map((s: any) => s.option_pnl), type: "bar", name: "Option P&L", marker: { color: PURPLE } },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("Stress P&L Decomposition: Perps vs Options"), font: { size: 12 } },
          barmode: "relative", height: 320,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, tickangle: -30, title: { text: "Scenario" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "P&L ($)" } },
        }}
      />

      {/* VaR histogram */}
      <PlotlyChart
        data={[
          {
            x: v.histogram_edges.slice(0, -1).map((e: number, i: number) => (e + v.histogram_edges[i + 1]) / 2),
            y: v.histogram_counts,
            type: "bar",
            marker: { color: v.histogram_edges.slice(0, -1).map((e: number) => e < v.var_99 ? ACCENT_HEX : `${BLUE}80`) },
            name: "P&L Distribution",
          },
        ]}
        layout={{
          ...PLOT_LAYOUT_BASE,
          title: { text: t("1-Day P&L Distribution (MC 10K paths)"), font: { size: 12 } },
          height: 300,
          xaxis: { ...PLOT_LAYOUT_BASE.xaxis, title: { text: "P&L ($)" } },
          yaxis: { ...PLOT_LAYOUT_BASE.yaxis, title: { text: "Frequency" } },
          shapes: [
            { type: "line", x0: v.var_95, x1: v.var_95, y0: 0, y1: 1, yref: "paper", line: { color: ORANGE, dash: "dash", width: 1.5 } },
            { type: "line", x0: v.var_99, x1: v.var_99, y0: 0, y1: 1, yref: "paper", line: { color: ACCENT_HEX, dash: "dash", width: 1.5 } },
          ],
          annotations: [
            { x: v.var_95, y: 0.95, yref: "paper", text: `VaR 95%<br>${fmtUSD(v.var_95)}`, showarrow: false, font: { color: ORANGE, size: 9 } },
            { x: v.var_99, y: 0.85, yref: "paper", text: `VaR 99%<br>${fmtUSD(v.var_99)}`, showarrow: false, font: { color: ACCENT_HEX, size: 9 } },
          ],
          showlegend: false,
        }}
      />

      <InfoBox title={t("Risk Contribution by Product Type")}>
        <p>
          {t(`Perp P&L standard deviation: $${fmt(v.perp_contribution_std)} | Option P&L standard deviation: $${fmt(v.option_contribution_std)}. The options book contributes more risk per unit notional because of the nonlinear (Gamma) exposure — a 20% BTC crash causes the short-gamma options book to lose significantly more than the linear perp book.`)}
        </p>
      </InfoBox>

      <InsightBox>
        {t(`Worst-case scenario (Flash crash −30% + Vol spike +80%): total loss of ${fmtUSD(sc[sc.length - 1]?.total_pnl)}, with ${fmtUSD(sc[sc.length - 1]?.perp_pnl)} from perps and ${fmtUSD(sc[sc.length - 1]?.option_pnl)} from options. The options losses are ${(Math.abs(sc[sc.length - 1]?.option_pnl || 0) / Math.abs(sc[sc.length - 1]?.perp_pnl || 1)).toFixed(1)}× larger than perp losses in this scenario due to the combined Gamma + Vega effect. The 99% CVaR of ${fmtUSD(Math.abs(v.cvar_99))} is the minimum capital the exchange should hold for the 1-day horizon.`)}
      </InsightBox>
    </section>
  );
}
