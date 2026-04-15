"""
Reusable Options Pricing Engine
================================
Primary model: Bates (Heston stochastic vol + Merton jumps)
Backup models: Heston (T > 1 day), Merton (T < 1 day)

This module provides clean, callable pricing functions that all downstream
phases (Greeks, portfolio aggregation, hedging simulation) import and use.

Usage:
    from pricing_engine import load_calibration, price_call_bates, price_put_bates
    params = load_calibration()
    c = price_call_bates(S=107000, K=105000, T=7/365.25, r=0.04, params=params)
"""

import json
from pathlib import Path
from typing import Optional

import numpy as np
from scipy.stats import norm as sp_norm
from scipy.optimize import brentq

BASE_DIR = Path(__file__).resolve().parent.parent
CALIB_PATH = BASE_DIR / "public" / "data" / "calibration.json"

DEFAULT_N_PATHS = 100_000
DEFAULT_SEED: Optional[int] = None


# ──────────────────────────────────────────────────────────────────────
# CALIBRATION LOADER
# ──────────────────────────────────────────────────────────────────────
def load_calibration(path: Optional[Path] = None) -> dict:
    """Load calibrated model parameters from the Options analysis output."""
    p = path or CALIB_PATH
    if not p.exists():
        raise FileNotFoundError(
            f"Calibration file not found: {p}\n"
            "Run analysis/run_analysis.py first to generate calibration.json"
        )
    with open(p) as f:
        calib = json.load(f)

    bates_p = calib["bates"]["params"]
    heston_p = calib["heston"]["params"]
    merton_p = calib["merton"]["params"]

    return {
        "spot": float(calib["spot"]),
        "bates": {
            "kappa": float(bates_p["kappa"]),
            "theta": float(bates_p["theta"]),
            "xi": float(bates_p["xi"]),
            "rho": float(bates_p["rho"]),
            "v0": float(bates_p["v0"]),
            "lambda": float(bates_p["lambda_annual"]),
            "mu_j": float(bates_p["mu_J"]),
            "sigma_j": float(bates_p["sigma_J"]),
        },
        "heston": {
            "kappa": float(heston_p["kappa"]),
            "theta": float(heston_p["theta"]),
            "xi": float(heston_p["xi"]),
            "rho": float(heston_p["rho"]),
            "v0": float(heston_p["v0"]),
        },
        "merton": {
            "sigma": float(merton_p["sigma_diffusion"]),
            "lambda": float(merton_p["lambda_annual"]),
            "mu_j": float(merton_p["mu_J"]),
            "sigma_j": float(merton_p["sigma_J"]),
            "k": float(merton_p["k"]),
        },
    }


