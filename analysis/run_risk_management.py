"""
Exchange Risk Management — Full Analysis Engine (Phase 2)

Builds on existing perp analysis JSON outputs to produce risk-management
data for the Next.js frontend.

Covers 5 core exchange risks for perpetual futures:
  Risk 1: Directional / Delta exposure
  Risk 2: Funding rate risk
  Risk 3: Liquidation cascade risk
  Risk 4: Basis risk (cross-exchange hedging)
  Risk 5: Liquidity / market impact risk

Reads pre-computed data from public/data/perp/*.json (avoids reloading
the full 1.76 GB CSV). Outputs ~10 JSON files to public/data/risk/.
"""

import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import norm

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
PERP_DATA_DIR = BASE_DIR / "public" / "data" / "perp"
OUTPUT_DIR = BASE_DIR / "public" / "data" / "risk"


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
            return [None if (isinstance(x, float) and (np.isnan(x) or np.isinf(x))) else x
                    for x in obj.tolist()]
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        return super().default(obj)


def _sanitize(obj):
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
    size_kb = path.stat().st_size / 1024
    print(f"  -> {filename} ({size_kb:.1f} KB)")


def load_perp_json(filename: str):
    path = PERP_DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Required file not found: {path}")
    with open(path) as f:
        return json.load(f)


# ──────────────────────────────────────────────────────────────────────
# DATA LOADING — from existing perp JSON files (fast, no CSV)
# ──────────────────────────────────────────────────────────────────────
def load_data() -> dict:
    print("Loading pre-computed data from perp analysis...")
    t0 = time.time()

    overview = load_perp_json("overview.json")
    volatility = load_perp_json("volatility.json")
    funding = load_perp_json("funding.json")
    spread = load_perp_json("spread.json")
    risk = load_perp_json("risk.json")

    daily_close = np.array([c for c in volatility["close"] if c is not None])
    dates = [d for d, c in zip(volatility["dates"], volatility["close"]) if c is not None]
    daily_returns = np.diff(np.log(daily_close))
    n_days = len(daily_returns)

    rvol_raw = volatility.get("rvol_cc", [])
    rvol_cc = np.array([v if v is not None else np.nan for v in rvol_raw])

    hourly_close = np.array(overview["close"])
    hourly_volume = np.array(overview["volume"])

    funding_rates = np.array(funding["funding_rate_pct"])
    funding_ts = funding["timestamps"]

    spread_by_hour = spread["by_hour"]

    elapsed = time.time() - t0
    print(f"  Loaded in {elapsed:.2f}s — {n_days} trading days, "
          f"price ${daily_close[0]:,.0f} → ${daily_close[-1]:,.0f}")

    return {
        "daily_close": daily_close,
        "daily_returns": daily_returns,
        "dates": dates,
        "dates_returns": dates[1:],
        "n_days": n_days,
        "current_price": float(daily_close[-1]),
        "avg_daily_volume": float(overview["avg_daily_volume"]),
        "hourly_close": hourly_close,
        "hourly_volume": hourly_volume,
        "rvol_cc": rvol_cc,
        "funding_rates": funding_rates,
        "funding_timestamps": funding_ts,
        "funding_stats": funding["stats"],
        "spread_by_hour": spread_by_hour,
        "spread_mean_bps": float(spread["stats"]["mean_bps"]),
        "var_table": risk["var_table"],
    }


# ──────────────────────────────────────────────────────────────────────
# STEP 0: PORTFOLIO SIMULATION
# ──────────────────────────────────────────────────────────────────────
def step0_portfolio(data: dict) -> dict:
    print("\n=== Step 0: Portfolio Simulation ===")
    np.random.seed(42)

    N = 500
    price = data["current_price"]
    daily_close = data["daily_close"]

    directions = np.random.choice(["long", "short"], N, p=[0.60, 0.40])

    sizes = np.random.pareto(1.5, N) * 0.08 + 0.01
    sizes = np.clip(sizes, 0.01, 50.0)

    lev_choices = [2, 3, 5, 10, 20, 25, 50, 75, 100, 125]
    lev_weights = [0.15, 0.12, 0.18, 0.20, 0.12, 0.08, 0.06, 0.04, 0.03, 0.02]
    leverages = np.random.choice(lev_choices, N, p=lev_weights)

    price_min, price_max = daily_close.min(), daily_close.max()
    spread_pct = 0.08
    entry_prices = price * (1 + np.random.normal(0, spread_pct / 2, N))
    entry_prices = np.clip(entry_prices, price_min * 0.95, price_max * 1.05)

    liq_prices = np.where(
        directions == "long",
        entry_prices * (1 - 1.0 / leverages),
        entry_prices * (1 + 1.0 / leverages),
    )

    pnl_pct = np.where(
        directions == "long",
        (price - entry_prices) / entry_prices * leverages * 100,
        (entry_prices - price) / entry_prices * leverages * 100,
    )

    positions = []
    for i in range(N):
        positions.append({
            "id": i,
            "direction": str(directions[i]),
            "size_btc": float(sizes[i]),
            "leverage": int(leverages[i]),
            "entry_price": float(entry_prices[i]),
            "liq_price": float(liq_prices[i]),
            "pnl_pct": float(pnl_pct[i]),
        })

    long_mask = directions == "long"
    total_long = float(sizes[long_mask].sum())
    total_short = float(sizes[~long_mask].sum())
    net_delta = total_long - total_short

    size_counts, size_edges = np.histogram(sizes, bins=30)
    lev_unique, lev_counts = np.unique(leverages, return_counts=True)

    top_20 = sorted(positions, key=lambda p: p["size_btc"], reverse=True)[:20]

    result = {
        "n_positions": N,
        "n_long": int(long_mask.sum()),
        "n_short": int((~long_mask).sum()),
        "total_long_btc": total_long,
        "total_short_btc": total_short,
        "net_delta_btc": float(net_delta),
        "net_delta_usd": float(net_delta * price),
        "current_price": price,
        "avg_size_btc": float(sizes.mean()),
        "median_size_btc": float(np.median(sizes)),
        "max_size_btc": float(sizes.max()),
        "avg_leverage": float(leverages.mean()),
        "size_histogram": {
            "edges": ((size_edges[:-1] + size_edges[1:]) / 2).tolist(),
            "counts": size_counts.tolist(),
        },
        "leverage_distribution": {
            "leverages": lev_unique.tolist(),
            "counts": lev_counts.tolist(),
        },
        "top_positions": top_20,
    }

    save_json(result, "portfolio.json")
    print(f"  {N} positions: {int(long_mask.sum())} long ({total_long:.1f} BTC), "
          f"{int((~long_mask).sum())} short ({total_short:.1f} BTC)")
    print(f"  Net delta: {net_delta:.1f} BTC (${net_delta * price:,.0f})")

    return {"positions": positions, "net_delta_snapshot": net_delta, "stats": result}


