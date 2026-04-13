function normCdf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

export function bsCall(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0) return Math.max(S - K, 0);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
}

export function bsPut(S: number, K: number, T: number, r: number, sigma: number): number {
  return bsCall(S, K, T, r, sigma) - S + K * Math.exp(-r * T);
}

export function bsImpliedVol(
  price: number, S: number, K: number, T: number, r: number, isCall = true
): number | null {
  const pricer = isCall ? bsCall : bsPut;
  let lo = 0.001, hi = 10.0;
  const intrinsic = isCall ? Math.max(S - K * Math.exp(-r * T), 0) : Math.max(K * Math.exp(-r * T) - S, 0);
  if (price <= intrinsic + 1e-8) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const p = pricer(S, K, T, r, mid);
    if (Math.abs(p - price) < 1e-8) return mid;
    if (p < price) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export const MATURITIES: Record<string, number> = {
  "1hr": 1 / (365.25 * 24),
  "4hr": 4 / (365.25 * 24),
  "1day": 1 / 365.25,
  "3day": 3 / 365.25,
  "7day": 7 / 365.25,
  "14day": 14 / 365.25,
  "30day": 30 / 365.25,
};

export function computeBSGrid(
  spot: number, r: number, sigma: number,
  moneyness: number[], maturities: Record<string, number>
): Record<string, { calls: number[]; puts: number[] }> {
  const result: Record<string, { calls: number[]; puts: number[] }> = {};
  for (const [label, T] of Object.entries(maturities)) {
    const calls = moneyness.map((m) => bsCall(spot, spot * m, T, r, sigma));
    const puts = moneyness.map((m) => bsPut(spot, spot * m, T, r, sigma));
    result[label] = { calls, puts };
  }
  return result;
}
