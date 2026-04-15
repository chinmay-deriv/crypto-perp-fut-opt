"""
Options Risk Management — Data Generator
==========================================
Phase 1: Pricing Engine validation
Phase 2: Greeks Calculator (Delta, Gamma, Vega, Theta, Vanna, Volga)
Phase 3: Portfolio Aggregation, Hedging Strategies, Dynamic Sim, Stress Tests
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy.stats import norm as sp_norm

sys.path.insert(0, str(Path(__file__).parent))
from pricing_engine import (
    load_calibration, price_grid, price_option,
    price_call_bates, price_put_bates, bs_call, bs_put, bs_implied_vol,
)
from greeks_engine import compute_greeks_grid, compute_smile_risk_grid

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data" / "options-risk"


def save_json(data: dict, name: str):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"  Saved {path.name} ({path.stat().st_size / 1024:.1f} KB)")


def load_existing_pricing() -> dict:
    p = Path(__file__).resolve().parent.parent / "public" / "data" / "pricing.json"
    with open(p) as f:
        return json.load(f)


# ──────────────────────────────────────────────────────────────────────
# PHASE 1.1: Cross-validate against existing prices
# ──────────────────────────────────────────────────────────────────────
def step1_cross_validation(params: dict) -> dict:
    print("\n=== Step 1: Cross-Validation Against Existing Pricing ===")
    ref = load_existing_pricing()
    S = ref["spot"]
    r = ref["risk_free_rate"]
    strikes = np.array(ref["strikes"])
    moneyness = np.array(ref["moneyness"])
    maturities = ref["maturities"]

    validation = {}
    models = ["bates", "heston", "merton"]
    ref_model_map = {"bates": "Bates", "heston": "Heston", "merton": "Merton"}

    for model in models:
        model_results = {}
        for mat_label, T in maturities.items():
            print(f"  {model.capitalize()} — {mat_label} (T={T:.6f}yr)...")
            ref_data = ref["mc_prices"][ref_model_map[model]].get(mat_label)
            if not ref_data:
                continue

            new = price_grid(S, strikes, float(T), r, params, model=model,
                             n_paths=100_000, seed=42)

            ref_calls = np.array(ref_data["calls"])
            ref_puts = np.array(ref_data["puts"])
            new_calls = np.array(new["calls"])
            new_puts = np.array(new["puts"])

            call_diffs = new_calls - ref_calls
            put_diffs = new_puts - ref_puts

            safe_ref_c = np.where(ref_calls > 1, ref_calls, 1)
            safe_ref_p = np.where(ref_puts > 1, ref_puts, 1)
            call_pct = (call_diffs / safe_ref_c) * 100
            put_pct = (put_diffs / safe_ref_p) * 100

            model_results[mat_label] = {
                "ref_calls": ref_calls.tolist(),
                "ref_puts": ref_puts.tolist(),
                "new_calls": new_calls.tolist(),
                "new_puts": new_puts.tolist(),
                "call_diff_abs": call_diffs.tolist(),
                "put_diff_abs": put_diffs.tolist(),
                "call_diff_pct": call_pct.tolist(),
                "put_diff_pct": put_pct.tolist(),
                "stats": {
                    "call_mae": float(np.mean(np.abs(call_diffs))),
                    "put_mae": float(np.mean(np.abs(put_diffs))),
                    "call_max_abs_err": float(np.max(np.abs(call_diffs))),
                    "put_max_abs_err": float(np.max(np.abs(put_diffs))),
                    "call_mean_pct_err": float(np.mean(np.abs(call_pct))),
                    "put_mean_pct_err": float(np.mean(np.abs(put_pct))),
                    "call_rmse": float(np.sqrt(np.mean(call_diffs**2))),
                    "put_rmse": float(np.sqrt(np.mean(put_diffs**2))),
                },
            }

        validation[model] = model_results

    result = {
        "spot": S,
        "risk_free_rate": r,
        "moneyness": moneyness.tolist(),
        "strikes": strikes.tolist(),
        "maturities": maturities,
        "models": models,
        "ref_model_names": ref_model_map,
        "ref_n_paths": 50_000,
        "new_n_paths": 100_000,
        "validation": validation,
    }
    save_json(result, "cross_validation.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# PHASE 1.2: Model selection logic demonstration
# ──────────────────────────────────────────────────────────────────────
def step2_model_selection(params: dict) -> dict:
    print("\n=== Step 2: Model Selection Logic ===")
    S = params["spot"]
    r = 0.04
    K_atm = round(S)

    maturities = {
        "1hr": 1 / (365.25 * 24),
        "4hr": 4 / (365.25 * 24),
        "12hr": 12 / (365.25 * 24),
        "1day": 1 / 365.25,
        "3day": 3 / 365.25,
        "7day": 7 / 365.25,
        "14day": 14 / 365.25,
        "30day": 30 / 365.25,
    }

    T_threshold = 1 / 365.25

    comparison = []
    for mat_label, T in maturities.items():
        row = {"maturity": mat_label, "T_years": float(T), "T_hours": float(T * 365.25 * 24)}

        recommended = "merton" if T < T_threshold else "heston"
        row["recommended_backup"] = recommended

        for model in ["bates", "heston", "merton"]:
            c = price_option(S, K_atm, T, r, params, is_call=True, model=model,
                             n_paths=100_000, seed=42)
            p = price_option(S, K_atm, T, r, params, is_call=False, model=model,
                             n_paths=100_000, seed=42)
            row[f"{model}_call"] = c
            row[f"{model}_put"] = p

        comparison.append(row)
        primary_c = row["bates_call"]
        backup_c = row[f"{recommended}_call"]
        spread = abs(primary_c - backup_c) / max(primary_c, 1) * 100
        row["primary_backup_spread_pct"] = float(spread)

        print(f"  {mat_label:>5}: Bates call=${primary_c:,.2f} | "
              f"Backup ({recommended}) call=${backup_c:,.2f} | spread={spread:.1f}%")

    result = {
        "spot": S,
        "strike_atm": K_atm,
        "risk_free_rate": r,
        "T_threshold_days": 1.0,
        "primary_model": "bates",
        "backup_short": "merton",
        "backup_long": "heston",
        "comparison": comparison,
        "selection_rule": (
            "Bates (primary) for all pricing/Greeks. "
            "Merton backup for T < 1 day (captures jumps, no stochastic vol overhead). "
            "Heston backup for T ≥ 1 day (captures vol clustering, no jump overhead). "
            "If Bates and backup diverge > 10%, flag for manual review."
        ),
    }
    save_json(result, "model_selection.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# PHASE 1.3: Pricing surface (Bates primary)
# ──────────────────────────────────────────────────────────────────────
def step3_pricing_surface(params: dict) -> dict:
    print("\n=== Step 3: Bates Pricing Surface ===")
    S = params["spot"]
    r = 0.04

    moneyness_grid = np.arange(0.90, 1.105, 0.01)
    strikes = S * moneyness_grid
    maturities = {
        "1hr": 1 / (365.25 * 24),
        "4hr": 4 / (365.25 * 24),
        "1day": 1 / 365.25,
        "3day": 3 / 365.25,
        "7day": 7 / 365.25,
        "14day": 14 / 365.25,
        "30day": 30 / 365.25,
    }

    surface_calls = {}
    surface_puts = {}
    iv_surface = {}

    for mat_label, T in maturities.items():
        print(f"  Surface — {mat_label}...")
        grid = price_grid(S, strikes, float(T), r, params, model="bates",
                          n_paths=100_000, seed=42)
        surface_calls[mat_label] = grid["calls"]
        surface_puts[mat_label] = grid["puts"]

        ivs = []
        for i, K in enumerate(strikes):
            iv = bs_implied_vol(grid["calls"][i], S, float(K), float(T), r, is_call=True)
            ivs.append(iv if iv is not None else None)
        iv_surface[mat_label] = ivs

    result = {
        "spot": S,
        "risk_free_rate": r,
        "moneyness": moneyness_grid.tolist(),
        "strikes": strikes.tolist(),
        "maturities": {k: float(v) for k, v in maturities.items()},
        "calls": surface_calls,
        "puts": surface_puts,
        "implied_vol": iv_surface,
    }
    save_json(result, "pricing_surface.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# PHASE 1.4: Put-Call Parity Check
# ──────────────────────────────────────────────────────────────────────
def step4_parity_check(params: dict) -> dict:
    """
    Verify put-call parity: C - P = S - K*exp(-rT)
    Any violation indicates MC noise or a bug.
    """
    print("\n=== Step 4: Put-Call Parity Verification ===")
    S = params["spot"]
    r = 0.04
    moneyness_grid = np.arange(0.90, 1.105, 0.01)
    strikes = S * moneyness_grid
    maturities = {
        "1day": 1 / 365.25,
        "7day": 7 / 365.25,
        "30day": 30 / 365.25,
    }

    parity_results = {}
    for mat_label, T in maturities.items():
        grid = price_grid(S, strikes, float(T), r, params, model="bates",
                          n_paths=100_000, seed=42)

        theoretical = [S - float(K) * np.exp(-r * float(T)) for K in strikes]
        mc_diff = [c - p for c, p in zip(grid["calls"], grid["puts"])]
        violations = [abs(mc_diff[i] - theoretical[i]) for i in range(len(strikes))]

        parity_results[mat_label] = {
            "theoretical_c_minus_p": theoretical,
            "mc_c_minus_p": mc_diff,
            "abs_violation": violations,
            "max_violation": float(max(violations)),
            "mean_violation": float(np.mean(violations)),
            "max_violation_pct": float(max(violations) / S * 100),
        }
        print(f"  {mat_label}: max violation = ${max(violations):.2f} "
              f"({max(violations)/S*100:.4f}% of spot)")

    save_json({
        "spot": S,
        "risk_free_rate": r,
        "moneyness": moneyness_grid.tolist(),
        "strikes": strikes.tolist(),
        "maturities": {k: float(v) for k, v in maturities.items()},
        "parity": parity_results,
    }, "parity_check.json")
    return parity_results


# ──────────────────────────────────────────────────────────────────────
# PHASE 1.5: Engine metadata / summary
# ──────────────────────────────────────────────────────────────────────
def step5_engine_summary(params: dict, xval: dict, model_sel: dict) -> dict:
    print("\n=== Step 5: Engine Summary ===")

    bates_stats = []
    for mat_label, data in xval.get("validation", {}).get("bates", {}).items():
        bates_stats.append({
            "maturity": mat_label,
            "call_mae": data["stats"]["call_mae"],
            "put_mae": data["stats"]["put_mae"],
            "call_rmse": data["stats"]["call_rmse"],
            "call_mean_pct_err": data["stats"]["call_mean_pct_err"],
        })

    result = {
        "primary_model": {
            "name": "Bates",
            "full_name": "Bates Stochastic Volatility with Jumps",
            "sde_latex": (
                "dS/S = (r - \\lambda k - \\frac{1}{2}v)dt + \\sqrt{v}\\,dW_1 + J\\,dN, \\quad "
                "dv = \\kappa(\\theta - v)dt + \\xi\\sqrt{v}\\,dW_2, \\quad "
                "\\mathrm{corr}(dW_1, dW_2) = \\rho"
            ),
            "params": params["bates"],
            "n_params": 8,
            "features": ["Stochastic volatility", "Mean-reverting variance",
                         "Vol-of-vol (smile curvature)", "Leverage effect (ρ)",
                         "Price jumps (fat tails)", "Jump intensity + size distribution"],
        },
        "backup_models": [
            {
                "name": "Merton",
                "full_name": "Merton Jump-Diffusion",
                "use_case": "T < 1 day (ultra-short expiry)",
                "reason": "Jumps dominate at short horizons; stochastic vol has little time to matter",
                "params": params["merton"],
            },
            {
                "name": "Heston",
                "full_name": "Heston Stochastic Volatility",
                "use_case": "T ≥ 1 day",
                "reason": "Vol clustering matters over longer horizons; pure jump model underprices tails",
                "params": params["heston"],
            },
        ],
        "mc_config": {
            "n_paths": 100_000,
            "dt": "1 hour (1/8766 years)",
            "antithetic": False,
            "seed": "42 for reproducibility, None for production",
        },
        "validation_summary": bates_stats,
        "model_selection_rule": model_sel.get("selection_rule", ""),
        "spot": params["spot"],
    }
    save_json(result, "engine_summary.json")
    return result


# ======================================================================
# PHASE 2: GREEKS CALCULATOR
# ======================================================================

GREEKS_MATURITIES = {
    "1hr": 1 / (365.25 * 24),
    "4hr": 4 / (365.25 * 24),
    "1day": 1 / 365.25,
    "3day": 3 / 365.25,
    "7day": 7 / 365.25,
    "14day": 14 / 365.25,
    "30day": 30 / 365.25,
}
GREEKS_N_PATHS = 50_000
GREEKS_SEED = 42


# ──────────────────────────────────────────────────────────────────────
# PHASE 2.1: Greeks surface (full grid — all maturities × strikes)
# ──────────────────────────────────────────────────────────────────────
def step6_greeks_surface(params: dict) -> dict:
    print("\n=== Step 6: Greeks Surface (all maturities × 21 strikes) ===")
    S = params["spot"]
    r = 0.04
    moneyness = np.arange(0.90, 1.105, 0.01)
    strikes = S * moneyness
    atm_idx = int(np.argmin(np.abs(moneyness - 1.0)))

    surface: dict = {}
    atm_table: list = []

    for mat_label, T in GREEKS_MATURITIES.items():
        print(f"  Computing Greeks — {mat_label} (T={T:.6f} yr, "
              f"~{T*365.25*24:.0f} hr)...")
        g = compute_greeks_grid(
            S, strikes, T, r, params,
            n_paths=GREEKS_N_PATHS, seed=GREEKS_SEED, eps_s_rel=0.001,
        )
        surface[mat_label] = g

        atm_row = {
            "maturity": mat_label,
            "T_years": float(T),
            "T_hours": float(T * 365.25 * 24),
            "price_call": g["prices_call"][atm_idx],
            "price_put": g["prices_put"][atm_idx],
            "call_delta": g["call_delta"][atm_idx],
            "put_delta": g["put_delta"][atm_idx],
            "gamma": g["gamma"][atm_idx],
            "gamma_pct": g["gamma_pct"][atm_idx],
            "gamma_cash": g["gamma_cash"][atm_idx],
            "vega": g["vega"][atm_idx],
            "call_theta": g["call_theta"][atm_idx],
            "put_theta": g["put_theta"][atm_idx],
            "vanna": g["vanna"][atm_idx],
            "volga": g["volga"][atm_idx],
        }
        atm_table.append(atm_row)
        print(f"    ATM Call Δ={atm_row['call_delta']:.4f}, "
              f"Γ%={atm_row['gamma_pct']:.4f}, "
              f"V=${atm_row['vega']:.2f}, "
              f"Θ=${atm_row['call_theta']:.2f}")

    result = {
        "spot": S,
        "risk_free_rate": r,
        "moneyness": moneyness.tolist(),
        "strikes": strikes.tolist(),
        "atm_idx": atm_idx,
        "maturities": {k: float(v) for k, v in GREEKS_MATURITIES.items()},
        "surface": surface,
        "atm_table": atm_table,
        "bump_config": {
            "eps_s_rel": 0.001,
            "eps_s_abs_usd": float(0.001 * S),
            "eps_vol": 0.01,
            "vol_bump_type": "parallel (√v₀ + √θ shifted together)",
            "dt_theta": "1 calendar day",
            "n_paths": GREEKS_N_PATHS,
        },
    }
    save_json(result, "greeks_surface.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# PHASE 2.2: Smile-risk Greeks
# ──────────────────────────────────────────────────────────────────────
def step7_smile_risk(params: dict) -> dict:
    print("\n=== Step 7: Smile-Risk Greeks (ξ, ρ, λ sensitivity) ===")
    S = params["spot"]
    r = 0.04
    moneyness = np.arange(0.90, 1.105, 0.01)
    strikes = S * moneyness

    select_mats = {"1day": 1 / 365.25, "7day": 7 / 365.25, "30day": 30 / 365.25}

    smile_risk: dict = {}
    for mat_label, T in select_mats.items():
        print(f"  Smile-risk — {mat_label}...")
        sr = compute_smile_risk_grid(
            S, strikes, T, r, params,
            n_paths=GREEKS_N_PATHS, seed=GREEKS_SEED,
        )
        smile_risk[mat_label] = sr

        for param_name in ["xi", "rho", "lambda"]:
            atm_sens = sr[param_name]["call_sens_per_unit"][10]
            print(f"    ∂C/∂{param_name} (ATM) = ${atm_sens:.4f} per unit")

    result = {
        "spot": S,
        "risk_free_rate": r,
        "moneyness": moneyness.tolist(),
        "strikes": strikes.tolist(),
        "maturities": {k: float(v) for k, v in select_mats.items()},
        "param_values": {
            "xi": float(params["bates"]["xi"]),
            "rho": float(params["bates"]["rho"]),
            "lambda": float(params["bates"]["lambda"]),
        },
        "smile_risk": smile_risk,
    }
    save_json(result, "smile_risk.json")
    return result


# ======================================================================
# PHASE 3: PORTFOLIO, HEDGING, DYNAMIC SIM, STRESS TESTS
# ======================================================================

# ── BS analytical Greeks (fast, for dynamic simulation) ──────────────
def _bs_d1(S, K, T, r, sigma):
    T = max(T, 1e-10)
    return (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))

def _bs_greeks(S, K, T, r, sigma, is_call):
    """Compute BS price + Greeks for a single option (scalar or array)."""
    T = np.maximum(T, 1e-10) if isinstance(T, np.ndarray) else max(T, 1e-10)
    sqrtT = np.sqrt(T)
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * sqrtT)
    d2 = d1 - sigma * sqrtT
    nd1, nd2 = sp_norm.cdf(d1), sp_norm.cdf(d2)
    pdf_d1 = sp_norm.pdf(d1)

    if is_call:
        price = S * nd1 - K * np.exp(-r * T) * nd2
        delta = nd1
        theta = (-S * pdf_d1 * sigma / (2 * sqrtT)
                 - r * K * np.exp(-r * T) * nd2) / 365.25
    else:
        price = K * np.exp(-r * T) * (1 - nd2) - S * (1 - nd1)
        delta = nd1 - 1.0
        theta = (-S * pdf_d1 * sigma / (2 * sqrtT)
                 + r * K * np.exp(-r * T) * (1 - nd2)) / 365.25

    gamma = pdf_d1 / (S * sigma * sqrtT)
    vega = S * pdf_d1 * sqrtT * 0.01
    return {"price": price, "delta": delta, "gamma": gamma, "vega": vega, "theta": theta}


# ──────────────────────────────────────────────────────────────────────
# PHASE 3.1: Portfolio simulation + aggregation + hedging strategies
# ──────────────────────────────────────────────────────────────────────
def step8_portfolio_and_hedging(params: dict) -> dict:
    print("\n=== Step 8: Portfolio Simulation & Hedging Strategies ===")
    S = params["spot"]
    r = 0.04
    sigma_base = np.sqrt(params["bates"]["theta"])
    rng = np.random.RandomState(777)

    moneyness_pool = np.arange(0.92, 1.09, 0.02)
    mat_pool = {
        "14day": 14 / 365.25, "30day": 30 / 365.25,
        "60day": 60 / 365.25, "90day": 90 / 365.25,
    }
    mat_labels = list(mat_pool.keys())
    mat_vals = list(mat_pool.values())

    positions = []
    for i in range(40):
        is_call = rng.random() < 0.55
        m = rng.choice(moneyness_pool)
        mi = rng.randint(len(mat_labels))
        notional = round(float(rng.uniform(0.5, 5.0)), 2)
        direction = -1 if rng.random() < 0.75 else 1

        K = round(S * m)
        T = mat_vals[mi]
        g = _bs_greeks(S, K, T, r, sigma_base, is_call)

        positions.append({
            "id": i + 1,
            "type": "call" if is_call else "put",
            "strike": K,
            "moneyness": float(round(m, 2)),
            "maturity": mat_labels[mi],
            "T": float(T),
            "notional_btc": notional,
            "direction": direction,
            "dir_label": "Exchange SHORT" if direction == -1 else "Exchange LONG",
            "price": float(g["price"]),
            "delta": float(g["delta"] * notional * direction),
            "gamma": float(g["gamma"] * notional * direction),
            "vega": float(g["vega"] * notional * direction),
            "theta": float(g["theta"] * notional * direction),
        })

    net = {k: sum(p[k] for p in positions) for k in ["delta", "gamma", "vega", "theta"]}
    print(f"  40 positions generated.")
    print(f"  Net Δ={net['delta']:.4f}  Γ={net['gamma']:.6f}  V=${net['vega']:.2f}  Θ=${net['theta']:.2f}")

    # ── Hedging strategies ───────────────────────────────────────────
    # Hedge instrument A: short-dated ATM call (high gamma/vega ratio)
    T_A = 7 / 365.25
    K_A = round(S)
    gA = _bs_greeks(S, K_A, T_A, r, sigma_base, True)

    # Hedge instrument B: long-dated ATM call (high vega/gamma ratio)
    T_B = 30 / 365.25
    K_B = round(S)
    gB = _bs_greeks(S, K_B, T_B, r, sigma_base, True)

    strategies = {}

    # Strategy 1: Delta-neutral only (spot BTC)
    n_spot_1 = -net["delta"]
    after_1 = {k: net[k] for k in net}
    after_1["delta"] = 0.0
    strategies["delta_neutral"] = {
        "label": "Δ-Neutral",
        "hedge": [{"instrument": "Spot BTC", "quantity_btc": float(round(n_spot_1, 4))}],
        "before": {k: float(v) for k, v in net.items()},
        "after": {k: float(v) for k, v in after_1.items()},
    }

    # Strategy 2: Delta+Gamma neutral (spot + option A)
    n_A = -net["gamma"] / gA["gamma"]
    n_spot_2 = -(net["delta"] + n_A * gA["delta"])
    after_2 = {
        "delta": 0.0,
        "gamma": 0.0,
        "vega": float(net["vega"] + n_A * gA["vega"]),
        "theta": float(net["theta"] + n_A * gA["theta"]),
    }
    strategies["delta_gamma_neutral"] = {
        "label": "Δ+Γ-Neutral",
        "hedge": [
            {"instrument": f"ATM 7d Call (K=${K_A:,})", "quantity": float(round(n_A, 4)),
             "delta": float(gA["delta"]), "gamma": float(gA["gamma"]), "vega": float(gA["vega"])},
            {"instrument": "Spot BTC", "quantity_btc": float(round(n_spot_2, 4))},
        ],
        "before": {k: float(v) for k, v in net.items()},
        "after": after_2,
    }

    # Strategy 3: Delta+Gamma+Vega neutral (spot + option A + option B)
    det = gA["gamma"] * gB["vega"] - gA["vega"] * gB["gamma"]
    if abs(det) > 1e-12:
        n_A3 = (-net["gamma"] * gB["vega"] + net["vega"] * gB["gamma"]) / det
        n_B3 = (-net["vega"] * gA["gamma"] + net["gamma"] * gA["vega"]) / det
    else:
        n_A3, n_B3 = 0, 0
    n_spot_3 = -(net["delta"] + n_A3 * gA["delta"] + n_B3 * gB["delta"])
    after_3 = {
        "delta": 0.0,
        "gamma": float(net["gamma"] + n_A3 * gA["gamma"] + n_B3 * gB["gamma"]),
        "vega": float(net["vega"] + n_A3 * gA["vega"] + n_B3 * gB["vega"]),
        "theta": float(net["theta"] + n_A3 * gA["theta"] + n_B3 * gB["theta"]),
    }
    strategies["delta_gamma_vega_neutral"] = {
        "label": "Δ+Γ+V-Neutral",
        "hedge": [
            {"instrument": f"ATM 7d Call (K=${K_A:,})", "quantity": float(round(n_A3, 4)),
             "delta": float(gA["delta"]), "gamma": float(gA["gamma"]), "vega": float(gA["vega"])},
            {"instrument": f"ATM 30d Call (K=${K_B:,})", "quantity": float(round(n_B3, 4)),
             "delta": float(gB["delta"]), "gamma": float(gB["gamma"]), "vega": float(gB["vega"])},
            {"instrument": "Spot BTC", "quantity_btc": float(round(n_spot_3, 4))},
        ],
        "before": {k: float(v) for k, v in net.items()},
        "after": after_3,
    }

    for s_name, s_data in strategies.items():
        a = s_data["after"]
        print(f"  {s_data['label']:>18}: Δ={a['delta']:.4f} Γ={a['gamma']:.6f} "
              f"V=${a['vega']:.2f} Θ=${a['theta']:.2f}")

    result = {
        "spot": S, "sigma_base": float(sigma_base), "risk_free_rate": r,
        "positions": positions,
        "net_greeks": {k: float(v) for k, v in net.items()},
        "n_positions": len(positions),
        "n_short": sum(1 for p in positions if p["direction"] == -1),
        "n_long": sum(1 for p in positions if p["direction"] == 1),
        "hedge_instruments": {
            "A": {"label": f"ATM 7d Call (K=${K_A:,})", "T": float(T_A),
                   "greeks": {k: float(v) for k, v in gA.items()}},
            "B": {"label": f"ATM 30d Call (K=${K_B:,})", "T": float(T_B),
                   "greeks": {k: float(v) for k, v in gB.items()}},
        },
        "strategies": strategies,
    }
    save_json(result, "portfolio.json")

    # ── Step 8b: Simulate incremental trade-by-trade rebalancing ─────
    print("\n  Simulating trade-by-trade hedge rebalancing...")
    rng2 = np.random.RandomState(999)
    trades: list = []
    running_greeks = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0}
    hedge_history: list = []

    incoming_trades = []
    for i in range(20):
        is_call = rng2.random() < 0.55
        m = rng2.choice(moneyness_pool)
        mi = rng2.randint(len(mat_labels))
        notional = round(float(rng2.uniform(0.5, 5.0)), 2)
        direction = -1 if rng2.random() < 0.80 else 1
        K_t = round(S * m)
        T_t = mat_vals[mi]
        g = _bs_greeks(S, K_t, T_t, r, sigma_base, is_call)
        incoming_trades.append({
            "id": i + 1,
            "type": "call" if is_call else "put",
            "strike": K_t,
            "moneyness": float(round(m, 2)),
            "maturity": mat_labels[mi],
            "notional_btc": notional,
            "direction": direction,
            "client_action": "BUY" if direction == -1 else "SELL",
            "delta": float(g["delta"] * notional * direction),
            "gamma": float(g["gamma"] * notional * direction),
            "vega": float(g["vega"] * notional * direction),
            "theta": float(g["theta"] * notional * direction),
        })

    for trade in incoming_trades:
        for k in ["delta", "gamma", "vega", "theta"]:
            running_greeks[k] += trade[k]

        det = gA["gamma"] * gB["vega"] - gA["vega"] * gB["gamma"]
        if abs(det) > 1e-12:
            h_nA = (-running_greeks["gamma"] * gB["vega"]
                    + running_greeks["vega"] * gB["gamma"]) / det
            h_nB = (-running_greeks["vega"] * gA["gamma"]
                    + running_greeks["gamma"] * gA["vega"]) / det
        else:
            h_nA, h_nB = 0.0, 0.0
        h_spot = -(running_greeks["delta"] + h_nA * gA["delta"] + h_nB * gB["delta"])

        hedge_history.append({
            "trade_id": trade["id"],
            "trade_desc": (f"Client {trade['client_action']}s {trade['notional_btc']} BTC "
                           f"{trade['type'].upper()} K={trade['moneyness']:.2f} {trade['maturity']}"),
            "exposure_before": {
                "delta": float(running_greeks["delta"] - trade["delta"]),
                "gamma": float(running_greeks["gamma"] - trade["gamma"]),
                "vega": float(running_greeks["vega"] - trade["vega"]),
            },
            "exposure_after": {k: float(v) for k, v in running_greeks.items()},
            "hedge_prescription": {
                "spot_btc": float(round(h_spot, 4)),
                "option_a_qty": float(round(h_nA, 2)),
                "option_a_label": f"ATM 7d Call (K=${K_A:,})",
                "option_b_qty": float(round(h_nB, 2)),
                "option_b_label": f"ATM 30d Call (K=${K_B:,})",
            },
            "residual_greeks": {
                "delta": 0.0,
                "gamma": float(running_greeks["gamma"] + h_nA * gA["gamma"] + h_nB * gB["gamma"]),
                "vega": float(running_greeks["vega"] + h_nA * gA["vega"] + h_nB * gB["vega"]),
            },
        })

    print(f"  Generated {len(hedge_history)} trade-by-trade rebalance events")
    rebal_result = {
        "trades": incoming_trades,
        "hedge_history": hedge_history,
        "hedge_instruments": {
            "A": {"label": f"ATM 7d Call (K=${K_A:,})", "T": float(T_A),
                  "greeks": {k: float(v) for k, v in gA.items()}},
            "B": {"label": f"ATM 30d Call (K=${K_B:,})", "T": float(T_B),
                  "greeks": {k: float(v) for k, v in gB.items()}},
        },
        "spot": S,
    }
    save_json(rebal_result, "hedge_rebalance.json")

    return result


# ──────────────────────────────────────────────────────────────────────
# PHASE 3.2: Dynamic hedging simulation (30-day, 3 strategies)
# Uses full BS repricing (not Taylor expansion) for accurate P&L
# ──────────────────────────────────────────────────────────────────────
def step9_dynamic_hedging(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 9: Dynamic Hedging Simulation (14 days) ===")
    S0 = portfolio["spot"]
    r = 0.04
    positions = portfolio["positions"]

    sigma_base = portfolio["sigma_base"]

    sim_sigma = sigma_base
    sim_kappa = 5.0
    sim_xi_vol = 0.8
    sim_lam = 24.0
    sim_mu_j = -0.002
    sim_sig_j = 0.02
    sim_k_jump = np.exp(sim_mu_j + 0.5 * sim_sig_j**2) - 1.0

    T_sim = 14 / 365.25
    dt_path = 1 / (365.25 * 6)
    n_steps = int(T_sim / dt_path)
    sqrt_dt = np.sqrt(dt_path)

    rng_path = np.random.RandomState(42)
    spot_path = np.zeros(n_steps + 1)
    sigma_path = np.zeros(n_steps + 1)
    spot_path[0] = S0
    sigma_path[0] = sim_sigma

    for i in range(n_steps):
        z1 = rng_path.standard_normal()
        z2 = rng_path.standard_normal()
        zv = -0.3 * z1 + np.sqrt(1.0 - 0.09) * z2
        sig_i = max(sigma_path[i], 0.05)

        nj = rng_path.poisson(sim_lam * dt_path)
        tj = (rng_path.normal(sim_mu_j * nj, sim_sig_j * np.sqrt(max(nj, 0)))
              if nj > 0 else 0.0)
        spot_path[i + 1] = spot_path[i] * np.exp(
            (r - sim_lam * sim_k_jump - 0.5 * sig_i**2) * dt_path
            + sig_i * sqrt_dt * z1 + tj)

        dsig = (sim_kappa * (sim_sigma - sig_i) * dt_path
                + sim_xi_vol * sig_i * sqrt_dt * zv)
        sigma_path[i + 1] = max(sig_i + dsig, 0.05)

    T_CM_A = 7 / 365.25
    T_CM_B = 30 / 365.25
    K_hedge = round(S0)

    strat_names = ["unhedged", "delta_only", "delta_gamma", "delta_gamma_vega"]
    hedge_pos = {s: {"spot": 0.0, "opt_a": 0.0, "opt_b": 0.0} for s in strat_names}
    cum_pnl = {s: [0.0] for s in strat_names}
    net_delta_ts = {s: [] for s in strat_names}
    net_gamma_ts = {s: [] for s in strat_names}
    net_vega_ts = {s: [] for s in strat_names}

    attr_delta = []
    attr_gamma = []
    attr_vega = []
    attr_theta = []
    attr_resid = []

    prev_S = None
    prev_sig = None
    prev_port_val = None
    prev_ha_price = None
    prev_hb_price = None
    prev_pg = None

    rebal_indices = list(range(0, n_steps + 1))
    timestamps = [float(i * dt_path * 365.25) for i in rebal_indices]

    for step_i, idx in enumerate(rebal_indices):
        S_now = float(spot_path[idx])
        sig_now = float(sigma_path[idx])
        t_elapsed = idx * dt_path

        port_val = 0.0
        pg = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0}
        for p in positions:
            T_rem = max(p["T"] - t_elapsed, 1e-10)
            if T_rem < 1e-8:
                continue
            g = _bs_greeks(S_now, p["strike"], T_rem, r, sig_now, p["type"] == "call")
            n = p["notional_btc"] * p["direction"]
            port_val += g["price"] * n
            pg["delta"] += g["delta"] * n
            pg["gamma"] += g["gamma"] * n
            pg["vega"] += g["vega"] * n
            pg["theta"] += g["theta"] * n

        ha = _bs_greeks(S_now, K_hedge, T_CM_A, r, sig_now, True)
        hb = _bs_greeks(S_now, K_hedge, T_CM_B, r, sig_now, True)

        if step_i > 0:
            dS = S_now - prev_S

            ha_prev_fresh = _bs_greeks(prev_S, K_hedge, T_CM_A, r, prev_sig, True)
            hb_prev_fresh = _bs_greeks(prev_S, K_hedge, T_CM_B, r, prev_sig, True)
            ha_now_aged = _bs_greeks(S_now, K_hedge, max(T_CM_A - dt_path, 1e-10), r, sig_now, True)
            hb_now_aged = _bs_greeks(S_now, K_hedge, max(T_CM_B - dt_path, 1e-10), r, sig_now, True)

            for s in strat_names:
                d_port = port_val - prev_port_val
                d_hedge = (hedge_pos[s]["spot"] * dS
                           + hedge_pos[s]["opt_a"] * (ha_now_aged["price"] - ha_prev_fresh["price"])
                           + hedge_pos[s]["opt_b"] * (hb_now_aged["price"] - hb_prev_fresh["price"]))
                total_pnl = d_port + d_hedge
                cum_pnl[s].append(cum_pnl[s][-1] + total_pnl)

            dSig = sig_now - prev_sig
            dt_days = dt_path * 365.25
            a_d = prev_pg["delta"] * dS
            a_g = 0.5 * prev_pg["gamma"] * dS**2
            a_v = prev_pg["vega"] * dSig * 100
            a_t = prev_pg["theta"] * dt_days
            actual = port_val - prev_port_val
            a_r = actual - (a_d + a_g + a_v + a_t)
            attr_delta.append(a_d)
            attr_gamma.append(a_g)
            attr_vega.append(a_v)
            attr_theta.append(a_t)
            attr_resid.append(a_r)

        for s in strat_names:
            if s == "unhedged":
                hedge_pos[s] = {"spot": 0.0, "opt_a": 0.0, "opt_b": 0.0}
                net_d = pg["delta"]
                net_g = pg["gamma"]
                net_v = pg["vega"]
            elif s == "delta_only":
                hedge_pos[s] = {"spot": -pg["delta"], "opt_a": 0.0, "opt_b": 0.0}
                net_d = 0.0
                net_g = pg["gamma"]
                net_v = pg["vega"]
            elif s == "delta_gamma":
                if abs(ha["gamma"]) > 1e-14:
                    n_a = -pg["gamma"] / ha["gamma"]
                else:
                    n_a = 0.0
                hedge_pos[s] = {
                    "spot": -(pg["delta"] + n_a * ha["delta"]),
                    "opt_a": n_a, "opt_b": 0.0,
                }
                net_d = 0.0
                net_g = 0.0
                net_v = pg["vega"] + n_a * ha["vega"]
            elif s == "delta_gamma_vega":
                det = ha["gamma"] * hb["vega"] - ha["vega"] * hb["gamma"]
                if abs(det) > 1e-14:
                    n_a = (-pg["gamma"] * hb["vega"] + pg["vega"] * hb["gamma"]) / det
                    n_b = (-pg["vega"] * ha["gamma"] + pg["gamma"] * ha["vega"]) / det
                else:
                    n_a, n_b = 0.0, 0.0
                hedge_pos[s] = {
                    "spot": -(pg["delta"] + n_a * ha["delta"] + n_b * hb["delta"]),
                    "opt_a": n_a, "opt_b": n_b,
                }
                net_d = 0.0
                net_g = 0.0
                net_v = 0.0
            else:
                net_d, net_g, net_v = pg["delta"], pg["gamma"], pg["vega"]

            net_delta_ts[s].append(float(net_d))
            net_gamma_ts[s].append(float(net_g))
            net_vega_ts[s].append(float(net_v))

        prev_S = S_now
        prev_sig = sig_now
        prev_port_val = port_val
        prev_pg = pg

    step_size = max(1, len(rebal_indices) // 200)

    cum_attr = {
        "delta": np.cumsum(attr_delta).tolist(),
        "gamma": np.cumsum(attr_gamma).tolist(),
        "vega": np.cumsum(attr_vega).tolist(),
        "theta": np.cumsum(attr_theta).tolist(),
        "residual": np.cumsum(attr_resid).tolist(),
    }
    attr_final = {k: float(v[-1]) if v else 0 for k, v in cum_attr.items()}

    sim_result = {
        "spot_path": spot_path[::step_size].tolist(),
        "sigma_path": (sigma_path[::step_size] * 100).tolist(),
        "timestamps": timestamps[::step_size],
        "n_rebalances": len(rebal_indices),
        "rebal_frequency": "4h",
        "strategies": {},
        "pnl_attribution": {
            k: v[::step_size] for k, v in cum_attr.items()
        },
        "pnl_attribution_final": attr_final,
    }
    for s in strat_names:
        pnl_arr = cum_pnl[s]
        sim_result["strategies"][s] = {
            "pnl": [pnl_arr[i] for i in range(0, len(pnl_arr), step_size)],
            "net_delta": net_delta_ts[s][::step_size],
            "net_gamma": net_gamma_ts[s][::step_size],
            "net_vega": net_vega_ts[s][::step_size],
            "final_pnl": float(pnl_arr[-1]),
        }
    for s in strat_names:
        print(f"  {s:>20}: final P&L = ${sim_result['strategies'][s]['final_pnl']:,.2f}")
    print(f"  Attribution — Δ: ${attr_final['delta']:,.2f}  Γ: ${attr_final['gamma']:,.2f}  "
          f"V: ${attr_final['vega']:,.2f}  Θ: ${attr_final['theta']:,.2f}  "
          f"Res: ${attr_final['residual']:,.2f}")

    save_json(sim_result, "dynamic_hedging.json")
    return sim_result


# ──────────────────────────────────────────────────────────────────────
# PHASE 3.3: Stress testing & VaR
# ──────────────────────────────────────────────────────────────────────
def step10_stress_tests(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 10: Stress Testing & VaR ===")
    S = portfolio["spot"]
    sigma_base = portfolio["sigma_base"]
    r = 0.04
    positions = portfolio["positions"]

    scenarios = [
        {"name": "BTC −10%", "spot_shock": -0.10, "vol_shock": 0.0},
        {"name": "BTC −20%", "spot_shock": -0.20, "vol_shock": 0.0},
        {"name": "BTC +10%", "spot_shock": 0.10, "vol_shock": 0.0},
        {"name": "BTC +20%", "spot_shock": 0.20, "vol_shock": 0.0},
        {"name": "Vol +25%", "spot_shock": 0.0, "vol_shock": 0.25},
        {"name": "Vol +50%", "spot_shock": 0.0, "vol_shock": 0.50},
        {"name": "Vol −25%", "spot_shock": 0.0, "vol_shock": -0.25},
        {"name": "Crash + Vol spike", "spot_shock": -0.20, "vol_shock": 0.50},
        {"name": "Rally + Vol crush", "spot_shock": 0.15, "vol_shock": -0.30},
        {"name": "Flash crash −30%", "spot_shock": -0.30, "vol_shock": 0.80},
    ]

    base_val = 0.0
    for p in positions:
        g = _bs_greeks(S, p["strike"], p["T"], r, sigma_base, p["type"] == "call")
        base_val += g["price"] * p["notional_btc"] * p["direction"]

    for sc in scenarios:
        S_shock = S * (1 + sc["spot_shock"])
        sig_shock = sigma_base * (1 + sc["vol_shock"])
        shock_val = 0.0
        for p in positions:
            g = _bs_greeks(S_shock, p["strike"], p["T"], r, sig_shock, p["type"] == "call")
            shock_val += g["price"] * p["notional_btc"] * p["direction"]
        sc["pnl"] = float(shock_val - base_val)
        sc["pnl_pct_notional"] = float(sc["pnl"] / abs(base_val) * 100) if base_val != 0 else 0
        print(f"  {sc['name']:>24}: P&L = ${sc['pnl']:,.2f}")

    rng_mc = np.random.RandomState(999)
    n_var = 10_000
    var_pnl = []
    daily_vol = sigma_base / np.sqrt(365.25)
    for _ in range(n_var):
        dS = rng_mc.normal(0, daily_vol * S)
        dSig = rng_mc.normal(0, sigma_base * 0.05)
        net = portfolio["net_greeks"]
        pnl = (net["delta"] * dS + 0.5 * net["gamma"] * dS**2
               + net["vega"] * dSig * 100 + net["theta"])
        var_pnl.append(pnl)
    var_pnl = np.array(var_pnl)
    var_95 = float(np.percentile(var_pnl, 5))
    var_99 = float(np.percentile(var_pnl, 1))
    cvar_99 = float(var_pnl[var_pnl <= var_99].mean()) if np.any(var_pnl <= var_99) else var_99

    print(f"  VaR 95% = ${var_95:,.2f}  |  VaR 99% = ${var_99:,.2f}  |  CVaR 99% = ${cvar_99:,.2f}")

    var_hist = np.histogram(var_pnl, bins=80)

    result = {
        "scenarios": scenarios,
        "base_value": float(base_val),
        "var": {
            "var_95": var_95, "var_99": var_99, "cvar_99": cvar_99,
            "n_simulations": n_var,
            "histogram_counts": var_hist[0].tolist(),
            "histogram_edges": var_hist[1].tolist(),
        },
    }
    save_json(result, "stress_tests.json")
    return result


# ──────────────────────────────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────────────────────────────
def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", type=int, default=0,
                        help="1=Phase1 only, 2=Phase2 only, 3=Phase3 only, 0=all")
    args = parser.parse_args()

    print("=" * 60)
    print("  OPTIONS RISK MANAGEMENT — Data Generator")
    print("=" * 60)

    params = load_calibration()
    print(f"\n  Loaded calibration: spot=${params['spot']:,.2f}")

    if args.phase in (0, 1):
        print("\n── Phase 1: Pricing Engine ─────────────────────────────")
        xval = step1_cross_validation(params)
        model_sel = step2_model_selection(params)
        step3_pricing_surface(params)
        step4_parity_check(params)
        step5_engine_summary(params, xval, model_sel)

    if args.phase in (0, 2):
        print("\n── Phase 2: Greeks Calculator ──────────────────────────")
        step6_greeks_surface(params)
        step7_smile_risk(params)

    if args.phase in (0, 3):
        print("\n── Phase 3: Portfolio & Hedging ────────────────────────")
        port = step8_portfolio_and_hedging(params)
        step9_dynamic_hedging(params, port)
        step10_stress_tests(params, port)

    print(f"\n{'=' * 60}")
    print("  All done. JSON data written to public/data/options-risk/")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