# ──────────────────────────────────────────────────────────────────────
# STEP 1: NET DELTA EXPOSURE
# ──────────────────────────────────────────────────────────────────────
def step1_delta_exposure(data: dict, portfolio: dict) -> dict:
    print("\n=== Step 1: Net Delta Exposure ===")
    np.random.seed(123)

    n = data["n_days"]
    daily_close = data["daily_close"][1:]
    daily_ret = data["daily_returns"]
    dates = data["dates_returns"]

    theta = 25.0
    kappa = 0.08
    sigma_d = 12.0
    jump_prob = 0.05
    jump_std = 25.0

    delta = np.zeros(n)
    delta[0] = portfolio["net_delta_snapshot"]

    for i in range(1, n):
        drift = kappa * (theta - delta[i - 1])
        diffusion = sigma_d * np.random.normal()
        jump = np.random.normal(0, jump_std) if np.random.random() < jump_prob else 0
        correlated = daily_ret[i] * 400
        delta[i] = delta[i - 1] + drift + diffusion + jump + correlated

    delta_usd = delta * daily_close

    exchange_pnl = np.zeros(n)
    for i in range(1, n):
        exchange_pnl[i] = -delta[i - 1] * (daily_close[i] - daily_close[i - 1])
    cum_pnl = np.cumsum(exchange_pnl)

    delta_hist_counts, delta_hist_edges = np.histogram(delta, bins=40)

    top10_pct = np.percentile(np.abs(delta), 90)
    top10_mask = np.abs(delta) >= top10_pct
    concentration = float(np.abs(delta[top10_mask]).sum() / np.abs(delta).sum() * 100)

    result = {
        "dates": dates,
        "net_delta_btc": delta.tolist(),
        "net_delta_usd": delta_usd.tolist(),
        "exchange_pnl_daily": exchange_pnl.tolist(),
        "exchange_pnl_cumulative": cum_pnl.tolist(),
        "stats": {
            "mean_delta_btc": float(delta.mean()),
            "std_delta_btc": float(delta.std()),
            "max_delta_btc": float(delta.max()),
            "min_delta_btc": float(delta.min()),
            "mean_delta_usd": float(delta_usd.mean()),
            "total_pnl": float(cum_pnl[-1]),
            "max_daily_loss": float(exchange_pnl.min()),
            "max_daily_gain": float(exchange_pnl.max()),
            "sharpe_exchange": float(exchange_pnl.mean() / max(exchange_pnl.std(), 1e-10)
                                     * np.sqrt(365)),
            "concentration_top10pct": concentration,
        },
        "delta_histogram": {
            "centers": ((delta_hist_edges[:-1] + delta_hist_edges[1:]) / 2).tolist(),
            "counts": delta_hist_counts.tolist(),
        },
    }

    save_json(result, "delta_exposure.json")
    print(f"  Mean Δ: {delta.mean():.1f} BTC, Std: {delta.std():.1f} BTC")
    print(f"  Cumulative exchange P&L: ${cum_pnl[-1]:,.0f}")

    return {"delta": delta, "exchange_pnl": exchange_pnl, "daily_close": daily_close}


