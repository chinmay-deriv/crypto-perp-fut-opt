"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PlotlyChart from "../../components/charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "delta", label: "1. Delta Exposure" },
  { id: "var", label: "2. VaR & Stress Tests" },
  { id: "funding", label: "3. Funding Risk" },
  { id: "cascade", label: "4. Cascades" },
  { id: "insurance", label: "5. Insurance Fund" },
  { id: "basis", label: "6. Basis Risk" },
  { id: "impact", label: "7. Market Impact" },
  { id: "hedge", label: "8. Hedge Backtest" },
  { id: "dashboard", label: "9. Risk Dashboard" },
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

const ACCENT = "var(--accent-amber)";
const ACCENT_HEX = "#f59e0b";
const RED = "var(--accent-red)";

export default function RiskManagement() {
  const { t } = useI18n();
  const [d, setD] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const files = [
      "portfolio",
      "delta_exposure",
      "portfolio_var",
      "funding_risk",
      "cascade",
      "insurance_fund",
      "basis_risk",
      "market_impact",
      "hedge_backtest",
      "risk_summary",
    ];
    files.forEach((f) =>
      fetchJSON(`/data/risk/${f}.json`).then((v) =>
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
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4 pt-6 overflow-y-auto">
        <Link
          href="/"
          className="text-[10px] text-[var(--muted)] hover:text-[var(--accent-amber)] transition mb-2 block"
        >
          {t("← Home")}
        </Link>
        <div className="mb-4">
          <h1 className="text-sm font-bold text-[var(--accent-amber)] leading-tight">
            {t("Risk Management")}
          </h1>
          <h2 className="text-xs text-[var(--muted)]">
            {t("Exchange Risk for Perps")}
          </h2>
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                activeSection === id
                  ? "bg-[rgba(245,158,11,0.15)] text-[var(--accent-amber)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">Phase 2 · Risk Module</p>
          <p className="text-[10px] text-[var(--muted)]">
            Simulated portfolio + BTC data
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            {t("10 Risk Sections")}
          </p>
        </div>
      </nav>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {t("Exchange Risk Management")}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t(
              "Comprehensive risk quantification for a crypto exchange offering BTC perpetual futures — directional risk, funding, liquidation cascades, basis, liquidity, and hedging."
            )}
          </p>
        </header>

        <OverviewSection data={d.portfolio} />
        <DeltaSection data={d.delta_exposure} />
        <VarSection data={d.portfolio_var} />
        <FundingRiskSection data={d.funding_risk} />
        <CascadeSection data={d.cascade} />
        <InsuranceSection data={d.insurance_fund} />
        <BasisSection data={d.basis_risk} />
        <ImpactSection data={d.market_impact} />
        <HedgeSection data={d.hedge_backtest} />
        <DashboardSection data={d.risk_summary} />

        <footer className="mt-12 pt-6 border-t border-[var(--card-border)] text-center text-xs text-[var(--muted)]">
          <p>
            {t(
              "Exchange Risk Management · Phase 2 · Next.js + Plotly.js + Python"
            )}
          </p>
          <p className="mt-1">
            {t(
              "Simulated exchange portfolio against real BTC price data, Jan–Jun 2025"
            )}
          </p>
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
function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
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
      <p className="text-xs text-[var(--muted)] leading-relaxed">{children}</p>
    </div>
  );
}

function MathBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="card mb-4 font-mono text-xs text-center py-3"
      style={{
        background: "rgba(245,158,11,0.06)",
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
      style={{ background: "rgba(239,68,68,0.06)", borderLeft: "3px solid #ef4444" }}
    >
      <p className="text-xs font-bold mb-1" style={{ color: "#ef4444" }}>
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

/* ── Section 0: Overview ─────────────────────────────────────────── */

function OverviewSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="overview" className="mb-12">
        <Loader />
      </section>
    );
  return (
    <section id="overview" className="mb-12">
      <STitle>{t("Overview — Simulated Exchange Portfolio")}</STitle>
      <InfoBox title="What is this?">
        {t(
          "We simulate a realistic crypto exchange portfolio of 500 client perpetual futures positions. The portfolio reflects typical retail behavior: ~60% of positions are long (retail traders are historically biased toward longs), sizes follow a power-law distribution (many small traders, few whales), and leverage ranges from conservative 2x to aggressive 125x. This simulated portfolio is the foundation for all risk analysis that follows."
        )}
      </InfoBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Positions")}
          value={fmt(data.n_positions)}
          color={ACCENT}
        />
        <Stat
          label={t("Net Delta")}
          value={`${fmt(data.net_delta_btc, 1)} BTC`}
          color={data.net_delta_btc > 0 ? "var(--accent-green)" : RED}
        />
        <Stat
          label={t("Exposure (USD)")}
          value={fmtUSD(data.net_delta_usd)}
          color={ACCENT}
        />
        <Stat
          label={t("Avg Leverage")}
          value={`${fmt(data.avg_leverage, 1)}x`}
          color="var(--accent-amber)"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Long Positions")}
          value={`${data.n_long} (${fmt(data.total_long_btc, 1)} BTC)`}
          color="var(--accent-green)"
        />
        <Stat
          label={t("Short Positions")}
          value={`${data.n_short} (${fmt(data.total_short_btc, 1)} BTC)`}
          color={RED}
        />
        <Stat
          label={t("Median Size")}
          value={`${fmt(data.median_size_btc, 3)} BTC`}
        />
        <Stat
          label={t("Max Size")}
          value={`${fmt(data.max_size_btc, 2)} BTC`}
          color="var(--accent-amber)"
        />
      </div>
      {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.size_histogram.edges,
                y: data.size_histogram.counts,
                type: "bar",
                marker: { color: ACCENT_HEX, opacity: 0.7 },
                name: "Count",
              },
            ]}
            layout={{
              title: "Position Size Distribution (BTC)",
              xaxis: { title: "Size (BTC)" },
              yaxis: { title: "Count" },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.leverage_distribution.leverages.map(
                  (l: number) => `${l}x`
                ),
                y: data.leverage_distribution.counts,
                type: "bar",
                marker: {
                  color: data.leverage_distribution.leverages.map(
                    (l: number) =>
                      l >= 50 ? "#ef4444" : l >= 20 ? "#f59e0b" : "#10b981"
                  ),
                },
              },
            ]}
            layout={{
              title: "Leverage Distribution",
              xaxis: { title: "Leverage" },
              yaxis: { title: "Number of Positions" },
            }}
          />
        </div>
      </div> */}
      <InsightBox>
        {t(
          `The portfolio is net long ${fmt(data.net_delta_btc, 1)} BTC ($${fmt(data.net_delta_usd)}), which means the exchange is effectively SHORT this amount. If BTC rises, the exchange loses money. This directional imbalance is the primary risk driver.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 1: Delta Exposure ───────────────────────────────────── */

function DeltaSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="delta" className="mb-12">
        <Loader />
      </section>
    );
  const s = data.stats;
  return (
    <section id="delta" className="mb-12">
      <STitle>{t("1 · Net Delta Exposure — Risk #1: Directional Risk")}</STitle>
      <InfoBox title="What is Delta?">
        {t(
          "Delta (Δ) measures how much your portfolio value changes for each $1 move in BTC. If clients hold more long contracts than shorts, the exchange's net delta is positive (clients are net long), meaning the EXCHANGE is effectively SHORT. Net Delta = Σ(long sizes) − Σ(short sizes). A net delta of +50 BTC means for every $1 BTC rises, the exchange loses $50. This is the single most important risk metric."
        )}
      </InfoBox>
      <MathBox>
        Exchange P&L (daily) = −Δ_net × (P_close − P_prev) &nbsp;|&nbsp;
        Δ_net = Σ long_BTC − Σ short_BTC
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Mean Δ")}
          value={`${fmt(s.mean_delta_btc, 1)} BTC`}
          color={ACCENT}
        />
        <Stat
          label={t("Std Dev Δ")}
          value={`${fmt(s.std_delta_btc, 1)} BTC`}
        />
        <Stat
          label={t("Max Daily Loss")}
          value={fmtUSD(s.max_daily_loss)}
          color={RED}
        />
        <Stat
          label={t("Cumulative P&L")}
          value={fmtUSD(s.total_pnl)}
          color={s.total_pnl >= 0 ? "var(--accent-green)" : RED}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card lg:col-span-2" style={{ height: 400 }}>
          <PlotlyChart
            data={[
              {
                x: data.dates,
                y: data.net_delta_btc,
                type: "scatter",
                mode: "lines",
                line: { width: 1.5, color: ACCENT_HEX },
                name: "Net Delta (BTC)",
                fill: "tozeroy",
                fillcolor: "rgba(245,158,11,0.1)",
              },
            ]}
            layout={{
              title: "Net Delta Exposure Over Time",
              yaxis: { title: "Net Delta (BTC)", zeroline: true },
              xaxis: { title: "Date" },
            }}
          />
        </div>
        <div className="card flex flex-col justify-center" style={{ height: 400 }}>
          <h3 className="text-sm font-bold text-[var(--accent-amber)] mb-3">{t("How This Is Computed")}</h3>
          <div className="space-y-3 text-xs text-[var(--muted-light)] leading-relaxed">
            <p>
              <span className="text-[var(--foreground)] font-semibold">Delta path</span> is modeled as an Ornstein-Uhlenbeck process with jumps, driven by real BTC returns:
            </p>
            <p className="font-mono text-[10px] text-[var(--accent)] bg-[#1e293b] rounded px-2 py-1.5">
              δ(t+1) = δ(t) + κ(θ − δ(t)) + σ·Z + J + 400·r<sub>BTC</sub>
            </p>
            <p>
              <span className="text-[var(--accent-amber)]">θ = 25 BTC</span> long-run mean (retail long bias), <span className="text-[var(--accent-amber)]">κ = 0.08</span> mean-reversion speed, <span className="text-[var(--accent-amber)]">σ = 12</span> daily noise, <span className="text-[var(--accent-amber)]">5%</span> daily jump probability.
            </p>
            <p>
              <span className="text-[var(--foreground)] font-semibold">P&L</span> uses <span className="text-[var(--accent-green)]">real BTC daily closes</span> (Binance, Jan–Jun 2025): Exchange P&L = −δ(t) × ΔP.
            </p>
            <p className="text-[var(--muted)] italic">
              Seeded (seed=123) for reproducibility. Delta is simulated; prices are real market data.
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.dates,
                y: data.exchange_pnl_cumulative,
                type: "scatter",
                mode: "lines",
                line: { width: 1.5, color: "#ef4444" },
                name: "Cumulative P&L",
                fill: "tozeroy",
                fillcolor: "rgba(239,68,68,0.08)",
              },
            ]}
            layout={{
              title: "Cumulative Exchange P&L (from Delta Exposure)",
              xaxis: { title: "Date" },
              yaxis: { title: "P&L ($)" },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.delta_histogram.centers,
                y: data.delta_histogram.counts,
                type: "bar",
                marker: { color: ACCENT_HEX, opacity: 0.7 },
              },
            ]}
            layout={{
              title: "Net Delta Distribution",
              xaxis: { title: "Net Delta (BTC)" },
              yaxis: { title: "Frequency" },
            }}
          />
        </div>
      </div>
      <InsightBox>
        {t(
          `The exchange's net delta averaged ${fmt(s.mean_delta_btc, 1)} BTC with a standard deviation of ${fmt(s.std_delta_btc, 1)} BTC. The largest single-day loss was ${fmtUSD(Math.abs(s.max_daily_loss))}. Top 10% of exposure days accounted for ${fmt(s.concentration_top10pct, 1)}% of total exposure — showing that risk concentrates in a few extreme days.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 2: VaR & Stress Tests ───────────────────────────────── */

function VarSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="var" className="mb-12">
        <Loader />
      </section>
    );
  const s = data.stats;
  return (
    <section id="var" className="mb-12">
      <STitle>{t("2 · Portfolio VaR & Stress Tests — Risk #1 Quantified")}</STitle>
      <InfoBox title="What is VaR and CVaR?">
        {t(
          'Value at Risk (VaR) answers: "What is the maximum we could lose in one day with X% confidence?" For example, a 99% daily VaR of $200K means there is only a 1% chance of losing more than $200K in a single day. Conditional VaR (CVaR, also called Expected Shortfall) answers a harder question: "If we DO have a bad day (beyond VaR), how bad could it actually be?" CVaR averages all losses beyond VaR, making it a more conservative risk measure. Regulators increasingly prefer CVaR because VaR ignores the severity of tail losses.'
        )}
      </InfoBox>
      <MathBox>
        VaR₉₉%(1-day) = Z₉₉% × σ_asset × |Δ_net| × Price
        &nbsp;|&nbsp; CVaR_α = E[Loss | Loss &gt; VaR_α]
      </MathBox>
      {data.var_decomposition && (
        <div
          className="card mb-4 text-xs font-mono text-center py-3"
          style={{ background: "rgba(59,130,246,0.06)", borderLeft: "3px solid #3b82f6" }}
        >
          <p className="text-[10px] text-[var(--muted)] mb-1">
            Parametric VaR₉₉% Decomposition
          </p>
          <p>
            <span style={{ color: "#3b82f6" }}>{fmt(data.var_decomposition.z_99, 3)}</span>
            {" × "}
            <span style={{ color: ACCENT_HEX }}>{fmt(data.var_decomposition.sigma_asset_daily, 4)}</span>
            {" × "}
            <span style={{ color: "#ef4444" }}>{fmt(data.var_decomposition.abs_delta_net_btc, 1)} BTC</span>
            {" × "}
            <span>${fmt(data.var_decomposition.abs_delta_net_usd / data.var_decomposition.abs_delta_net_btc)}</span>
            {" = "}
            <strong style={{ color: "#ef4444" }}>{fmtUSD(data.var_decomposition.parametric_var_99_usd)}</strong>
          </p>
          <p className="text-[10px] text-[var(--muted)] mt-1">
            Z₉₉% × σ_daily × |Δ_net| × P_btc
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("99% VaR (Parametric)")}
          value={fmtUSD(data.var_decomposition?.parametric_var_99_usd)}
          color={RED}
        />
        <Stat
          label={t("99% VaR (Historical)")}
          value={fmtUSD(data.var_table[2]?.historical_var)}
          color={RED}
        />
        <Stat
          label={t("99% CVaR (ES)")}
          value={fmtUSD(data.var_table[2]?.cvar)}
          color={RED}
        />
        <Stat
          label={t("Daily Vol (σ)")}
          value={`${fmt(s.daily_vol_pct, 2)}%`}
          color={ACCENT}
        />
      </div>

      {/* VaR table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Confidence")}</th>
              <th>{t("Parametric VaR")}</th>
              <th>{t("Historical VaR")}</th>
              <th>{t("CVaR (Expected Shortfall)")}</th>
            </tr>
          </thead>
          <tbody>
            {data.var_table.map((row: any, i: number) => (
              <tr key={i}>
                <td>{(row.confidence * 100).toFixed(1)}%</td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(row.parametric_var)}
                </td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(row.historical_var)}
                </td>
                <td style={{ color: "#dc2626" }}>{fmtUSD(row.cvar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.pnl_distribution.centers,
                y: data.pnl_distribution.counts,
                type: "bar",
                marker: {
                  color: data.pnl_distribution.centers.map((c: number) =>
                    c < 0 ? "#ef4444" : "#10b981"
                  ),
                  opacity: 0.7,
                },
                name: "P&L",
              },
            ]}
            layout={{
              title: "Daily P&L Distribution",
              xaxis: { title: "Daily P&L ($)" },
              yaxis: { title: "Density" },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.scenario_analysis.map(
                  (s: any) => `${s.shock_pct.toFixed(0)}%`
                ),
                y: data.scenario_analysis.map((s: any) => s.exchange_pnl),
                type: "bar",
                marker: {
                  color: data.scenario_analysis.map((s: any) =>
                    s.exchange_pnl < 0 ? "#ef4444" : "#10b981"
                  ),
                },
                name: "Exchange P&L",
              },
            ]}
            layout={{
              title: "Scenario Analysis: Exchange P&L by BTC Move",
              xaxis: { title: "BTC Price Shock" },
              yaxis: { title: "Exchange P&L ($)" },
            }}
          />
        </div>
      </div>

      {/* Stress test table */}
      <div className="card mt-4 overflow-x-auto">
        <p className="text-xs font-bold mb-2" style={{ color: RED }}>
          Historical Stress Tests
        </p>
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Scenario")}</th>
              <th>{t("Date")}</th>
              <th>{t("BTC Return")}</th>
              <th>{t("Exchange Loss")}</th>
            </tr>
          </thead>
          <tbody>
            {data.stress_tests.map((st: any, i: number) => (
              <tr key={i}>
                <td>{st.name}</td>
                <td>{st.date}</td>
                <td style={{ color: "#ef4444" }}>
                  {fmt(st.return_pct, 2)}%
                </td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(Math.abs(st.exchange_loss))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightBox>
        {t(
          `At 99% confidence, the exchange could lose up to ${fmtUSD(data.var_table[2]?.historical_var)} in a single day from directional exposure alone. The CVaR (Expected Shortfall) of ${fmtUSD(data.var_table[2]?.cvar)} tells us that when bad days happen, losses average even higher. This is the capital that must be reserved to survive adverse moves.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 3: Funding Rate Risk ────────────────────────────────── */

function FundingRiskSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="funding" className="mb-12">
        <Loader />
      </section>
    );
  const rs = data.run_stats;
  return (
    <section id="funding" className="mb-12">
      <STitle>{t("3 · Funding Rate Risk — Risk #2")}</STitle>
      <InfoBox title="What is Funding Rate Risk?">
        {t(
          "Perpetual futures have no expiry date, so funding rates keep their price anchored to spot. Every 8 hours, longs pay shorts (positive funding) or shorts pay longs (negative funding). As an exchange, you collect and distribute these payments. The risk arises when funding stays persistently one-sided: if your clients are mostly long and funding is positive, they pay you — but if the market flips and funding turns negative while clients are still long, the exchange may face cash flow imbalances. Autocorrelation tells us HOW persistent funding trends are — high autocorrelation means once funding goes positive, it tends to STAY positive for days."
        )}
      </InfoBox>
      <MathBox>
        Funding Payment = Position Size × Funding Rate &nbsp;|&nbsp; Exchange
        Net = Σ(long payments) − Σ(short payments)
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <Stat
          label={t("ACF(1)")}
          value={fmt(data.autocorrelation.acf[1], 3)}
          color={ACCENT}
        />
        <Stat
          label={t("% Positive")}
          value={`${fmt(rs.pct_positive, 1)}%`}
          color="var(--accent-green)"
        />
        <Stat
          label={t("Max Pos Run")}
          value={`${rs.max_positive_run} periods`}
          color={ACCENT}
        />
        <Stat
          label={t("Max Neg Run")}
          value={`${rs.max_negative_run} periods`}
          color={RED}
        />
        <Stat
          label={t("Funding VaR (7d)")}
          value={fmtUSD(data.funding_var?.var_usd)}
          color={RED}
        />
        <Stat
          label={t("Diff. Cost (ann.)")}
          value={fmtUSD(data.funding_differential?.stats?.annualized_cost_usd)}
          color={RED}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.autocorrelation.lags,
                y: data.autocorrelation.acf,
                type: "bar",
                marker: { color: ACCENT_HEX, opacity: 0.8 },
              },
            ]}
            layout={{
              title: "Funding Rate Autocorrelation (ACF)",
              xaxis: { title: "Lag (8h periods)" },
              yaxis: { title: "Autocorrelation", range: [-0.2, 1] },
              shapes: [
                {
                  type: "line",
                  x0: 0,
                  x1: 20,
                  y0: 0,
                  y1: 0,
                  line: { color: "#666", dash: "dash" },
                },
              ],
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={data.cashflow_scenarios.map((sc: any, i: number) => ({
              x: sc.timestamps,
              y: sc.cumulative_series,
              type: "scatter",
              mode: "lines",
              name: sc.skew_label,
              line: {
                width: 1.5,
                color: ["#6b7280", "#3b82f6", "#f59e0b", "#ef4444", "#dc2626"][
                  i
                ],
              },
            }))}
            layout={{
              title: "Cumulative Funding Cash Flow by Position Skew",
              xaxis: { title: "Date" },
              yaxis: { title: "Cumulative Cash Flow (BTC)" },
              showlegend: true,
              legend: { x: 0, y: 1.15, orientation: "h" },
            }}
          />
        </div>
      </div>

      {/* Funding Differential + Funding VaR */}
      {data.funding_differential && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="card" style={{ height: 360 }}>
            <PlotlyChart
              data={[
                {
                  x: data.funding_differential.timestamps,
                  y: data.funding_differential.cumulative_cost_usd,
                  type: "scatter",
                  mode: "lines",
                  line: { width: 1.5, color: "#ef4444" },
                  name: "Cum. Differential Cost",
                  fill: "tozeroy",
                  fillcolor: "rgba(239,68,68,0.08)",
                },
              ]}
              layout={{
                title: "Funding Differential: Your Exchange vs Hedge Venue ($)",
                xaxis: { title: "Date" },
                yaxis: { title: "Cumulative Cost ($)" },
              }}
            />
          </div>
          <InfoBox title="Funding Differential & Funding VaR">
            {t(
              `Even after a perfect delta hedge, the funding rate DIFFERENTIAL between your exchange and the hedge venue creates residual P&L. Your exchange and the hedge venue have different client flows, different clamp levels, and sometimes different payment timing — so funding rates aren't identical. Over 6 months, this differential costs ${fmtUSD(Math.abs(data.funding_differential.stats.cumulative_cost_usd))} (annualized: ${fmtUSD(Math.abs(data.funding_differential.stats.annualized_cost_usd))}). The Funding VaR of ${fmtUSD(data.funding_var?.var_usd)} represents the 99% worst-case cumulative funding drain over any 7-day period — this is the capital you need reserved specifically for funding risk.`
            )}
          </InfoBox>
        </div>
      )}

      {/* Stress scenarios table */}
      <div className="card overflow-x-auto">
        <p className="text-xs font-bold mb-2" style={{ color: RED }}>
          Funding Stress Scenarios
        </p>
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Duration")}</th>
              <th>{t("Rate Scenario")}</th>
              <th>{t("Funding Rate")}</th>
              <th>{t("Total Cost (BTC)")}</th>
              <th>{t("Total Cost (USD)")}</th>
            </tr>
          </thead>
          <tbody>
            {data.stress_scenarios.map((ss: any, i: number) => (
              <tr key={i}>
                <td>{ss.duration_days} days</td>
                <td>{ss.rate_scenario}</td>
                <td>{fmt(ss.rate_pct, 4)}%</td>
                <td>{fmt(ss.total_cost_btc, 4)}</td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(ss.total_cost_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InsightBox>
        {t(
          `Funding rates show an ACF(1) of ${fmt(data.autocorrelation.acf[1], 3)}, meaning they are moderately persistent — once funding trends in a direction, it tends to continue. The longest observed positive funding run was ${rs.max_positive_run} periods (${Math.round(rs.max_positive_run * 8 / 24)} days). Funding VaR (7-day, 99%) = ${fmtUSD(data.funding_var?.var_usd)} — this is the worst-case funding drain over a week. Even with hedging, the funding differential between exchanges costs ${fmtUSD(Math.abs(data.funding_differential?.stats?.annualized_cost_usd))}/year.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 4: Liquidation Cascades ─────────────────────────────── */

function CascadeSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="cascade" className="mb-12">
        <Loader />
      </section>
    );
  const worst = data.down_cascades[data.down_cascades.length - 1];
  return (
    <section id="cascade" className="mb-12">
      <STitle>{t("4 · Liquidation Cascades — Risk #3")}</STitle>
      <InfoBox title="What is a Liquidation Cascade?">
        {t(
          "A liquidation cascade is the most dangerous feedback loop in crypto derivatives: a price drop liquidates leveraged long positions → the exchange must sell their collateral to close them → this selling pushes the price down further → which triggers MORE liquidations → and so on. A 5% initial dip can amplify into a 15%+ crash through this mechanism. The cascade amplification factor measures how much worse the final outcome is compared to the initial shock. We simulate this by: (1) applying a price shock, (2) identifying which positions hit their liquidation price, (3) computing the market impact of forced selling using the square-root law, (4) checking if the additional price drop triggers more liquidations, and (5) repeating until equilibrium."
        )}
      </InfoBox>
      <MathBox>
        Market Impact = σ_daily × √(Q_liquidated / ADV) × κ &nbsp;|&nbsp;
        Amplification = |Total Price Drop| / |Initial Shock|
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Worst Cascade Loss")}
          value={fmtUSD(worst?.total_loss_usd)}
          color={RED}
        />
        <Stat
          label={t("Positions Liquidated")}
          value={fmt(worst?.total_liquidated)}
          color={RED}
        />
        <Stat
          label={t("BTC Liquidated")}
          value={`${fmt(worst?.total_btc_liquidated, 1)}`}
          color={ACCENT}
        />
        <Stat
          label={t("Max Amplification")}
          value={`${fmt(worst?.amplification, 2)}x`}
          color={RED}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: data.down_cascades.map((c: any) => `${c.shock_pct.toFixed(0)}%`),
                y: data.down_cascades.map((c: any) => c.total_loss_usd),
                type: "bar",
                marker: {
                  color: data.down_cascades.map((_: any, i: number) =>
                    i >= 5 ? "#dc2626" : i >= 3 ? "#ef4444" : "#f59e0b"
                  ),
                },
                name: "Cascade Loss (USD)",
              },
            ]}
            layout={{
              title: "Cascade Loss by Downward Shock",
              xaxis: { title: "Initial Price Shock" },
              yaxis: { title: "Total Loss ($)" },
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: data.down_cascades.map((c: any) => c.shock_pct),
                y: data.down_cascades.map((c: any) => c.total_drop_pct),
                type: "scatter",
                mode: "lines+markers",
                line: { color: "#ef4444", width: 2 },
                marker: { size: 8 },
                name: "Actual Drop",
              },
              {
                x: data.down_cascades.map((c: any) => c.shock_pct),
                y: data.down_cascades.map((c: any) => c.shock_pct),
                type: "scatter",
                mode: "lines",
                line: { color: "#6b7280", dash: "dash", width: 1 },
                name: "No Cascade (1:1)",
              },
            ]}
            layout={{
              title: "Cascade Amplification: Initial vs Actual Drop",
              xaxis: { title: "Initial Shock (%)" },
              yaxis: { title: "Total Price Drop (%)" },
              showlegend: true,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.down_cascades.map((c: any) => `${c.shock_pct.toFixed(0)}%`),
                y: data.down_cascades.map((c: any) => c.total_liquidated),
                type: "bar",
                marker: { color: "#ef4444", opacity: 0.8 },
                name: "Positions",
              },
            ]}
            layout={{
              title: "Positions Liquidated by Shock Size",
              xaxis: { title: "Shock" },
              yaxis: { title: "Positions Liquidated" },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.up_cascades.map((c: any) => `+${c.shock_pct.toFixed(0)}%`),
                y: data.up_cascades.map((c: any) => c.total_loss_usd),
                type: "bar",
                marker: { color: "#3b82f6", opacity: 0.8 },
                name: "Short Cascade Loss",
              },
            ]}
            layout={{
              title: "Upward Shock: Short Liquidation Cascade",
              xaxis: { title: "Upward Shock" },
              yaxis: { title: "Loss ($)" },
            }}
          />
        </div>
      </div>

      <InsightBox>
        {t(
          `At a −20% shock, ${worst?.total_liquidated} positions are liquidated for a total loss of ${fmtUSD(worst?.total_loss_usd)}. The cascade amplification factor of ${fmt(worst?.amplification, 2)}x means the actual price drop exceeds the initial shock due to forced selling. High-leverage positions (50x–125x) are the first dominos — they trigger within a 1–2% move and their forced liquidation can push the market further, creating a chain reaction.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 5: Insurance Fund ───────────────────────────────────── */

function InsuranceSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="insurance" className="mb-12">
        <Loader />
      </section>
    );
  const sus = data.sustainability;
  return (
    <section id="insurance" className="mb-12">
      <STitle>{t("5 · Insurance Fund Sizing — Risk #3 Continued")}</STitle>
      <InfoBox title="What is the Insurance Fund?">
        {t(
          "The insurance fund is the exchange's safety net against liquidation losses. When a position is liquidated, the exchange closes it at the liquidation price — but if the market has already moved past that price, the actual closing price may be worse. The difference is a 'shortfall' loss. The insurance fund covers these shortfalls. It is funded by liquidation penalty fees (a small % taken from each liquidated position). If the fund runs out, the exchange must either absorb losses from its own capital or use Auto-Deleveraging (ADL) — forcibly reducing profitable traders' positions to cover losses."
        )}
      </InfoBox>
      <MathBox>
        Required Fund ≥ VaR_{"{99%}"} of cascade losses × 1.5 safety margin
        &nbsp;|&nbsp; Fund Growth = Liq Penalty Income − Cascade Drawdowns
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("99% Fund Req.")}
          value={fmtUSD(data.fund_requirements[1]?.recommended_fund_usd)}
          color={RED}
        />
        <Stat
          label={t("Daily Income")}
          value={fmtUSD(data.income_model.daily_liq_penalty_income)}
          color="var(--accent-green)"
        />
        <Stat
          label={t("Drawdown Events")}
          value={fmt(sus.n_drawdown_events)}
          color={ACCENT}
        />
        <Stat
          label={t("Survived?")}
          value={sus.survived ? "YES" : "NO"}
          color={sus.survived ? "var(--accent-green)" : RED}
        />
      </div>

      {/* Fund requirements table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Confidence Level")}</th>
              <th>{t("Daily VaR (%)")}</th>
              <th>{t("Expected Cascade Loss")}</th>
              <th>{t("Recommended Fund Size")}</th>
            </tr>
          </thead>
          <tbody>
            {data.fund_requirements.map((fr: any, i: number) => (
              <tr key={i}>
                <td>{(fr.confidence * 100).toFixed(1)}%</td>
                <td>{fmt(fr.daily_var_pct, 2)}%</td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(fr.expected_cascade_loss)}
                </td>
                <td style={{ color: ACCENT_HEX }}>
                  {fmtUSD(fr.recommended_fund_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ height: 400 }}>
        <PlotlyChart
          data={[
            {
              x: data.fund_balance_simulation.dates,
              y: data.fund_balance_simulation.balance,
              type: "scatter",
              mode: "lines",
              line: { width: 1.5, color: ACCENT_HEX },
              name: "Fund Balance",
              fill: "tozeroy",
              fillcolor: "rgba(245,158,11,0.08)",
            },
            {
              x: data.fund_balance_simulation.dates,
              y: Array(data.fund_balance_simulation.dates.length).fill(0),
              type: "scatter",
              mode: "lines",
              line: { color: "#ef4444", dash: "dash", width: 1 },
              name: "Zero Line",
            },
          ]}
          layout={{
            title: "Insurance Fund Balance Over Time (Backtest)",
            xaxis: { title: "Date" },
            yaxis: { title: "Fund Balance ($)" },
            showlegend: true,
          }}
        />
      </div>

      <InsightBox>
        {t(
          `The insurance fund ${sus.survived ? "survived" : "was depleted during"} the 6-month backtest period. Minimum balance reached ${fmtUSD(sus.min_balance)}. The fund generated ${fmtUSD(sus.total_income)} in liquidation penalty income against ${fmtUSD(sus.total_drawdowns)} in cascade drawdowns, for a net change of ${fmtUSD(sus.net_fund_change)}. ${sus.survived ? "The fund is adequately sized at the 99% confidence level." : "Consider increasing the fund size or implementing ADL triggers earlier."}`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 6: Basis Risk ───────────────────────────────────────── */

function BasisSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="basis" className="mb-12">
        <Loader />
      </section>
    );
  const s = data.stats;
  const vd = data.var_decomposition;
  return (
    <section id="basis" className="mb-12">
      <STitle>{t("6 · Basis Risk — Risk #4")}</STitle>
      <InfoBox title="What is Basis Risk?">
        {t(
          "Basis = Your exchange's perpetual price − External venue's perpetual price. Even when you hedge your net delta by taking an opposite position on another exchange, the prices aren't identical. Different liquidity conditions, funding rates, and order flow create a persistent price gap (basis). This means your hedge is imperfect — you can lose money simultaneously on your client book AND your hedge. Basis risk is modeled as an Ornstein-Uhlenbeck (mean-reverting) process because the two exchange prices tend to reconverge, but deviations can be significant during volatility spikes."
        )}
      </InfoBox>
      <MathBox>
        Basis = P_your_exchange − P_hedge_venue &nbsp;|&nbsp; Hedge Leakage =
        Δ_net × (ΔP_yours − ΔP_hedge) &nbsp;|&nbsp; dB = κ(θ−B)dt + σ_B dW
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Mean Basis")}
          value={`${fmt(s.mean_basis_bps, 2)} bps`}
          color={ACCENT}
        />
        <Stat
          label={t("Basis Volatility")}
          value={`${fmt(s.std_basis_bps, 2)} bps`}
        />
        <Stat
          label={t("Max |Basis|")}
          value={`${fmt(s.max_abs_basis_bps, 1)} bps`}
          color={RED}
        />
        <Stat
          label={t("Basis % of Total VaR")}
          value={`${fmt(vd.basis_share_pct, 1)}%`}
          color={ACCENT}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.dates,
                y: data.basis_bps,
                type: "scatter",
                mode: "lines",
                line: { width: 1, color: ACCENT_HEX },
                name: "Basis (bps)",
                fill: "tozeroy",
                fillcolor: "rgba(245,158,11,0.08)",
              },
            ]}
            layout={{
              title: "Basis Over Time (bps)",
              xaxis: { title: "Date" },
              yaxis: { title: "Basis (bps)", zeroline: true },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.basis_histogram.centers,
                y: data.basis_histogram.counts,
                type: "bar",
                marker: { color: ACCENT_HEX, opacity: 0.7 },
              },
            ]}
            layout={{
              title: "Basis Distribution",
              xaxis: { title: "Basis (bps)" },
              yaxis: { title: "Frequency" },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.dates,
                y: data.cumulative_leakage_usd,
                type: "scatter",
                mode: "lines",
                line: { width: 1.5, color: "#ef4444" },
                name: "Cumulative Leakage",
              },
            ]}
            layout={{
              title: "Cumulative Hedge Leakage from Basis ($)",
              xaxis: { title: "Date" },
              yaxis: { title: "Leakage ($)" },
            }}
          />
        </div>
        <div className="card" style={{ height: 360 }}>
          <PlotlyChart
            data={[
              {
                x: data.autocorrelation.lags,
                y: data.autocorrelation.acf,
                type: "bar",
                marker: { color: "#3b82f6", opacity: 0.8 },
              },
            ]}
            layout={{
              title: "Basis Autocorrelation",
              xaxis: { title: "Lag (days)" },
              yaxis: { title: "ACF" },
            }}
          />
        </div>
      </div>

      <InsightBox>
        {t(
          `Basis averages ${fmt(s.mean_basis_bps, 2)} bps with a volatility of ${fmt(s.std_basis_bps, 2)} bps. Over the 6-month period, cumulative hedge leakage from basis drift was ${fmtUSD(Math.abs(s.total_leakage_usd))} (annualized: ${fmtUSD(Math.abs(s.annualized_leakage_usd))}). Basis accounts for ${fmt(vd.basis_share_pct, 1)}% of total portfolio VaR. While small individually, basis risk compounds over time and becomes significant for high-frequency hedge rebalancing.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 7: Market Impact ────────────────────────────────────── */

function ImpactSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="impact" className="mb-12">
        <Loader />
      </section>
    );
  const p = data.parameters;
  return (
    <section id="impact" className="mb-12">
      <STitle>{t("7 · Market Impact & Execution Cost — Risk #5")}</STitle>
      <InfoBox title="What is Market Impact?">
        {t(
          "When you need to hedge your exchange's net delta by trading on an external venue, your own trades move the market against you. If you need to sell 100 BTC to hedge, the act of selling pushes the price down — so you get a worse average price than expected. This is market impact. The Almgren-Chriss square-root model estimates impact as: Impact ∝ σ × √(Q/V), where σ is volatility, Q is your trade size, and V is daily volume. The key insight: impact grows with the SQUARE ROOT of size (selling 4× more only costs 2× more in impact), but it grows LINEARLY with volatility. During stressed markets when you most need to hedge, costs skyrocket."
        )}
      </InfoBox>
      <MathBox>
        Impact = σ_daily × √(Q / ADV) × κ &nbsp;|&nbsp; Total Cost = Impact +
        Spread &nbsp;|&nbsp; TWAP Savings ∝ √(n_slices)
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("ADV")}
          value={`${fmt(p.avg_daily_volume_btc, 0)} BTC`}
          color={ACCENT}
        />
        <Stat
          label={t("Daily Vol")}
          value={`${fmt(p.daily_volatility_pct, 2)}%`}
        />
        <Stat
          label={t("Avg Spread")}
          value={`${fmt(p.spread_bps, 1)} bps`}
        />
        <Stat
          label={t("Price")}
          value={`$${fmt(p.current_price)}`}
          color={ACCENT}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: data.impact_curve.map((ic: any) => ic.trade_size_btc),
                y: data.impact_curve.map((ic: any) => ic.impact_bps),
                type: "scatter",
                mode: "lines+markers",
                line: { color: "#ef4444", width: 2 },
                marker: { size: 8 },
                name: "Market Impact (bps)",
              },
              {
                x: data.impact_curve.map((ic: any) => ic.trade_size_btc),
                y: data.impact_curve.map(
                  () => p.spread_bps
                ),
                type: "scatter",
                mode: "lines",
                line: { color: "#6b7280", dash: "dash" },
                name: "Spread (bps)",
              },
            ]}
            layout={{
              title: "Market Impact vs Trade Size (Square-Root Model)",
              xaxis: { title: "Trade Size (BTC)", type: "log" },
              yaxis: { title: "Cost (bps)" },
              showlegend: true,
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: data.impact_curve.map((ic: any) => `${ic.trade_size_btc}`),
                y: data.impact_curve.map((ic: any) => ic.impact_usd),
                type: "bar",
                marker: { color: "#ef4444", opacity: 0.7 },
                name: "Impact Cost",
              },
              {
                x: data.impact_curve.map((ic: any) => `${ic.trade_size_btc}`),
                y: data.impact_curve.map((ic: any) => ic.spread_cost_usd),
                type: "bar",
                marker: { color: "#3b82f6", opacity: 0.7 },
                name: "Spread Cost",
              },
            ]}
            layout={{
              title: "Total Execution Cost Breakdown ($)",
              xaxis: { title: "Trade Size (BTC)" },
              yaxis: { title: "Cost ($)" },
              barmode: "stack",
              showlegend: true,
            }}
          />
        </div>
      </div>

      {/* Execution schedule */}
      <div className="card mb-4 overflow-x-auto">
        <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
          Optimal Execution: TWAP for 100 BTC Trade
        </p>
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Slices")}</th>
              <th>{t("Size per Slice")}</th>
              <th>{t("Total Impact")}</th>
              <th>{t("Spread Cost")}</th>
              <th>{t("Total Cost")}</th>
              <th>{t("Savings vs Single")}</th>
            </tr>
          </thead>
          <tbody>
            {data.execution_schedule.map((es: any, i: number) => (
              <tr key={i}>
                <td>{es.n_slices}</td>
                <td>{fmt(es.slice_size_btc, 1)} BTC</td>
                <td>{fmtUSD(es.total_impact_usd)}</td>
                <td>{fmtUSD(es.spread_cost_usd)}</td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(es.total_cost_usd)}
                </td>
                <td style={{ color: "var(--accent-green)" }}>
                  {fmt(es.savings_vs_single_pct, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Impact by hour */}
      <div className="card" style={{ height: 360 }}>
        <PlotlyChart
          data={[
            {
              x: data.impact_by_hour.map((h: any) => `${h.hour}:00`),
              y: data.impact_by_hour.map((h: any) => h.spread_bps),
              type: "bar",
              marker: { color: "#3b82f6", opacity: 0.6 },
              name: "Spread (bps)",
            },
          ]}
          layout={{
            title: "Spread by Hour of Day (UTC)",
            xaxis: { title: "Hour" },
            yaxis: { title: "bps" },
            showlegend: true,
          }}
        />
      </div>

      <InsightBox>
        {t(
          "Splitting a 100 BTC hedge into 8 TWAP slices saves significant impact cost compared to executing all at once. Market impact follows the square-root law — doubling trade size only increases impact by ~41% (√2), not 100%. However, slicing trades too thin introduces timing risk (price may move while you're executing). The optimal balance depends on your urgency and market conditions."
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 8: Hedge Simulation Backtest ────────────────────────── */

function HedgeSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="hedge" className="mb-12">
        <Loader />
      </section>
    );
  const mp = data.main_params;
  const main = data.main_scenario;
  const best90 = data.scenarios.find(
    (s: any) => s.hedge_ratio === 0.9 && s.rebalance_hours === 8
  );
  return (
    <section id="hedge" className="mb-12">
      <STitle>{t("8 · Hedge Simulation Backtest — All Risks Combined")}</STitle>
      <InfoBox title="What is the Hedge Backtest?">
        {t(
          "This is the capstone analysis that ties ALL risks together. We simulate: (1) the exchange's evolving net delta exposure over 6 months, (2) hedging X% of that exposure on an external venue, (3) rebalancing the hedge every Y hours, and (4) applying ALL real-world frictions — spread costs, market impact, basis drift, and funding differentials. We test multiple combinations of hedge ratio (50%, 75%, 90%, 100%) and rebalance frequency (1h, 4h, 8h, 24h) to find the optimal strategy. The 'efficient frontier' shows the trade-off between risk reduction and hedge cost."
        )}
      </InfoBox>
      <MathBox>
        Hedged P&L = Unhedged P&L + Hedge Revenue − Spread Cost − Impact Cost
        − Basis Leakage
      </MathBox>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label={t("Best Hedge Ratio")}
          value={`${(mp.hedge_ratio * 100).toFixed(0)}%`}
          color={ACCENT}
        />
        <Stat
          label={t("Rebalance Freq")}
          value={`${mp.rebalance_hours}h`}
        />
        <Stat
          label={t("Vol Reduction")}
          value={`${fmt(best90?.vol_reduction_pct, 1)}%`}
          color="var(--accent-green)"
        />
        <Stat
          label={t("Total Hedge Cost")}
          value={fmtUSD(best90?.total_hedge_cost)}
          color={RED}
        />
      </div>

      {main && (
        <div className="card mb-4" style={{ height: 420 }}>
          <PlotlyChart
            data={[
              {
                x: main.dates,
                y: main.unhedged_cumulative,
                type: "scatter",
                mode: "lines",
                line: { width: 1.5, color: "#ef4444" },
                name: "Unhedged P&L",
              },
              {
                x: main.dates,
                y: main.hedged_cumulative,
                type: "scatter",
                mode: "lines",
                line: { width: 2, color: "#10b981" },
                name: `Hedged P&L (${(mp.hedge_ratio * 100).toFixed(0)}%)`,
              },
              {
                x: main.dates,
                y: main.cost_cumulative.map((c: number) => -c),
                type: "scatter",
                mode: "lines",
                line: { width: 1, color: "#6b7280", dash: "dash" },
                name: "Cumulative Cost (neg)",
              },
            ]}
            layout={{
              title: `Hedged vs Unhedged P&L (${(mp.hedge_ratio * 100).toFixed(0)}% ratio, ${mp.rebalance_hours}h rebalance)`,
              xaxis: { title: "Date" },
              yaxis: { title: "Cumulative P&L ($)" },
              showlegend: true,
              legend: { x: 0, y: 1.15, orientation: "h" },
            }}
          />
        </div>
      )}

      {/* Scenario comparison table */}
      <div className="card overflow-x-auto">
        <p className="text-xs font-bold mb-2" style={{ color: ACCENT_HEX }}>
          Hedge Strategy Comparison
        </p>
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Hedge %")}</th>
              <th>{t("Rebalance")}</th>
              <th>{t("Vol Reduction")}</th>
              <th>{t("Hedge Cost")}</th>
              <th>{t("Max DD (Unhedged)")}</th>
              <th>{t("Max DD (Hedged)")}</th>
            </tr>
          </thead>
          <tbody>
            {data.scenarios
              .filter((s: any) => s.hedge_ratio > 0)
              .map((sc: any, i: number) => (
                <tr key={i}>
                  <td>{(sc.hedge_ratio * 100).toFixed(0)}%</td>
                  <td>{sc.rebalance_hours}h</td>
                  <td style={{ color: "var(--accent-green)" }}>
                    {fmt(sc.vol_reduction_pct, 1)}%
                  </td>
                  <td>{fmtUSD(sc.total_hedge_cost)}</td>
                  <td style={{ color: "#ef4444" }}>
                    {fmtUSD(sc.max_drawdown_unhedged)}
                  </td>
                  <td style={{ color: "#f59e0b" }}>
                    {fmtUSD(sc.max_drawdown_hedged)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <InsightBox>
        {t(
          `A ${(mp.hedge_ratio * 100).toFixed(0)}% hedge with ${mp.rebalance_hours}-hour rebalancing reduces P&L volatility by ${fmt(best90?.vol_reduction_pct, 1)}% at a cost of ${fmtUSD(best90?.total_hedge_cost)} over 6 months. The remaining volatility comes from basis risk, timing gaps between rebalances, and market impact friction. Full 100% hedging is not optimal because the additional cost of hedging the last 10% often exceeds the risk reduction benefit.`
        )}
      </InsightBox>
    </section>
  );
}

/* ── Section 9: Risk Dashboard ───────────────────────────────────── */

function DashboardSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data)
    return (
      <section id="dashboard" className="mb-12">
        <Loader />
      </section>
    );
  const rb = data.risk_budget;
  const rv = data.revenue_model;
  const km = data.key_metrics;
  return (
    <section id="dashboard" className="mb-12">
      <STitle>{t("9 · Integrated Risk Dashboard — All Risks")}</STitle>
      <InfoBox title="Why an Integrated View?">
        {t(
          "Individual risk metrics are useful, but the exchange needs to understand how they combine. The risk budget shows what percentage of total risk comes from each of the 5 risk types. This helps allocate capital and attention efficiently — you might discover that 70% of your risk comes from directional exposure, making delta hedging the highest-priority action. The revenue model then compares expected income (from spreads and funding) against expected risk costs, giving the risk-adjusted return that determines whether offering perpetual futures is actually profitable."
        )}
      </InfoBox>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat
          label={t("Total Annual Risk")}
          value={fmtUSD(data.total_risk_usd)}
          color={RED}
        />
        <Stat
          label={t("Total Annual Revenue")}
          value={fmtUSD(rv.total_revenue_annual)}
          color="var(--accent-green)"
        />
        <Stat
          label={t("Risk/Return Ratio")}
          value={`${fmt(rv.risk_return_ratio, 1)}x`}
          color={ACCENT}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                labels: rb.labels,
                values: rb.values,
                type: "pie",
                hole: 0.45,
                marker: {
                  colors: [
                    "#ef4444",
                    "#f59e0b",
                    "#3b82f6",
                    "#8b5cf6",
                    "#10b981",
                  ],
                },
                textinfo: "label+percent",
                textfont: { size: 10, color: "#fff" },
              },
            ]}
            layout={{
              title: "Risk Budget — % Contribution by Risk Type",
              showlegend: false,
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              {
                x: ["Spread Rev", "Funding Rev", "Hedge Cost", "Net Revenue"],
                y: [
                  rv.spread_revenue_annual,
                  rv.funding_revenue_annual,
                  -rv.hedge_cost_annual,
                  rv.net_revenue_annual,
                ],
                type: "bar",
                marker: {
                  color: [
                    "#10b981",
                    "#3b82f6",
                    "#ef4444",
                    rv.net_revenue_annual >= 0 ? "#10b981" : "#ef4444",
                  ],
                },
              },
            ]}
            layout={{
              title: "Annual Revenue Model ($)",
              xaxis: { title: "Revenue Component" },
              yaxis: { title: "USD / year" },
            }}
          />
        </div>
      </div>

      {/* P&L Attribution Waterfall */}
      {data.pnl_attribution && (
        <>
          <InfoBox title="P&L Attribution — Where Does Money Come From?">
            {t(
              "P&L attribution splits the exchange's total profit/loss into its 5 component sources: (1) spread/fee income from client trades, (2) slippage costs from delta hedging on external venues, (3) funding rate carry — the cost of the funding differential between your exchange and the hedge venue, (4) liquidation shortfalls when positions close at prices worse than the bankruptcy price, and (5) basis drift — the P&L leakage from imperfect hedging due to cross-exchange price differences. This decomposition reveals exactly where money is being made and lost."
            )}
          </InfoBox>
          <div className="card mb-4" style={{ height: 400 }}>
            <PlotlyChart
              data={[
                {
                  x: data.pnl_attribution.labels,
                  y: data.pnl_attribution.annualized,
                  type: "bar",
                  marker: {
                    color: data.pnl_attribution.annualized.map((v: number) =>
                      v >= 0 ? "#10b981" : "#ef4444"
                    ),
                  },
                  name: "Annualized P&L",
                },
              ]}
              layout={{
                title: `P&L Attribution — Annualized (Net: ${fmtUSD(data.pnl_attribution.net_pnl_annualized)}/yr)`,
                yaxis: { title: "USD / year" },
                xaxis: { title: "P&L Source", tickangle: -20 },
              }}
            />
          </div>
        </>
      )}

      {/* Risk budget detail table */}
      <div className="card mb-4 overflow-x-auto">
        <table className="data-table w-full text-xs">
          <thead>
            <tr>
              <th>{t("Risk Type")}</th>
              <th>{t("Annual USD Exposure")}</th>
              <th>{t("% of Total")}</th>
            </tr>
          </thead>
          <tbody>
            {rb.labels.map((label: string, i: number) => (
              <tr key={i}>
                <td>{label}</td>
                <td style={{ color: "#ef4444" }}>
                  {fmtUSD(rb.usd_values[i])}
                </td>
                <td>{fmt(rb.values[i], 1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat
          label={t("99% Daily VaR")}
          value={fmtUSD(km.daily_var_99)}
          color={RED}
        />
        <Stat
          label={t("Worst Cascade Loss")}
          value={fmtUSD(km.worst_cascade_loss)}
          color={RED}
        />
        <Stat
          label={t("Hedge Effectiveness")}
          value={`${fmt(km.hedge_effectiveness, 1)}%`}
          color="var(--accent-green)"
        />
      </div>

      {/* Recommendations */}
      <div className="card">
        <p
          className="text-xs font-bold mb-3"
          style={{ color: ACCENT_HEX }}
        >
          Risk Management Recommendations
        </p>
        <div className="space-y-2">
          {data.recommendations.map((rec: any, i: number) => (
            <div
              key={i}
              className="flex items-start gap-3 text-xs"
            >
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0"
                style={{
                  background:
                    rec.priority === "CRITICAL"
                      ? "rgba(239,68,68,0.2)"
                      : rec.priority === "HIGH"
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(59,130,246,0.15)",
                  color:
                    rec.priority === "CRITICAL"
                      ? "#ef4444"
                      : rec.priority === "HIGH"
                      ? "#f59e0b"
                      : "#3b82f6",
                }}
              >
                {rec.priority}
              </span>
              <span className="text-[var(--muted)]">
                <strong style={{ color: "var(--foreground)" }}>
                  {rec.risk}:
                </strong>{" "}
                {rec.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      <InsightBox>
        {t(
          `The exchange generates an estimated ${fmtUSD(rv.total_revenue_annual)}/year in revenue (spreads + funding) against ${fmtUSD(rv.hedge_cost_annual)}/year in hedging costs, yielding a net revenue of ${fmtUSD(rv.net_revenue_annual)}/year. The risk/return ratio of ${fmt(rv.risk_return_ratio, 1)}x indicates that expected revenue significantly exceeds risk costs — offering perpetual futures is profitable IF proper risk management (especially delta hedging and cascade protection) is maintained.`
        )}
      </InsightBox>
    </section>
  );
}
