"""
Options Greeks Engine
=====================
Computes Delta, Gamma, Vega, Theta, Vanna, Volga for European options
under the Bates model using central finite differences with Common
Random Numbers (CRN).

Also computes smile-risk sensitivities: dC/dξ, dC/dρ, dC/dλ.

Scaling conventions (all chosen for risk-management usefulness):
  Delta : ∂C/∂S            — per $1 spot move   (0→1 calls, −1→0 puts)
  Gamma : ∂²C/∂S²          — per ($1)²; also gamma_pct = Γ·S·0.01
                              (delta change for a 1 % spot move)
  Vega  : [C(σ+1 pp)−C(σ−1 pp)]/2  — $ P&L per 1 percentage-point
                                       move in instantaneous vol (√v₀)
  Theta : C(T−1 day)−C(T)           — $ P&L per calendar day
                                       (negative = time decay)
  Vanna : (cross finite-diff) / (4h) — delta change per 1 pp vol move
  Volga : C(v+)−2C+C(v−)            — vega change per 1 pp vol move ($)

Bump sizes:
  Spot  : ε_S = 0.001 · S  (0.1 % relative)
  Vol   : ε_σ = 0.01       (1 percentage point in √v₀ terms)
  Time  : Δt  = 1/365.25   (1 calendar day)

Usage:
    from greeks_engine import compute_greeks_grid, compute_smile_risk_grid
    from pricing_engine import load_calibration
    params = load_calibration()
    greeks = compute_greeks_grid(S, strikes, T, r, params)
"""

import numpy as np
from copy import deepcopy
from typing import Optional, Dict, Any


# ──────────────────────────────────────────────────────────────────────
# OPTIMISED BATES MC (CRN-safe, vectorised jumps)
# ──────────────────────────────────────────────────────────────────────
def _mc_bates_crn(
    S: float, T: float, r: float, params: dict,
    n_paths: int, rng: np.random.RandomState,
) -> np.ndarray:
    """
    Bates MC with fully vectorised jumps and a *supplied* RandomState
    so that the caller can guarantee CRN across bumped evaluations.

    Key optimisation vs pricing_engine._mc_bates:
      If path i has n_i Poisson jumps of size J_k ~ N(μ_J, σ_J²),
      then Σ J_k ~ N(n_i·μ_J, n_i·σ_J²).  One normal draw per path
      replaces the Python-loop list comprehension → ~10× faster.
    """
    bp = params["bates"]
    kappa, theta, xi, rho = bp["kappa"], bp["theta"], bp["xi"], bp["rho"]
    v0 = bp["v0"]
    lam, mu_j, sigma_j = bp["lambda"], bp["mu_j"], bp["sigma_j"]
    k_jump = np.exp(mu_j + 0.5 * sigma_j ** 2) - 1.0

    dt = 1.0 / (365.25 * 24)
    n_steps = max(int(np.ceil(T / dt)), 1)
    dt_actual = T / n_steps
    sqrt_dt = np.sqrt(dt_actual)
    lam_dt = lam * dt_actual

    S_cur = np.full(n_paths, S, dtype=np.float64)
    v = np.full(n_paths, v0, dtype=np.float64)

    for _ in range(n_steps):
        z1 = rng.standard_normal(n_paths)
        z2 = rng.standard_normal(n_paths)
        zv = rho * z1 + np.sqrt(1.0 - rho ** 2) * z2

        v_pos = np.maximum(v, 0.0)
        sqrt_v = np.sqrt(v_pos)

        n_jumps = rng.poisson(lam_dt, n_paths)
        z_jump = rng.standard_normal(n_paths)
        total_jump = np.where(
            n_jumps > 0,
            mu_j * n_jumps + sigma_j * np.sqrt(n_jumps.astype(np.float64)) * z_jump,
            0.0,
        )

        S_cur *= np.exp(
            (r - lam * k_jump - 0.5 * v_pos) * dt_actual
            + sqrt_v * sqrt_dt * z1
            + total_jump
        )

        v = v + kappa * (theta - v) * dt_actual + xi * sqrt_v * sqrt_dt * zv
        v = np.maximum(v, 0.0)

    return S_cur


# ──────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────
def _bump_vol_parallel(params: dict, delta_sigma: float) -> dict:
    """
    Parallel vol shift: bump both √v₀ AND √θ by delta_sigma.

    With high κ (fast mean-reversion), v₀ is pulled to θ within hours,
    so bumping v₀ alone gives near-zero vega for any T > intraday.
    A parallel shift of the entire variance term structure is the
    standard risk-management convention for Heston/Bates models.
    """
    p = deepcopy(params)
    sqrt_v0 = np.sqrt(p["bates"]["v0"])
    sqrt_theta = np.sqrt(p["bates"]["theta"])
    p["bates"]["v0"] = max(sqrt_v0 + delta_sigma, 1e-6) ** 2
    p["bates"]["theta"] = max(sqrt_theta + delta_sigma, 1e-6) ** 2
    return p