# ──────────────────────────────────────────────────────────────────────
# STEP 2: PORTFOLIO VaR & STRESS TESTING
# ──────────────────────────────────────────────────────────────────────
def step2_portfolio_var(data: dict, delta_ts: dict) -> dict:
    print("\n=== Step 2: Portfolio VaR & Stress Tests ===")

    delta = delta_ts["delta"]
    pnl = delta_ts["exchange_pnl"]
    daily_ret = data["daily_returns"]
    daily_close = data["daily_close"][1:]
    price = data["current_price"]

    pnl_nonzero = pnl[pnl != 0]
    mu_pnl = float(pnl_nonzero.mean())
    sigma_pnl = float(pnl_nonzero.std())

    confidences = [0.90, 0.95, 0.99, 0.995, 0.999]
    var_table = []
    for cl in confidences:
        z = norm.ppf(cl)
        parametric_var = -mu_pnl + z * sigma_pnl
        historical_var = float(-np.percentile(pnl_nonzero, (1 - cl) * 100))
        tail = pnl_nonzero[pnl_nonzero <= np.percentile(pnl_nonzero, (1 - cl) * 100)]
        cvar = float(-tail.mean()) if len(tail) > 0 else historical_var * 1.2
        var_table.append({
            "confidence": float(cl),
            "parametric_var": float(parametric_var),
            "historical_var": historical_var,
            "cvar": cvar,
        })

    pnl_counts, pnl_edges = np.histogram(pnl_nonzero, bins=60, density=True)
    pnl_centers = ((pnl_edges[:-1] + pnl_edges[1:]) / 2).tolist()

    scenarios = [-0.05, -0.10, -0.15, -0.20, -0.30]
    current_delta = float(delta[-1])
    scenario_table = []
    for shock in scenarios:
        dollar_move = price * shock
        loss = -current_delta * dollar_move
        scenario_table.append({
            "shock_pct": shock * 100,
            "btc_move": float(dollar_move),
            "exchange_pnl": float(loss),
            "pnl_pct_of_exposure": float(loss / max(abs(current_delta * price), 1) * 100),
        })

    worst_1d_idx = np.argmin(daily_ret)
    worst_3d_rets = pd.Series(daily_ret).rolling(3).sum()
    worst_3d_idx = int(worst_3d_rets.idxmin()) if not worst_3d_rets.isna().all() else 0
    worst_7d_rets = pd.Series(daily_ret).rolling(7).sum()
    worst_7d_idx = int(worst_7d_rets.idxmin()) if not worst_7d_rets.isna().all() else 0

    stress_tests = [
        {"name": "Worst 1-Day", "return_pct": float(daily_ret[worst_1d_idx] * 100),
         "date": data["dates_returns"][worst_1d_idx],
         "exchange_loss": float(-current_delta * daily_close[worst_1d_idx] * daily_ret[worst_1d_idx])},
        {"name": "Worst 3-Day", "return_pct": float(worst_3d_rets.iloc[worst_3d_idx] * 100),
         "date": data["dates_returns"][worst_3d_idx],
         "exchange_loss": float(-current_delta * price * worst_3d_rets.iloc[worst_3d_idx])},
        {"name": "Worst 7-Day", "return_pct": float(worst_7d_rets.iloc[worst_7d_idx] * 100),
         "date": data["dates_returns"][worst_7d_idx],
         "exchange_loss": float(-current_delta * price * worst_7d_rets.iloc[worst_7d_idx])},
    ]

    lev_tiers = [2, 5, 10, 20, 50, 100]
    marginal_var = []
    daily_vol = float(np.std(daily_ret))
    for lev in lev_tiers:
        tier_exposure_pct = lev / sum(lev_tiers) * 100
        tier_var = abs(current_delta) * price * daily_vol * norm.ppf(0.99) * (lev / 10)
        marginal_var.append({
            "leverage_tier": f"{lev}x",
            "var_99": float(tier_var),
            "pct_of_total": float(tier_exposure_pct),
        })

    z99 = float(norm.ppf(0.99))
    parametric_var_decomposed = z99 * daily_vol * abs(current_delta) * price

    result = {
        "var_table": var_table,
        "pnl_distribution": {"centers": pnl_centers, "counts": pnl_counts.tolist()},
        "scenario_analysis": scenario_table,
        "stress_tests": stress_tests,
        "marginal_var": marginal_var,
        "var_decomposition": {
            "z_99": z99,
            "sigma_asset_daily": float(daily_vol),
            "sigma_asset_daily_pct": float(daily_vol * 100),
            "abs_delta_net_btc": float(abs(current_delta)),
            "abs_delta_net_usd": float(abs(current_delta) * price),
            "parametric_var_99_usd": float(parametric_var_decomposed),
            "formula_display": f"VaR₉₉% = {z99:.3f} × {daily_vol:.4f} × {abs(current_delta):.1f} BTC × ${price:,.0f}",
        },
        "stats": {
            "mean_daily_pnl": mu_pnl,
            "std_daily_pnl": sigma_pnl,
            "current_delta_btc": current_delta,
            "current_exposure_usd": float(current_delta * price),
            "daily_vol_pct": float(daily_vol * 100),
        },
    }

    save_json(result, "portfolio_var.json")
    print(f"  99% VaR (decomposed): Z×σ×|Δ|×P = {z99:.3f} × {daily_vol:.4f} × "
          f"{abs(current_delta):.1f} × ${price:,.0f} = ${parametric_var_decomposed:,.0f}")
    print(f"  99% VaR (historical): ${var_table[2]['historical_var']:,.0f}")
    print(f"  99% CVaR: ${var_table[2]['cvar']:,.0f}")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 3: FUNDING RATE RISK
