"use client";
import { useI18n } from "../lib/i18n";

interface Props {
  spot: number;
  setSpot: (v: number) => void;
  riskFree: number;
  setRiskFree: (v: number) => void;
  sigma: number;
  setSigma: (v: number) => void;
}

export default function InputPanel({ spot, setSpot, riskFree, setRiskFree, sigma, setSigma }: Props) {
  const { t } = useI18n();
  return (
    <div className="card mb-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
        {t("Pricing Parameters")}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label={t("Spot Price ($)")} value={spot} onChange={setSpot} step={100} />
        <Field label={t("Risk-Free Rate (%)")} value={riskFree * 100} onChange={(v) => setRiskFree(v / 100)} step={0.25} />
        <Field label={t("BS Volatility (%)")} value={sigma * 100} onChange={(v) => setSigma(v / 100)} step={1} />
        <div className="flex flex-col justify-end">
          <p className="stat-label">{t("Data Source")}</p>
          <p className="text-xs text-[var(--foreground)] mt-1">BTCUSDT 1s Klines<br />Jan – Jun 2025 (6 months)</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="stat-label">{label}</label>
      <input
        type="number"
        step={step}
        value={Number(value.toFixed(4))}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="bg-[#1e293b] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)] transition"
      />
    </div>
  );
}
