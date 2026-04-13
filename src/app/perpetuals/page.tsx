"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import PlotlyChart from "../../components/charts/PlotlyChart";
import { useI18n } from "../../lib/i18n";

/* eslint-disable @typescript-eslint/no-explicit-any */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "returns", label: "1. Returns" },
  { id: "vwap", label: "2. VWAP" },
  { id: "ofi", label: "3. Order Flow" },
  { id: "rvol", label: "4. Realized Vol" },
  { id: "spread", label: "5. Micro-Spread" },
  { id: "volprofile", label: "6. Volume Profile" },
  { id: "funding", label: "7. Funding Rate" },
  { id: "markprice", label: "8. Mark Price" },
  { id: "risk", label: "9. VaR / CVaR" },
  { id: "liquidation", label: "10. Liquidation" },
  { id: "seasonality", label: "11. Seasonality" },
  { id: "autocorrelation", label: "12. ACF & Hurst" },
  { id: "tailrisk", label: "13. Tail Risk" },
  { id: "margin", label: "14. Margin Tiers" },
];

async function fetchJSON<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default function PerpetualFutures() {
  const { t } = useI18n();
  const [d, setD] = useState<Record<string, any>>({});
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const files = ["overview", "returns", "vwap", "ofi", "volatility", "spread",
      "volume_profile", "funding", "mark_price", "risk", "liquidation",
      "seasonality", "autocorrelation", "tail_risk", "margin"];
    files.forEach((f) => fetchJSON(`/data/perp/${f}.json`).then((v) => setD((prev) => ({ ...prev, [f]: v }))));
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id); },
      { threshold: 0.15, rootMargin: "-80px 0px -40% 0px" }
    );
    SECTIONS.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex min-h-screen">
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4 pt-6 overflow-y-auto">
        <Link href="/" className="text-[10px] text-[var(--muted)] hover:text-[var(--accent-green)] transition mb-2 block">{t("← Home")}</Link>
        <div className="mb-4">
          <h1 className="text-sm font-bold text-[var(--accent-green)] leading-tight">{t("Perpetual Futures")}</h1>
          <h2 className="text-xs text-[var(--muted)]">{t("Exchange Risk & Microstructure")}</h2>
        </div>
        <div className="flex flex-col gap-0.5 flex-1">
          {SECTIONS.map(({ id, label }) => (
            <button key={id} onClick={() => scrollTo(id)}
              className={`text-left text-xs px-3 py-1.5 rounded-lg transition-all ${
                activeSection === id ? "bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.03)]"}`}>
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">BTCUSDT 1s Klines</p>
          <p className="text-[10px] text-[var(--muted)]">Jan–Jun 2025 · 15.6M rows</p>
          <p className="text-[10px] text-[var(--muted)]">{t("14 Analysis Steps")}</p>
        </div>
      </nav>

      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">{t("Perpetual Futures Analytics")}</h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t("Fair pricing, microstructure, risk management & margin calibration for BTC perpetual contracts — from 15.6 million 1-second observations.")}
          </p>
        </header>

        <OverviewSection data={d.overview} />
        <ReturnsSection data={d.returns} />
        <VwapSection data={d.vwap} />
        <OfiSection data={d.ofi} />
        <RvolSection data={d.volatility} />
        <SpreadSection data={d.spread} />
        <VolProfileSection data={d.volume_profile} />
        <FundingSection data={d.funding} />
        <MarkPriceSection data={d.mark_price} />
        <RiskSection data={d.risk} />
        <LiquidationSection data={d.liquidation} />
        <SeasonalitySection data={d.seasonality} />
        <AutocorrelationSection data={d.autocorrelation} />
        <TailRiskSection data={d.tail_risk} />
        <MarginSection data={d.margin} />

        <SummarySection />

        <footer className="mt-12 pt-6 border-t border-[var(--card-border)] text-center text-xs text-[var(--muted)]">
          <p>{t("Perpetual Futures Research · Next.js + Plotly.js + Python")}</p>
          <p className="mt-1">{t("Data: BTCUSDT 1-second klines, Binance, Jan–Jun 2025")}</p>
        </footer>
      </main>
    </div>
  );
}

function Loader() { return <div className="card animate-pulse h-32 flex items-center justify-center text-[var(--muted)]">Loading...</div>; }
function STitle({ children }: { children: React.ReactNode }) { return <h2 className="section-title" style={{ color: "var(--accent-green)" }}>{children}</h2>; }
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return <div className="card text-center"><p className="stat-label">{label}</p><p className="stat-value" style={{ color }}>{value}</p></div>;
}

function OverviewSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="overview" className="mb-12"><Loader /></section>;
  return (
    <section id="overview" className="mb-12">
      <STitle>{t("Overview — BTCUSDT Perpetual")}</STitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Total Rows")} value={data.total_rows.toLocaleString()} color="var(--accent-green)" />
        <Stat label={t("Period")} value={`${data.date_start} → ${data.date_end}`} />
        <Stat label={t("Price Range")} value={`$${(data.price_min / 1000).toFixed(0)}K – $${(data.price_max / 1000).toFixed(0)}K`} color="var(--accent)" />
        <Stat label={t("Avg Daily Vol")} value={`${data.avg_daily_volume.toFixed(0)} BTC`} color="var(--accent-amber)" />
      </div>
      <div className="card" style={{ height: 400 }}>
        <PlotlyChart
          data={[
            { x: data.timestamps, y: data.close, type: "scatter", mode: "lines", line: { width: 1, color: "#3b82f6" }, name: "Close", yaxis: "y" },
            { x: data.timestamps, y: data.volume, type: "bar", marker: { color: "rgba(249,115,22,0.3)" }, name: "Volume", yaxis: "y2" },
          ]}
          layout={{
            title: "BTCUSDT Price & Volume (Hourly)", yaxis: { title: "Price ($)", side: "left" },
            yaxis2: { title: "Volume (BTC)", overlaying: "y", side: "right" }, showlegend: true,
          }}
        />
      </div>
    </section>
  );
}

function ReturnsSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="returns" className="mb-12"><Loader /></section>;
  const s = data.stats_1s;
  const h = data.histogram;
  const qq = data.qq_plot;
  return (
    <section id="returns" className="mb-12">
      <STitle>{t("Step 1 — Log Returns")}</STitle>
      <p className="text-sm text-[var(--muted)] mb-4">{t("Log returns are the building block of all quantitative finance — additive over time, enabling cleaner statistical analysis.")}</p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
        <Stat label={t("Mean")} value={s.mean.toExponential(3)} />
        <Stat label={t("Std Dev")} value={s.std.toExponential(3)} />
        <Stat label={t("Skewness")} value={s.skewness.toFixed(3)} color={s.skewness < 0 ? "var(--accent-red)" : "var(--accent-green)"} />
        <Stat label={t("Kurtosis")} value={s.kurtosis.toFixed(0)} color="var(--accent-amber)" />
        <Stat label={t("Min")} value={`${(s.min * 100).toFixed(3)}%`} color="var(--accent-red)" />
        <Stat label={t("Max")} value={`${(s.max * 100).toFixed(3)}%`} color="var(--accent-green)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              { x: h.bin_centers, y: h.counts, type: "bar", marker: { color: "#10b981", opacity: 0.7 }, name: "Actual" },
              { x: h.normal_x, y: h.normal_y, type: "scatter", mode: "lines", line: { color: "#ef4444", width: 2 }, name: "Normal" },
            ]}
            layout={{ title: "1-Min Returns vs Normal", xaxis: { title: "Log Return" }, yaxis: { title: "Density" }, bargap: 0, showlegend: true }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              { x: qq.theoretical, y: qq.sample, type: "scatter", mode: "markers", marker: { color: "#10b981", size: 2, opacity: 0.3 }, name: "Data" },
              { x: [qq.theoretical[0], qq.theoretical[qq.theoretical.length - 1]],
                y: [qq.intercept + qq.slope * qq.theoretical[0], qq.intercept + qq.slope * qq.theoretical[qq.theoretical.length - 1]],
                type: "scatter", mode: "lines", line: { color: "#ef4444", width: 2, dash: "dash" }, name: "Reference" },
            ]}
            layout={{ title: "QQ Plot — Tail Deviation from Normal", xaxis: { title: "Theoretical" }, yaxis: { title: "Sample" }, showlegend: true }}
          />
        </div>
      </div>
      <div className="card mt-4 border-l-4 border-l-[var(--accent-amber)]">
        <p className="text-sm"><strong className="text-[var(--accent-amber)]">Key Insight:</strong> {t("Kurtosis")} = {s.kurtosis.toFixed(0)} (normal = 0). Extreme moves happen far more often than a bell curve predicts — this is why exchanges use mark price for liquidations.</p>
      </div>
    </section>
  );
}

function VwapSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="vwap" className="mb-12"><Loader /></section>;
  const ds = data.deviation_stats;
  return (
    <section id="vwap" className="mb-12">
      <STitle>{t("Step 2 — VWAP: Volume-Weighted Average Price")}</STitle>
      <p className="text-sm text-[var(--muted)] mb-4">VWAP = cumulative(quote_volume) / cumulative(volume), resetting each day. The &quot;fair&quot; benchmark price.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Mean Deviation")} value={`${ds.mean > 0 ? "+" : ""}${ds.mean.toFixed(4)}%`} />
        <Stat label={t("Std Deviation")} value={`${ds.std.toFixed(4)}%`} />
        <Stat label={t("Median Dev")} value={`${ds.median > 0 ? "+" : ""}${ds.median.toFixed(4)}%`} />
        <Stat label="|Dev| > 0.1%" value={`${ds.pct_gt_01.toFixed(1)}% of time`} color="var(--accent-amber)" />
      </div>
      <div className="card" style={{ height: 400 }}>
        <PlotlyChart
          data={[
            { x: data.sample_timestamps, y: data.sample_close, type: "scatter", mode: "lines", line: { width: 1, color: "#3b82f6" }, name: "Close" },
            { x: data.sample_timestamps, y: data.sample_vwap, type: "scatter", mode: "lines", line: { width: 2, color: "#ef4444" }, name: "VWAP" },
          ]}
          layout={{ title: `VWAP vs Close — ${data.sample_date}`, yaxis: { title: "Price ($)" }, showlegend: true }}
        />
      </div>
    </section>
  );
}

function OfiSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="ofi" className="mb-12"><Loader /></section>;
  return (
    <section id="ofi" className="mb-12">
      <STitle>{t("Step 3 — Order Flow Imbalance")}</STitle>
      <p className="text-sm text-[var(--muted)] mb-4">{t("OFI = (taker_buy − taker_sell) / total_volume. Measures who is aggressively buying vs selling.")}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{ x: data.ofi_histogram.centers, y: data.ofi_histogram.counts, type: "bar", marker: { color: "#10b981", opacity: 0.7 } }]}
            layout={{ title: "5-Min OFI Distribution", xaxis: { title: "OFI (−1 = all sells, +1 = all buys)" }, yaxis: { title: "Density" }, bargap: 0,
              shapes: [{ type: "line", x0: 0, x1: 0, y0: 0, y1: 1, yref: "paper", line: { color: "white", dash: "dash", width: 1 } }] }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: data.decile_signal.x, y: data.decile_signal.y, type: "bar",
              marker: { color: data.decile_signal.y.map((v: number) => v < 0 ? "#ef4444" : "#10b981") },
            }]}
            layout={{ title: "OFI Decile → Next 5-Min Return (bps)", xaxis: { title: "OFI Decile (0=most selling → 19=most buying)" }, yaxis: { title: "Avg Fwd Return (bps)" },
              shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: 0, y1: 0, line: { color: "white", dash: "dash", width: 0.5 } }] }}
          />
        </div>
      </div>
      <div className="card mt-4 border-l-4 border-l-[var(--accent-green)]">
        <p className="text-sm"><strong className="text-[var(--accent-green)]">Correlation(OFI, next-bar return):</strong> {data.correlation.toFixed(4)} — Looks small, but in HFT even r = 0.02 is highly profitable over thousands of trades per day.</p>
      </div>
    </section>
  );
}

function RvolSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="rvol" className="mb-12"><Loader /></section>;
  return (
    <section id="rvol" className="mb-12">
      <STitle>{t("Step 4 — Realized Volatility")}</STitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Avg 30d Vol")} value={`${data.mean_vol.toFixed(1)}%`} color="var(--accent-green)" />
        <Stat label={t("Peak Vol")} value={`${data.peak_vol.toFixed(1)}%`} color="var(--accent-red)" />
        <Stat label={t("Peak Date")} value={data.peak_vol_date} />
        <Stat label={t("Min Vol")} value={`${data.min_vol.toFixed(1)}%`} color="var(--accent)" />
      </div>
      <div className="card" style={{ height: 450 }}>
        <PlotlyChart
          data={[
            { x: data.dates, y: data.close, type: "scatter", mode: "lines", line: { width: 1, color: "#3b82f6" }, name: "Price", yaxis: "y" },
            { x: data.dates, y: data.rvol_cc, type: "scatter", mode: "lines", line: { width: 1.5, color: "#ef4444" }, name: "CC Vol", yaxis: "y2" },
            { x: data.dates, y: data.rvol_park, type: "scatter", mode: "lines", line: { width: 1.5, color: "#f59e0b", dash: "dash" }, name: "Parkinson Vol", yaxis: "y2" },
          ]}
          layout={{
            title: "Price & 30-Day Realized Volatility", yaxis: { title: "Price ($)", side: "left" },
            yaxis2: { title: "Ann. Vol (%)", overlaying: "y", side: "right" }, showlegend: true,
          }}
        />
      </div>
    </section>
  );
}

function SpreadSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="spread" className="mb-12"><Loader /></section>;
  const st = data.stats;
  const mean = data.by_hour.mean;
  return (
    <section id="spread" className="mb-12">
      <STitle>{t("Step 5 — Micro-Spread")}</STitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Mean Spread")} value={`${st.mean_bps.toFixed(2)} bps`} color="var(--accent-green)" />
        <Stat label={t("Tightest Hour")} value={`${st.tightest_hour}:00 UTC (${st.tightest_bps.toFixed(2)} bps)`} />
        <Stat label={t("Widest Hour")} value={`${st.widest_hour}:00 UTC (${st.widest_bps.toFixed(2)} bps)`} color="var(--accent-red)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{
              x: data.by_hour.hours, y: data.by_hour.spread, type: "bar",
              marker: { color: data.by_hour.spread.map((v: number) => v < mean ? "#10b981" : "#ef4444") },
            }]}
            layout={{ title: "Spread by Hour of Day (UTC)", xaxis: { title: "Hour (UTC)", dtick: 2 }, yaxis: { title: "Spread (bps)" },
              shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: mean, y1: mean, line: { color: "white", dash: "dash", width: 1 } }] }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{ x: data.scatter.volume, y: data.scatter.spread, type: "scatter", mode: "markers",
              marker: { color: "#10b981", size: 2, opacity: 0.1 } }]}
            layout={{ title: "Spread vs Volume (inverse = healthy)", xaxis: { title: "Hourly Volume (BTC)" }, yaxis: { title: "Spread (bps)" } }}
          />
        </div>
      </div>
    </section>
  );
}

function VolProfileSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="volprofile" className="mb-12"><Loader /></section>;
  return (
    <section id="volprofile" className="mb-12">
      <STitle>{t("Step 6 — Volume Profile")}</STitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Point of Control")} value={`$${data.poc.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} color="var(--accent-red)" />
        <Stat label={t("Value Area Low")} value={`$${data.va_low.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat label={t("Value Area High")} value={`$${data.va_high.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <Stat label={t("VA Width")} value={`${data.va_width_pct.toFixed(1)}% of POC`} color="var(--accent-amber)" />
      </div>
      <div className="card" style={{ height: 450 }}>
        <PlotlyChart
          data={[
            { x: data.daily_dates, y: data.daily_close, type: "scatter", mode: "lines", line: { width: 1, color: "#3b82f6" }, name: "Daily Close" },
          ]}
          layout={{
            title: "Price Action + Value Area", yaxis: { title: "Price ($)" },
            shapes: [
              { type: "rect", x0: 0, x1: 1, xref: "paper", y0: data.va_low, y1: data.va_high, fillcolor: "rgba(16,185,129,0.1)", line: { width: 0 } },
              { type: "line", x0: 0, x1: 1, xref: "paper", y0: data.poc, y1: data.poc, line: { color: "#ef4444", dash: "dash", width: 1.5 } },
            ],
            annotations: [{ x: 0.02, xref: "paper", y: data.poc, text: `POC: $${data.poc.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, showarrow: false, font: { color: "#ef4444", size: 10 } }],
          }}
        />
      </div>
      <div className="card mt-4 border-l-4" style={{ borderLeftColor: data.inside_va ? "var(--accent-green)" : "var(--accent-amber)" }}>
        <p className="text-sm">Current price ${data.current_price.toLocaleString()} is <strong>{data.inside_va ? "INSIDE" : "OUTSIDE"}</strong> the Value Area — {data.inside_va ? "market is in balance." : "potential breakout or reversion."}</p>
      </div>
    </section>
  );
}

function FundingSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="funding" className="mb-12"><Loader /></section>;
  const s = data.stats;
  return (
    <section id="funding" className="mb-12">
      <STitle>{t("Step 7 — Funding Rate")}</STitle>
      <p className="text-sm text-[var(--muted)] mb-4">{t("The engine that keeps perpetual contracts anchored to spot. Positive = longs pay shorts. Standard 8h interval.")}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Mean per 8h")} value={`${s.mean_pct > 0 ? "+" : ""}${s.mean_pct.toFixed(4)}%`} color="var(--accent-green)" />
        <Stat label={t("Positive %")} value={`${s.pct_positive.toFixed(1)}%`} />
        <Stat label={t("Ann. Yield")} value={`${s.annualized_yield_pct.toFixed(1)}%`} color="var(--accent-amber)" />
        <Stat label={t("6m Cumulative")} value={`${s.cumulative_6m_pct.toFixed(2)}%`} color="var(--accent-purple)" />
      </div>
      <div className="card mb-4" style={{ height: 350 }}>
        <PlotlyChart
          data={[{ x: data.timestamps, y: data.funding_rate_pct, type: "bar",
            marker: { color: data.funding_rate_pct.map((v: number) => v >= 0 ? "#10b981" : "#ef4444"), opacity: 0.7 } }]}
          layout={{ title: "8h Funding Rate (green = longs pay, red = shorts pay)", yaxis: { title: "Funding (%)" },
            shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: 0, y1: 0, line: { color: "white", width: 0.5 } }] }}
        />
      </div>
      <div className="card" style={{ height: 350 }}>
        <PlotlyChart
          data={[{ x: data.timestamps, y: data.cumulative_funding_pct, type: "scatter", mode: "lines",
            line: { width: 2, color: "#8b5cf6" }, fill: "tozeroy", fillcolor: "rgba(139,92,246,0.1)" }]}
          layout={{ title: "Cumulative Funding (basis trade P&L)", yaxis: { title: "Cumulative (%)" } }}
        />
      </div>
      <div className="card mt-4 border-l-4 border-l-[var(--accent-purple)]">
        <p className="text-sm"><strong className="text-[var(--accent-purple)]">Cash-and-Carry:</strong> Long spot + short perp would have earned {s.cumulative_6m_pct.toFixed(2)}% in 6 months ≈ {(s.cumulative_6m_pct * 2).toFixed(1)}% annualized.</p>
      </div>
    </section>
  );
}

function MarkPriceSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="markprice" className="mb-12"><Loader /></section>;
  const s = data.stats;
  return (
    <section id="markprice" className="mb-12">
      <STitle>{t("Step 8 — Mark Price Construction")}</STitle>
      <p className="text-sm text-[var(--muted)] mb-4">{t("Mark Price = VWAP + EMA-smoothed basis. The price that determines liquidations — smooths out short-lived spikes.")}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label={t("Mean |Close−Mark|")} value={`$${s.mean_abs_dev.toFixed(2)}`} />
        <Stat label={t("Median")} value={`$${s.median_abs_dev.toFixed(2)}`} />
        <Stat label="95th pctl" value={`$${s.p95_abs_dev.toFixed(2)}`} color="var(--accent-amber)" />
        <Stat label={t("Max")} value={`$${s.max_abs_dev.toFixed(2)}`} color="var(--accent-red)" />
      </div>
      <div className="card mb-4" style={{ height: 380 }}>
        <PlotlyChart
          data={[
            { x: data.sample_timestamps, y: data.sample_close, type: "scatter", mode: "lines", line: { width: 0.6, color: "#3b82f680" }, name: "Last Traded" },
            { x: data.sample_timestamps, y: data.sample_mark, type: "scatter", mode: "lines", line: { width: 2, color: "#ef4444" }, name: "Mark Price" },
            { x: data.sample_timestamps, y: data.sample_vwap, type: "scatter", mode: "lines", line: { width: 1, color: "#10b981", dash: "dash" }, name: "VWAP" },
          ]}
          layout={{ title: `Mark vs Last vs VWAP — ${data.sample_date}`, yaxis: { title: "Price ($)" }, showlegend: true }}
        />
      </div>
      <div className="card" style={{ height: 300 }}>
        <PlotlyChart
          data={[{ x: data.sample_timestamps, y: data.sample_dev_bps, type: "scatter", mode: "lines",
            fill: "tozeroy", line: { width: 1, color: "#3b82f6" }, fillcolor: "rgba(59,130,246,0.15)" }]}
          layout={{ title: "Close − Mark Price (bps)", yaxis: { title: "Deviation (bps)" },
            shapes: [{ type: "line", x0: 0, x1: 1, xref: "paper", y0: 0, y1: 0, line: { color: "white", width: 0.5, dash: "dash" } }] }}
        />
      </div>
    </section>
  );
}

function RiskSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="risk" className="mb-12"><Loader /></section>;
  return (
    <section id="risk" className="mb-12">
      <STitle>{t("Step 9 — VaR, CVaR & Maximum Drawdown")}</STitle>
      <div className="card mb-4 overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>{t("Confidence")}</th><th>{t("Hourly VaR")}</th><th>{t("Hourly CVaR")}</th><th>{t("Daily VaR")}</th><th>{t("Daily CVaR")}</th></tr></thead>
          <tbody>
            {data.var_table.map((r: any) => (
              <tr key={r.confidence}><td className="font-semibold">{(r.confidence * 100).toFixed(1)}%</td>
                <td>{r.hourly_var.toFixed(3)}%</td><td>{r.hourly_cvar.toFixed(3)}%</td>
                <td className="text-[var(--accent-amber)]">{r.daily_var.toFixed(3)}%</td>
                <td className="text-[var(--accent-red)]">{r.daily_cvar.toFixed(3)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[
              { x: data.daily_hist.centers, y: data.daily_hist.counts, type: "bar", marker: { color: "#3b82f6", opacity: 0.7 } },
            ]}
            layout={{ title: "Daily Returns + VaR", xaxis: { title: "Return (%)" }, yaxis: { title: "Density" }, bargap: 0,
              shapes: [
                { type: "line", x0: -data.var_95_pct, x1: -data.var_95_pct, y0: 0, y1: 1, yref: "paper", line: { color: "#f59e0b", dash: "dash", width: 2 } },
                { type: "line", x0: -data.var_99_pct, x1: -data.var_99_pct, y0: 0, y1: 1, yref: "paper", line: { color: "#ef4444", dash: "dash", width: 2 } },
              ] }}
          />
        </div>
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[{ x: data.drawdown.dates, y: data.drawdown.values, type: "scatter", mode: "lines",
              fill: "tozeroy", line: { width: 1, color: "#ef4444" }, fillcolor: "rgba(239,68,68,0.3)" }]}
            layout={{ title: `Drawdown from Peak (max: ${data.drawdown.max_dd_pct.toFixed(2)}%)`, yaxis: { title: "Drawdown (%)" } }}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[{ x: data.rolling_var.dates, y: data.rolling_var.values, type: "scatter", mode: "lines",
              fill: "tozeroy", line: { width: 1.5, color: "#ef4444" }, fillcolor: "rgba(239,68,68,0.15)" }]}
            layout={{ title: "Rolling 30-Day VaR (99%)", yaxis: { title: "VaR (%)" } }}
          />
        </div>
        <div className="card" style={{ height: 350 }}>
          <PlotlyChart
            data={[{ y: data.worst_days.returns, x: data.worst_days.dates, type: "bar", orientation: "h",
              marker: { color: "#ef4444", opacity: 0.8 } }]}
            layout={{ title: "10 Worst Daily Returns", xaxis: { title: "Return (%)" }, yaxis: { autorange: "reversed" }, margin: { l: 90 } }}
          />
        </div>
      </div>
    </section>
  );
}

function LiquidationSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="liquidation" className="mb-12"><Loader /></section>;
  const colors = ["#3b82f6", "#f59e0b", "#ef4444"];
  return (
    <section id="liquidation" className="mb-12">
      <STitle>{t("Step 10 — Liquidation Cascade Analysis")}</STitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={data.horizons.map((h: string, i: number) => ({
              x: data.leverage_levels, y: data.long_probs[h], type: "scatter", mode: "lines+markers",
              line: { width: 2, color: colors[i] }, marker: { size: 7 }, name: h,
            }))}
            layout={{ title: "Long — Liquidation Prob by Leverage", xaxis: { title: "Leverage (x)", type: "log" }, yaxis: { title: "Probability (%)" }, showlegend: true }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={data.horizons.map((h: string, i: number) => ({
              x: data.leverage_levels, y: data.short_probs[h], type: "scatter", mode: "lines+markers",
              line: { width: 2, color: colors[i] }, marker: { size: 7 }, name: h,
            }))}
            layout={{ title: "Short — Liquidation Prob by Leverage", xaxis: { title: "Leverage (x)", type: "log" }, yaxis: { title: "Probability (%)" }, showlegend: true }}
          />
        </div>
      </div>
      <div className="card overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent-green)] mb-2">{t("24h Long Liquidation Probability")}</h3>
        <table className="data-table">
          <thead><tr><th>{t("Leverage")}</th><th>{t("Probability")}</th><th>{t("Risk Level")}</th></tr></thead>
          <tbody>
            {data.liq_24h_table.map((r: any) => (
              <tr key={r.leverage}><td className="font-semibold">{r.leverage}x</td>
                <td>{r.prob.toFixed(2)}%</td>
                <td className={r.risk === "LOW" ? "text-[var(--accent-green)]" : r.risk === "MEDIUM" ? "text-[var(--accent-amber)]" : "text-[var(--accent-red)]"} style={{ fontWeight: 600 }}>{r.risk}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SeasonalitySection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="seasonality" className="mb-12"><Loader /></section>;
  const metricLabels: Record<string, string> = { volume: "Volume (BTC)", log_return: "Volatility (σ)", spread_bps: "Spread (bps)", num_trades: "Trades" };
  const colorscales: Record<string, string> = { volume: "YlOrRd", log_return: "Reds", spread_bps: "Blues", num_trades: "YlGn" };
  return (
    <section id="seasonality" className="mb-12">
      <STitle>{t("Step 11 — Intraday Seasonality")}</STitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Asia (00–08 UTC)" value={`${data.session_volume.asia.toFixed(1)}%`} />
        <Stat label="EU (07–16 UTC)" value={`${data.session_volume.eu.toFixed(1)}%`} color="var(--accent)" />
        <Stat label="US (13–22 UTC)" value={`${data.session_volume.us.toFixed(1)}%`} color="var(--accent-green)" />
        <Stat label="Weekend/Weekday" value={`${data.weekend_weekday_pct.toFixed(0)}%`} color="var(--accent-amber)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(metricLabels).map(([metric, label]) => (
          <div key={metric} className="card" style={{ height: 380 }}>
            <PlotlyChart
              data={[{ z: data.heatmaps[metric], x: data.weekday_names, y: data.hours.map((h: number) => `${h.toString().padStart(2, "0")}:00`),
                type: "heatmap", colorscale: colorscales[metric], showscale: true }]}
              layout={{ title: label, xaxis: { title: "Day" }, yaxis: { title: "Hour (UTC)", autorange: "reversed" } }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function AutocorrelationSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="autocorrelation" className="mb-12"><Loader /></section>;
  const H = data.hurst;
  const freqs = ["1m", "5m", "1h"];
  const labels = ["1-Min", "5-Min", "1-Hour"];
  return (
    <section id="autocorrelation" className="mb-12">
      <STitle>{t("Step 12 — Autocorrelation & Hurst Exponent")}</STitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {freqs.map((f, i) => (
          <div key={f} className="card" style={{ height: 320 }}>
            <PlotlyChart
              data={[
                { x: data.lags, y: data.acf[f].returns, type: "bar", marker: { color: "#3b82f6", opacity: 0.7 }, name: "Returns" },
              ]}
              layout={{
                title: `ACF — ${labels[i]} Returns`, xaxis: { title: "Lag" }, yaxis: { title: "Autocorrelation" },
                shapes: [
                  { type: "line", x0: 0, x1: 50, y0: data.acf[f].ci, y1: data.acf[f].ci, line: { color: "#ef4444", dash: "dash", width: 1 } },
                  { type: "line", x0: 0, x1: 50, y0: -data.acf[f].ci, y1: -data.acf[f].ci, line: { color: "#ef4444", dash: "dash", width: 1 } },
                ],
              }}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {freqs.map((f, i) => (
          <div key={`abs_${f}`} className="card" style={{ height: 320 }}>
            <PlotlyChart
              data={[
                { x: data.lags, y: data.acf[f].abs_returns, type: "bar", marker: { color: "#ef4444", opacity: 0.7 }, name: "|Returns|" },
              ]}
              layout={{ title: `ACF — ${labels[i]} |Returns| (Vol Clustering)`, xaxis: { title: "Lag" }, yaxis: { title: "Autocorrelation" } }}
            />
          </div>
        ))}
      </div>
      <div className="card border-l-4" style={{ borderLeftColor: H.regime === "TRENDING" ? "var(--accent-green)" : H.regime === "MEAN-REVERTING" ? "var(--accent-red)" : "var(--accent-amber)" }}>
        <p className="text-sm"><strong>Hurst Exponent: {H.value.toFixed(4)}</strong> → <strong>{H.regime}</strong>.
          {H.regime === "NEAR RANDOM WALK" ? " Markets are mostly efficient — no easy alpha from momentum alone." :
           H.regime === "TRENDING" ? " Price tends to continue in the same direction." : " Price tends to reverse after moves."}
          <br /><span className="text-[var(--muted)]">Returns ACF ≈ 0 (efficient), but |Returns| ACF &gt;&gt; 0 (volatility clusters) — risk parameters must be dynamic.</span>
        </p>
      </div>
    </section>
  );
}

function TailRiskSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="tailrisk" className="mb-12"><Loader /></section>;
  return (
    <section id="tailrisk" className="mb-12">
      <STitle>{t("Step 13 — Tail Risk & Extreme Events")}</STitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              { x: data.histogram.centers, y: data.histogram.counts, type: "bar", marker: { color: "#3b82f6", opacity: 0.5 }, name: "Actual" },
              { x: data.fit_x, y: data.normal_pdf, type: "scatter", mode: "lines", line: { width: 2, color: "#10b981" }, name: "Normal fit" },
              { x: data.fit_x, y: data.student_t_pdf, type: "scatter", mode: "lines", line: { width: 2, color: "#ef4444" }, name: `Student-t (df=${data.t_df.toFixed(1)})` },
            ]}
            layout={{ title: "Daily Returns: Normal vs Student-t", xaxis: { title: "Return (%)" }, yaxis: { title: "Density" }, showlegend: true, bargap: 0 }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[
              { x: data.extreme_table.map((r: any) => `>${r.sigma}σ`), y: data.extreme_table.map((r: any) => r.actual),
                type: "bar", name: "Actual", marker: { color: "#3b82f6" } },
              { x: data.extreme_table.map((r: any) => `>${r.sigma}σ`), y: data.extreme_table.map((r: any) => r.expected_normal),
                type: "bar", name: "Normal predicts", marker: { color: "#10b981" } },
            ]}
            layout={{ title: "Extreme Events: Actual vs Normal", xaxis: { title: t("Threshold") }, yaxis: { title: "Days" }, barmode: "group", showlegend: true }}
          />
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>{t("Threshold")}</th><th>% Return</th><th>{t("Actual Days")}</th><th>{t("Normal Expects")}</th><th>{t("Ratio")}</th></tr></thead>
          <tbody>
            {data.extreme_table.map((r: any) => (
              <tr key={r.sigma}><td className="font-semibold">&gt;{r.sigma}σ</td>
                <td>{r.threshold_pct.toFixed(1)}%</td>
                <td className="text-[var(--accent-amber)]">{r.actual}</td>
                <td>{r.expected_normal.toFixed(1)}</td>
                <td className="text-[var(--accent-red)] font-semibold">{r.ratio != null ? `${r.ratio.toFixed(1)}x` : "∞"}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MarginSection({ data }: { data: any }) {
  const { t } = useI18n();
  if (!data) return <section id="margin" className="mb-12"><Loader /></section>;
  const lc = data.leverage_curve;
  return (
    <section id="margin" className="mb-12">
      <STitle>{t("Step 14 — Margin Tier Calibration")}</STitle>
      <div className="card mb-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent-green)] mb-2">{t("24h Max Adverse Excursion Percentiles")}</h3>
        <table className="data-table">
          <thead><tr><th>{t("Confidence")}</th><th>Long Risk (drop)</th><th>Short Risk (rise)</th></tr></thead>
          <tbody>
            {data.percentile_table.map((r: any) => (
              <tr key={r.confidence}><td className="font-semibold">{(r.confidence * 100).toFixed(1)}%</td>
                <td>{r.long_risk_pct.toFixed(2)}%</td><td>{r.short_risk_pct.toFixed(2)}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card mb-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--accent-green)] mb-2">{t("Margin Tier Table")}</h3>
        <table className="data-table">
          <thead><tr><th>{t("Leverage")}</th><th>{t("Init Margin")}</th><th>{t("Maint Margin")}</th><th>{t("24h Liq Prob")}</th><th>{t("Risk")}</th></tr></thead>
          <tbody>
            {data.margin_table.map((r: any) => (
              <tr key={r.leverage}><td className="font-semibold">{r.leverage}x</td>
                <td>{r.init_margin_pct.toFixed(2)}%</td><td>{r.maint_margin_pct.toFixed(2)}%</td>
                <td>{r.liq_prob_pct.toFixed(2)}%</td>
                <td className={r.risk === "LOW" ? "text-[var(--accent-green)]" : r.risk === "MEDIUM" ? "text-[var(--accent-amber)]" : "text-[var(--accent-red)]"} style={{ fontWeight: 600 }}>{r.risk}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{ x: lc.leverage, y: lc.probs, type: "scatter", mode: "lines",
              fill: "tozeroy", line: { width: 2, color: "#ef4444" }, fillcolor: "rgba(239,68,68,0.1)" }]}
            layout={{ title: "Leverage vs 24h Liquidation Probability", xaxis: { title: "Leverage (x)" }, yaxis: { title: "Liq Probability (%)" },
              shapes: [
                { type: "line", x0: 0, x1: 1, xref: "paper", y0: 0.5, y1: 0.5, line: { color: "white", dash: "dash", width: 1 } },
                { type: "line", x0: lc.safe_leverage, x1: lc.safe_leverage, y0: 0, y1: 1, yref: "paper", line: { color: "#10b981", dash: "dash", width: 2 } },
              ],
              annotations: [{ x: lc.safe_leverage, y: 0.5, text: `Safe: ${lc.safe_leverage}x`, showarrow: true, arrowhead: 2, font: { color: "#10b981", size: 11 } }],
            }}
          />
        </div>
        <div className="card" style={{ height: 380 }}>
          <PlotlyChart
            data={[{ x: data.cdf.x, y: data.cdf.y, type: "scatter", mode: "lines", line: { width: 2, color: "#ef4444" } }]}
            layout={{ title: "CDF of 24h Max Drawdown", xaxis: { title: "Max Drop (%)", range: [0, 25] }, yaxis: { title: "Cumulative Prob (%)" },
              shapes: [5, 10, 20, 50].map((lev) => ({
                type: "line" as const, x0: 100 / lev, x1: 100 / lev, y0: 0, y1: 1, yref: "paper" as const,
                line: { color: "#f59e0b80", dash: "dash" as const, width: 1 },
              })),
            }}
          />
        </div>
      </div>
      <div className="card mt-4 border-l-4 border-l-[var(--accent-green)]">
        <p className="text-sm"><strong className="text-[var(--accent-green)]">Max safe leverage: {lc.safe_leverage}x</strong> (at 0.5% daily liquidation threshold). Above this, more than 0.5% of positions would be liquidated per day. Exchanges offering 100x+ implicitly accept high liquidation rates — insurance fund must be sized accordingly.</p>
      </div>
    </section>
  );
}

function SummarySection() {
  const { t } = useI18n();
  return (
    <section id="summary" className="mb-12">
      <STitle>{t("Summary — Complete Perpetual Futures Analytics Stack")}</STitle>
      <div className="card mb-4">
        <h3 className="text-sm font-semibold text-[var(--accent-green)] mb-3">{t("What We Built")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-[#1e293b] rounded-lg border-t-2 border-t-[var(--accent)]">
            <p className="text-xs text-[var(--muted)]">{t("Part 1 — Data & EDA")}</p>
            <p className="text-sm font-semibold text-[var(--accent)]">{t("Price & Volume Overview")}</p>
            <p className="text-xs text-[var(--muted)] mt-1">15.6M rows of 1s tick data, interactive exploration.</p>
          </div>
          <div className="p-3 bg-[#1e293b] rounded-lg border-t-2 border-t-[var(--accent-green)]">
            <p className="text-xs text-[var(--muted)]">{t("Part 2 — Fair Price Primitives")}</p>
            <p className="text-sm font-semibold text-[var(--accent-green)]">{t("Steps 1–6")}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{t("Returns, VWAP, order flow, realized vol, micro-spread, volume profile.")}</p>
          </div>
          <div className="p-3 bg-[#1e293b] rounded-lg border-t-2 border-t-[var(--accent-red)]">
            <p className="text-xs text-[var(--muted)]">{t("Part 3 — Exchange Risk & Operations")}</p>
            <p className="text-sm font-semibold text-[var(--accent-red)]">{t("Steps 7–14")}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{t("Funding rates, mark price, VaR/CVaR, liquidation, seasonality, tail risk, margin calibration.")}</p>
          </div>
        </div>
      </div>
      <div className="card border-l-4 border-l-[var(--muted)]">
        <h3 className="text-sm font-semibold text-[var(--muted)] mb-2">{t("What Comes Next for Production")}</h3>
        <ul className="text-xs text-[var(--muted)] space-y-1 list-disc pl-4">
          <li>{t("Real-time data feeds for live mark price and funding calculations.")}</li>
          <li>{t("Multi-asset support (ETH, SOL perpetuals with cross-margin).")}</li>
          <li>{t("ADL (auto-deleveraging) engine when insurance fund is insufficient.")}</li>
          <li>{t("Dynamic margin adjustment based on rolling volatility regime.")}</li>
          <li>{t("Order book depth analysis and market maker incentive modeling.")}</li>
        </ul>
      </div>
    </section>
  );
}
