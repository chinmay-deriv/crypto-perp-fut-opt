"""
Crypto Options Pricing — Full Analysis Engine
Processes btcusd.csv (1-second BTCUSDT klines) and outputs JSON files
for the Next.js frontend.
"""

import json
import os
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import norm as sp_norm, poisson
from scipy.optimize import brentq

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "btcusd.csv"
OUTPUT_DIR = BASE_DIR / "public" / "data"
SECONDS_PER_YEAR = 365.25 * 24 * 3600
BARS_5MIN_PER_DAY = 288


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            v = float(obj)
            if np.isnan(v) or np.isinf(v):
                return None
            return v
        if isinstance(obj, np.ndarray):
            return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x for x in obj.tolist()]
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super().default(obj)


def save_json(data: dict, filename: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, cls=NumpyEncoder, separators=(",", ":"))
    size_mb = path.stat().st_size / 1024 / 1024
    print(f"  -> {filename} ({size_mb:.1f} MB)")


def load_data() -> pd.DataFrame:
    print(f"Loading {CSV_PATH} ...")
    t0 = time.time()
    df = pd.read_csv(CSV_PATH)
    df["timestamp"] = pd.to_datetime(df["open_time"] // 1_000_000, unit="s", utc=True)
    df = df.set_index("timestamp").sort_index()
    elapsed = time.time() - t0
    print(f"  Loaded {len(df):,} rows in {elapsed:.1f}s")
    print(f"  Date range: {df.index.min()} -> {df.index.max()}")
    return df


# ──────────────────────────────────────────────────────────────────────
# PHASE 1: RETURNS
# ──────────────────────────────────────────────────────────────────────
def phase1_returns(df: pd.DataFrame) -> dict:
    print("\n=== Phase 1: Returns Distribution ===")
    horizons = {"1s": 1, "5s": 5, "30s": 30, "1min": 60, "5min": 300, "1hr": 3600, "1day": 86400}
    log_returns = {}
    for label, n in horizons.items():
        sampled = df["close"].iloc[::n]
        lr = np.log(sampled / sampled.shift(1)).dropna()
        log_returns[label] = lr

    result = {"horizons": [], "summary": [], "histograms": {}, "qq_plots": {}}

    for label, lr in log_returns.items():
        result["horizons"].append(label)
        result["summary"].append({
            "horizon": label,
            "count": int(len(lr)),
            "mean": float(lr.mean()),
            "std": float(lr.std()),
            "skewness": float(lr.skew()),
            "kurtosis": float(lr.kurtosis()),
            "min": float(lr.min()),
            "max": float(lr.max()),
        })

        mu, sigma = lr.mean(), lr.std()
        counts, bin_edges = np.histogram(lr.values, bins=200, density=True)
        bin_centers = ((bin_edges[:-1] + bin_edges[1:]) / 2).tolist()
        x_norm = np.linspace(mu - 5 * sigma, mu + 5 * sigma, 200).tolist()
        y_norm = stats.norm.pdf(np.array(x_norm), mu, sigma).tolist()

        result["histograms"][label] = {
            "bin_centers": bin_centers,
            "counts": counts.tolist(),
            "normal_x": x_norm,
            "normal_y": y_norm,
            "xlim": [float(mu - 5 * sigma), float(mu + 5 * sigma)],
        }

        qq = stats.probplot(lr.values, dist="norm")
        theoretical_full = qq[0][0]
        sample_full = qq[0][1]
        MAX_QQ_POINTS = 2000
        if len(theoretical_full) > MAX_QQ_POINTS:
            idx = np.linspace(0, len(theoretical_full) - 1, MAX_QQ_POINTS, dtype=int)
            theoretical_sub = theoretical_full[idx]
            sample_sub = sample_full[idx]
        else:
            theoretical_sub = theoretical_full
            sample_sub = sample_full
        result["qq_plots"][label] = {
            "theoretical": theoretical_sub.tolist(),
            "sample": sample_sub.tolist(),
            "slope": float(qq[1][0]),
            "intercept": float(qq[1][1]),
            "r_squared": float(qq[1][2] ** 2),
        }

    save_json(result, "returns.json")
    print(f"  Computed returns for {len(horizons)} horizons")
    return {"log_returns": log_returns}


# ──────────────────────────────────────────────────────────────────────
# PHASE 2: VOLATILITY
# ──────────────────────────────────────────────────────────────────────
def phase2_volatility(df: pd.DataFrame) -> dict:
    print("\n=== Phase 2: Realized Volatility ===")
    df["date"] = df.index.date

    def close_to_close_rv(group):
        lr = np.log(group["close"] / group["close"].shift(1)).dropna()
        return (lr ** 2).sum()

    df_5min = df.resample("5min").agg({"open": "first", "high": "max", "low": "min", "close": "last"}).dropna()
    df_5min["date"] = df_5min.index.date

    def parkinson_rv(group):
        hl = np.log(group["high"] / group["low"])
        return (hl ** 2).sum() / (4 * np.log(2))

    def garman_klass_rv(group):
        hl = np.log(group["high"] / group["low"])
        co = np.log(group["close"] / group["open"])
        return (0.5 * hl ** 2 - (2 * np.log(2) - 1) * co ** 2).sum()

    def yang_zhang_rv(group):
        n = len(group)
        if n < 2:
            return np.nan
        log_oc = np.log(group["open"] / group["close"].shift(1)).dropna()
        log_co = np.log(group["close"] / group["open"])
        log_ho = np.log(group["high"] / group["open"])
        log_lo = np.log(group["low"] / group["open"])
        sigma_o2 = (1 / (n - 1)) * ((log_oc - log_oc.mean()) ** 2).sum()
        sigma_c2 = (1 / (n - 1)) * ((log_co - log_co.mean()) ** 2).sum()
        sigma_rs2 = (log_ho * (log_ho - log_co) + log_lo * (log_lo - log_co)).sum() / n
        k = 0.34 / (1.34 + (n + 1) / (n - 1))
        return k * sigma_o2 + (1 - k) * sigma_c2 + sigma_rs2

    daily_cc = df.groupby("date").apply(close_to_close_rv)
    grouped_5min = df_5min.groupby("date")
    daily_rv = pd.DataFrame({
        "CC": daily_cc,
        "Parkinson": grouped_5min.apply(parkinson_rv),
        "GK": grouped_5min.apply(garman_klass_rv),
        "YZ": grouped_5min.apply(yang_zhang_rv),
    })

    annualize = np.sqrt(365.25)
    daily_vol = pd.DataFrame()
    daily_vol["CC"] = np.sqrt(daily_rv["CC"]) * annualize * 100
    daily_vol["Parkinson"] = np.sqrt(daily_rv["Parkinson"]) * annualize * 100
    daily_vol["GK"] = np.sqrt(daily_rv["GK"]) * annualize * 100
    daily_vol["YZ"] = np.sqrt(daily_rv["YZ"] * BARS_5MIN_PER_DAY) * annualize * 100

    dates_str = [str(d) for d in daily_vol.index]

    # Volatility signature plot
    sampling_freqs = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800]
    freq_labels = ["1s", "2s", "5s", "10s", "15s", "30s", "1m", "2m", "5m", "10m", "15m", "30m"]
    sig_plot = []
    for freq in sampling_freqs:
        sampled = df["close"].iloc[::freq]
        lr = np.log(sampled / sampled.shift(1)).dropna()
        rv = (lr ** 2).sum()
        ann_vol = np.sqrt(rv * SECONDS_PER_YEAR / len(df)) * 100
        sig_plot.append(float(ann_vol))

    # Intraday pattern
    df["log_ret_1s"] = np.log(df["close"] / df["close"].shift(1))
    df["hour"] = df.index.hour
    hourly_vol = df.groupby(["date", "hour"])["log_ret_1s"].apply(lambda x: np.sqrt((x ** 2).sum())).reset_index()
    hourly_vol.columns = ["date", "hour", "hourly_rv"]
    avg_by_hour = hourly_vol.groupby("hour")["hourly_rv"].mean()
    avg_by_hour_ann = avg_by_hour * np.sqrt(SECONDS_PER_YEAR / 3600) * 100

    result = {
        "daily_vol": {col: daily_vol[col].tolist() for col in daily_vol.columns},
        "dates": dates_str,
        "summary": {col: {"mean": float(daily_vol[col].mean()), "std": float(daily_vol[col].std()),
                          "min": float(daily_vol[col].min()), "max": float(daily_vol[col].max())}
                    for col in daily_vol.columns},
        "signature_plot": {"labels": freq_labels, "freqs": sampling_freqs, "ann_vol": sig_plot},
        "intraday": {"hours": list(range(24)), "ann_vol": avg_by_hour_ann.tolist()},
        "avg_cc_vol_decimal": float(daily_vol["CC"].mean() / 100),
    }

    save_json(result, "volatility.json")
    print(f"  Computed daily vol for {len(daily_vol)} days, 4 estimators")
    return {"daily_vol": daily_vol, "df_5min": df_5min}