# ──────────────────────────────────────────────────────────────────────
# BLACK-SCHOLES (analytical baseline)
# ──────────────────────────────────────────────────────────────────────
def bs_call(S: float, K: float, T: float, r: float, sigma: float) -> float:
    if T <= 0:
        return max(S - K, 0.0)
    d1 = (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    return float(S * sp_norm.cdf(d1) - K * np.exp(-r * T) * sp_norm.cdf(d2))


def bs_put(S: float, K: float, T: float, r: float, sigma: float) -> float:
    return bs_call(S, K, T, r, sigma) - S + K * np.exp(-r * T)


def bs_implied_vol(
    price: float, S: float, K: float, T: float, r: float, is_call: bool = True
) -> Optional[float]:
    pricer = bs_call if is_call else bs_put
    intrinsic = max(S - K, 0) if is_call else max(K * np.exp(-r * T) - S, 0)
    if price <= intrinsic + 1e-8:
        return None
    try:
        return float(
            brentq(lambda sig: pricer(S, K, T, r, sig) - price, 1e-6, 10.0,
                    xtol=1e-8, maxiter=200)
        )
    except (ValueError, RuntimeError):
        return None


# ──────────────────────────────────────────────────────────────────────
# CORE MC ENGINE — BATES MODEL (primary)
# ──────────────────────────────────────────────────────────────────────
def _mc_bates(
    S: float, T: float, r: float, params: dict,
    n_paths: int = DEFAULT_N_PATHS,
    seed: Optional[int] = DEFAULT_SEED,
) -> np.ndarray:
    """
    Simulate terminal spot prices under the Bates model.

    Bates SDE:
        dS/S = (r - λk - ½v)dt + √v dW₁ + J dN
        dv   = κ(θ - v)dt + ξ√v dW₂
        corr(dW₁, dW₂) = ρ
        J ~ N(μ_J, σ_J²), N ~ Poisson(λ dt)

    Returns array of shape (n_paths,) with terminal S_T values.
    """
    bp = params["bates"]
    kappa, theta, xi, rho = bp["kappa"], bp["theta"], bp["xi"], bp["rho"]
    v0 = bp["v0"]
    lam, mu_j, sigma_j = bp["lambda"], bp["mu_j"], bp["sigma_j"]
    k_jump = np.exp(mu_j + 0.5 * sigma_j**2) - 1

    if seed is not None:
        np.random.seed(seed)

    dt = 1.0 / (365.25 * 24)
    n_steps = max(int(np.ceil(T / dt)), 1)
    dt_actual = T / n_steps
    sqrt_dt = np.sqrt(dt_actual)
    lam_dt = lam * dt_actual

    S_cur = np.full(n_paths, S, dtype=np.float64)
    v = np.full(n_paths, v0, dtype=np.float64)

    for _ in range(n_steps):
        z1 = np.random.standard_normal(n_paths)
        z2 = np.random.standard_normal(n_paths)
        zv = rho * z1 + np.sqrt(1.0 - rho**2) * z2

        v_pos = np.maximum(v, 0.0)
        sqrt_v = np.sqrt(v_pos)

        n_jumps = np.random.poisson(lam_dt, n_paths)
        total_jump = np.where(
            n_jumps > 0,
            np.array([np.random.normal(mu_j, sigma_j, nj).sum() if nj > 0 else 0.0
                       for nj in n_jumps]),
            0.0,
        )

        S_cur *= np.exp(
            (r - lam * k_jump - 0.5 * v_pos) * dt_actual
            + sqrt_v * sqrt_dt * z1
            + total_jump
        )

        v = (v + kappa * (theta - v) * dt_actual
             + xi * sqrt_v * sqrt_dt * zv)
        v = np.maximum(v, 0.0)

    return S_cur


# ──────────────────────────────────────────────────────────────────────
# CORE MC ENGINE — HESTON MODEL (backup, T > 1 day)
# ──────────────────────────────────────────────────────────────────────
def _mc_heston(
    S: float, T: float, r: float, params: dict,
    n_paths: int = DEFAULT_N_PATHS,
    seed: Optional[int] = DEFAULT_SEED,
) -> np.ndarray:
    """
    Simulate terminal spot prices under the Heston stochastic vol model.

    Heston SDE:
        dS/S = (r - ½v)dt + √v dW₁
        dv   = κ(θ - v)dt + ξ√v dW₂
        corr(dW₁, dW₂) = ρ
    """
    hp = params["heston"]
    kappa, theta, xi, rho = hp["kappa"], hp["theta"], hp["xi"], hp["rho"]
    v0 = hp["v0"]

    if seed is not None:
        np.random.seed(seed)

    dt = 1.0 / (365.25 * 24)
    n_steps = max(int(np.ceil(T / dt)), 1)
    dt_actual = T / n_steps
    sqrt_dt = np.sqrt(dt_actual)

    S_cur = np.full(n_paths, S, dtype=np.float64)
    v = np.full(n_paths, v0, dtype=np.float64)

    for _ in range(n_steps):
        z1 = np.random.standard_normal(n_paths)
        z2 = np.random.standard_normal(n_paths)
        zv = rho * z1 + np.sqrt(1.0 - rho**2) * z2

        v_pos = np.maximum(v, 0.0)
        sqrt_v = np.sqrt(v_pos)

        S_cur *= np.exp(
            (r - 0.5 * v_pos) * dt_actual + sqrt_v * sqrt_dt * z1
        )

        v = (v + kappa * (theta - v) * dt_actual
             + xi * sqrt_v * sqrt_dt * zv)
        v = np.maximum(v, 0.0)

    return S_cur


# ──────────────────────────────────────────────────────────────────────
# CORE MC ENGINE — MERTON JUMP-DIFFUSION (backup, T < 1 day)
# ──────────────────────────────────────────────────────────────────────
def _mc_merton(
    S: float, T: float, r: float, params: dict,
    n_paths: int = DEFAULT_N_PATHS,
    seed: Optional[int] = DEFAULT_SEED,
) -> np.ndarray:
    """
    Simulate terminal spot prices under Merton's jump-diffusion model.

    Merton SDE:
        dS/S = (r - λk - ½σ²)dt + σ dW + J dN
        J ~ N(μ_J, σ_J²), N ~ Poisson(λ dt)
    """
    mp = params["merton"]
    sigma = mp["sigma"]
    lam, mu_j, sigma_j, k_jump = mp["lambda"], mp["mu_j"], mp["sigma_j"], mp["k"]

    if seed is not None:
        np.random.seed(seed)

    dt = 1.0 / (365.25 * 24)
    n_steps = max(int(np.ceil(T / dt)), 1)
    dt_actual = T / n_steps
    sqrt_dt = np.sqrt(dt_actual)
    lam_dt = lam * dt_actual
    drift = (r - lam * k_jump - 0.5 * sigma**2) * dt_actual

    S_cur = np.full(n_paths, S, dtype=np.float64)

    for _ in range(n_steps):
        z = np.random.standard_normal(n_paths)
        n_jumps = np.random.poisson(lam_dt, n_paths)
        total_jump = np.where(
            n_jumps > 0,
            np.array([np.random.normal(mu_j, sigma_j, nj).sum() if nj > 0 else 0.0
                       for nj in n_jumps]),
            0.0,
        )
        S_cur *= np.exp(drift + sigma * sqrt_dt * z + total_jump)

    return S_cur


# ──────────────────────────────────────────────────────────────────────
# UNIFIED PRICING FUNCTION
# ──────────────────────────────────────────────────────────────────────
def price_option(
    S: float,
    K: float,
    T: float,
    r: float,
    params: dict,
    is_call: bool = True,
    model: str = "bates",
    n_paths: int = DEFAULT_N_PATHS,
    seed: Optional[int] = DEFAULT_SEED,
) -> float:
    """
    Price a European option using Monte Carlo simulation.

    Parameters
    ----------
    S : Spot price
    K : Strike price
    T : Time to maturity in years (e.g., 7/365.25 for 7 days)
    r : Risk-free rate (annualized, e.g., 0.04)
    params : Calibration dict from load_calibration()
    is_call : True for call, False for put
    model : "bates" (primary), "heston", or "merton"
    n_paths : Number of MC simulation paths
    seed : Random seed for reproducibility (None = no seed)

    Returns
    -------
    Option price in USD
    """
    if T <= 0:
        return max(S - K, 0.0) if is_call else max(K - S, 0.0)

    mc_funcs = {"bates": _mc_bates, "heston": _mc_heston, "merton": _mc_merton}
    if model not in mc_funcs:
        raise ValueError(f"Unknown model '{model}'. Choose from: {list(mc_funcs)}")

    S_T = mc_funcs[model](S, T, r, params, n_paths=n_paths, seed=seed)
    discount = np.exp(-r * T)

    if is_call:
        payoffs = np.maximum(S_T - K, 0.0)
    else:
        payoffs = np.maximum(K - S_T, 0.0)

    return float(discount * np.mean(payoffs))


# ──────────────────────────────────────────────────────────────────────
# CONVENIENCE HELPERS
# ──────────────────────────────────────────────────────────────────────
def price_call_bates(
    S: float, K: float, T: float, r: float, params: dict,
    n_paths: int = DEFAULT_N_PATHS, seed: Optional[int] = DEFAULT_SEED,
) -> float:
    """Price a European call under the Bates model."""
    return price_option(S, K, T, r, params, is_call=True, model="bates",
                        n_paths=n_paths, seed=seed)


def price_put_bates(
    S: float, K: float, T: float, r: float, params: dict,
    n_paths: int = DEFAULT_N_PATHS, seed: Optional[int] = DEFAULT_SEED,
) -> float:
    """Price a European put under the Bates model."""
    return price_option(S, K, T, r, params, is_call=False, model="bates",
                        n_paths=n_paths, seed=seed)


# ──────────────────────────────────────────────────────────────────────
# BATCH PRICING — price a grid of strikes for a single maturity
# ──────────────────────────────────────────────────────────────────────
def price_grid(
    S: float,
    strikes: np.ndarray,
    T: float,
    r: float,
    params: dict,
    model: str = "bates",
    n_paths: int = DEFAULT_N_PATHS,
    seed: Optional[int] = DEFAULT_SEED,
) -> dict:
    """
    Price calls and puts for an array of strikes at a single maturity.
    Much more efficient than calling price_option() in a loop because
    the MC paths are simulated once and reused for all strikes.

    Returns {"calls": [...], "puts": [...]}
    """
    if T <= 0:
        calls = [max(S - K, 0.0) for K in strikes]
        puts = [max(K - S, 0.0) for K in strikes]
        return {"calls": calls, "puts": puts}

    mc_funcs = {"bates": _mc_bates, "heston": _mc_heston, "merton": _mc_merton}
    S_T = mc_funcs[model](S, T, r, params, n_paths=n_paths, seed=seed)
    discount = np.exp(-r * T)

    calls = [float(discount * np.mean(np.maximum(S_T - K, 0.0))) for K in strikes]
    puts = [float(discount * np.mean(np.maximum(K - S_T, 0.0))) for K in strikes]
    return {"calls": calls, "puts": puts}


# ──────────────────────────────────────────────────────────────────────
# SELF-TEST
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  PRICING ENGINE — Self-Test")
    print("=" * 60)

    params = load_calibration()
    S = params["spot"]
    r = 0.04
    K_atm = round(S)
    K_otm_put = round(S * 0.95)
    K_otm_call = round(S * 1.05)

    test_cases = [
        ("1day", 1 / 365.25),
        ("7day", 7 / 365.25),
        ("30day", 30 / 365.25),
    ]

    print(f"\n  Spot: ${S:,.2f} | r: {r} | N_paths: {DEFAULT_N_PATHS:,}")
    print(f"  Bates params loaded: κ={params['bates']['kappa']:.1f}, "
          f"θ={params['bates']['theta']:.4f}, ξ={params['bates']['xi']:.1f}, "
          f"ρ={params['bates']['rho']:.4f}, v₀={params['bates']['v0']:.4f}")
    print(f"  λ={params['bates']['lambda']:.1f}/yr, "
          f"μ_J={params['bates']['mu_j']:.6f}, σ_J={params['bates']['sigma_j']:.6f}")

    print(f"\n{'Mat':<8} {'Strike':<12} {'Type':<6} {'Bates':>10} {'Heston':>10} {'Merton':>10}")
    print("-" * 60)

    for mat_label, T in test_cases:
        for K, label in [(K_atm, "ATM"), (K_otm_put, "95%"), (K_otm_call, "105%")]:
            bc = price_call_bates(S, K, T, r, params, seed=42)
            hc = price_option(S, K, T, r, params, is_call=True, model="heston", seed=42)
            mc = price_option(S, K, T, r, params, is_call=True, model="merton", seed=42)
            print(f"{mat_label:<8} ${K:>9,} {'C':>4}   ${bc:>9,.2f} ${hc:>9,.2f} ${mc:>9,.2f}")

            if label == "ATM":
                bp = price_put_bates(S, K, T, r, params, seed=42)
                print(f"{'':8} ${K:>9,} {'P':>4}   ${bp:>9,.2f}")

    print("\n  Grid pricing test (7day, 21 strikes)...")
    strikes = S * np.arange(0.90, 1.105, 0.01)
    grid = price_grid(S, strikes, 7 / 365.25, r, params, model="bates", seed=42)
    print(f"  ATM call: ${grid['calls'][10]:,.2f} | ATM put: ${grid['puts'][10]:,.2f}")
    print(f"  Min call: ${min(grid['calls']):,.2f} | Max call: ${max(grid['calls']):,.2f}")

    print(f"\n{'=' * 60}")
    print("  Self-test complete.")
    print(f"{'=' * 60}")