def _bump_param(params: dict, section: str, key: str, delta: float) -> dict:
    """Return a copy with params[section][key] += delta."""
    p = deepcopy(params)
    p[section][key] = p[section][key] + delta
    return p


def _prices_from_terminal(
    S_T: np.ndarray, strikes: np.ndarray, discount: float,
) -> tuple:
    """Vectorised call/put pricing from terminal spot values."""
    payoff_c = np.maximum(S_T[np.newaxis, :] - strikes[:, np.newaxis], 0.0)
    payoff_p = np.maximum(strikes[:, np.newaxis] - S_T[np.newaxis, :], 0.0)
    return (
        discount * payoff_c.mean(axis=1),
        discount * payoff_p.mean(axis=1),
    )


# ──────────────────────────────────────────────────────────────────────
# CORE: GREEKS GRID
# ──────────────────────────────────────────────────────────────────────
def compute_greeks_grid(
    S: float,
    strikes: np.ndarray,
    T: float,
    r: float,
    params: dict,
    n_paths: int = 50_000,
    seed: int = 42,
    eps_s_rel: float = 0.001,
) -> Dict[str, Any]:
    """
    Compute all 6 Greeks for calls AND puts across an array of strikes
    at a single maturity T.

    10 MC evaluations per call, all with the same random seed (CRN):
      base, S±h, v₀±, T−dt, (S±h × v₀±) cross terms.

    Parameters
    ----------
    S          : spot price
    strikes    : 1-D array of strike prices
    T          : time to maturity in years
    r          : risk-free rate (annualised)
    params     : dict from load_calibration()
    n_paths    : MC paths (50 K default — CRN keeps noise low)
    seed       : random seed for CRN reproducibility
    eps_s_rel  : relative spot bump (0.001 = 0.1 %)

    Returns
    -------
    dict with keys:
      prices_call, prices_put,
      call_delta, put_delta,
      gamma, gamma_pct, gamma_cash,
      vega,
      call_theta, put_theta,
      vanna, volga
    """
    strikes = np.asarray(strikes, dtype=np.float64)
    eps_s = eps_s_rel * S
    EPS_VOL = 0.01
    DT_THETA_1D = 1.0 / 365.25
    dt_theta = min(DT_THETA_1D, T * 0.5) if T > 0 else 0
    can_theta = dt_theta > 1e-10

    def mc(S_i, T_i, p):
        rng = np.random.RandomState(seed)
        return _mc_bates_crn(S_i, T_i, r, p, n_paths, rng)

    p_vup = _bump_vol_parallel(params, +EPS_VOL)
    p_vdn = _bump_vol_parallel(params, -EPS_VOL)

    # ── 10 MC evaluations (CRN via identical seed) ──────────────────
    S_T_0 = mc(S, T, params)                     # 1  base
    S_T_su = mc(S + eps_s, T, params)             # 2  spot up
    S_T_sd = mc(S - eps_s, T, params)             # 3  spot down
    S_T_vu = mc(S, T, p_vup)                      # 4  vol up
    S_T_vd = mc(S, T, p_vdn)                      # 5  vol down
    S_T_tm = mc(S, T - dt_theta, params) if can_theta else None  # 6  theta
    S_T_su_vu = mc(S + eps_s, T, p_vup)           # 7  cross
    S_T_sd_vu = mc(S - eps_s, T, p_vup)           # 8  cross
    S_T_su_vd = mc(S + eps_s, T, p_vdn)           # 9  cross
    S_T_sd_vd = mc(S - eps_s, T, p_vdn)           # 10 cross

    disc = np.exp(-r * T)
    disc_tm = np.exp(-r * (T - dt_theta)) if can_theta else disc

    # ── price all strikes from each terminal distribution ───────────
    C0, P0 = _prices_from_terminal(S_T_0, strikes, disc)
    Cu, Pu = _prices_from_terminal(S_T_su, strikes, disc)
    Cd, Pd = _prices_from_terminal(S_T_sd, strikes, disc)
    Cv, Pv = _prices_from_terminal(S_T_vu, strikes, disc)
    Cvd, Pvd = _prices_from_terminal(S_T_vd, strikes, disc)
    if can_theta and S_T_tm is not None:
        Ct, Pt = _prices_from_terminal(S_T_tm, strikes, disc_tm)
    Cuv, _ = _prices_from_terminal(S_T_su_vu, strikes, disc)
    Cdv, _ = _prices_from_terminal(S_T_sd_vu, strikes, disc)
    Cuvd, _ = _prices_from_terminal(S_T_su_vd, strikes, disc)
    Cdvd, _ = _prices_from_terminal(S_T_sd_vd, strikes, disc)

    # ── DELTA  ∂C/∂S = [C(S+h) − C(S−h)] / 2h ─────────────────────
    call_delta = (Cu - Cd) / (2.0 * eps_s)
    put_delta = (Pu - Pd) / (2.0 * eps_s)

    # ── GAMMA  ∂²C/∂S² = [C(S+h) − 2C + C(S−h)] / h² ─────────────
    gamma = (Cu - 2.0 * C0 + Cd) / (eps_s ** 2)
    gamma_pct = gamma * S * 0.01
    gamma_cash = 0.5 * gamma * (S * 0.01) ** 2

    # ── VEGA   [C(σ+1pp) − C(σ−1pp)] / 2   ($ per 1pp vol) ────────
    vega = (Cv - Cvd) / 2.0

    # ── THETA  $ per calendar day ──────────────────────────────────
    #   For T ≥ 1d: θ = C(T−1d)−C(T), directly gives per-day decay.
    #   For T < 1d: θ = [C(T−dt)−C(T)] / dt × (1/365.25), scaled to $/day.
    if can_theta:
        raw_diff_c = Ct - C0
        raw_diff_p = Pt - P0
        scale = DT_THETA_1D / dt_theta
        call_theta = raw_diff_c * scale
        put_theta = raw_diff_p * scale
    else:
        call_theta = np.zeros_like(C0)
        put_theta = np.zeros_like(P0)

    # ── VANNA  cross FD  = [C(S+h,v+)−C(S−h,v+)−C(S+h,v−)+C(S−h,v−)] / 4h
    #           gives ∂Δ/∂σ per 1pp vol (scaling: eps_vol = 0.01 embedded)
    vanna = (Cuv - Cdv - Cuvd + Cdvd) / (4.0 * eps_s)

    # ── VOLGA  C(v+) − 2C + C(v−)   (vega change per 1pp vol, $) ───
    volga = Cv - 2.0 * C0 + Cvd

    return {
        "prices_call": C0.tolist(),
        "prices_put": P0.tolist(),
        "call_delta": call_delta.tolist(),
        "put_delta": put_delta.tolist(),
        "gamma": gamma.tolist(),
        "gamma_pct": gamma_pct.tolist(),
        "gamma_cash": gamma_cash.tolist(),
        "vega": vega.tolist(),
        "call_theta": call_theta.tolist(),
        "put_theta": put_theta.tolist(),
        "vanna": vanna.tolist(),
        "volga": volga.tolist(),
    }