# ──────────────────────────────────────────────────────────────────────
# PHASE 3: JUMP DETECTION
# ──────────────────────────────────────────────────────────────────────
def phase3_jumps(df: pd.DataFrame, log_returns: dict) -> dict:
    print("\n=== Phase 3: Jump Detection ===")
    ret_1min = log_returns["1min"]

    daily_jump_stats = []
    for date, grp in ret_1min.groupby(ret_1min.index.date):
        r = grp.values
        n = len(r)
        if n < 3:
            continue
        rv = (r ** 2).sum()
        bv = (np.pi / 2) * (np.abs(r[1:]) * np.abs(r[:-1])).sum()
        tpq = n * (np.pi ** 2 / 4 + np.pi - 5) * \
              (np.abs(r[2:]) ** (4 / 3) * np.abs(r[1:-1]) ** (4 / 3) * np.abs(r[:-2]) ** (4 / 3)).sum()
        mu1 = np.sqrt(2 / np.pi)
        tpq *= (mu1 ** -4) * (2 ** (2 / 3))
        denom = np.sqrt(max(tpq, 1e-30))
        z_bns = (rv - bv) / denom * np.sqrt(n)
        jump_var = max(rv - bv, 0)

        daily_jump_stats.append({
            "date": str(date), "RV": float(rv), "BV": float(bv),
            "jump_var": float(jump_var),
            "jump_pct_of_rv": float(jump_var / rv * 100) if rv > 0 else 0,
            "z_bns": float(z_bns),
            "jump_significant": bool(z_bns > stats.norm.ppf(0.95)),
        })

    # Threshold detection
    THRESHOLD_SIGMA = 4
    ROLLING_WINDOW = 120
    rolling_std = ret_1min.rolling(window=ROLLING_WINDOW, min_periods=30).std()
    z_scores = (ret_1min / rolling_std).dropna()
    jump_mask = z_scores.abs() > THRESHOLD_SIGMA
    jump_returns = ret_1min.loc[jump_mask.index[jump_mask]]

    n_days = (ret_1min.index.max() - ret_1min.index.min()).days + 1

    jump_catalog = {
        "pct_returns": ((np.exp(jump_returns.values) - 1) * 100).tolist(),
        "timestamps": [t.isoformat() for t in jump_returns.index],
        "directions": ["UP" if v > 0 else "DOWN" for v in jump_returns.values],
        "log_returns": jump_returns.values.tolist(),
    }

    jump_intensity_per_day = len(jump_returns) / max(n_days, 1)
    jump_mean_logret = float(jump_returns.mean()) if len(jump_returns) > 0 else 0.0
    jump_std_logret = float(jump_returns.std()) if len(jump_returns) > 1 else 0.001

    # Jump size histogram
    if len(jump_returns) > 0:
        pct_rets = (np.exp(jump_returns.values) - 1) * 100
        counts, edges = np.histogram(pct_rets, bins=50)
        centers = ((edges[:-1] + edges[1:]) / 2).tolist()
    else:
        counts, centers = [], []

    n_sig = sum(1 for s in daily_jump_stats if s["jump_significant"])

    merton_params = {
        "lambda_per_day": float(jump_intensity_per_day),
        "lambda_annual": float(jump_intensity_per_day * 365.25),
        "mu_J": float(jump_mean_logret),
        "sigma_J": float(jump_std_logret),
    }

    result = {
        "daily_stats": daily_jump_stats,
        "n_significant_days": n_sig,
        "total_days": len(daily_jump_stats),
        "avg_jump_pct": float(np.mean([s["jump_pct_of_rv"] for s in daily_jump_stats])),
        "threshold": {"total_returns": int(len(ret_1min)), "jumps_detected": int(len(jump_returns)),
                       "frequency_pct": float(len(jump_returns) / len(ret_1min) * 100),
                       "avg_per_day": float(jump_intensity_per_day),
                       "up_jumps": int(sum(1 for d in jump_catalog["directions"] if d == "UP")),
                       "down_jumps": int(sum(1 for d in jump_catalog["directions"] if d == "DOWN")),
                       "mean_abs_pct": float(np.mean(np.abs(pct_rets))) if len(jump_returns) > 0 else 0},
        "jump_histogram": {"centers": centers, "counts": counts.tolist() if hasattr(counts, 'tolist') else counts},
        "jump_scatter": {"timestamps": jump_catalog["timestamps"][:500],
                         "pct_returns": jump_catalog["pct_returns"][:500],
                         "directions": jump_catalog["directions"][:500]},
        "merton_params": merton_params,
    }

    save_json(result, "jumps.json")
    print(f"  {n_sig}/{len(daily_jump_stats)} days with significant jumps")
    print(f"  {len(jump_returns)} threshold jumps detected ({jump_intensity_per_day:.1f}/day)")
    return {"merton_params": merton_params, "log_returns": log_returns, "n_days": n_days}


