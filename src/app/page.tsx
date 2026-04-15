"use client";
import Link from "next/link";
import { useI18n } from "../lib/i18n";

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      {/* ════════════ HERO ════════════ */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        {/* Background glows */}
        <div className="hero-glow hero-glow-green" style={{ width: 500, height: 500, top: -120, left: "15%" }} />
        <div className="hero-glow hero-glow-blue" style={{ width: 400, height: 400, top: -60, right: "10%" }} />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <span className="pill">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
              {t("Live Research · BTCUSDT · 2025")}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            {t("Quantitative")}{" "}
            <span className="gradient-text-green">{t("Crypto")}</span>
            <br />
            {t("Derivatives Research")}
          </h1>

          <p className="mt-5 text-base md:text-lg text-[var(--muted-light)] max-w-2xl mx-auto leading-relaxed">
            {t("Quantitative analysis of Bitcoin derivative pricing and risk management — built from 15.6 million 1-second tick observations (BTCUSDT, Jan–Jun 2025).")}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: "◈", label: t("15.6M ticks"), color: "var(--accent-green)" },
              { icon: "⧗", label: t("1-second resolution"), color: "var(--accent)" },
              { icon: "◫", label: t("6 months · Jan–Jun 2025"), color: "var(--accent-purple)" },
            ].map((b) => (
              <span key={b.label} className="pill">
                <span style={{ color: b.color, fontSize: "0.8rem" }}>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-gradient mx-6" />

      {/* ════════════ RESEARCH PRODUCTS ════════════ */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">
              {t("Built for")}{" "}
              <span className="gradient-text-mixed">{t("every derivative")}</span>
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)] max-w-xl mx-auto">
              {t("From vanilla options pricing to perpetual futures microstructure — comprehensive quantitative analysis across the full crypto derivatives stack.")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Options Card */}
            <Link href="/options" className="group block">
              <div className="card-interactive h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #3b82f6, #60a5fa, transparent)" }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="icon-container" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>◇</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#60a5fa] group-hover:text-[#93c5fd] transition-colors">
                      {t("Crypto Options Pricing")}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t("Quantitative Pricing Research")}</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted-light)] mb-5 leading-relaxed">
                  {t("Multi-model options pricing analysis using Black-Scholes, GARCH, Heston, Merton, and Bates models. Includes return distributions, realized volatility, jump detection, model calibration, and full comparative analysis.")}
                </p>

                <div className="grid grid-cols-1 gap-2 mb-6">
                  {[
                    t("5 pricing models with 50K Monte Carlo paths"),
                    t("Interactive Black-Scholes repricing"),
                    t("IV smile & price divergence analysis"),
                    t("Jump detection & Merton parameters"),
                    t("GARCH, Heston, Merton, Bates calibration"),
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="w-1 h-1 rounded-full bg-[#3b82f6] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#3b82f6] group-hover:text-[#60a5fa] group-hover:gap-3 transition-all">
                  {t("Explore Research")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Perpetuals Card */}
            <Link href="/perpetuals" className="group block">
              <div className="card-interactive h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #10b981, #34d399, transparent)" }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="icon-container" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>⟁</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#34d399] group-hover:text-[#6ee7b7] transition-colors">
                      {t("Perpetual Futures Analytics")}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t("Exchange Risk & Microstructure")}</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted-light)] mb-5 leading-relaxed">
                  {t("Comprehensive perpetual contract analysis covering fair pricing (VWAP, mark price), order flow, funding rates, liquidation cascades, VaR/CVaR, margin calibration, and intraday seasonality.")}
                </p>

                <div className="grid grid-cols-1 gap-2 mb-6">
                  {[
                    t("Fair price construction (VWAP, Mark Price)"),
                    t("Order flow imbalance & predictive signal"),
                    t("Funding rate simulation & basis trade P&L"),
                    t("VaR, CVaR, max drawdown risk metrics"),
                    t("Liquidation cascade & margin tier calibration"),
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="w-1 h-1 rounded-full bg-[#10b981] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#10b981] group-hover:text-[#34d399] group-hover:gap-3 transition-all">
                  {t("Explore Research")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Risk Management Card */}
            <Link href="/risk-management" className="group block">
              <div className="card-interactive h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24, transparent)" }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="icon-container" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>⛊</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#fbbf24] group-hover:text-[#fcd34d] transition-colors">
                      {t("Exchange Risk Management")}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t("Portfolio Risk & Hedging")}</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted-light)] mb-5 leading-relaxed">
                  {t("Comprehensive risk quantification for exchanges offering perpetual futures — delta exposure, funding risk, liquidation cascades, basis risk, market impact, and hedge simulation with full backtesting.")}
                </p>

                <div className="grid grid-cols-1 gap-2 mb-6">
                  {[
                    t("Net delta tracking & directional risk"),
                    t("VaR, CVaR & historical stress tests"),
                    t("Liquidation cascade simulation"),
                    t("Insurance fund sizing & sustainability"),
                    t("Hedge backtest with execution costs"),
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="w-1 h-1 rounded-full bg-[#f59e0b] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#f59e0b] group-hover:text-[#fbbf24] group-hover:gap-3 transition-all">
                  {t("Explore Research")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Options Risk Card */}
            <Link href="/options-risk" className="group block">
              <div className="card-interactive h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #a855f7, #c084fc, transparent)" }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="icon-container" style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7" }}>⬡</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#c084fc] group-hover:text-[#d8b4fe] transition-colors">
                      {t("Options Risk Management")}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t("Greeks, Hedging & Portfolio Risk")}</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted-light)] mb-5 leading-relaxed">
                  {t("Quantifying and hedging the exchange's risk from selling vanilla options — Greeks exposure, volatility surface risk, gamma hedging, and portfolio-level risk aggregation.")}
                </p>

                <div className="grid grid-cols-1 gap-2 mb-6">
                  {[
                    t("Greeks exposure (Delta, Gamma, Vega, Theta)"),
                    t("Dynamic delta & gamma hedging"),
                    t("Volatility surface & smile risk"),
                    t("Portfolio-level risk aggregation"),
                    t("Hedging P&L attribution"),
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="w-1 h-1 rounded-full bg-[#a855f7] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#a855f7] group-hover:text-[#c084fc] group-hover:gap-3 transition-all">
                  {t("Explore Research")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>

            {/* Unified Risk Card */}
            <Link href="/unified-risk" className="group block">
              <div className="card-interactive h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #ef4444, #f87171, transparent)" }} />

                <div className="flex items-start gap-4 mb-5">
                  <div className="icon-container" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>⬢</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-[#f87171] group-hover:text-[#fca5a5] transition-colors">
                      {t("Unified Risk Engine")}
                    </h3>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{t("Perps + Options Combined")}</p>
                  </div>
                </div>

                <p className="text-sm text-[var(--muted-light)] mb-5 leading-relaxed">
                  {t("Combined risk management for perpetual futures and vanilla options — unified Greek exposure, cross-product netting, single hedge engine, and integrated stress testing.")}
                </p>

                <div className="grid grid-cols-1 gap-2 mb-6">
                  {[
                    t("Unified Greeks across perps + options"),
                    t("Cross-product Delta netting"),
                    t("Single DGV-neutral hedge engine"),
                    t("Combined stress tests & VaR"),
                    t("Per-product P&L decomposition"),
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--foreground)]">
                      <span className="w-1 h-1 rounded-full bg-[#ef4444] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#ef4444] group-hover:text-[#f87171] group-hover:gap-3 transition-all">
                  {t("Explore Research")}
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <div className="divider-gradient mx-6" />

      {/* ════════════ CAPABILITIES GRID ════════════ */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              {t("What's inside the")}{" "}
              <span className="gradient-text-green">{t("research")}</span>
            </h2>
            <p className="mt-3 text-sm text-[var(--muted)] max-w-lg mx-auto">
              {t("End-to-end quantitative pipeline — from raw tick data to actionable pricing and risk analytics.")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CAPABILITIES.map((c) => (
              <div key={c.label} className="cap-card text-center">
                <div className="text-2xl mb-2.5" style={{ color: c.color }}>{c.icon}</div>
                <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">{t(c.label)}</p>
                <p className="text-[10px] text-[var(--muted)] mt-1 leading-snug">{t(c.sub)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider-gradient mx-6" />

      {/* ════════════ DATA & METHODOLOGY BANNER ════════════ */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0f1a2e 0%, #0a1628 50%, #0d1f1a 100%)" }}>
            <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 80% 50%, #10b981 0%, transparent 60%)" }} />
            <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-8">
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold mb-3">
                  {t("Built on")} <span className="gradient-text-green">{t("real market data")}</span>
                </h3>
                <p className="text-sm text-[var(--muted-light)] leading-relaxed max-w-xl">
                  {t("All analysis is derived from 15,638,400 one-second BTCUSDT klines sourced from Binance, spanning January to June 2025. Models are calibrated to this production-grade tick dataset — no simulated or synthetic data.")}
                </p>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                {[
                  { v: "15.6M", l: t("Tick observations") },
                  { v: "1 sec", l: t("Granularity") },
                  { v: "6 mo", l: t("Time span") },
                  { v: "5+", l: t("Pricing models") },
                ].map((s) => (
                  <div key={s.l} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-[var(--accent-green)] font-mono w-14 text-right">{s.v}</span>
                    <span className="text-xs text-[var(--muted)]">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="divider-gradient mx-6" />

      {/* ════════════ CTA ════════════ */}
      <section className="px-6 py-16 md:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t("Start exploring the")}{" "}
            <span className="gradient-text-mixed">{t("quantitative analysis")}</span>
          </h2>
          <p className="text-sm text-[var(--muted)] mb-8 max-w-lg mx-auto">
            {t("Dive into options pricing models or perpetual futures risk analytics — interactive charts powered by Plotly.js with real Bitcoin market data.")}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/options"
              className="btn-primary text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
              {t("Options Pricing")}
              <span>→</span>
            </Link>
            <Link href="/perpetuals"
              className="btn-primary text-white"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              {t("Perpetual Futures")}
              <span>→</span>
            </Link>
            <Link href="/risk-management"
              className="btn-primary text-white"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              {t("Perps Risk")}
              <span>→</span>
            </Link>
            <Link href="/options-risk"
              className="btn-primary text-white"
              style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}>
              {t("Options Risk")}
              <span>→</span>
            </Link>
            <Link href="/unified-risk"
              className="btn-primary text-white"
              style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
              {t("Unified Risk")}
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════ FOOTER ════════════ */}
      <footer className="mt-auto border-t border-[var(--card-border)] bg-[var(--background-secondary)]">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 footer-section">
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">{t("Research")}</h4>
              <div className="flex flex-col gap-2">
                <Link href="/options" className="text-xs">{t("Crypto Options Pricing")}</Link>
                <Link href="/perpetuals" className="text-xs">{t("Perpetual Futures Analytics")}</Link>
                <Link href="/risk-management" className="text-xs">{t("Exchange Risk Management")}</Link>
                <Link href="/options-risk" className="text-xs">{t("Options Risk Management")}</Link>
                <Link href="/unified-risk" className="text-xs">{t("Unified Risk Engine")}</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">{t("Models & Methods")}</h4>
              <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
                <span>Black-Scholes · GARCH · Heston</span>
                <span>Merton · Bates · Monte Carlo</span>
                <span>VaR · CVaR · OFI · VWAP</span>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">{t("Tech Stack")}</h4>
              <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
                <span>Next.js · React · TypeScript</span>
                <span>Plotly.js · Tailwind CSS</span>
                <span>Python · NumPy · SciPy</span>
              </div>
            </div>
          </div>
          <div className="divider-gradient mb-6" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-xs text-[var(--muted)]">
              {t("Crypto Derivatives Research · BTCUSDT 1s Klines · Binance · Next.js + Plotly.js + Python")}
            </p>
            <p className="text-xs text-[var(--muted)]">BTCUSDT · Binance · 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const CAPABILITIES = [
  { icon: "📊", label: "Return Distributions", sub: "Fat tails & QQ plots", color: "var(--accent)" },
  { icon: "📈", label: "Realized Volatility", sub: "4 estimator methods", color: "var(--accent-green)" },
  { icon: "⚡", label: "Jump Detection", sub: "BNS & threshold tests", color: "var(--accent-amber)" },
  { icon: "🔧", label: "Model Calibration", sub: "MoM & MLE fitting", color: "var(--accent-purple)" },
  { icon: "💰", label: "Option Pricing", sub: "5 stochastic models", color: "var(--accent)" },
  { icon: "🔄", label: "VWAP & Mark Price", sub: "Fair price construction", color: "var(--accent-green)" },
  { icon: "📉", label: "Order Flow", sub: "OFI predictive signal", color: "var(--accent-amber)" },
  { icon: "💸", label: "Funding Rates", sub: "Basis trade analysis", color: "var(--accent-purple)" },
  { icon: "🛡️", label: "VaR & CVaR", sub: "Tail risk management", color: "var(--accent-red)" },
  { icon: "⚖️", label: "Margin Calibration", sub: "Leverage tier design", color: "var(--accent-green)" },
];
