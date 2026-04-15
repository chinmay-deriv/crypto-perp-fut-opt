"""
Unified Risk Engine — Combined Perpetual Futures & Vanilla Options
===================================================================
Simulates a mixed derivatives book where clients trade both BTC perpetual
futures and vanilla European options simultaneously.  Computes unified
portfolio Greeks (perps contribute only Delta; options contribute all
Greeks) and runs a single DGV-neutral hedge engine across both products.

Hybrid Greeks approach:
  - Bates MC Greeks (via greeks_engine) for static portfolio snapshots
  - BS analytical Greeks (fast) for dynamic simulation & rebalancing
"""

import json
import sys
from pathlib import Path

import numpy as np
from scipy.stats import norm as sp_norm

sys.path.insert(0, str(Path(__file__).parent))
from pricing_engine import load_calibration, bs_implied_vol

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data" / "unified-risk"


class NumpyEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, (np.integer,)):
            return int(o)
        if isinstance(o, (np.floating,)):
            return float(o)
        if isinstance(o, np.ndarray):
            return o.tolist()
        return super().default(o)


def save_json(data: dict, name: str):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"), cls=NumpyEncoder)
    print(f"  Saved {path.name} ({path.stat().st_size / 1024:.1f} KB)")


# ── BS analytical Greeks (fast, for portfolio & dynamic simulation) ───
def _bs_d1(S, K, T, r, sigma):
    T = max(T, 1e-10)
    return (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))


def _bs_greeks(S, K, T, r, sigma, is_call):
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


# ======================================================================
# STEP 1: Generate a mixed Perp + Options portfolio
# ======================================================================
def step1_unified_portfolio(params: dict) -> dict:
    print("\n=== Step 1: Unified Portfolio — Perps + Options ===")
    S = params["spot"]
    r = 0.04
    sigma_base = np.sqrt(params["bates"]["theta"])
    rng = np.random.RandomState(2024)

    # ── Generate perp positions ───────────────────────────────────────
    perp_positions = []
    for i in range(30):
        size = round(float(rng.uniform(0.5, 8.0)), 2)
        is_long = rng.random() < 0.55
        direction = 1 if is_long else -1
        leverage = int(rng.choice([2, 5, 10, 20, 50]))

        perp_positions.append({
            "id": f"P{i+1:02d}",
            "instrument": "perp",
            "type": "long" if is_long else "short",
            "size_btc": size,
            "leverage": leverage,
            "direction": direction,
            "delta": float(direction * size),
            "gamma": 0.0,
            "vega": 0.0,
            "theta": 0.0,
            "funding_exposure": True,
        })

    # ── Generate option positions ─────────────────────────────────────
    moneyness_pool = np.arange(0.92, 1.09, 0.02)
    mat_pool = {
        "7day": 7 / 365.25, "14day": 14 / 365.25,
        "30day": 30 / 365.25, "60day": 60 / 365.25,
        "90day": 90 / 365.25,
    }
    mat_labels = list(mat_pool.keys())
    mat_vals = list(mat_pool.values())

    option_positions = []
    for i in range(30):
        is_call = rng.random() < 0.55
        m = rng.choice(moneyness_pool)
        mi = rng.randint(len(mat_labels))
        notional = round(float(rng.uniform(0.5, 5.0)), 2)
        direction = -1 if rng.random() < 0.75 else 1

        K = round(S * m)
        T = mat_vals[mi]
        g = _bs_greeks(S, K, T, r, sigma_base, is_call)

        option_positions.append({
            "id": f"O{i+1:02d}",
            "instrument": "option",
            "type": "call" if is_call else "put",
            "strike": K,
            "moneyness": float(round(m, 2)),
            "maturity": mat_labels[mi],
            "T": float(T),
            "size_btc": notional,
            "direction": direction,
            "dir_label": "SHORT" if direction == -1 else "LONG",
            "price": float(g["price"]),
            "delta": float(g["delta"] * notional * direction),
            "gamma": float(g["gamma"] * notional * direction),
            "vega": float(g["vega"] * notional * direction),
            "theta": float(g["theta"] * notional * direction),
            "funding_exposure": False,
        })

    all_positions = perp_positions + option_positions

    # ── Aggregate Greeks ──────────────────────────────────────────────
    perp_greeks = {k: sum(p[k] for p in perp_positions) for k in ["delta", "gamma", "vega", "theta"]}
    opt_greeks = {k: sum(p[k] for p in option_positions) for k in ["delta", "gamma", "vega", "theta"]}
    combined = {k: perp_greeks[k] + opt_greeks[k] for k in ["delta", "gamma", "vega", "theta"]}

    print(f"  Perps:   {len(perp_positions)} positions | Δ={perp_greeks['delta']:.2f}")
    print(f"  Options: {len(option_positions)} positions | Δ={opt_greeks['delta']:.4f}  "
          f"Γ={opt_greeks['gamma']:.6f}  V=${opt_greeks['vega']:.2f}")
    print(f"  Combined: Δ={combined['delta']:.4f}  Γ={combined['gamma']:.6f}  "
          f"V=${combined['vega']:.2f}  Θ=${combined['theta']:.2f}")

    result = {
        "spot": S, "sigma_base": float(sigma_base), "risk_free_rate": r,
        "positions": all_positions,
        "perp_positions": perp_positions,
        "option_positions": option_positions,
        "n_perps": len(perp_positions),
        "n_options": len(option_positions),
        "n_total": len(all_positions),
        "perp_greeks": {k: float(v) for k, v in perp_greeks.items()},
        "option_greeks": {k: float(v) for k, v in opt_greeks.items()},
        "combined_greeks": {k: float(v) for k, v in combined.items()},
        "perp_notional_btc": float(sum(p["size_btc"] for p in perp_positions)),
        "option_notional_btc": float(sum(p["size_btc"] for p in option_positions)),
    }
    save_json(result, "portfolio.json")
    return result