# ──────────────────────────────────────────────────────────────────────
# SINGLE-OPTION GREEKS (convenience wrapper)
# ──────────────────────────────────────────────────────────────────────
def compute_greeks(
    S: float, K: float, T: float, r: float, params: dict,
    is_call: bool = True,
    n_paths: int = 50_000,
    seed: int = 42,
    eps_s_rel: float = 0.001,
) -> Dict[str, float]:
    """Compute all 6 Greeks for a single European option."""
    g = compute_greeks_grid(S, np.array([K]), T, r, params,
                            n_paths=n_paths, seed=seed, eps_s_rel=eps_s_rel)
    prefix = "call" if is_call else "put"
    return {
        "price": g[f"prices_{prefix}"][0],
        "delta": g[f"{prefix}_delta"][0],
        "gamma": g["gamma"][0],
        "gamma_pct": g["gamma_pct"][0],
        "gamma_cash": g["gamma_cash"][0],
        "vega": g["vega"][0],
        "theta": g[f"{prefix}_theta"][0],
        "vanna": g["vanna"][0],
        "volga": g["volga"][0],
    }


# ──────────────────────────────────────────────────────────────────────
# SMILE-RISK GREEKS: sensitivity to Bates model parameters
# ──────────────────────────────────────────────────────────────────────
def compute_smile_risk_grid(
    S: float,
    strikes: np.ndarray,
    T: float,
    r: float,
    params: dict,
    n_paths: int = 50_000,
    seed: int = 42,
) -> Dict[str, Any]:
    """
    Compute option price sensitivity to the three key Bates parameters
    that govern the IV smile shape:

      ξ  (vol-of-vol)    → smile curvature / wing richness
      ρ  (spot-vol corr) → skew direction
      λ  (jump intensity)→ tail weight / kurtosis

    Returns price change (call & put) per unit bump, plus IVs under
    each bumped scenario for visualising how the smile deforms.

    Bumps are chosen to give ~1 % relative change:
      Δξ = ξ × 0.01,   Δρ = 0.005,   Δλ = λ × 0.01
    """
    from pricing_engine import bs_implied_vol

    strikes = np.asarray(strikes, dtype=np.float64)

    xi_val = params["bates"]["xi"]
    rho_val = params["bates"]["rho"]
    lam_val = params["bates"]["lambda"]

    d_xi = xi_val * 0.01
    d_rho = 0.005
    d_lam = lam_val * 0.01

    def mc(p):
        rng = np.random.RandomState(seed)
        return _mc_bates_crn(S, T, r, p, n_paths, rng)

    disc = np.exp(-r * T)

    S_T_base = mc(params)
    C0, P0 = _prices_from_terminal(S_T_base, strikes, disc)

    results: Dict[str, Any] = {}

    for label, section, key, delta in [
        ("xi", "bates", "xi", d_xi),
        ("rho", "bates", "rho", d_rho),
        ("lambda", "bates", "lambda", d_lam),
    ]:
        p_up = _bump_param(params, section, key, +delta)
        p_dn = _bump_param(params, section, key, -delta)
        S_T_up = mc(p_up)
        S_T_dn = mc(p_dn)
        Cu, Pu = _prices_from_terminal(S_T_up, strikes, disc)
        Cd, Pd = _prices_from_terminal(S_T_dn, strikes, disc)

        call_sens = ((Cu - Cd) / (2.0 * delta)).tolist()
        put_sens = ((Pu - Pd) / (2.0 * delta)).tolist()

        iv_base = [bs_implied_vol(float(c), S, float(K), float(T), r, True)
                    for c, K in zip(C0, strikes)]
        iv_up = [bs_implied_vol(float(c), S, float(K), float(T), r, True)
                  for c, K in zip(Cu, strikes)]
        iv_dn = [bs_implied_vol(float(c), S, float(K), float(T), r, True)
                  for c, K in zip(Cd, strikes)]

        results[label] = {
            "bump_abs": float(delta),
            "bump_rel_pct": float(delta / abs(params["bates"].get(key, delta)) * 100)
                            if key != "rho" else None,
            "call_sens_per_unit": call_sens,
            "put_sens_per_unit": put_sens,
            "iv_base": [v * 100 if v else None for v in iv_base],
            "iv_up": [v * 100 if v else None for v in iv_up],
            "iv_dn": [v * 100 if v else None for v in iv_dn],
        }

    return results


