"""
Perpetual Futures Analytics — Full Analysis Engine
Processes btcusd.csv (1-second BTCUSDT klines) and outputs JSON files
for the Next.js frontend.

Adapts all 14 steps from btc-futures.ipynb:
  Part 1: Data overview + price/volume chart data
  Part 2: Fair price primitives (Steps 1–6)
  Part 3: Exchange risk & operations (Steps 7–14)
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
from scipy.stats import norm, t as t_dist

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
CSV_PATH = BASE_DIR / "btcusd.csv"
OUTPUT_DIR = BASE_DIR / "public" / "data" / "perp"
SECONDS_PER_YEAR = 365.25 * 24 * 3600


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating, float)):
            v = float(obj)
            if np.isnan(v) or np.isinf(v):
                return None
            return v
        if isinstance(obj, np.ndarray):
            return self._clean_list(obj.tolist())
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        return super().default(obj)

    @staticmethod
    def _clean_list(lst):
        return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x for x in lst]


def _sanitize(obj):
    """Recursively replace NaN/Inf with None in nested dicts/lists."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    return obj


def save_json(data: dict, filename: str):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / filename
    clean = _sanitize(data)
    with open(path, "w") as f:
        json.dump(clean, f, cls=NumpyEncoder, separators=(",", ":"))
    size_mb = path.stat().st_size / 1024 / 1024
    print(f"  -> {filename} ({size_mb:.2f} MB)")