# ======================================================================
# STEP 2: Trade-by-trade unified hedge engine
# ======================================================================
def step2_unified_hedge_engine(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 2: Unified Hedge Engine — Trade-by-Trade ===")
    S = portfolio["spot"]
    r = portfolio["risk_free_rate"]
    sigma_base = portfolio["sigma_base"]
    rng = np.random.RandomState(555)

    # Hedge instruments (same as options-risk page)
    T_A = 7 / 365.25
    T_B = 30 / 365.25
    K_A = round(S)
    K_B = round(S)
    gA = _bs_greeks(S, K_A, T_A, r, sigma_base, True)
    gB = _bs_greeks(S, K_B, T_B, r, sigma_base, True)

    moneyness_pool = np.arange(0.92, 1.09, 0.02)
    mat_pool = {"7day": 7 / 365.25, "14day": 14 / 365.25,
                "30day": 30 / 365.25, "60day": 60 / 365.25}
    mat_labels = list(mat_pool.keys())
    mat_vals = list(mat_pool.values())

    running_greeks = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0}
    hedge_history = []
    incoming_trades = []

    # Generate 40 mixed trades (60% perps, 40% options)
    for i in range(40):
        is_perp = rng.random() < 0.55

        if is_perp:
            size = round(float(rng.uniform(1.0, 10.0)), 2)
            is_long = rng.random() < 0.55
            direction = 1 if is_long else -1
            incoming_trades.append({
                "id": i + 1,
                "instrument": "perp",
                "type": "long" if is_long else "short",
                "size_btc": size,
                "desc_short": f"{'LONG' if is_long else 'SHORT'} {size} BTC Perp",
                "client_action": "LONG" if is_long else "SHORT",
                "delta": float(direction * size),
                "gamma": 0.0,
                "vega": 0.0,
                "theta": 0.0,
            })
        else:
            is_call = rng.random() < 0.55
            m = rng.choice(moneyness_pool)
            mi = rng.randint(len(mat_labels))
            notional = round(float(rng.uniform(0.5, 5.0)), 2)
            direction = -1 if rng.random() < 0.80 else 1
            K_t = round(S * m)
            T_t = mat_vals[mi]
            g = _bs_greeks(S, K_t, T_t, r, sigma_base, is_call)
            opt_type = "CALL" if is_call else "PUT"
            incoming_trades.append({
                "id": i + 1,
                "instrument": "option",
                "type": opt_type.lower(),
                "strike": K_t,
                "moneyness": float(round(m, 2)),
                "maturity": mat_labels[mi],
                "size_btc": notional,
                "client_action": "BUY" if direction == -1 else "SELL",
                "desc_short": (f"{'BUY' if direction == -1 else 'SELL'} {notional} BTC "
                               f"{opt_type} K={m:.2f} {mat_labels[mi]}"),
                "delta": float(g["delta"] * notional * direction),
                "gamma": float(g["gamma"] * notional * direction),
                "vega": float(g["vega"] * notional * direction),
                "theta": float(g["theta"] * notional * direction),
            })

    # Process each trade and compute hedge prescription
    for trade in incoming_trades:
        before = {k: float(v) for k, v in running_greeks.items()}

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

        residual_gamma = running_greeks["gamma"] + h_nA * gA["gamma"] + h_nB * gB["gamma"]
        residual_vega = running_greeks["vega"] + h_nA * gA["vega"] + h_nB * gB["vega"]

        hedge_history.append({
            "trade_id": trade["id"],
            "instrument": trade["instrument"],
            "trade_desc": trade["desc_short"],
            "trade_greeks": {k: trade[k] for k in ["delta", "gamma", "vega", "theta"]},
            "exposure_before": before,
            "exposure_after": {k: float(v) for k, v in running_greeks.items()},
            "hedge_prescription": {
                "spot_btc": float(round(h_spot, 4)),
                "option_a_qty": float(round(h_nA, 4)),
                "option_a_label": f"ATM 7d Call (K=${K_A:,})",
                "option_b_qty": float(round(h_nB, 4)),
                "option_b_label": f"ATM 30d Call (K=${K_B:,})",
            },
            "residual_greeks": {
                "delta": 0.0,
                "gamma": float(residual_gamma),
                "vega": float(residual_vega),
            },
        })

    print(f"  Processed {len(hedge_history)} mixed trades")
    print(f"  Final raw exposure: Δ={running_greeks['delta']:.4f}  "
          f"Γ={running_greeks['gamma']:.6f}  V=${running_greeks['vega']:.2f}")

    result = {
        "trades": incoming_trades,
        "hedge_history": hedge_history,
        "hedge_instruments": {
            "A": {"label": f"ATM 7d Call (K=${K_A:,})", "T": float(T_A),
                  "greeks": {k: float(v) for k, v in gA.items()}},
            "B": {"label": f"ATM 30d Call (K=${K_B:,})", "T": float(T_B),
                  "greeks": {k: float(v) for k, v in gB.items()}},
        },
        "spot": S,
        "n_perp_trades": sum(1 for t in incoming_trades if t["instrument"] == "perp"),
        "n_option_trades": sum(1 for t in incoming_trades if t["instrument"] == "option"),
    }
    save_json(result, "hedge_rebalance.json")
    return result