# ──────────────────────────────────────────────────────────────────────
# SELF-TEST
# ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))
    from pricing_engine import load_calibration, bs_call, bs_put
    from scipy.stats import norm as sp_norm

    print("=" * 60)
    print("  GREEKS ENGINE — Self-Test")
    print("=" * 60)

    params = load_calibration()
    S = params["spot"]
    r = 0.04
    K = round(S)
    T = 7 / 365.25

    g = compute_greeks(S, K, T, r, params, is_call=True, seed=42)
    print(f"\n  ATM 7-day CALL (S=${S:,.0f}, K=${K:,})")
    print(f"    Price  = ${g['price']:,.2f}")
    print(f"    Delta  =  {g['delta']:.4f}")
    print(f"    Gamma  =  {g['gamma']:.2e}  (per $1)")
    print(f"    Gamma% =  {g['gamma_pct']:.4f}  (Δ change per 1% spot)")
    print(f"    Vega   = ${g['vega']:,.2f}  (per 1pp vol)")
    print(f"    Theta  = ${g['theta']:,.2f}  (per day)")
    print(f"    Vanna  =  {g['vanna']:.4f}  (Δ chg per 1pp vol)")
    print(f"    Volga  = ${g['volga']:,.2f}  (vega chg per 1pp vol)")

    g_p = compute_greeks(S, K, T, r, params, is_call=False, seed=42)
    print(f"\n  ATM 7-day PUT")
    print(f"    Price  = ${g_p['price']:,.2f}")
    print(f"    Delta  =  {g_p['delta']:.4f}")
    print(f"    Theta  = ${g_p['theta']:,.2f}")

    print(f"\n  Put-Call parity check: Delta_C - Delta_P = "
          f"{g['delta'] - g_p['delta']:.4f} (should be ≈1.0)")
    print(f"  Gamma_C = {g['gamma']:.2e}, Gamma_P = {g_p['gamma']:.2e} "
          f"(should match)")

    # BS analytical comparison for sanity
    bs_sigma = np.sqrt(params["bates"]["v0"])
    d1 = (np.log(S / K) + (r + 0.5 * bs_sigma ** 2) * T) / (bs_sigma * np.sqrt(T))
    bs_delta = float(sp_norm.cdf(d1))
    bs_vega = float(S * sp_norm.pdf(d1) * np.sqrt(T) * 0.01)
    print(f"\n  BS reference (σ=√v₀={bs_sigma:.4f}): Delta={bs_delta:.4f}, "
          f"Vega/1pp=${bs_vega:,.2f}")
    print(f"  Bates Delta={g['delta']:.4f}, Bates Vega=${g['vega']:,.2f}")

    print(f"\n{'=' * 60}")
    print("  Self-test complete.")
    print(f"{'=' * 60}")
