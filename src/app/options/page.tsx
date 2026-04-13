"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import InputPanel from "../../components/InputPanel";
import ReturnsSection from "../../components/sections/ReturnsSection";
import VolatilitySection from "../../components/sections/VolatilitySection";
import JumpsSection from "../../components/sections/JumpsSection";
import CalibrationSection from "../../components/sections/CalibrationSection";
import PricingSection from "../../components/sections/PricingSection";
import ComparisonSection from "../../components/sections/ComparisonSection";
import MiscSection from "../../components/sections/MiscSection";
import ConclusionsSection from "../../components/sections/ConclusionsSection";
import { useI18n } from "../../lib/i18n";

const SECTIONS = [
  { id: "returns", label: "1. Returns" },
  { id: "volatility", label: "2. Volatility" },
  { id: "jumps", label: "3. Jumps" },
  { id: "calibration", label: "4. Calibration" },
  { id: "pricing", label: "5. Pricing" },
  { id: "comparison", label: "6. Comparison" },
  { id: "miscellaneous", label: "7. Insights" },
  { id: "conclusions", label: "8. Conclusions" },
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

export default function Home() {
  const { t } = useI18n();
  const [returnsData, setReturnsData] = useState<any>(null);
  const [volData, setVolData] = useState<any>(null);
  const [jumpData, setJumpData] = useState<any>(null);
  const [calibData, setCalibData] = useState<any>(null);
  const [pricingData, setPricingData] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const [spot, setSpot] = useState(100000);
  const [riskFree, setRiskFree] = useState(0.04);
  const [sigma, setSigma] = useState(0.5);
  const [activeSection, setActiveSection] = useState("returns");

  useEffect(() => {
    fetchJSON("/data/returns.json").then(setReturnsData);
    fetchJSON("/data/volatility.json").then(setVolData);
    fetchJSON("/data/jumps.json").then(setJumpData);
    fetchJSON("/data/calibration.json").then((d: any) => {
      setCalibData(d);
      if (d?.spot) setSpot(d.spot);
    });
    fetchJSON("/data/pricing.json").then((d: any) => {
      setPricingData(d);
      if (d?.bs_sigma) setSigma(d.bs_sigma);
    });
    fetchJSON("/data/comparison.json").then(setComparisonData);
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setActiveSection(id);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { threshold: 0.2, rootMargin: "-80px 0px -40% 0px" }
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
      <nav className="hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4 pt-6">
        <Link href="/" className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] transition mb-2 block">{t("← Home")}</Link>
        <div className="mb-6">
          <h1 className="text-sm font-bold text-[var(--accent)] leading-tight">{t("Crypto Options")}</h1>
          <h2 className="text-xs text-[var(--muted)]">{t("Quantitative Pricing Research")}</h2>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`text-left text-xs px-3 py-2 rounded-lg transition-all ${
                activeSection === id
                  ? "bg-[rgba(59,130,246,0.15)] text-[var(--accent)] font-semibold"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-[var(--card-border)]">
          <p className="text-[10px] text-[var(--muted)]">BTCUSDT 1s Klines</p>
          <p className="text-[10px] text-[var(--muted)]">Jan–Jun 2025 · 15.6M rows</p>
          <p className="text-[10px] text-[var(--muted)]">5 Models · 100K MC paths</p>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-w-0 px-4 md:px-8 py-6 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--foreground)]">
            {t("Crypto Vanilla Options Pricing")}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t("Quantitative analysis of Bitcoin derivative pricing using stochastic models — from 15.6 million 1-second observations to actionable option prices.")}
          </p>
        </header>

        {/* Input Panel */}
        <InputPanel spot={spot} setSpot={setSpot} riskFree={riskFree} setRiskFree={setRiskFree} sigma={sigma} setSigma={setSigma} />

        {/* All sections */}
        <ReturnsSection data={returnsData} />
        <VolatilitySection data={volData} />
        <JumpsSection data={jumpData} />
        <CalibrationSection data={calibData} />
        <PricingSection data={pricingData} spot={spot} riskFree={riskFree} sigma={sigma} />
        <ComparisonSection data={comparisonData} />
        <MiscSection calibData={calibData} jumpData={jumpData} volData={volData} />
        <ConclusionsSection calibData={calibData} comparisonData={comparisonData} />

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-[var(--card-border)] text-center text-xs text-[var(--muted)]">
          <p>{t("Crypto Options Pricing Research · Built with Next.js, Plotly.js, Python")}</p>
          <p className="mt-1">{t("Data: BTCUSDT 1-second klines, Binance, Jan–Jun 2025")}</p>
        </footer>
      </main>
    </div>
  );
}