# ──────────────────────────────────────────────────────────────────────
# PHASE 4: MODEL CALIBRATION
# ──────────────────────────────────────────────────────────────────────
def phase4_calibration(df: pd.DataFrame, log_returns: dict, merton_params: dict, n_days: int) -> dict:
    print("\n=== Phase 4: Model Calibration ===")
    from arch import arch_model

    ret_5min = log_returns["5min"] * 100
    ret_1min = log_returns["1min"]

    # ── GARCH(1,1) ──
    print("  Fitting GARCH(1,1)...")
    garch11 = arch_model(ret_5min, vol="Garch", p=1, q=1, mean="Constant", dist="t")
    garch11_res = garch11.fit(disp="off")
    gp = garch11_res.params

    garch_omega = float(gp["omega"])
    garch_alpha = float(gp["alpha[1]"])
    garch_beta = float(gp["beta[1]"])
    garch_nu = float(gp["nu"])

    # GJR-GARCH
    print("  Fitting GJR-GARCH...")
    gjr = arch_model(ret_5min, vol="GARCH", p=1, o=1, q=1, mean="Constant", dist="t")
    gjr_res = gjr.fit(disp="off")
    gjrp = gjr_res.params

    cond_vol_garch = garch11_res.conditional_volatility
    cond_vol_gjr = gjr_res.conditional_volatility
    periods_per_year = SECONDS_PER_YEAR / 300
    ann_vol_garch = cond_vol_garch * np.sqrt(periods_per_year)
    ann_vol_gjr = cond_vol_gjr * np.sqrt(periods_per_year)

    # Downsample conditional vol for JSON (every 12th = hourly)
    step = max(1, len(ann_vol_garch) // 2000)
    garch_vol_ts = ann_vol_garch.iloc[::step]
    gjr_vol_ts = ann_vol_gjr.iloc[::step]

    garch_result = {
        "params": {"omega": garch_omega, "alpha": garch_alpha, "beta": garch_beta,
                    "persistence": float(garch_alpha + garch_beta), "nu": garch_nu},
        "gjr_params": {"omega": float(gjrp["omega"]), "alpha": float(gjrp["alpha[1]"]),
                        "gamma": float(gjrp["gamma[1]"]), "beta": float(gjrp["beta[1]"]),
                        "persistence": float(gjrp["alpha[1]"] + gjrp["beta[1]"] + 0.5 * gjrp["gamma[1]"])},
        "cond_vol_timestamps": [t.isoformat() for t in garch_vol_ts.index],
        "cond_vol_garch": garch_vol_ts.values.tolist(),
        "cond_vol_gjr": gjr_vol_ts.values.tolist(),
    }

    # ── HESTON ──
    print("  Calibrating Heston...")
    hourly_rv_series = (ret_1min ** 2).resample("1h").sum().dropna()
    hourly_rv_series = hourly_rv_series[hourly_rv_series > 0]
    periods_per_year_hourly = SECONDS_PER_YEAR / 3600
    v_t = hourly_rv_series.values * periods_per_year_hourly
    dt_hour = 1.0 / (365.25 * 24)
    v_mean = np.mean(v_t)
    v_var = np.var(v_t)
    ac1 = np.corrcoef(v_t[:-1], v_t[1:])[0, 1]
    ac1 = max(min(ac1, 0.9999), 0.01)

    heston_kappa = -np.log(ac1) / dt_hour
    heston_theta = v_mean
    heston_xi = np.sqrt(2 * heston_kappa * v_var / max(heston_theta, 1e-10))
    heston_v0 = v_t[-1]

    ret_1hr = log_returns["1hr"]
    common_idx = hourly_rv_series.index.intersection(ret_1hr.index)
    ret_aligned = ret_1hr.reindex(common_idx).dropna()
    rv_aligned = hourly_rv_series.reindex(common_idx).dropna()
    common = ret_aligned.index.intersection(rv_aligned.index)
    if len(common) > 2:
        ret_arr = ret_aligned.loc[common].values
        rv_arr = rv_aligned.loc[common].values
        drv = np.diff(rv_arr)
        heston_rho = float(np.corrcoef(ret_arr[:-1], drv)[0, 1])
    else:
        heston_rho = 0.0

    feller = 2 * heston_kappa * heston_theta / max(heston_xi ** 2, 1e-10)

    # Simulated validation path
    np.random.seed(42)
    n_sim = min(len(v_t), 2000)
    v_sim = np.zeros(n_sim)
    v_sim[0] = heston_v0
    for i in range(1, n_sim):
        dW = np.random.normal(0, np.sqrt(dt_hour))
        v_sim[i] = max(v_sim[i - 1] + heston_kappa * (heston_theta - v_sim[i - 1]) * dt_hour
                       + heston_xi * np.sqrt(max(v_sim[i - 1], 0)) * dW, 0)

    heston_result = {
        "params": {"kappa": float(heston_kappa), "theta": float(heston_theta),
                    "theta_vol_pct": float(np.sqrt(heston_theta) * 100),
                    "xi": float(heston_xi), "rho": heston_rho,
                    "v0": float(heston_v0), "v0_vol_pct": float(np.sqrt(heston_v0) * 100),
                    "feller": float(feller)},
        "validation": {
            "empirical_vol": (np.sqrt(v_t[:n_sim]) * 100).tolist(),
            "simulated_vol": (np.sqrt(v_sim) * 100).tolist(),
            "long_run_vol": float(np.sqrt(heston_theta) * 100),
        },
    }

    # ── MERTON ──
    print("  Calibrating Merton...")
    merton_lambda = merton_params["lambda_annual"]
    merton_mu_j = merton_params["mu_J"]
    merton_sigma_j = merton_params["sigma_J"]

    total_var_annual = float((ret_1min ** 2).sum() * (SECONDS_PER_YEAR / (n_days * 86400)))
    jump_var_annual = merton_lambda * (merton_sigma_j ** 2 + merton_mu_j ** 2)
    diffusion_var = max(total_var_annual - jump_var_annual, 0.01 ** 2)
    merton_sigma = np.sqrt(diffusion_var)
    merton_k = np.exp(merton_mu_j + 0.5 * merton_sigma_j ** 2) - 1

    dt_1min = 1.0 / (365.25 * 24 * 60)
    lam_dt = merton_lambda * dt_1min
    x_grid = np.linspace(-0.02, 0.02, 300)
    pdf_merton = np.zeros_like(x_grid)
    for nj in range(15):
        w = poisson.pmf(nj, lam_dt)
        mu_n = nj * merton_mu_j
        var_n = merton_sigma ** 2 * dt_1min + nj * merton_sigma_j ** 2
        pdf_merton += w * sp_norm.pdf(x_grid, mu_n, np.sqrt(var_n))
    pdf_normal = sp_norm.pdf(x_grid, ret_1min.mean(), ret_1min.std())

    merton_result = {
        "params": {"sigma_diffusion": float(merton_sigma), "sigma_diffusion_pct": float(merton_sigma * 100),
                    "lambda_annual": float(merton_lambda), "lambda_per_day": float(merton_lambda / 365.25),
                    "mu_J": float(merton_mu_j), "sigma_J": float(merton_sigma_j),
                    "k": float(merton_k),
                    "total_vol_pct": float(np.sqrt(total_var_annual) * 100),
                    "jump_vol_pct": float(np.sqrt(jump_var_annual) * 100)},
        "pdf_overlay": {"x": x_grid.tolist(), "merton_pdf": pdf_merton.tolist(), "normal_pdf": pdf_normal.tolist()},
    }

    # ── BATES (Heston + Merton combined) ──
    print("  Assembling Bates model...")
    bates_result = {
        "params": {
            "kappa": float(heston_kappa), "theta": float(heston_theta),
            "theta_vol_pct": float(np.sqrt(heston_theta) * 100),
            "xi": float(heston_xi), "rho": heston_rho,
            "v0": float(heston_v0), "v0_vol_pct": float(np.sqrt(heston_v0) * 100),
            "lambda_annual": float(merton_lambda), "lambda_per_day": float(merton_lambda / 365.25),
            "mu_J": float(merton_mu_j), "sigma_J": float(merton_sigma_j),
            "feller": float(feller),
        },
        "description": "Bates = Heston stochastic vol + Merton jumps. 8 parameters total.",
    }

    calibration = {
        "garch": garch_result,
        "heston": heston_result,
        "merton": merton_result,
        "bates": bates_result,
        "spot": float(df["close"].iloc[-1]),
    }

    save_json(calibration, "calibration.json")
    print(f"  All models calibrated. Spot = ${df['close'].iloc[-1]:,.2f}")
    return {
        "garch": {"omega": garch_omega, "alpha": garch_alpha, "beta": garch_beta, "nu": garch_nu,
                  "last_cond_vol_5min": float(cond_vol_garch.iloc[-1] / 100)},
        "heston": {"kappa": heston_kappa, "theta": heston_theta, "xi": heston_xi, "rho": heston_rho, "v0": heston_v0},
        "merton": {"sigma": merton_sigma, "lambda": merton_lambda, "mu_j": merton_mu_j,
                   "sigma_j": merton_sigma_j, "k": merton_k},
        "spot": float(df["close"].iloc[-1]),
        "bs_sigma": float(np.sqrt(total_var_annual)),
    }


# ──────────────────────────────────────────────────────────────────────
# PHASE 5: OPTION PRICING
# ──────────────────────────────────────────────────────────────────────
def bs_call(S, K, T, r, sigma):
    if T <= 0:
        return max(S - K, 0.0)
    d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return float(S * sp_norm.cdf(d1) - K * np.exp(-r * T) * sp_norm.cdf(d2))


def bs_put(S, K, T, r, sigma):
    return bs_call(S, K, T, r, sigma) - S + K * np.exp(-r * T)


def bs_implied_vol(price, S, K, T, r, is_call=True):
    pricer = bs_call if is_call else bs_put
    intrinsic = max(S - K, 0) if is_call else max(K * np.exp(-r * T) - S, 0)
    if price <= intrinsic + 1e-8:
        return None
    try:
        return float(brentq(lambda sig: pricer(S, K, T, r, sig) - price, 1e-6, 10.0, xtol=1e-8, maxiter=200))
    except (ValueError, RuntimeError):
        return None


def phase5_pricing(params: dict) -> dict:
    print("\n=== Phase 5: Option Pricing ===")
    S0 = params["spot"]
    r = 0.04
    bs_sigma = params["bs_sigma"]

    moneyness = np.arange(0.90, 1.105, 0.01)
    strikes = S0 * moneyness

    maturities_dict = {
        "1hr": 1 / (365.25 * 24), "4hr": 4 / (365.25 * 24),
        "1day": 1 / 365.25, "3day": 3 / 365.25,
        "7day": 7 / 365.25, "14day": 14 / 365.25, "30day": 30 / 365.25,
    }

    # BS baseline
    print("  Computing BS baseline...")
    bs_prices = {}
    for mat_label, T in maturities_dict.items():
        calls = [bs_call(S0, K, T, r, bs_sigma) for K in strikes]
        puts = [bs_put(S0, K, T, r, bs_sigma) for K in strikes]
        bs_prices[mat_label] = {"calls": calls, "puts": puts}

    # Monte Carlo setup — memory-efficient: only store current prices, snapshot at maturity checkpoints
    N_PATHS = 50_000
    np.random.seed(42)
    max_T = max(maturities_dict.values())
    dt_sim = 1.0 / (365.25 * 24)
    n_steps = int(np.ceil(max_T / dt_sim)) + 1
    sqrt_dt = np.sqrt(dt_sim)

    mat_step_map = {}
    for label, T in maturities_dict.items():
        mat_step_map[label] = min(int(round(T / dt_sim)), n_steps)

    step_to_mats = {}
    for label, step_idx in mat_step_map.items():
        step_to_mats.setdefault(step_idx, []).append(label)

    mc_prices = {"GARCH": {}, "Heston": {}, "Merton": {}, "Bates": {}}
    discount = {label: np.exp(-r * T) for label, T in maturities_dict.items()}

    def price_at_checkpoint(S_T, model_name, mat_label):
        calls = [float(discount[mat_label] * np.mean(np.maximum(S_T - K, 0))) for K in strikes]
        puts = [float(discount[mat_label] * np.mean(np.maximum(K - S_T, 0))) for K in strikes]
        mc_prices[model_name][mat_label] = {"calls": calls, "puts": puts}

    # GARCH MC
    print("  Running GARCH Monte Carlo (50K paths)...")
    gp = params["garch"]
    scale_factor = 12
    garch_omega_h = gp["omega"] * scale_factor / 1e4
    init_var_h = (gp["last_cond_vol_5min"] ** 2) * scale_factor
    S_cur = np.full(N_PATHS, S0)
    var_h = np.full(N_PATHS, init_var_h)
    for t in range(1, n_steps + 1):
        z = np.random.standard_normal(N_PATHS)
        sigma_h = np.sqrt(np.maximum(var_h, 1e-20))
        log_ret = (r - 0.5 * var_h * (1 / dt_sim)) * dt_sim + sigma_h * z
        S_cur = S_cur * np.exp(log_ret)
        eps = sigma_h * z
        var_h = garch_omega_h + gp["alpha"] * eps ** 2 + gp["beta"] * var_h
        if t in step_to_mats:
            for ml in step_to_mats[t]:
                price_at_checkpoint(S_cur, "GARCH", ml)
    del S_cur, var_h

    # Heston MC
    print("  Running Heston Monte Carlo (50K paths)...")
    hp = params["heston"]
    S_cur = np.full(N_PATHS, S0)
    v = np.full(N_PATHS, hp["v0"])
    for t in range(1, n_steps + 1):
        z1 = np.random.standard_normal(N_PATHS)
        z2 = np.random.standard_normal(N_PATHS)
        zv = hp["rho"] * z1 + np.sqrt(1 - hp["rho"] ** 2) * z2
        v_pos = np.maximum(v, 0)
        sqrt_v = np.sqrt(v_pos)
        S_cur = S_cur * np.exp((r - 0.5 * v_pos) * dt_sim + sqrt_v * sqrt_dt * z1)
        v = v + hp["kappa"] * (hp["theta"] - v) * dt_sim + hp["xi"] * sqrt_v * sqrt_dt * zv
        v = np.maximum(v, 0)
        if t in step_to_mats:
            for ml in step_to_mats[t]:
                price_at_checkpoint(S_cur, "Heston", ml)
    del S_cur, v

    # Merton MC — vectorized jump sizes
    print("  Running Merton Monte Carlo (50K paths)...")
    mp = params["merton"]
    S_cur = np.full(N_PATHS, S0)
    lam_dt_m = mp["lambda"] * dt_sim
    drift_m = (r - mp["lambda"] * mp["k"] - 0.5 * mp["sigma"] ** 2) * dt_sim
    for t in range(1, n_steps + 1):
        z = np.random.standard_normal(N_PATHS)
        n_jumps = np.random.poisson(lam_dt_m, N_PATHS)
        total_jump = np.random.normal(mp["mu_j"], mp["sigma_j"], N_PATHS) * n_jumps
        S_cur = S_cur * np.exp(drift_m + mp["sigma"] * sqrt_dt * z + total_jump)
        if t in step_to_mats:
            for ml in step_to_mats[t]:
                price_at_checkpoint(S_cur, "Merton", ml)
    del S_cur

    # Bates MC (Heston + Merton) — vectorized
    print("  Running Bates Monte Carlo (50K paths)...")
    S_cur = np.full(N_PATHS, S0)
    v_bates = np.full(N_PATHS, hp["v0"])
    for t in range(1, n_steps + 1):
        z1 = np.random.standard_normal(N_PATHS)
        z2 = np.random.standard_normal(N_PATHS)
        zv = hp["rho"] * z1 + np.sqrt(1 - hp["rho"] ** 2) * z2
        v_pos = np.maximum(v_bates, 0)
        sqrt_v = np.sqrt(v_pos)
        n_jumps = np.random.poisson(lam_dt_m, N_PATHS)
        total_jump = np.random.normal(mp["mu_j"], mp["sigma_j"], N_PATHS) * n_jumps
        S_cur = S_cur * np.exp(
            (r - mp["lambda"] * mp["k"] - 0.5 * v_pos) * dt_sim
            + sqrt_v * sqrt_dt * z1 + total_jump)
        v_bates = v_bates + hp["kappa"] * (hp["theta"] - v_bates) * dt_sim \
                  + hp["xi"] * sqrt_v * sqrt_dt * zv
        v_bates = np.maximum(v_bates, 0)
        if t in step_to_mats:
            for ml in step_to_mats[t]:
                price_at_checkpoint(S_cur, "Bates", ml)
    del S_cur, v_bates

    print("  MC pricing complete.")

    # Package results
    atm_idx = int(np.argmin(np.abs(moneyness - 1.0)))
    result = {
        "spot": S0, "risk_free_rate": r, "bs_sigma": float(bs_sigma),
        "bs_sigma_pct": float(bs_sigma * 100),
        "moneyness": moneyness.tolist(),
        "strikes": strikes.tolist(),
        "maturities": {k: float(v) for k, v in maturities_dict.items()},
        "atm_idx": atm_idx,
        "bs_prices": bs_prices,
        "mc_prices": mc_prices,
        "models": ["BS", "GARCH", "Heston", "Merton", "Bates"],
    }

    save_json(result, "pricing.json")
    print(f"  Priced {len(moneyness)} strikes x {len(maturities_dict)} maturities x 5 models")
    return {"bs_prices": bs_prices, "mc_prices": mc_prices, "moneyness": moneyness,
            "strikes": strikes, "maturities_dict": maturities_dict, "atm_idx": atm_idx,
            "S0": S0, "r": r, "bs_sigma": bs_sigma}


# ──────────────────────────────────────────────────────────────────────
# PHASE 6: COMPARISON
# ──────────────────────────────────────────────────────────────────────
def phase6_comparison(pricing: dict) -> dict:
    print("\n=== Phase 6: Comparative Analysis ===")
    bs_prices = pricing["bs_prices"]
    mc_prices = pricing["mc_prices"]
    moneyness = pricing["moneyness"]
    strikes = pricing["strikes"]
    maturities_dict = pricing["maturities_dict"]
    atm_idx = pricing["atm_idx"]
    S0 = pricing["S0"]
    r = pricing["r"]
    bs_sigma = pricing["bs_sigma"]

    # IV smiles
    iv_smiles = {model: {} for model in ["GARCH", "Heston", "Merton", "Bates"]}
    for model_name in iv_smiles:
        for mat_label, T in maturities_dict.items():
            ivs = []
            for i, K in enumerate(strikes):
                mc_price = mc_prices[model_name][mat_label]["calls"][i]
                iv = bs_implied_vol(mc_price, S0, K, T, r, is_call=True)
                ivs.append(iv)
            iv_smiles[model_name][mat_label] = ivs

    # ATM comparison tables
    atm_table = []
    for mat_label, T in maturities_dict.items():
        row = {"maturity": mat_label, "T_days": float(T * 365.25),
               "BS_call": bs_prices[mat_label]["calls"][atm_idx]}
        for model_name in ["GARCH", "Heston", "Merton", "Bates"]:
            mc_c = mc_prices[model_name][mat_label]["calls"][atm_idx]
            row[f"{model_name}_call"] = mc_c
            row[f"{model_name}_pct_diff"] = float((mc_c - row["BS_call"]) / max(row["BS_call"], 1e-10) * 100)
            iv_atm = iv_smiles[model_name][mat_label][atm_idx]
            row[f"{model_name}_IV_atm"] = float(iv_atm * 100) if iv_atm is not None else None

            idx_95 = int(np.argmin(np.abs(moneyness - 0.95)))
            idx_105 = int(np.argmin(np.abs(moneyness - 1.05)))
            iv_95 = iv_smiles[model_name][mat_label][idx_95]
            iv_105 = iv_smiles[model_name][mat_label][idx_105]
            if iv_95 is not None and iv_105 is not None:
                row[f"{model_name}_skew"] = float((iv_95 - iv_105) * 100)
            else:
                row[f"{model_name}_skew"] = None
        atm_table.append(row)

    result = {
        "iv_smiles": iv_smiles,
        "moneyness": moneyness.tolist(),
        "bs_flat_vol_pct": float(bs_sigma * 100),
        "atm_table": atm_table,
        "models": ["GARCH", "Heston", "Merton", "Bates"],
        "maturities": list(maturities_dict.keys()),
    }

    save_json(result, "comparison.json")
    print(f"  Computed IV smiles for 4 models x {len(maturities_dict)} maturities")
    return result


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────
def main():
    t_start = time.time()
    print("=" * 60)
    print("  CRYPTO OPTIONS PRICING — FULL ANALYSIS ENGINE")
    print("=" * 60)

    df = load_data()

    p1 = phase1_returns(df)
    p2 = phase2_volatility(df)
    p3 = phase3_jumps(df, p1["log_returns"])
    p4 = phase4_calibration(df, p1["log_returns"], p3["merton_params"], p3["n_days"])
    p5 = phase5_pricing(p4)
    phase6_comparison(p5)

    elapsed = time.time() - t_start
    print(f"\n{'=' * 60}")
    print(f"  DONE — Total time: {elapsed:.0f}s ({elapsed / 60:.1f} min)")
    print(f"  Output files in: {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