# ======================================================================
# STEP 3: Cross-product netting benefit analysis
# ======================================================================
def step3_netting_benefit(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 3: Cross-Product Netting Benefit ===")
    S = portfolio["spot"]
    r = portfolio["risk_free_rate"]
    sigma_base = portfolio["sigma_base"]

    T_A = 7 / 365.25
    T_B = 30 / 365.25
    K_h = round(S)
    gA = _bs_greeks(S, K_h, T_A, r, sigma_base, True)
    gB = _bs_greeks(S, K_h, T_B, r, sigma_base, True)

    def hedge_cost(greeks):
        """Compute total hedge notional (proxy for cost) for DGV-neutral."""
        det = gA["gamma"] * gB["vega"] - gA["vega"] * gB["gamma"]
        if abs(det) < 1e-12:
            return {"spot": abs(greeks["delta"]), "opt_a": 0.0, "opt_b": 0.0, "total": abs(greeks["delta"])}
        n_a = (-greeks["gamma"] * gB["vega"] + greeks["vega"] * gB["gamma"]) / det
        n_b = (-greeks["vega"] * gA["gamma"] + greeks["gamma"] * gA["vega"]) / det
        n_spot = abs(greeks["delta"] + n_a * gA["delta"] + n_b * gB["delta"])
        return {
            "spot_btc": float(round(n_spot, 4)),
            "opt_a_qty": float(round(abs(n_a), 4)),
            "opt_b_qty": float(round(abs(n_b), 4)),
            "total_notional": float(round(n_spot + abs(n_a) + abs(n_b), 4)),
        }

    perp_g = portfolio["perp_greeks"]
    opt_g = portfolio["option_greeks"]
    combined_g = portfolio["combined_greeks"]

    perp_hedge = hedge_cost(perp_g)
    opt_hedge = hedge_cost(opt_g)
    combined_hedge = hedge_cost(combined_g)

    separate_total = perp_hedge["total_notional"] + opt_hedge["total_notional"]
    netting_saving = separate_total - combined_hedge["total_notional"]
    netting_pct = (netting_saving / separate_total * 100) if separate_total > 0 else 0

    print(f"  Perps hedged separately:   total notional = {perp_hedge['total_notional']:.2f}")
    print(f"  Options hedged separately: total notional = {opt_hedge['total_notional']:.2f}")
    print(f"  Combined hedge:            total notional = {combined_hedge['total_notional']:.2f}")
    print(f"  Netting saving: {netting_saving:.2f} ({netting_pct:.1f}%)")

    # VaR comparison: separate vs combined
    rng = np.random.RandomState(42)
    n_sim = 10_000
    daily_vol = sigma_base / np.sqrt(365.25)

    def simulate_var(greeks):
        pnl = []
        for _ in range(n_sim):
            dS = rng.normal(0, daily_vol * S)
            dSig = rng.normal(0, sigma_base * 0.05)
            p = (greeks["delta"] * dS + 0.5 * greeks["gamma"] * dS**2
                 + greeks["vega"] * dSig * 100 + greeks["theta"])
            pnl.append(p)
        pnl = np.array(pnl)
        return {
            "var_95": float(np.percentile(pnl, 5)),
            "var_99": float(np.percentile(pnl, 1)),
            "cvar_99": float(pnl[pnl <= np.percentile(pnl, 1)].mean()),
            "std": float(np.std(pnl)),
        }

    rng = np.random.RandomState(42)
    perp_var = simulate_var(perp_g)
    rng = np.random.RandomState(42)
    opt_var = simulate_var(opt_g)
    rng = np.random.RandomState(42)
    combined_var = simulate_var(combined_g)

    separate_var99 = abs(perp_var["var_99"]) + abs(opt_var["var_99"])
    combined_var99 = abs(combined_var["var_99"])
    var_benefit = separate_var99 - combined_var99
    var_benefit_pct = (var_benefit / separate_var99 * 100) if separate_var99 > 0 else 0

    result = {
        "perp_greeks": {k: float(v) for k, v in perp_g.items()},
        "option_greeks": {k: float(v) for k, v in opt_g.items()},
        "combined_greeks": {k: float(v) for k, v in combined_g.items()},
        "perp_hedge": perp_hedge,
        "option_hedge": opt_hedge,
        "combined_hedge": combined_hedge,
        "separate_total_notional": float(separate_total),
        "netting_saving": float(netting_saving),
        "netting_saving_pct": float(netting_pct),
        "var_comparison": {
            "perp": perp_var,
            "option": opt_var,
            "combined": combined_var,
            "separate_var99_sum": float(separate_var99),
            "combined_var99": float(combined_var99),
            "diversification_benefit_usd": float(var_benefit),
            "diversification_benefit_pct": float(var_benefit_pct),
        },
    }
    save_json(result, "netting_benefit.json")
    return result


# ======================================================================
# STEP 4: Dynamic hedging simulation (14 days, mixed book)
# ======================================================================
def step4_dynamic_simulation(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 4: Dynamic Hedging Simulation (14 days) ===")
    S0 = portfolio["spot"]
    r = portfolio["risk_free_rate"]
    sigma_base = portfolio["sigma_base"]
    positions = portfolio["positions"]

    sim_kappa = 5.0
    sim_xi_vol = 0.8
    sim_lam = 24.0
    sim_mu_j = -0.002
    sim_sig_j = 0.02
    sim_k_jump = np.exp(sim_mu_j + 0.5 * sim_sig_j**2) - 1.0

    T_sim = 14 / 365.25
    dt_path = 1 / (365.25 * 6)  # 4h steps
    n_steps = int(T_sim / dt_path)
    sqrt_dt = np.sqrt(dt_path)

    # ── Simulate BTC price + vol path ─────────────────────────────────
    rng_path = np.random.RandomState(2024)
    spot_path = np.zeros(n_steps + 1)
    sigma_path = np.zeros(n_steps + 1)
    spot_path[0] = S0
    sigma_path[0] = sigma_base

    # Synthetic funding rate path (8h = every 2 steps)
    funding_rates = []

    for i in range(n_steps):
        z1 = rng_path.standard_normal()
        z2 = rng_path.standard_normal()
        zv = -0.3 * z1 + np.sqrt(0.91) * z2
        sig_i = max(sigma_path[i], 0.05)

        nj = rng_path.poisson(sim_lam * dt_path)
        tj = (rng_path.normal(sim_mu_j * nj, sim_sig_j * np.sqrt(max(nj, 0)))
              if nj > 0 else 0.0)
        spot_path[i + 1] = spot_path[i] * np.exp(
            (r - sim_lam * sim_k_jump - 0.5 * sig_i**2) * dt_path
            + sig_i * sqrt_dt * z1 + tj)

        dsig = (sim_kappa * (sigma_base - sig_i) * dt_path
                + sim_xi_vol * sig_i * sqrt_dt * zv)
        sigma_path[i + 1] = max(sig_i + dsig, 0.05)

        if i % 2 == 1:
            premium = (spot_path[i + 1] - spot_path[i]) / spot_path[i] * 100
            funding_rates.append(max(min(premium * 0.01, 0.03), -0.03))

    # ── Hedge instruments ─────────────────────────────────────────────
    T_CM_A = 7 / 365.25
    T_CM_B = 30 / 365.25
    K_hedge = round(S0)

    strat_names = ["unhedged", "delta_only", "delta_gamma_vega"]
    hedge_pos = {s: {"spot": 0.0, "opt_a": 0.0, "opt_b": 0.0} for s in strat_names}
    cum_pnl = {s: [0.0] for s in strat_names}
    cum_funding = [0.0]

    net_delta_ts = {s: [] for s in strat_names}
    net_gamma_ts = {s: [] for s in strat_names}
    net_vega_ts = {s: [] for s in strat_names}

    perp_delta_ts = []
    opt_delta_ts = []

    attr_delta, attr_gamma, attr_vega, attr_theta, attr_resid = [], [], [], [], []

    prev_S = None
    prev_sig = None
    prev_port_val = None
    prev_pg = None

    rebal_indices = list(range(0, n_steps + 1))
    timestamps = [float(i * dt_path * 365.25) for i in rebal_indices]
    funding_idx = 0

    for step_i, idx in enumerate(rebal_indices):
        S_now = float(spot_path[idx])
        sig_now = float(sigma_path[idx])
        t_elapsed = idx * dt_path

        # ── Compute portfolio value and Greeks ────────────────────────
        port_val = 0.0
        pg = {"delta": 0.0, "gamma": 0.0, "vega": 0.0, "theta": 0.0}
        perp_d = 0.0
        opt_d = 0.0

        for p in positions:
            if p["instrument"] == "perp":
                d = p["direction"] * p["size_btc"]
                perp_d += d
                pg["delta"] += d
            else:
                T_rem = max(p["T"] - t_elapsed, 1e-10)
                if T_rem < 1e-8:
                    continue
                g = _bs_greeks(S_now, p["strike"], T_rem, r, sig_now,
                               p["type"] == "call")
                n = p["size_btc"] * p["direction"]
                port_val += g["price"] * n
                opt_d += g["delta"] * n
                pg["delta"] += g["delta"] * n
                pg["gamma"] += g["gamma"] * n
                pg["vega"] += g["vega"] * n
                pg["theta"] += g["theta"] * n

        # Perp value: mark-to-market on spot
        for p in positions:
            if p["instrument"] == "perp":
                port_val += p["direction"] * p["size_btc"] * S_now

        perp_delta_ts.append(float(perp_d))
        opt_delta_ts.append(float(opt_d))

        # ── Hedge option instruments ──────────────────────────────────
        ha = _bs_greeks(S_now, K_hedge, T_CM_A, r, sig_now, True)
        hb = _bs_greeks(S_now, K_hedge, T_CM_B, r, sig_now, True)

        # ── P&L computation ───────────────────────────────────────────
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

            # Funding P&L on perp positions (every 2 steps = 8h)
            if idx % 2 == 0 and funding_idx < len(funding_rates):
                net_perp_btc = sum(p["direction"] * p["size_btc"]
                                   for p in positions if p["instrument"] == "perp")
                f_pnl = -net_perp_btc * funding_rates[funding_idx] * S_now / 100
                cum_funding.append(cum_funding[-1] + f_pnl)
                funding_idx += 1
            else:
                cum_funding.append(cum_funding[-1])

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

        # ── Set hedge positions for next step ─────────────────────────
        for s in strat_names:
            if s == "unhedged":
                hedge_pos[s] = {"spot": 0.0, "opt_a": 0.0, "opt_b": 0.0}
                net_d, net_g, net_v = pg["delta"], pg["gamma"], pg["vega"]
            elif s == "delta_only":
                hedge_pos[s] = {"spot": -pg["delta"], "opt_a": 0.0, "opt_b": 0.0}
                net_d, net_g, net_v = 0.0, pg["gamma"], pg["vega"]
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
                net_d, net_g, net_v = 0.0, 0.0, 0.0
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

    for s in strat_names:
        print(f"  {s:>20}: final P&L = ${cum_pnl[s][-1]:,.2f}")

    result = {
        "spot_path": spot_path[::step_size].tolist(),
        "sigma_path": (sigma_path[::step_size] * 100).tolist(),
        "timestamps": timestamps[::step_size],
        "n_rebalances": len(rebal_indices),
        "rebal_frequency": "4h",
        "strategies": {},
        "perp_delta": perp_delta_ts[::step_size],
        "option_delta": opt_delta_ts[::step_size],
        "funding_pnl": cum_funding[::step_size],
        "pnl_attribution": {k: v[::step_size] for k, v in cum_attr.items()},
        "pnl_attribution_final": attr_final,
    }

    for s in strat_names:
        pnl_arr = cum_pnl[s]
        result["strategies"][s] = {
            "pnl": [pnl_arr[i] for i in range(0, len(pnl_arr), step_size)],
            "net_delta": net_delta_ts[s][::step_size],
            "net_gamma": net_gamma_ts[s][::step_size],
            "net_vega": net_vega_ts[s][::step_size],
            "final_pnl": float(pnl_arr[-1]),
        }

    save_json(result, "dynamic_sim.json")
    return result


# ======================================================================
# STEP 5: Combined stress testing & VaR
# ======================================================================
def step5_stress_tests(params: dict, portfolio: dict) -> dict:
    print("\n=== Step 5: Combined Stress Testing & VaR ===")
    S = portfolio["spot"]
    sigma_base = portfolio["sigma_base"]
    r = portfolio["risk_free_rate"]
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

    def portfolio_value(S_v, sig_v):
        val = 0.0
        for p in positions:
            if p["instrument"] == "perp":
                val += p["direction"] * p["size_btc"] * S_v
            else:
                g = _bs_greeks(S_v, p["strike"], p["T"], r, sig_v,
                               p["type"] == "call")
                val += g["price"] * p["size_btc"] * p["direction"]
        return val

    base_val = portfolio_value(S, sigma_base)

    # ── Per-product stress breakdown ──────────────────────────────────
    for sc in scenarios:
        S_shock = S * (1 + sc["spot_shock"])
        sig_shock = sigma_base * (1 + sc["vol_shock"])

        perp_pnl = 0.0
        opt_pnl = 0.0
        for p in positions:
            if p["instrument"] == "perp":
                perp_pnl += p["direction"] * p["size_btc"] * (S_shock - S)
            else:
                g_base = _bs_greeks(S, p["strike"], p["T"], r, sigma_base, p["type"] == "call")
                g_shock = _bs_greeks(S_shock, p["strike"], p["T"], r, sig_shock, p["type"] == "call")
                opt_pnl += (g_shock["price"] - g_base["price"]) * p["size_btc"] * p["direction"]

        sc["perp_pnl"] = float(perp_pnl)
        sc["option_pnl"] = float(opt_pnl)
        sc["total_pnl"] = float(perp_pnl + opt_pnl)
        sc["pnl_pct"] = float((perp_pnl + opt_pnl) / abs(base_val) * 100) if base_val != 0 else 0
        print(f"  {sc['name']:>24}: Perp=${perp_pnl:>10,.2f}  Opt=${opt_pnl:>10,.2f}  "
              f"Total=${sc['total_pnl']:>10,.2f}")

    # ── Monte Carlo VaR ───────────────────────────────────────────────
    combined_g = portfolio["combined_greeks"]
    rng_mc = np.random.RandomState(999)
    n_var = 10_000
    daily_vol = sigma_base / np.sqrt(365.25)

    var_pnl = []
    perp_pnl_mc = []
    opt_pnl_mc = []

    perp_net_delta = portfolio["perp_greeks"]["delta"]
    for _ in range(n_var):
        dS = rng_mc.normal(0, daily_vol * S)
        dSig = rng_mc.normal(0, sigma_base * 0.05)

        p_perp = perp_net_delta * dS
        p_opt = ((combined_g["delta"] - perp_net_delta) * dS
                 + 0.5 * combined_g["gamma"] * dS**2
                 + combined_g["vega"] * dSig * 100
                 + combined_g["theta"])
        var_pnl.append(p_perp + p_opt)
        perp_pnl_mc.append(p_perp)
        opt_pnl_mc.append(p_opt)

    var_pnl = np.array(var_pnl)
    var_95 = float(np.percentile(var_pnl, 5))
    var_99 = float(np.percentile(var_pnl, 1))
    cvar_99 = float(var_pnl[var_pnl <= var_99].mean()) if np.any(var_pnl <= var_99) else var_99

    var_hist = np.histogram(var_pnl, bins=80)

    print(f"  VaR 95%=${var_95:,.2f}  VaR 99%=${var_99:,.2f}  CVaR 99%=${cvar_99:,.2f}")

    result = {
        "scenarios": scenarios,
        "base_value": float(base_val),
        "var": {
            "var_95": var_95, "var_99": var_99, "cvar_99": cvar_99,
            "n_simulations": n_var,
            "histogram_counts": var_hist[0].tolist(),
            "histogram_edges": var_hist[1].tolist(),
            "perp_contribution_std": float(np.std(perp_pnl_mc)),
            "option_contribution_std": float(np.std(opt_pnl_mc)),
        },
    }
    save_json(result, "stress_tests.json")
    return result


# ======================================================================
# MAIN
# ======================================================================
def main():
    print("=" * 60)
    print("  UNIFIED RISK ENGINE — Perps + Options Combined")
    print("=" * 60)

    params = load_calibration()
    print(f"\n  Loaded calibration: spot=${params['spot']:,.2f}")

    portfolio = step1_unified_portfolio(params)
    step2_unified_hedge_engine(params, portfolio)
    step3_netting_benefit(params, portfolio)
    step4_dynamic_simulation(params, portfolio)
    step5_stress_tests(params, portfolio)

    print(f"\n{'=' * 60}")
    print("  All done. JSON data written to public/data/unified-risk/")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