# ──────────────────────────────────────────────────────────────────────
def step3_funding_risk(data: dict) -> dict:
    print("\n=== Step 3: Funding Rate Risk ===")

    rates = data["funding_rates"]
    timestamps = data["funding_timestamps"]
    n = len(rates)

    max_lag = 20
    acf = []
    for lag in range(max_lag + 1):
        if lag == 0:
            acf.append(1.0)
        else:
            c = np.corrcoef(rates[:-lag], rates[lag:])[0, 1]
            acf.append(float(c) if not np.isnan(c) else 0.0)

    signs = np.sign(rates)
    runs = []
    current_run_len = 1
    current_sign = signs[0]
    for i in range(1, n):
        if signs[i] == current_sign:
            current_run_len += 1
        else:
            runs.append({"sign": "positive" if current_sign > 0 else "negative",
                         "length": current_run_len})
            current_run_len = 1
            current_sign = signs[i]
    runs.append({"sign": "positive" if current_sign > 0 else "negative",
                 "length": current_run_len})

    run_lengths = [r["length"] for r in runs]
    pos_runs = [r["length"] for r in runs if r["sign"] == "positive"]
    neg_runs = [r["length"] for r in runs if r["sign"] == "negative"]

    skew_levels = [0.0, 0.25, 0.50, 0.75, 1.0]
    cashflow_scenarios = []
    for skew in skew_levels:
        net_delta_btc = skew * 50
        cashflow_8h = -net_delta_btc * rates / 100
        cumulative = np.cumsum(cashflow_8h)
        step = max(1, len(cumulative) // 200)
        cashflow_scenarios.append({
            "skew_label": f"{int(skew * 100)}% long bias",
            "net_delta_btc": net_delta_btc,
            "total_cashflow_btc": float(cumulative[-1]),
            "cumulative_series": cumulative[::step].tolist(),
            "timestamps": timestamps[::step],
        })

    p95 = float(np.percentile(rates, 95))
    p99 = float(np.percentile(rates, 99))
    stress_days = [3, 7, 14, 30]
    stress_scenarios = []
    for days in stress_days:
        periods = days * 3
        for rate_label, rate_val in [("95th pctl", p95), ("99th pctl", p99)]:
            net_delta_btc = 50
            total_cost = net_delta_btc * rate_val / 100 * periods
            stress_scenarios.append({
                "duration_days": days,
                "rate_scenario": rate_label,
                "rate_pct": rate_val,
                "total_cost_btc": float(total_cost),
                "total_cost_usd": float(total_cost * data["current_price"]),
            })

    # ── Funding Differential: your exchange vs hedge venue ──
    # Even after delta hedging, the funding rate DIFFERENTIAL between
    # your exchange and the hedge venue creates residual P&L.
    # Hedge venue has similar but not identical funding (different client
    # flow, clamp levels, payment timing).
    np.random.seed(321)
    hedge_venue_rates = rates + np.random.normal(0.001, 0.005, n)
    funding_diff = rates - hedge_venue_rates
    hedge_delta_btc = 50.0
    cum_diff_btc = np.cumsum(funding_diff / 100 * hedge_delta_btc)
    cum_diff_usd = cum_diff_btc * data["current_price"]
    step_diff = max(1, len(cum_diff_usd) // 200)
    diff_stats = {
        "mean_diff_pct": float(funding_diff.mean()),
        "std_diff_pct": float(funding_diff.std()),
        "cumulative_cost_btc": float(cum_diff_btc[-1]),
        "cumulative_cost_usd": float(cum_diff_usd[-1]),
        "annualized_cost_usd": float(cum_diff_usd[-1] * 365 * 3 / n),
    }

    # ── Funding VaR: 99% worst-case cumulative drain over 7 days ──
    # Roll a 7-day window (= 21 funding periods) of cumulative funding
    # cost for a hedged 50-BTC position on our exchange.
    periods_7d = 7 * 3
    cashflow_per_period = -hedge_delta_btc * rates / 100
    rolling_7d = pd.Series(cashflow_per_period).rolling(periods_7d).sum().dropna()
    funding_var_7d_99_btc = float(-np.percentile(rolling_7d, 1))
    funding_var_7d_99_usd = funding_var_7d_99_btc * data["current_price"]

    result = {
        "autocorrelation": {"lags": list(range(max_lag + 1)), "acf": acf},
        "regime_runs": runs[:50],
        "run_stats": {
            "mean_run_length": float(np.mean(run_lengths)),
            "max_run_length": int(max(run_lengths)),
            "mean_positive_run": float(np.mean(pos_runs)) if pos_runs else 0,
            "mean_negative_run": float(np.mean(neg_runs)) if neg_runs else 0,
            "max_positive_run": int(max(pos_runs)) if pos_runs else 0,
            "max_negative_run": int(max(neg_runs)) if neg_runs else 0,
            "pct_positive": float(data["funding_stats"]["pct_positive"]),
        },
        "cashflow_scenarios": cashflow_scenarios,
        "stress_scenarios": stress_scenarios,
        "funding_stats": data["funding_stats"],
        "funding_differential": {
            "timestamps": timestamps[::step_diff],
            "cumulative_cost_usd": cum_diff_usd[::step_diff].tolist(),
            "stats": diff_stats,
        },
        "funding_var": {
            "horizon_days": 7,
            "confidence": 0.99,
            "var_btc": funding_var_7d_99_btc,
            "var_usd": funding_var_7d_99_usd,
            "hedge_position_btc": hedge_delta_btc,
        },
    }

    save_json(result, "funding_risk.json")
    print(f"  ACF(1) = {acf[1]:.3f}, max positive run = {max(pos_runs) if pos_runs else 0}")
    print(f"  Funding VaR (7d, 99%): {funding_var_7d_99_btc:.4f} BTC "
          f"(${funding_var_7d_99_usd:,.0f})")
    print(f"  Funding differential (annualized): ${diff_stats['annualized_cost_usd']:,.0f}")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 4: LIQUIDATION CASCADE SIMULATION
# ──────────────────────────────────────────────────────────────────────
def step4_cascade(data: dict, portfolio: dict) -> dict:
    print("\n=== Step 4: Liquidation Cascade Simulation ===")

    positions = portfolio["positions"]
    price = data["current_price"]
    adv = data["avg_daily_volume"]
    daily_vol = float(np.std(data["daily_returns"]))

    def run_cascade(shock_pct: float):
        p = price * (1 + shock_pct)
        remaining = list(positions)
        rounds = []
        total_liq_btc = 0.0
        total_loss = 0.0

        for r in range(1, 30):
            liquidated = []
            for pos in remaining:
                if pos["direction"] == "long" and p <= pos["liq_price"]:
                    liquidated.append(pos)
                elif pos["direction"] == "short" and p >= pos["liq_price"]:
                    liquidated.append(pos)

            if not liquidated:
                break

            btc_liq = sum(pos["size_btc"] for pos in liquidated)
            long_btc = sum(pos["size_btc"] for pos in liquidated if pos["direction"] == "long")
            short_btc = sum(pos["size_btc"] for pos in liquidated if pos["direction"] == "short")
            net_sell = long_btc - short_btc

            round_loss = 0.0
            for pos in liquidated:
                if pos["direction"] == "long":
                    round_loss += max(pos["liq_price"] - p, 0) * pos["size_btc"]
                else:
                    round_loss += max(p - pos["liq_price"], 0) * pos["size_btc"]

            impact = daily_vol * np.sqrt(abs(net_sell) / max(adv, 1)) * 2.5
            price_change = -np.sign(net_sell) * impact * p
            p += price_change

            total_liq_btc += btc_liq
            total_loss += round_loss

            rounds.append({
                "round": r,
                "n_liquidated": len(liquidated),
                "btc_liquidated": float(btc_liq),
                "round_loss": float(round_loss),
                "price_after": float(p),
                "impact_pct": float(impact * 100),
            })

            remaining = [pos for pos in remaining if pos not in liquidated]

        return {
            "shock_pct": float(shock_pct * 100),
            "initial_price": float(price * (1 + shock_pct)),
            "final_price": float(p),
            "total_drop_pct": float((p / price - 1) * 100),
            "amplification": float(abs((p / price - 1) / shock_pct)) if shock_pct != 0 else 1.0,
            "n_rounds": len(rounds),
            "total_liquidated": sum(rd["n_liquidated"] for rd in rounds),
            "total_btc_liquidated": float(total_liq_btc),
            "total_loss_usd": float(total_loss),
            "cascade_details": rounds,
        }

    down_shocks = [-0.01, -0.02, -0.03, -0.05, -0.07, -0.10, -0.15, -0.20]
    up_shocks = [0.01, 0.02, 0.03, 0.05, 0.07, 0.10, 0.15, 0.20]

    down_results = [run_cascade(s) for s in down_shocks]
    up_results = [run_cascade(s) for s in up_shocks]

    result = {
        "down_cascades": down_results,
        "up_cascades": up_results,
        "current_price": price,
        "n_positions": len(positions),
    }

    save_json(result, "cascade.json")

    worst_down = max(down_results, key=lambda x: x["total_loss_usd"])
    print(f"  Worst downward cascade ({worst_down['shock_pct']:.0f}%): "
          f"{worst_down['total_liquidated']} positions, "
          f"${worst_down['total_loss_usd']:,.0f} loss, "
          f"amplification {worst_down['amplification']:.2f}x")

    return {"down_cascades": down_results, "up_cascades": up_results}


# ──────────────────────────────────────────────────────────────────────
# STEP 5: INSURANCE FUND SIZING
# ──────────────────────────────────────────────────────────────────────
def step5_insurance_fund(data: dict, cascade_results: dict, portfolio: dict) -> dict:
    print("\n=== Step 5: Insurance Fund Sizing ===")

    down = cascade_results["down_cascades"]
    positions = portfolio["positions"]
    price = data["current_price"]
    daily_ret = data["daily_returns"]

    losses = np.array([c["total_loss_usd"] for c in down])
    shocks = np.array([c["shock_pct"] for c in down])

    confidence_levels = [0.95, 0.99, 0.995, 0.999]
    fund_requirements = []
    for cl in confidence_levels:
        var_daily = float(-np.percentile(daily_ret, (1 - cl) * 100))
        matching = [c for c in down if abs(c["shock_pct"]) >= var_daily * 100 * 0.8]
        expected_loss = float(matching[0]["total_loss_usd"]) if matching else float(losses.max())
        fund_requirements.append({
            "confidence": float(cl),
            "daily_var_pct": float(var_daily * 100),
            "expected_cascade_loss": expected_loss,
            "recommended_fund_usd": float(expected_loss * 1.5),
        })

    liq_penalty_pct = 0.5
    avg_daily_liq_volume = float(np.mean([abs(d["total_btc_liquidated"]) for d in down]) * 0.1)
    daily_income = avg_daily_liq_volume * price * liq_penalty_pct / 100

    fund_99 = fund_requirements[1]["recommended_fund_usd"]
    n_days_data = data["n_days"]

    fund_balance = np.zeros(n_days_data)
    fund_balance[0] = fund_99
    daily_drawdowns = []

    for i in range(1, n_days_data):
        ret = daily_ret[i]
        income = daily_income

        cascade_loss = 0.0
        for c in down:
            if abs(ret * 100) >= abs(c["shock_pct"]) * 0.8:
                cascade_loss = c["total_loss_usd"] * 0.3
                break

        fund_balance[i] = fund_balance[i - 1] + income - cascade_loss
        if cascade_loss > 0:
            daily_drawdowns.append({"day": i, "loss": float(cascade_loss)})

    dates_for_fund = data["dates_returns"]

    result = {
        "fund_requirements": fund_requirements,
        "fund_balance_simulation": {
            "dates": dates_for_fund,
            "balance": fund_balance.tolist(),
            "initial_fund": float(fund_99),
            "final_fund": float(fund_balance[-1]),
        },
        "income_model": {
            "daily_liq_penalty_income": float(daily_income),
            "monthly_income": float(daily_income * 30),
            "annual_income": float(daily_income * 365),
        },
        "sustainability": {
            "n_drawdown_events": len(daily_drawdowns),
            "total_drawdowns": float(sum(d["loss"] for d in daily_drawdowns)),
            "total_income": float(daily_income * n_days_data),
            "net_fund_change": float(fund_balance[-1] - fund_99),
            "survived": bool(fund_balance.min() > 0),
            "min_balance": float(fund_balance.min()),
        },
    }

    save_json(result, "insurance_fund.json")
    print(f"  99% fund requirement: ${fund_99:,.0f}")
    print(f"  Fund survived: {fund_balance.min() > 0}, min balance: ${fund_balance.min():,.0f}")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 6: BASIS RISK
# ──────────────────────────────────────────────────────────────────────
def step6_basis_risk(data: dict) -> dict:
    print("\n=== Step 6: Basis Risk ===")
    np.random.seed(456)

    n = data["n_days"]
    dates = data["dates_returns"]
    daily_close = data["daily_close"][1:]

    basis_kappa = 0.3
    basis_theta = 0.0
    basis_sigma = 0.0003
    basis = np.zeros(n)

    for i in range(1, n):
        basis[i] = (basis[i - 1]
                     + basis_kappa * (basis_theta - basis[i - 1])
                     + basis_sigma * np.random.normal())

    basis_bps = basis * 10000
    hedge_price = daily_close * (1 + basis)

    net_delta_approx = 30.0
    hedge_pnl = np.zeros(n)
    basis_leakage = np.zeros(n)
    for i in range(1, n):
        actual_return = daily_close[i] - daily_close[i - 1]
        hedge_return = hedge_price[i] - hedge_price[i - 1]
        hedge_pnl[i] = net_delta_approx * (actual_return - hedge_return)
        basis_leakage[i] = net_delta_approx * (actual_return - hedge_return)
    cum_leakage = np.cumsum(basis_leakage)

    basis_hist_counts, basis_hist_edges = np.histogram(basis_bps, bins=40)

    basis_acf = []
    for lag in range(11):
        if lag == 0:
            basis_acf.append(1.0)
        else:
            c = np.corrcoef(basis_bps[:-lag], basis_bps[lag:])[0, 1]
            basis_acf.append(float(c) if not np.isnan(c) else 0.0)

    daily_vol = float(np.std(data["daily_returns"]))
    basis_vol = float(np.std(basis))
    var_99_price = daily_vol * norm.ppf(0.99)
    var_99_basis = basis_vol * norm.ppf(0.99)
    var_99_combined = np.sqrt(var_99_price ** 2 + var_99_basis ** 2)

    result = {
        "dates": dates,
        "basis_bps": basis_bps.tolist(),
        "cumulative_leakage_usd": cum_leakage.tolist(),
        "stats": {
            "mean_basis_bps": float(basis_bps.mean()),
            "std_basis_bps": float(basis_bps.std()),
            "max_abs_basis_bps": float(np.abs(basis_bps).max()),
            "total_leakage_usd": float(cum_leakage[-1]),
            "annualized_leakage_usd": float(cum_leakage[-1] * 365 / n),
        },
        "basis_histogram": {
            "centers": ((basis_hist_edges[:-1] + basis_hist_edges[1:]) / 2).tolist(),
            "counts": basis_hist_counts.tolist(),
        },
        "autocorrelation": {"lags": list(range(11)), "acf": basis_acf},
        "var_decomposition": {
            "price_var_99_pct": float(var_99_price * 100),
            "basis_var_99_pct": float(var_99_basis * 100),
            "combined_var_99_pct": float(var_99_combined * 100),
            "basis_share_pct": float(var_99_basis ** 2 / max(var_99_combined ** 2, 1e-20) * 100),
        },
    }

    save_json(result, "basis_risk.json")
    print(f"  Mean basis: {basis_bps.mean():.2f} bps, std: {basis_bps.std():.2f} bps")
    print(f"  Cumulative hedge leakage: ${cum_leakage[-1]:,.0f}")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 7: MARKET IMPACT & EXECUTION COST
# ──────────────────────────────────────────────────────────────────────
def step7_market_impact(data: dict) -> dict:
    print("\n=== Step 7: Market Impact & Execution Cost ===")

    adv = data["avg_daily_volume"]
    daily_vol = float(np.std(data["daily_returns"]))
    price = data["current_price"]
    spread_bps = data["spread_mean_bps"]

    IMPACT_CONST = 2.0
    trade_sizes = [1, 5, 10, 25, 50, 100, 250, 500, 1000]
    impact_curve = []
    for q in trade_sizes:
        impact_pct = daily_vol * np.sqrt(q / adv) * IMPACT_CONST * 100
        impact_usd = impact_pct / 100 * price * q
        spread_cost = spread_bps / 10000 * price * q
        total_cost = impact_usd + spread_cost
        impact_curve.append({
            "trade_size_btc": q,
            "impact_bps": float(impact_pct * 100),
            "impact_usd": float(impact_usd),
            "spread_cost_usd": float(spread_cost),
            "total_cost_usd": float(total_cost),
            "cost_pct": float(total_cost / (price * q) * 100),
        })

    hourly_spreads = data["spread_by_hour"]["spread"]
    hours = list(range(24))
    impact_by_hour = []
    hourly_vol = data["hourly_volume"]
    avg_hour_vol = float(np.mean(hourly_vol)) if len(hourly_vol) > 0 else adv / 24
    for h in hours:
        h_spread = hourly_spreads[h] if h < len(hourly_spreads) else spread_bps
        h_vol_factor = 1.0
        impact = daily_vol * np.sqrt(50 / max(adv * h_vol_factor, 1)) * IMPACT_CONST * 100
        total = impact + h_spread / 100
        impact_by_hour.append({
            "hour": h,
            "spread_bps": float(h_spread),
            "impact_bps_50btc": float(impact * 100),
            "total_cost_bps": float(total * 100),
        })

    trade_btc = 100
    n_slices_options = [1, 2, 4, 8, 12, 24]
    execution_schedule = []
    for n_slices in n_slices_options:
        slice_size = trade_btc / n_slices
        total_impact = 0.0
        for _ in range(n_slices):
            imp = daily_vol * np.sqrt(slice_size / adv) * IMPACT_CONST
            total_impact += imp * price * slice_size
        total_spread = spread_bps / 10000 * price * trade_btc
        execution_schedule.append({
            "n_slices": n_slices,
            "slice_size_btc": float(slice_size),
            "total_impact_usd": float(total_impact),
            "spread_cost_usd": float(total_spread),
            "total_cost_usd": float(total_impact + total_spread),
            "savings_vs_single_pct": 0.0,
        })
    if execution_schedule:
        single_cost = execution_schedule[0]["total_cost_usd"]
        for es in execution_schedule:
            es["savings_vs_single_pct"] = float(
                (1 - es["total_cost_usd"] / max(single_cost, 1)) * 100)

    result = {
        "impact_curve": impact_curve,
        "impact_by_hour": impact_by_hour,
        "execution_schedule": execution_schedule,
        "parameters": {
            "avg_daily_volume_btc": float(adv),
            "daily_volatility_pct": float(daily_vol * 100),
            "spread_bps": float(spread_bps),
            "impact_constant": IMPACT_CONST,
            "current_price": price,
        },
    }

    save_json(result, "market_impact.json")
    print(f"  Impact for 100 BTC: {impact_curve[5]['impact_bps']:.1f} bps "
          f"(${impact_curve[5]['total_cost_usd']:,.0f})")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 8: HEDGE SIMULATION BACKTEST
# ──────────────────────────────────────────────────────────────────────
def step8_hedge_backtest(data: dict, delta_ts: dict) -> dict:
    print("\n=== Step 8: Hedge Simulation Backtest ===")
    np.random.seed(789)

    delta = delta_ts["delta"]
    daily_close = delta_ts["daily_close"]
    daily_ret = data["daily_returns"]
    n = len(delta)
    price = data["current_price"]
    adv = data["avg_daily_volume"]
    daily_vol = float(np.std(daily_ret))
    spread_bps = data["spread_mean_bps"]

    basis_noise = np.random.normal(0, 0.0002, n)
    hedge_returns = daily_ret + np.diff(np.concatenate([[0], basis_noise]))[:n]

    hedge_ratios = [0.0, 0.50, 0.75, 0.90, 1.00]
    rebalance_intervals = [1, 4, 8, 24]

    all_scenarios = []
    for hr in hedge_ratios:
        for rb_hrs in rebalance_intervals:
            rb_days = max(rb_hrs / 24, 1)
            rb_int = max(int(rb_days), 1)

            hedge_pos = np.zeros(n)
            unhedged_pnl = np.zeros(n)
            hedged_pnl = np.zeros(n)
            hedge_cost = np.zeros(n)

            for i in range(1, n):
                if i % rb_int == 0 or i == 1:
                    new_hedge = hr * delta[i]
                    trade_size = abs(new_hedge - hedge_pos[i - 1])
                    impact = daily_vol * np.sqrt(trade_size / max(adv, 1)) * 2.0
                    spread_cost_val = spread_bps / 10000 * abs(trade_size) * daily_close[i]
                    impact_cost = impact * abs(trade_size) * daily_close[i]
                    hedge_cost[i] = spread_cost_val + impact_cost
                    hedge_pos[i] = new_hedge
                else:
                    hedge_pos[i] = hedge_pos[i - 1]

                price_move = daily_close[i] - daily_close[i - 1]
                unhedged_pnl[i] = -delta[i - 1] * price_move
                hedge_revenue = hedge_pos[i - 1] * (daily_close[i - 1] * hedge_returns[i])
                hedged_pnl[i] = unhedged_pnl[i] + hedge_revenue - hedge_cost[i]

            cum_unhedged = np.cumsum(unhedged_pnl)
            cum_hedged = np.cumsum(hedged_pnl)
            cum_cost = np.cumsum(hedge_cost)

            vol_unhedged = float(np.std(unhedged_pnl[1:]))
            vol_hedged = float(np.std(hedged_pnl[1:]))

            scenario = {
                "hedge_ratio": float(hr),
                "rebalance_hours": rb_hrs,
                "total_unhedged_pnl": float(cum_unhedged[-1]),
                "total_hedged_pnl": float(cum_hedged[-1]),
                "total_hedge_cost": float(cum_cost[-1]),
                "vol_unhedged": vol_unhedged,
                "vol_hedged": vol_hedged,
                "vol_reduction_pct": float((1 - vol_hedged / max(vol_unhedged, 1)) * 100),
                "max_drawdown_unhedged": float(
                    (cum_unhedged - np.maximum.accumulate(cum_unhedged)).min()),
                "max_drawdown_hedged": float(
                    (cum_hedged - np.maximum.accumulate(cum_hedged)).min()),
            }
            all_scenarios.append(scenario)

    best_idx = 0
    best_90 = [s for s in all_scenarios if s["hedge_ratio"] == 0.90 and s["rebalance_hours"] == 8]
    main_scenario_hr = 0.90
    main_scenario_rb = 8

    main = None
    for hr in hedge_ratios:
        for rb_hrs in rebalance_intervals:
            if hr == main_scenario_hr and rb_hrs == main_scenario_rb:
                rb_int = max(int(max(rb_hrs / 24, 1)), 1)
                hedge_pos = np.zeros(n)
                unhedged_pnl_main = np.zeros(n)
                hedged_pnl_main = np.zeros(n)
                cost_main = np.zeros(n)
                for i in range(1, n):
                    if i % rb_int == 0 or i == 1:
                        new_hedge = hr * delta[i]
                        trade_size = abs(new_hedge - hedge_pos[i - 1])
                        impact = daily_vol * np.sqrt(trade_size / max(adv, 1)) * 2.0
                        cost_main[i] = (spread_bps / 10000 * abs(trade_size) * daily_close[i]
                                        + impact * abs(trade_size) * daily_close[i])
                        hedge_pos[i] = new_hedge
                    else:
                        hedge_pos[i] = hedge_pos[i - 1]
                    price_move = daily_close[i] - daily_close[i - 1]
                    unhedged_pnl_main[i] = -delta[i - 1] * price_move
                    hedged_pnl_main[i] = (unhedged_pnl_main[i]
                                          + hedge_pos[i - 1] * daily_close[i - 1] * hedge_returns[i]
                                          - cost_main[i])
                main = {
                    "dates": data["dates_returns"],
                    "unhedged_cumulative": np.cumsum(unhedged_pnl_main).tolist(),
                    "hedged_cumulative": np.cumsum(hedged_pnl_main).tolist(),
                    "cost_cumulative": np.cumsum(cost_main).tolist(),
                }
                break
        if main:
            break

    result = {
        "scenarios": all_scenarios,
        "main_scenario": main,
        "main_params": {"hedge_ratio": main_scenario_hr, "rebalance_hours": main_scenario_rb},
    }

    save_json(result, "hedge_backtest.json")
    if best_90:
        b = best_90[0]
        print(f"  90% hedge / 8h rebalance: vol reduction {b['vol_reduction_pct']:.1f}%, "
              f"cost ${b['total_hedge_cost']:,.0f}")

    return result


# ──────────────────────────────────────────────────────────────────────
# STEP 9: INTEGRATED RISK SUMMARY
# ──────────────────────────────────────────────────────────────────────
def step9_risk_summary(data: dict, var_result: dict, funding_result: dict,
                       cascade_results: dict, basis_result: dict,
                       impact_result: dict, hedge_result: dict) -> dict:
    print("\n=== Step 9: Integrated Risk Summary ===")

    price = data["current_price"]
    n_days = data["n_days"]

    delta_var = var_result["var_table"][2]["historical_var"]

    worst_cascade = max(cascade_results["down_cascades"],
                        key=lambda x: x["total_loss_usd"])
    cascade_loss = worst_cascade["total_loss_usd"]

    funding_stress = max(funding_result["stress_scenarios"],
                         key=lambda x: x["total_cost_usd"])
    funding_risk_usd = funding_stress["total_cost_usd"]

    basis_annual = abs(basis_result["stats"]["annualized_leakage_usd"])

    impact_100btc = 0
    for ic in impact_result["impact_curve"]:
        if ic["trade_size_btc"] == 100:
            impact_100btc = ic["total_cost_usd"]
            break
    liquidity_annual = impact_100btc * 252

    risks = {
        "delta": delta_var,
        "cascade": cascade_loss * 0.01,
        "funding": funding_risk_usd,
        "basis": basis_annual,
        "liquidity": liquidity_annual,
    }
    total_risk = sum(risks.values())
    risk_budget = {k: float(v / max(total_risk, 1) * 100) for k, v in risks.items()}

    spread_rev = data["spread_mean_bps"] / 10000 * price * data["avg_daily_volume"] * 365
    funding_rev = abs(data["funding_stats"]["annualized_yield_pct"]) / 100 * price * 50 * 365
    total_revenue = spread_rev + funding_rev

    best_hedged = [s for s in hedge_result["scenarios"]
                   if s["hedge_ratio"] == 0.90 and s["rebalance_hours"] == 8]
    hedge_cost_annual = (best_hedged[0]["total_hedge_cost"] * 365 / n_days
                         if best_hedged else 0)

    # ── P&L Attribution (5-way decomposition) ──
    # Splits daily exchange P&L into its component sources so you
    # can see exactly WHERE money is made / lost.
    ann = 365 / n_days
    spread_income = data["spread_mean_bps"] / 10000 * price * data["avg_daily_volume"] * n_days
    hedging_slippage = best_hedged[0]["total_hedge_cost"] if best_hedged else 0
    funding_carry_raw = funding_result.get("funding_differential", {}).get("stats", {})
    funding_carry = abs(funding_carry_raw.get("cumulative_cost_usd", 0))
    liq_shortfalls = cascade_loss * 0.05
    basis_drift = abs(basis_result["stats"]["total_leakage_usd"])

    pnl_components = {
        "labels": [
            "Spread / Fee Income",
            "Delta Hedging Slippage",
            "Funding Carry (Differential)",
            "Liquidation Shortfalls",
            "Basis Drift",
        ],
        "values": [
            float(spread_income),
            float(-hedging_slippage),
            float(-funding_carry),
            float(-liq_shortfalls),
            float(-basis_drift),
        ],
        "annualized": [
            float(spread_income * ann),
            float(-hedging_slippage * ann),
            float(-funding_carry * ann),
            float(-liq_shortfalls * ann),
            float(-basis_drift * ann),
        ],
        "net_pnl": float(spread_income - hedging_slippage - funding_carry
                         - liq_shortfalls - basis_drift),
        "net_pnl_annualized": float((spread_income - hedging_slippage - funding_carry
                                     - liq_shortfalls - basis_drift) * ann),
    }

    result = {
        "risk_budget": {
            "labels": ["Delta / Directional", "Liquidation Cascade",
                       "Funding Rate", "Basis (Hedging)", "Liquidity / Impact"],
            "values": [risk_budget["delta"], risk_budget["cascade"],
                       risk_budget["funding"], risk_budget["basis"],
                       risk_budget["liquidity"]],
            "usd_values": [float(risks["delta"]), float(risks["cascade"]),
                           float(risks["funding"]), float(risks["basis"]),
                           float(risks["liquidity"])],
        },
        "total_risk_usd": float(total_risk),
        "pnl_attribution": pnl_components,
        "revenue_model": {
            "spread_revenue_annual": float(spread_rev),
            "funding_revenue_annual": float(funding_rev),
            "total_revenue_annual": float(total_revenue),
            "hedge_cost_annual": float(hedge_cost_annual),
            "net_revenue_annual": float(total_revenue - hedge_cost_annual),
            "risk_return_ratio": float(total_revenue / max(total_risk, 1)),
        },
        "key_metrics": {
            "current_price": price,
            "daily_var_99": float(delta_var),
            "worst_cascade_loss": float(cascade_loss),
            "max_funding_stress": float(funding_risk_usd),
            "annual_basis_leakage": float(basis_annual),
            "hedge_effectiveness": float(
                best_hedged[0]["vol_reduction_pct"] if best_hedged else 0),
        },
        "recommendations": [
            {
                "risk": "Delta",
                "action": "Maintain 85-95% hedge ratio on external venue",
                "priority": "CRITICAL",
            },
            {
                "risk": "Cascade",
                "action": f"Size insurance fund at ${cascade_loss * 0.015:,.0f} minimum (99% confidence)",
                "priority": "HIGH",
            },
            {
                "risk": "Funding",
                "action": "Implement dynamic funding rate that adjusts with position skew",
                "priority": "MEDIUM",
            },
            {
                "risk": "Basis",
                "action": "Diversify hedging across 2-3 venues to reduce single-venue basis",
                "priority": "MEDIUM",
            },
            {
                "risk": "Liquidity",
                "action": "Use TWAP execution with 4-8 slices for hedge rebalancing",
                "priority": "LOW",
            },
        ],
    }

    save_json(result, "risk_summary.json")
    print(f"  Total annualized risk: ${total_risk:,.0f}")
    print(f"  Risk/Return ratio: {total_revenue / max(total_risk, 1):.2f}x")

    return result


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────
def main():
    t_start = time.time()
    print("=" * 60)
    print("  EXCHANGE RISK MANAGEMENT — PHASE 2 ANALYSIS ENGINE")
    print("=" * 60)

    data = load_data()

    port = step0_portfolio(data)
    delta_ts = step1_delta_exposure(data, port)
    var_res = step2_portfolio_var(data, delta_ts)
    fund_res = step3_funding_risk(data)
    cascade_res = step4_cascade(data, port)
    step5_insurance_fund(data, cascade_res, port)
    basis_res = step6_basis_risk(data)
    impact_res = step7_market_impact(data)
    hedge_res = step8_hedge_backtest(data, delta_ts)
    step9_risk_summary(data, var_res, fund_res, cascade_res,
                       basis_res, impact_res, hedge_res)

    elapsed = time.time() - t_start
    print(f"\n{'=' * 60}")
    print(f"  DONE — Total time: {elapsed:.1f}s")
    print(f"  Output files in: {OUTPUT_DIR}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