def load_data() -> pd.DataFrame:
    print(f"Loading {CSV_PATH} ...")
    t0 = time.time()
    df = pd.read_csv(CSV_PATH)
    df["open_time"] = pd.to_datetime(df["open_time"] // 1_000_000, unit="s", utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"] // 1_000_000, unit="s", utc=True)
    df = df.set_index("open_time").sort_index()
    df.index = df.index.tz_localize(None)
    if "ignore" in df.columns:
        df = df.drop(columns=["ignore"])
    elapsed = time.time() - t0
    print(f"  Loaded {len(df):,} rows in {elapsed:.1f}s")
    print(f"  Date range: {df.index.min()} -> {df.index.max()}")
    return df


# ──────────────────────────────────────────────────────────────────────
# OVERVIEW: Price & Volume chart data
# ──────────────────────────────────────────────────────────────────────
def step0_overview(df: pd.DataFrame) -> dict:
    print("\n=== Overview: Price & Volume ===")
    hourly = df.resample("1h").agg({"close": "last", "volume": "sum"}).dropna()
    step = max(1, len(hourly) // 3000)
    sampled = hourly.iloc[::step]

    result = {
        "timestamps": [t.isoformat() for t in sampled.index],
        "close": sampled["close"].values.tolist(),
        "volume": sampled["volume"].values.tolist(),
        "total_rows": int(len(df)),
        "date_start": str(df.index.min().date()),
        "date_end": str(df.index.max().date()),
        "n_days": int((df.index.max() - df.index.min()).days + 1),
        "price_start": float(df["close"].iloc[0]),
        "price_end": float(df["close"].iloc[-1]),
        "price_min": float(df["close"].min()),
        "price_max": float(df["close"].max()),
        "total_volume_btc": float(df["volume"].sum()),
        "avg_daily_volume": float(df["volume"].resample("1D").sum().mean()),
    }
    save_json(result, "overview.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 1: Returns
# ──────────────────────────────────────────────────────────────────────
def step1_returns(df: pd.DataFrame) -> dict:
    print("\n=== Step 1: Returns ===")
    df["log_return"] = np.log(df["close"] / df["close"].shift(1))

    ret_stats = {
        "mean": float(df["log_return"].mean()),
        "std": float(df["log_return"].std()),
        "skewness": float(df["log_return"].skew()),
        "kurtosis": float(df["log_return"].kurtosis()),
        "min": float(df["log_return"].min()),
        "max": float(df["log_return"].max()),
    }

    minute_returns = df["log_return"].resample("1min").sum().dropna()
    mu, sigma = minute_returns.mean(), minute_returns.std()
    counts, bin_edges = np.histogram(minute_returns.values, bins=300, density=True)
    bin_centers = ((bin_edges[:-1] + bin_edges[1:]) / 2).tolist()
    x_norm = np.linspace(mu - 5 * sigma, mu + 5 * sigma, 300).tolist()
    y_norm = norm.pdf(np.array(x_norm), mu, sigma).tolist()

    MAX_QQ = 2000
    qq = stats.probplot(minute_returns.values, dist="norm")
    theo = qq[0][0]
    samp = qq[0][1]
    if len(theo) > MAX_QQ:
        idx = np.linspace(0, len(theo) - 1, MAX_QQ, dtype=int)
        theo = theo[idx]
        samp = samp[idx]

    result = {
        "stats_1s": ret_stats,
        "histogram": {
            "bin_centers": bin_centers,
            "counts": counts.tolist(),
            "normal_x": x_norm,
            "normal_y": y_norm,
            "xlim": [float(mu - 5 * sigma), float(mu + 5 * sigma)],
        },
        "qq_plot": {
            "theoretical": theo.tolist(),
            "sample": samp.tolist(),
            "slope": float(qq[1][0]),
            "intercept": float(qq[1][1]),
        },
    }
    save_json(result, "returns.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 2: VWAP
# ──────────────────────────────────────────────────────────────────────
def step2_vwap(df: pd.DataFrame) -> dict:
    print("\n=== Step 2: VWAP ===")
    date_groups = df.groupby(df.index.date)
    df["vwap"] = date_groups["quote_volume"].cumsum() / date_groups["volume"].cumsum()

    sample_date = str(df.index[len(df) // 2].date())
    sample = df.loc[sample_date].resample("1min").agg({"close": "last", "vwap": "last", "volume": "sum"}).dropna()
    step = max(1, len(sample) // 1440)
    sample = sample.iloc[::step]

    vwap_dev = (df["close"] - df["vwap"]) / df["vwap"] * 100
    dev_stats = {
        "mean": float(vwap_dev.mean()),
        "std": float(vwap_dev.std()),
        "median": float(vwap_dev.median()),
        "pct_gt_01": float((vwap_dev.abs() > 0.1).mean() * 100),
    }

    result = {
        "sample_date": sample_date,
        "sample_timestamps": [t.isoformat() for t in sample.index],
        "sample_close": sample["close"].values.tolist(),
        "sample_vwap": sample["vwap"].values.tolist(),
        "sample_volume": sample["volume"].values.tolist(),
        "deviation_stats": dev_stats,
    }
    save_json(result, "vwap.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 3: Order Flow Imbalance
# ──────────────────────────────────────────────────────────────────────
def step3_ofi(df: pd.DataFrame) -> dict:
    print("\n=== Step 3: Order Flow Imbalance ===")
    df["taker_sell_volume"] = df["volume"] - df["taker_buy_volume"]

    bars_5m = df.resample("5min").agg({
        "close": "last", "volume": "sum",
        "taker_buy_volume": "sum", "taker_sell_volume": "sum",
        "log_return": "sum",
    }).dropna()
    bars_5m["ofi"] = ((bars_5m["taker_buy_volume"] - bars_5m["taker_sell_volume"]) / bars_5m["volume"])
    bars_5m["fwd_return"] = bars_5m["log_return"].shift(-1)

    # OFI distribution
    counts, edges = np.histogram(bars_5m["ofi"].dropna(), bins=200, density=True)
    ofi_centers = ((edges[:-1] + edges[1:]) / 2).tolist()

    # Decile signal
    bars_5m["ofi_bin"] = pd.qcut(bars_5m["ofi"], 20, labels=False, duplicates="drop")
    ofi_signal = bars_5m.groupby("ofi_bin")["fwd_return"].mean() * 10000
    decile_x = ofi_signal.index.tolist()
    decile_y = ofi_signal.values.tolist()

    corr = bars_5m[["ofi", "fwd_return"]].dropna().corr().iloc[0, 1]

    # Sample day
    sample_date = str(df.index[len(df) // 2].date())
    sample = bars_5m.loc[sample_date]

    result = {
        "ofi_histogram": {"centers": ofi_centers, "counts": counts.tolist()},
        "decile_signal": {"x": decile_x, "y": decile_y},
        "correlation": float(corr),
        "sample_date": sample_date,
        "sample_ofi": sample["ofi"].values.tolist(),
        "sample_close": sample["close"].values.tolist(),
    }
    save_json(result, "ofi.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 4: Realized Volatility
# ──────────────────────────────────────────────────────────────────────
def step4_volatility(df: pd.DataFrame) -> dict:
    print("\n=== Step 4: Realized Volatility ===")
    daily = df.resample("1D").agg({
        "open": "first", "high": "max", "low": "min",
        "close": "last", "volume": "sum", "log_return": "sum"
    }).dropna()

    daily["rvol_cc_30d"] = daily["log_return"].rolling(30).std() * np.sqrt(365)
    daily["hl_log_sq"] = np.log(daily["high"] / daily["low"]) ** 2
    daily["rvol_park_30d"] = np.sqrt(
        daily["hl_log_sq"].rolling(30).mean() / (4 * np.log(2))
    ) * np.sqrt(365)

    dates = [str(d.date()) for d in daily.index]
    mean_vol = float(daily["rvol_cc_30d"].dropna().mean() * 100)

    result = {
        "dates": dates,
        "close": daily["close"].values.tolist(),
        "rvol_cc": (daily["rvol_cc_30d"] * 100).values.tolist(),
        "rvol_park": (daily["rvol_park_30d"] * 100).values.tolist(),
        "mean_vol": mean_vol,
        "peak_vol": float(daily["rvol_cc_30d"].max() * 100),
        "peak_vol_date": str(daily["rvol_cc_30d"].idxmax().date()),
        "min_vol": float(daily["rvol_cc_30d"].dropna().min() * 100),
        "min_vol_date": str(daily["rvol_cc_30d"].dropna().idxmin().date()),
    }
    save_json(result, "volatility.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 5: Micro-Spread
# ──────────────────────────────────────────────────────────────────────
def step5_spread(df: pd.DataFrame) -> dict:
    print("\n=== Step 5: Micro-Spread ===")
    df["spread_bps"] = (df["high"] - df["low"]) / ((df["high"] + df["low"]) / 2) * 10000

    hourly_spread = df["spread_bps"].resample("1h").mean()
    ma_7d = hourly_spread.rolling(24 * 7).mean()

    step = max(1, len(hourly_spread) // 2000)
    spread_ts_idx = [t.isoformat() for t in hourly_spread.index[::step]]
    spread_ts_val = hourly_spread.values[::step].tolist()
    ma_ts_val = ma_7d.values[::step].tolist()

    spread_by_hour = df.groupby(df.index.hour)["spread_bps"].mean()
    mean_spread = float(spread_by_hour.mean())

    hourly_sv = df.resample("1h").agg({"spread_bps": "mean", "volume": "sum"}).dropna()
    q99_vol = hourly_sv["volume"].quantile(0.99)
    q99_sp = hourly_sv["spread_bps"].quantile(0.99)
    scatter_data = hourly_sv[(hourly_sv["volume"] < q99_vol) & (hourly_sv["spread_bps"] < q99_sp)]
    scatter_step = max(1, len(scatter_data) // 1500)
    scatter_sampled = scatter_data.iloc[::scatter_step]

    result = {
        "time_series": {"timestamps": spread_ts_idx, "spread": spread_ts_val, "ma_7d": ma_ts_val},
        "by_hour": {"hours": list(range(24)), "spread": spread_by_hour.values.tolist(), "mean": mean_spread},
        "scatter": {"volume": scatter_sampled["volume"].values.tolist(),
                     "spread": scatter_sampled["spread_bps"].values.tolist()},
        "stats": {
            "mean_bps": float(df["spread_bps"].mean()),
            "tightest_hour": int(spread_by_hour.idxmin()),
            "tightest_bps": float(spread_by_hour.min()),
            "widest_hour": int(spread_by_hour.idxmax()),
            "widest_bps": float(spread_by_hour.max()),
        },
    }
    save_json(result, "spread.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 6: Volume Profile
# ──────────────────────────────────────────────────────────────────────
def step6_volume_profile(df: pd.DataFrame) -> dict:
    print("\n=== Step 6: Volume Profile ===")
    vol_at_price, bin_edges = np.histogram(df["close"].values, bins=200, weights=df["volume"].values)
    bin_centers = ((bin_edges[:-1] + bin_edges[1:]) / 2)
    vol_profile = pd.Series(vol_at_price, index=bin_centers)

    poc_price = float(vol_profile.idxmax())
    total_vol = vol_profile.sum()
    sorted_vp = vol_profile.sort_values(ascending=False)
    cumulative = sorted_vp.cumsum()
    va_bins = cumulative[cumulative <= total_vol * 0.70].index
    va_low = float(va_bins.min())
    va_high = float(va_bins.max())

    daily_close = df["close"].resample("1D").last().dropna()
    current_price = float(df["close"].iloc[-1])

    result = {
        "profile_prices": bin_centers.tolist(),
        "profile_volumes": vol_at_price.tolist(),
        "poc": poc_price,
        "va_low": va_low,
        "va_high": va_high,
        "va_width_pct": float((va_high - va_low) / poc_price * 100),
        "current_price": current_price,
        "inside_va": bool(va_low <= current_price <= va_high),
        "daily_dates": [str(d.date()) for d in daily_close.index],
        "daily_close": daily_close.values.tolist(),
    }
    save_json(result, "volume_profile.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 7: Funding Rate
# ──────────────────────────────────────────────────────────────────────
def step7_funding(df: pd.DataFrame) -> dict:
    print("\n=== Step 7: Funding Rate ===")
    bars_8h = df.resample("8h").agg({
        "open": "first", "high": "max", "low": "min",
        "close": "last", "volume": "sum", "vwap": "last",
    }).dropna()

    bars_8h["premium_index"] = (bars_8h["close"] - bars_8h["vwap"]) / bars_8h["vwap"]
    INTEREST_RATE = 0.0001
    bars_8h["funding_rate"] = bars_8h["premium_index"] + np.clip(
        INTEREST_RATE - bars_8h["premium_index"], -0.0005, 0.0005
    )
    bars_8h["annual_funding"] = bars_8h["funding_rate"] * 3 * 365
    cum_funding = bars_8h["funding_rate"].cumsum() * 100

    pct_positive = float((bars_8h["funding_rate"] > 0).mean() * 100)

    result = {
        "timestamps": [t.isoformat() for t in bars_8h.index],
        "close": bars_8h["close"].values.tolist(),
        "funding_rate_pct": (bars_8h["funding_rate"] * 100).values.tolist(),
        "cumulative_funding_pct": cum_funding.values.tolist(),
        "stats": {
            "mean_pct": float(bars_8h["funding_rate"].mean() * 100),
            "median_pct": float(bars_8h["funding_rate"].median() * 100),
            "std_pct": float(bars_8h["funding_rate"].std() * 100),
            "min_pct": float(bars_8h["funding_rate"].min() * 100),
            "max_pct": float(bars_8h["funding_rate"].max() * 100),
            "pct_positive": pct_positive,
            "annualized_yield_pct": float(bars_8h["annual_funding"].mean() * 100),
            "cumulative_6m_pct": float(cum_funding.iloc[-1]),
        },
    }
    save_json(result, "funding.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 8: Mark Price
# ──────────────────────────────────────────────────────────────────────
def step8_mark_price(df: pd.DataFrame) -> dict:
    print("\n=== Step 8: Mark Price ===")
    df["basis"] = df["close"] - df["vwap"]
    df["mark_price"] = df["vwap"] + df["basis"].ewm(span=300, adjust=False).mean()

    sample_date = str(df.index[len(df) // 2].date())
    sample_10s = df.loc[sample_date].resample("10s").last().dropna()
    step = max(1, len(sample_10s) // 1000)
    sample_10s = sample_10s.iloc[::step]

    dev_bps = (sample_10s["close"] - sample_10s["mark_price"]) / sample_10s["mark_price"] * 10000
    dev_abs = (df["close"] - df["mark_price"]).abs()

    result = {
        "sample_date": sample_date,
        "sample_timestamps": [t.isoformat() for t in sample_10s.index],
        "sample_close": sample_10s["close"].values.tolist(),
        "sample_mark": sample_10s["mark_price"].values.tolist(),
        "sample_vwap": sample_10s["vwap"].values.tolist(),
        "sample_dev_bps": dev_bps.values.tolist(),
        "stats": {
            "mean_abs_dev": float(dev_abs.mean()),
            "median_abs_dev": float(dev_abs.median()),
            "p95_abs_dev": float(dev_abs.quantile(0.95)),
            "max_abs_dev": float(dev_abs.max()),
        },
    }
    save_json(result, "mark_price.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 9: VaR, CVaR, Drawdown
# ──────────────────────────────────────────────────────────────────────
def step9_risk(df: pd.DataFrame) -> dict:
    print("\n=== Step 9: VaR / CVaR / Drawdown ===")
    hourly_rets = df["log_return"].resample("1h").sum().dropna()
    daily_rets = df["log_return"].resample("1D").sum().dropna()

    confidence_levels = [0.90, 0.95, 0.99, 0.995, 0.999]
    var_table = []
    for cl in confidence_levels:
        h_var = float(-hourly_rets.quantile(1 - cl))
        d_var = float(-daily_rets.quantile(1 - cl))
        h_cvar = float(-hourly_rets[hourly_rets <= hourly_rets.quantile(1 - cl)].mean())
        d_cvar = float(-daily_rets[daily_rets <= daily_rets.quantile(1 - cl)].mean())
        var_table.append({
            "confidence": float(cl),
            "hourly_var": h_var * 100, "hourly_cvar": h_cvar * 100,
            "daily_var": d_var * 100, "daily_cvar": d_cvar * 100,
        })

    cumulative = daily_rets.cumsum()
    running_max = cumulative.cummax()
    drawdown = cumulative - running_max
    max_dd_idx = drawdown.idxmin()
    max_dd_start = cumulative.loc[:max_dd_idx].idxmax()

    # Daily return histogram
    d_counts, d_edges = np.histogram(daily_rets.values * 100, bins=80, density=True)
    d_centers = ((d_edges[:-1] + d_edges[1:]) / 2).tolist()

    # Rolling VaR
    rolling_var = daily_rets.rolling(30).quantile(0.01).abs() * 100

    # Worst days
    worst = daily_rets.nsmallest(10) * 100

    result = {
        "var_table": var_table,
        "daily_hist": {"centers": d_centers, "counts": d_counts.tolist()},
        "var_95_pct": float(-daily_rets.quantile(0.05) * 100),
        "var_99_pct": float(-daily_rets.quantile(0.01) * 100),
        "rolling_var": {
            "dates": [str(d.date()) for d in rolling_var.index],
            "values": rolling_var.values.tolist(),
        },
        "drawdown": {
            "dates": [str(d.date()) for d in drawdown.index],
            "values": (drawdown * 100).values.tolist(),
            "max_dd_pct": float(drawdown.min() * 100),
            "peak_date": str(max_dd_start.date()),
            "trough_date": str(max_dd_idx.date()),
            "duration_days": int((max_dd_idx - max_dd_start).days),
        },
        "worst_days": {
            "dates": [str(d.date()) for d in worst.index],
            "returns": worst.values.tolist(),
        },
    }
    save_json(result, "risk.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 10: Liquidation Cascade
# ──────────────────────────────────────────────────────────────────────
def step10_liquidation(df: pd.DataFrame) -> dict:
    print("\n=== Step 10: Liquidation Cascade ===")
    close_1m = df["close"].resample("1min").last().dropna()
    leverage_levels = [2, 5, 10, 20, 50, 100, 125]
    horizons = {"1h": 60, "4h": 240, "24h": 1440}
    liq_results = {}

    for h_name, h_mins in horizons.items():
        fwd_min = close_1m[::-1].rolling(h_mins, min_periods=30).min()[::-1]
        fwd_max = close_1m[::-1].rolling(h_mins, min_periods=30).max()[::-1]
        max_drop = (1 - fwd_min / close_1m).dropna()
        max_rise = (fwd_max / close_1m - 1).dropna()
        liq_results[h_name] = {"drop": max_drop, "rise": max_rise}

    long_probs = {}
    short_probs = {}
    for h_name in horizons:
        long_probs[h_name] = [float((liq_results[h_name]["drop"] > 1 / lev).mean() * 100) for lev in leverage_levels]
        short_probs[h_name] = [float((liq_results[h_name]["rise"] > 1 / lev).mean() * 100) for lev in leverage_levels]

    liq_24h_table = []
    for lev in leverage_levels:
        prob = float((liq_results["24h"]["drop"] > 1 / lev).mean() * 100)
        risk = "LOW" if prob < 1 else ("MEDIUM" if prob < 10 else ("HIGH" if prob < 50 else "EXTREME"))
        liq_24h_table.append({"leverage": lev, "prob": prob, "risk": risk})

    result = {
        "leverage_levels": leverage_levels,
        "horizons": list(horizons.keys()),
        "long_probs": long_probs,
        "short_probs": short_probs,
        "liq_24h_table": liq_24h_table,
    }
    save_json(result, "liquidation.json")
    return {"liq_results": liq_results}


# ──────────────────────────────────────────────────────────────────────
# STEP 11: Intraday Seasonality
# ──────────────────────────────────────────────────────────────────────
def step11_seasonality(df: pd.DataFrame) -> dict:
    print("\n=== Step 11: Intraday Seasonality ===")
    hourly_agg = df.resample("1h").agg({
        "volume": "sum",
        "log_return": "std",
        "spread_bps": "mean",
        "num_trades": "sum",
    }).dropna()
    hourly_agg["hour"] = hourly_agg.index.hour
    hourly_agg["weekday"] = hourly_agg.index.dayofweek

    weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    heatmaps = {}
    for metric in ["volume", "log_return", "spread_bps", "num_trades"]:
        pivot = hourly_agg.pivot_table(values=metric, index="hour", columns="weekday", aggfunc="mean")
        heatmaps[metric] = pivot.values.tolist()

    vol_by_hour = hourly_agg.groupby("hour")["volume"].mean()
    total = vol_by_hour.sum()
    asia_vol = float(vol_by_hour.loc[0:8].sum() / total * 100)
    eu_vol = float(vol_by_hour.loc[7:16].sum() / total * 100)
    us_vol = float(vol_by_hour.loc[13:22].sum() / total * 100)
    weekday_avg = hourly_agg[hourly_agg["weekday"] < 5]["volume"].mean()
    weekend_avg = hourly_agg[hourly_agg["weekday"] >= 5]["volume"].mean()

    result = {
        "weekday_names": weekday_names,
        "hours": list(range(24)),
        "heatmaps": heatmaps,
        "session_volume": {"asia": asia_vol, "eu": eu_vol, "us": us_vol},
        "peak_hour": int(vol_by_hour.idxmax()),
        "quiet_hour": int(vol_by_hour.idxmin()),
        "peak_quiet_ratio": float(vol_by_hour.max() / vol_by_hour.min()),
        "weekend_weekday_pct": float(weekend_avg / weekday_avg * 100),
    }
    save_json(result, "seasonality.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 12: Autocorrelation & Hurst
# ──────────────────────────────────────────────────────────────────────
def step12_autocorrelation(df: pd.DataFrame) -> dict:
    print("\n=== Step 12: Autocorrelation & Hurst ===")
    returns_1m = df["log_return"].resample("1min").sum().dropna()
    returns_5m = df["log_return"].resample("5min").sum().dropna()
    returns_1h = df["log_return"].resample("1h").sum().dropna()

    n_lags = 50
    acf_data = {}
    for label, rets in [("1m", returns_1m), ("5m", returns_5m), ("1h", returns_1h)]:
        acf_ret = [float(rets.autocorr(lag=i)) for i in range(n_lags + 1)]
        acf_abs = [float(rets.abs().autocorr(lag=i)) for i in range(n_lags + 1)]
        ci = float(1.96 / np.sqrt(len(rets)))
        acf_data[label] = {"returns": acf_ret, "abs_returns": acf_abs, "ci": ci}

    def hurst_exponent(ts, max_lag=100):
        lags = range(2, max_lag)
        tau = [np.std(np.subtract(ts[lag:], ts[:-lag])) for lag in lags]
        log_lags = np.log(list(lags))
        log_tau = np.log(tau)
        slope, _ = np.polyfit(log_lags, log_tau, 1)
        return float(slope)

    prices_1h = df["close"].resample("1h").last().dropna().values
    H = hurst_exponent(prices_1h)
    if H < 0.45:
        regime = "MEAN-REVERTING"
    elif H > 0.55:
        regime = "TRENDING"
    else:
        regime = "NEAR RANDOM WALK"

    result = {
        "lags": list(range(n_lags + 1)),
        "acf": acf_data,
        "hurst": {"value": H, "regime": regime},
    }
    save_json(result, "autocorrelation.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 13: Tail Risk
# ──────────────────────────────────────────────────────────────────────
def step13_tail_risk(df: pd.DataFrame) -> dict:
    print("\n=== Step 13: Tail Risk ===")
    daily_rets = df["log_return"].resample("1D").sum().dropna()

    norm_params = norm.fit(daily_rets)
    t_params = t_dist.fit(daily_rets)
    t_df, t_loc, t_scale = t_params

    x = np.linspace(daily_rets.min() * 1.2, daily_rets.max() * 1.2, 300)
    d_counts, d_edges = np.histogram(daily_rets.values * 100, bins=50, density=True)
    d_centers = ((d_edges[:-1] + d_edges[1:]) / 2).tolist()

    sigmas = [2, 3, 4, 5]
    sigma_val = daily_rets.std()
    n_days = len(daily_rets)
    extreme_table = []
    for s in sigmas:
        actual = int((daily_rets.abs() > s * sigma_val).sum())
        expected_norm = float(n_days * 2 * norm.sf(s))
        ratio = actual / expected_norm if expected_norm > 0.01 else None
        extreme_table.append({"sigma": s, "threshold_pct": float(s * sigma_val * 100),
                               "actual": actual, "expected_normal": expected_norm, "ratio": ratio})

    result = {
        "histogram": {"centers": d_centers, "counts": d_counts.tolist()},
        "fit_x": (x * 100).tolist(),
        "normal_pdf": (norm.pdf(x, *norm_params) / 100).tolist(),
        "student_t_pdf": (t_dist.pdf(x, *t_params) / 100).tolist(),
        "t_df": float(t_df),
        "extreme_table": extreme_table,
    }
    save_json(result, "tail_risk.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 14: Margin Tier Calibration
# ──────────────────────────────────────────────────────────────────────
def step14_margin(df: pd.DataFrame, liq_results: dict) -> dict:
    print("\n=== Step 14: Margin Tier Calibration ===")
    max_drop_24h = liq_results["24h"]["drop"]
    max_rise_24h = liq_results["24h"]["rise"]

    percentiles = [0.90, 0.95, 0.99, 0.995, 0.999]
    pctl_table = []
    for p in percentiles:
        pctl_table.append({
            "confidence": float(p),
            "long_risk_pct": float(max_drop_24h.quantile(p) * 100),
            "short_risk_pct": float(max_rise_24h.quantile(p) * 100),
        })

    leverage_tiers = [125, 100, 75, 50, 25, 20, 10, 5, 3, 2]
    margin_table = []
    for lev in leverage_tiers:
        init_margin = 1 / lev
        maint_margin = init_margin * 0.5
        liq_prob = float((max_drop_24h > init_margin).mean() * 100)
        risk = "LOW" if liq_prob < 0.5 else ("MEDIUM" if liq_prob < 5 else ("HIGH" if liq_prob < 30 else "EXTREME"))
        margin_table.append({
            "leverage": lev, "init_margin_pct": float(init_margin * 100),
            "maint_margin_pct": float(maint_margin * 100),
            "liq_prob_pct": liq_prob, "risk": risk,
        })

    # CDF data
    sorted_drops = np.sort(max_drop_24h.values) * 100
    cdf = np.arange(1, len(sorted_drops) + 1) / len(sorted_drops)
    cdf_step = max(1, len(sorted_drops) // 2000)
    cdf_x = sorted_drops[::cdf_step].tolist()
    cdf_y = (cdf[::cdf_step] * 100).tolist()

    # Leverage vs liq probability curve
    levs = list(range(2, 126))
    probs = [float((max_drop_24h > 1 / l).mean() * 100) for l in levs]
    safe_lev = max([l for l, p in zip(levs, probs) if p <= 0.5], default=2)

    result = {
        "percentile_table": pctl_table,
        "margin_table": margin_table,
        "cdf": {"x": cdf_x, "y": cdf_y},
        "leverage_curve": {"leverage": levs, "probs": probs, "safe_leverage": safe_lev},
    }
    save_json(result, "margin.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────
def main():
    t_start = time.time()
    print("=" * 60)
    print("  PERPETUAL FUTURES ANALYTICS — FULL ANALYSIS ENGINE")
    print("=" * 60)

    df = load_data()

    step0_overview(df)
    step1_returns(df)
    step2_vwap(df)
    step3_ofi(df)
    step4_volatility(df)
    step5_spread(df)
    step6_volume_profile(df)
    step7_funding(df)
    step8_mark_price(df)
    step9_risk(df)
    liq = step10_liquidation(df)
    step11_seasonality(df)
    step12_autocorrelation(df)
    step13_tail_risk(df)
    step14_margin(df, liq["liq_results"])

    elapsed = time.time() - t_start
    print(f"\n{'=' * 60}")
    print(f"  DONE — Total time: {elapsed:.0f}s ({elapsed / 60:.1f} min)")
    print(f"  Output files in: {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
