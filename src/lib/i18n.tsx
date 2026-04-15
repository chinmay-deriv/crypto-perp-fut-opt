"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type Lang = "en" | "ja";

interface I18nContextType {
  lang: Lang;
  toggle: () => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  toggle: () => {},
  t: (k) => k,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const toggle = useCallback(() => setLang((l) => (l === "en" ? "ja" : "en")), []);
  const t = useCallback(
    (key: string) => {
      if (lang === "en") return key;
      return JA[key] ?? key;
    },
    [lang]
  );
  return <I18nContext.Provider value={{ lang, toggle, t }}>{children}</I18nContext.Provider>;
}

export function LangToggle() {
  const { lang, toggle } = useI18n();
  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--accent)] transition-all shadow-lg"
      aria-label="Toggle language"
    >
      <span className={lang === "en" ? "opacity-100" : "opacity-40"}>EN</span>
      <span className="w-8 h-4 rounded-full bg-[#1e293b] relative inline-block">
        <span
          className="absolute top-0.5 w-3 h-3 rounded-full bg-[var(--accent)] transition-all"
          style={{ left: lang === "en" ? 2 : 18 }}
        />
      </span>
      <span className={lang === "ja" ? "opacity-100" : "opacity-40"}>JP</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// JAPANESE TRANSLATIONS
// Key = English string, Value = Japanese
// Financial/mathematical proper nouns are intentionally kept as-is:
//   Black-Scholes, GARCH, GJR-GARCH, Heston, Merton, Bates,
//   VWAP, OFI, VaR, CVaR, POC, BTC, BTCUSDT, UTC,
//   Greek symbols (κ, θ, ξ, ρ, σ, α, β, γ, ω, ν, λ, μ)
// ═══════════════════════════════════════════════════════════════

const JA: Record<string, string> = {
  // ── Home page ──
  "Crypto Derivatives Research": "暗号資産デリバティブ研究",
  "Quantitative analysis of Bitcoin derivative pricing and risk management — built from 15.6 million 1-second tick observations (BTCUSDT, Jan–Jun 2025).":
    "15.6百万件の1秒ティックデータ（BTCUSDT、2025年1月〜6月）に基づくビットコインデリバティブの定量的価格分析とリスク管理。",
  "15.6M ticks": "1,560万ティック",
  "1-second resolution": "1秒間隔",
  "6 months · Jan–Jun 2025": "6ヶ月間 · 2025年1月〜6月",
  "Crypto Options Pricing": "暗号資産オプション価格算定",
  "Quantitative Pricing Research": "定量的価格分析研究",
  "Multi-model options pricing analysis using Black-Scholes, GARCH, Heston, Merton, and Bates models. Includes return distributions, realized volatility, jump detection, model calibration, and full comparative analysis.":
    "Black-Scholes、GARCH、Heston、Merton、Batesモデルを用いたマルチモデルオプション価格分析。リターン分布、実現ボラティリティ、ジャンプ検出、モデル校正、包括的な比較分析を含む。",
  "5 pricing models with 50K Monte Carlo paths": "5つの価格モデル（50K Monte Carloパス）",
  "Interactive Black-Scholes repricing": "インタラクティブBlack-Scholes再価格計算",
  "IV smile & price divergence analysis": "IV スマイル＆価格乖離分析",
  "Jump detection & Merton parameters": "ジャンプ検出＆Mertonパラメータ",
  "GARCH, Heston, Merton, Bates calibration": "GARCH、Heston、Merton、Batesモデル校正",
  "Perpetual Futures Analytics": "無期限先物契約分析",
  "Exchange Risk & Microstructure": "取引所リスク＆マーケットマイクロストラクチャー",
  "Comprehensive perpetual contract analysis covering fair pricing (VWAP, mark price), order flow, funding rates, liquidation cascades, VaR/CVaR, margin calibration, and intraday seasonality.":
    "公正価格算出（VWAP、マーク価格）、オーダーフロー、ファンディングレート、清算カスケード、VaR/CVaR、証拠金設計、日中季節性を網羅する包括的な無期限契約分析。",
  "Fair price construction (VWAP, Mark Price)": "公正価格の構築（VWAP、マーク価格）",
  "Order flow imbalance & predictive signal": "オーダーフロー不均衡＆予測シグナル",
  "Funding rate simulation & basis trade P&L": "ファンディングレートシミュレーション＆ベーシス取引損益",
  "VaR, CVaR, max drawdown risk metrics": "VaR、CVaR、最大ドローダウンリスク指標",
  "Liquidation cascade & margin tier calibration": "清算カスケード＆証拠金ティア設計",
  "Explore Research": "研究を見る",

  // ── Shared ──
  "← Home": "← ホーム",
  "Data Source": "データソース",

  // ── Options sidebar & header ──
  "Crypto Options": "暗号資産オプション",
  "1. Returns": "1. リターン分布",
  "2. Volatility": "2. ボラティリティ",
  "3. Jumps": "3. ジャンプ",
  "4. Calibration": "4. モデル校正",
  "5. Pricing": "5. 価格算定",
  "6. Comparison": "6. 比較分析",
  "7. Insights": "7. 考察",
  "8. Conclusions": "8. 結論",
  "Crypto Vanilla Options Pricing": "暗号資産バニラオプション価格算定",
  "Quantitative analysis of Bitcoin derivative pricing using stochastic models — from 15.6 million 1-second observations to actionable option prices.":
    "確率モデルを用いたビットコインデリバティブの定量分析 — 1,560万件の1秒観測データから実用的なオプション価格を導出。",
  "Pricing Parameters": "価格算定パラメータ",
  "Spot Price ($)": "原資産価格（$）",
  "Risk-Free Rate (%)": "無リスク金利（%）",
  "BS Volatility (%)": "Black-Scholesボラティリティ（%）",

  // ── Section 1: Returns ──
  "1. Log Returns Distribution": "1. 対数リターン分布",
  "Multi-horizon log-return analysis revealing fat tails, skewness, and departures from normality that drive the need for advanced option pricing models.":
    "多時間軸の対数リターン分析により、ファットテール、歪度、正規分布からの乖離を明らかにし、高度なオプション価格モデルの必要性を示す。",
  "Horizon": "時間軸",
  "Count": "データ数",
  "Mean": "平均",
  "Std Dev": "標準偏差",
  "Skewness": "歪度",
  "Kurtosis": "尖度",
  "Min": "最小値",
  "Max": "最大値",

  // ── Section 2: Volatility ──
  "2. Realized Volatility Estimation": "2. 実現ボラティリティ推定",
  "Four established estimators capture different aspects of price dynamics. The volatility signature plot reveals optimal sampling frequency, while intraday patterns show when markets are most active.":
    "4つの確立された推定手法がそれぞれ異なる価格動態を捉える。ボラティリティ・シグネチャープロットは最適なサンプリング頻度を示し、日中パターンは市場の活発な時間帯を明らかにする。",
  "Avg Vol": "平均ボラティリティ",

  // ── Section 3: Jumps ──
  "3. Jump Detection": "3. ジャンプ検出",
  "Identifying sudden discontinuous price movements using Bipower Variation (BNS test) and threshold-based detection. These jumps are critical for short-maturity option pricing.":
    "Bipower Variation（BNS検定）と閾値ベースの検出法を用いて突発的な不連続価格変動を特定。これらのジャンプは短期満期オプションの価格算定に極めて重要。",
  "Significant Jump Days": "有意なジャンプ日数",
  "Avg Jump % of RV": "RVに対するジャンプ平均%",
  "Threshold Jumps": "閾値超過ジャンプ数",
  "Avg Jumps/Day": "平均ジャンプ数/日",
  "Up / Down": "上昇 / 下降",
  "Merton Jump Parameters (from threshold detection)": "Mertonジャンプパラメータ（閾値検出に基づく）",

  // ── Section 4: Calibration ──
  "4. Model Calibration": "4. モデル校正（キャリブレーション）",
  "Each model is individually calibrated to the historical data. Parameters are estimated via maximum likelihood (GARCH), method of moments (Heston), jump catalog analysis (Merton), and combined assembly (Bates).":
    "各モデルは過去データに個別に校正。パラメータは最尤推定法（GARCH）、モーメント法（Heston）、ジャンプカタログ分析（Merton）、統合アセンブリ（Bates）により推定。",
  "Parameter": "パラメータ",
  "Symbol": "記号",
  "Value": "値",
  "Interpretation": "解釈",
  "GARCH(1,1) with Student-t Innovations": "Student-t分布イノベーション付きGARCH(1,1)",
  "GJR-GARCH (Asymmetric Leverage)": "GJR-GARCH（非対称レバレッジ効果）",
  "Heston Stochastic Volatility": "Heston確率ボラティリティモデル",
  "Merton Jump-Diffusion": "Mertonジャンプ拡散モデル",
  "Bates Model (Heston + Merton)": "Batesモデル（Heston + Merton統合）",
  "Bates = Heston stochastic vol + Merton jumps. 8 parameters total.":
    "Bates = Heston確率ボラティリティ + Mertonジャンプ。合計8パラメータ。",
  "Baseline variance floor": "分散のベースライン下限",
  "Shocks gradually decay": "ショックは徐々に減衰",
  "IGARCH — shocks never fully decay": "IGARCH — ショックは完全には減衰しない",
  "From Heston calibration": "Heston校正から導出",
  "From Merton calibration": "Merton校正から導出",
  "Current market condition": "現在の市場状況",
  "Smooth random walk component": "滑らかなランダムウォーク成分",
  "Near zero — jumps unbiased": "ほぼゼロ — ジャンプは偏りなし",
  "Combined diffusion + jumps": "拡散＋ジャンプの合成",
  "Contribution from jumps alone": "ジャンプ成分のみの寄与",
  "How volatile is volatility itself": "ボラティリティ自体の変動性",
  "Satisfied — variance stays positive": "充足 — 分散は正値を維持",
  "Not satisfied — variance can hit zero": "非充足 — 分散がゼロに到達する可能性",
  "Omega": "Omega（定数項）",
  "Alpha": "Alpha（ARCH項）",
  "Beta": "Beta（GARCH項）",
  "Gamma": "Gamma（非対称項）",
  "Persistence": "持続性",
  "Degrees of Freedom": "自由度",
  "Mean-Reversion Speed": "平均回帰速度",
  "Long-Run Variance": "長期分散",
  "Vol-of-Vol": "ボラティリティのボラティリティ",
  "Correlation": "相関係数",
  "Initial Variance": "初期分散",
  "Feller Condition": "Feller条件",
  "Diffusion Vol": "拡散ボラティリティ",
  "Jump Intensity": "ジャンプ強度",
  "Mean Jump Size": "平均ジャンプサイズ",
  "Jump Size Vol": "ジャンプサイズのボラティリティ",
  "Total Vol": "合計ボラティリティ",
  "Jump Vol Component": "ジャンプボラティリティ成分",
  "Initial Vol": "初期ボラティリティ",
  "Student-t tail parameter (lower = fatter tails)": "Student-t分布テールパラメータ（小さいほどファットテール）",

  // ── Section 5: Pricing ──
  "5. Option Pricing": "5. オプション価格算定",
  "Prices across 21 strikes and 7 maturities. BS is computed in real-time from your inputs — adjust parameters above to see instant recalculation. Other models use 100,000 Monte Carlo paths.":
    "21の行使価格と7つの満期にわたる価格算定。Black-Scholesは入力パラメータからリアルタイム計算 — 上部のパラメータを変更すると即座に再計算。他モデルは100,000 Monte Carloパスを使用。",
  "ATM Call Prices by Maturity": "ATMコール価格（満期別）",
  "Maturity": "満期",

  // ── Section 6: Comparison ──
  "6. Comparative Analysis": "6. 比較分析",
  "Implied volatility smiles, ATM term structure, and price divergences reveal how each model captures different aspects of market behavior.":
    "インプライドボラティリティスマイル、ATM期間構造、価格乖離の分析により、各モデルが市場の異なる側面をどう捉えるかを明示。",
  "ATM Implied Volatility by Model & Maturity": "モデル・満期別ATMインプライドボラティリティ",
  "Smile Steepness (IV₉₅% − IV₁₀₅%)": "スマイル勾配（IV₉₅% − IV₁₀₅%）",

  // ── Section 7: Miscellaneous ──
  "7. Additional Insights": "7. 追加的考察",
  "Variance decomposition, regime analysis, and theoretical considerations for practitioners.":
    "分散分解、レジーム分析、および実務家向けの理論的考察。",
  "Variance Decomposition": "分散分解",
  "How total variance splits between smooth diffusion and discontinuous jumps.":
    "総分散が滑らかな拡散成分と不連続なジャンプ成分にどう分解されるか。",
  "Total Annualized Vol": "年率換算総ボラティリティ",
  "Diffusion Component": "拡散成分",
  "Jump Component": "ジャンプ成分",
  "Feller Condition Analysis": "Feller条件分析",
  "The Feller condition (2κθ ≥ ξ²) ensures variance stays strictly positive in the Heston/Bates model.":
    "Feller条件（2κθ ≥ ξ²）はHeston/Batesモデルにおいて分散が厳密に正値を維持することを保証する。",
  "Feller condition satisfied. Variance process never touches zero — continuous paths guaranteed.":
    "Feller条件充足。分散過程はゼロに到達しない — 連続パスが保証される。",
  "Feller condition NOT satisfied. The variance process can reach zero, requiring absorption/reflection boundary. This is common for crypto (high vol-of-vol) and handled via full truncation in MC simulation.":
    "Feller条件非充足。分散過程がゼロに到達する可能性があり、吸収/反射境界が必要。暗号資産（高いvol-of-vol）では一般的であり、MCシミュレーションではフルトランケーションで処理。",
  "Volatility Regime Analysis": "ボラティリティレジーム分析",
  "Long-Run 5min Vol": "長期5分ボラティリティ",
  "Half-Life of Shocks": "ショックの半減期",
  "Parameter Sensitivity Notes": "パラメータ感応度ノート",

  // ── Section 8: Conclusions ──
  "8. Final Comparison & Conclusions": "8. 最終比較と結論",
  "Model Feature Comparison": "モデル機能比較",
  "Model": "モデル",
  "Features": "特徴",
  "Strengths": "強み",
  "Weaknesses": "弱み",
  "Best For": "最適な用途",
  "Key Research Findings": "主要な研究知見",
  "Recommended Model by Maturity Horizon": "満期別推奨モデル",
  "Limitations & Next Steps": "制約事項と今後の課題",

  "Constant vol, no jumps": "一定ボラティリティ、ジャンプなし",
  "Analytical, fast, universal baseline": "解析解あり、高速、普遍的ベースライン",
  "Flat IV smile, misprices tails": "平坦なIVスマイル、テールのミスプライシング",
  "Quick benchmarking": "簡易ベンチマーク",
  "Time-varying vol, clustering": "時変ボラティリティ、クラスタリング",
  "Captures vol persistence, discrete-time": "ボラティリティの持続性を捕捉、離散時間",
  "No stochastic vol, no jumps": "確率的ボラティリティなし、ジャンプなし",
  "Short-term vol forecasting": "短期ボラティリティ予測",
  "Stochastic vol, mean-reverting, correlated": "確率的ボラティリティ、平均回帰、相関あり",
  "IV smile, semi-analytical, fast calibration": "IVスマイル、半解析的、高速校正",
  "No jumps, Feller often violated in crypto": "ジャンプなし、暗号資産ではFeller条件未充足が頻繁",
  "Medium-term (7-30 day) options": "中期（7〜30日）オプション",
  "Constant vol + Poisson jumps": "一定ボラティリティ＋Poissonジャンプ",
  "Fat tails, crash risk pricing": "ファットテール、暴落リスクの価格算定",
  "No vol clustering, constant between jumps": "ボラティリティクラスタリングなし、ジャンプ間は一定",
  "Short-maturity (<1 day) options": "短期満期（1日未満）オプション",
  "Stochastic vol + jumps (8 params)": "確率的ボラティリティ＋ジャンプ（8パラメータ）",
  "Most realistic, captures all features": "最も現実的、全特徴を捕捉",
  "Hardest to calibrate, most parameters": "校正が最も困難、パラメータ最多",
  "Full-spectrum pricing (1hr–30 days)": "全スペクトラム価格算定（1時間〜30日）",

  "Extreme Fat Tails": "極端なファットテール",
  "BTC 1-second returns show kurtosis >50, far exceeding the normal distribution's value of 3. This means catastrophic moves occur routinely — every option pricing model must account for this.":
    "BTCの1秒リターンは尖度50超を示し、正規分布の値3を大幅に超える。壊滅的な価格変動が日常的に発生しており、全てのオプション価格モデルがこれを考慮する必要がある。",
  "Jumps Dominate Short Maturities": "短期満期ではジャンプが支配的",
  "For options expiring in <1 day, jump risk is the primary pricing factor. Merton and Bates price these 20-50% higher than Black-Scholes, correctly reflecting the true risk.":
    "1日未満で満期を迎えるオプションでは、ジャンプリスクが主要な価格決定要因。MertonとBatesはBlack-Scholesより20〜50%高い価格を算出し、真のリスクを正確に反映。",
  "Vol-of-Vol Creates Smile": "Vol-of-Volがスマイルを形成",
  "The IV smile (higher implied vol for OTM options) is primarily driven by stochastic volatility (Heston's ξ parameter). Without it, models produce flat smiles that underestimate tail risk.":
    "IVスマイル（OTMオプションの高いインプライドボラティリティ）は主にHestonのξパラメータ（確率的ボラティリティ）により駆動。これなしではモデルは平坦なスマイルを生成し、テールリスクを過小評価。",
  "Convergence at Long Maturities": "長期満期での収束",
  "As maturity increases to 14-30 days, all models converge toward Black-Scholes pricing. Mean reversion smooths out short-term effects, and the Central Limit Theorem begins to apply.":
    "満期が14〜30日に延びると、全モデルがBlack-Scholes価格に収束。平均回帰が短期効果を平滑化し、中心極限定理が適用され始める。",
  "Bates = Industry Standard": "Bates = 業界標準モデル",
  "The Bates model (Heston + Merton) provides the best coverage across all maturities, correctly pricing both the IV smile and fat tails. It is the standard for crypto options desks at institutional firms.":
    "Batesモデル（Heston + Merton）は全満期にわたり最良のカバレッジを提供し、IVスマイルとファットテールの両方を正確に価格算定。機関投資家の暗号資産オプションデスクでの業界標準。",

  "Short (< 1 day)": "短期（1日未満）",
  "Merton / Bates": "Merton / Bates",
  "Jumps dominate. Need explicit jump modeling for accurate pricing.":
    "ジャンプが支配的。正確な価格算定には明示的なジャンプモデルが必要。",
  "Medium (1-7 days)": "中期（1〜7日）",
  "Both stochastic vol and jumps material. Bates captures both.":
    "確率的ボラティリティとジャンプの両方が重要。Batesは両方を捕捉。",
  "Longer (7-30 days)": "長期（7〜30日）",
  "Heston / Bates": "Heston / Bates",
  "Jumps smooth out. Stochastic vol still important for smile.":
    "ジャンプは平滑化。スマイル形成には確率的ボラティリティが依然重要。",

  "Calibration uses method-of-moments (fast but less precise than MLE or joint calibration to IV surface).":
    "校正にはモーメント法を使用（MLEやIVサーフェスへの同時校正より高速だが精度は劣る）。",
  "No market IV data — all IVs are model-implied. Live option market data would allow proper calibration.":
    "市場IVデータなし — 全IVはモデルから導出。ライブオプション市場データがあれば適切な校正が可能。",
  "Constant risk-free rate assumed. In crypto, funding rates and lending rates are highly variable.":
    "無リスク金利を一定と仮定。暗号資産ではファンディングレートと貸出金利は大きく変動。",
  "No transaction costs, margin requirements, or market impact modeled.":
    "取引コスト、証拠金要件、マーケットインパクトは未モデル化。",
  "Bates model parameters are assembled (Heston + Merton separately); joint calibration would be ideal.":
    "Batesモデルのパラメータは個別に組み立て（Heston + Merton別々）；同時校正が理想的。",

  // ── Perpetuals sidebar & header ──
  "Perpetual Futures": "無期限先物契約",
  "Overview": "概要",
  "2. VWAP": "2. VWAP",
  "3. Order Flow": "3. オーダーフロー",
  "4. Realized Vol": "4. 実現ボラティリティ",
  "5. Micro-Spread": "5. マイクロスプレッド",
  "6. Volume Profile": "6. 出来高プロファイル",
  "7. Funding Rate": "7. ファンディングレート",
  "8. Mark Price": "8. マーク価格",
  "9. VaR / CVaR": "9. VaR / CVaR",
  "10. Liquidation": "10. 清算分析",
  "11. Seasonality": "11. 季節性",
  "12. ACF & Hurst": "12. 自己相関 & Hurst",
  "13. Tail Risk": "13. テールリスク",
  "14. Margin Tiers": "14. 証拠金ティア",
  "Fair pricing, microstructure, risk management & margin calibration for BTC perpetual contracts — from 15.6 million 1-second observations.":
    "BTC無期限契約の公正価格算出、マイクロストラクチャー、リスク管理、証拠金設計 — 1,560万件の1秒観測データに基づく。",
  "14 Analysis Steps": "14の分析ステップ",

  // ── Perp sections ──
  "Overview — BTCUSDT Perpetual": "概要 — BTCUSDT無期限契約",
  "Total Rows": "総データ行数",
  "Period": "期間",
  "Price Range": "価格レンジ",
  "Avg Daily Vol": "平均日次出来高",

  "Step 1 — Log Returns": "ステップ1 — 対数リターン",
  "Log returns are the building block of all quantitative finance — additive over time, enabling cleaner statistical analysis.":
    "対数リターンは定量的金融の基本構成要素 — 時間を通じて加法性を持ち、より精緻な統計分析を可能にする。",

  "Step 2 — VWAP: Volume-Weighted Average Price": "ステップ2 — VWAP：出来高加重平均価格",
  "Mean Deviation": "平均偏差",
  "Std Deviation": "偏差の標準偏差",
  "Median Dev": "中央偏差",

  "Step 3 — Order Flow Imbalance": "ステップ3 — オーダーフロー不均衡",
  "OFI = (taker_buy − taker_sell) / total_volume. Measures who is aggressively buying vs selling.":
    "OFI = (テイカー買い − テイカー売り) / 総出来高。積極的な買い手と売り手のバランスを測定。",

  "Step 4 — Realized Volatility": "ステップ4 — 実現ボラティリティ",
  "Avg 30d Vol": "30日平均ボラティリティ",
  "Peak Vol": "ピークボラティリティ",
  "Peak Date": "ピーク日",
  "Min Vol": "最低ボラティリティ",

  "Step 5 — Micro-Spread": "ステップ5 — マイクロスプレッド",
  "Mean Spread": "平均スプレッド",
  "Tightest Hour": "最狭時間帯",
  "Widest Hour": "最広時間帯",

  "Step 6 — Volume Profile": "ステップ6 — 出来高プロファイル",
  "Point of Control": "ポイントオブコントロール（POC）",
  "Value Area Low": "バリューエリア下限",
  "Value Area High": "バリューエリア上限",
  "VA Width": "バリューエリア幅",

  "Step 7 — Funding Rate": "ステップ7 — ファンディングレート",
  "The engine that keeps perpetual contracts anchored to spot. Positive = longs pay shorts. Standard 8h interval.":
    "無期限契約を現物価格に連動させる仕組み。正 = ロングがショートに支払い。標準8時間間隔。",
  "Mean per 8h": "8時間あたり平均",
  "Positive %": "正の割合",
  "Ann. Yield": "年率利回り",
  "6m Cumulative": "6ヶ月累計",

  "Step 8 — Mark Price Construction": "ステップ8 — マーク価格の構築",
  "Mark Price = VWAP + EMA-smoothed basis. The price that determines liquidations — smooths out short-lived spikes.":
    "マーク価格 = VWAP + EMA平滑化ベーシス。清算を決定する価格 — 短期的なスパイクを平滑化。",
  "Mean |Close−Mark|": "平均|終値−マーク|",
  "Median": "中央値",

  "Step 9 — VaR, CVaR & Maximum Drawdown": "ステップ9 — VaR、CVaR、最大ドローダウン",
  "Confidence": "信頼水準",
  "Hourly VaR": "時間VaR",
  "Hourly CVaR": "時間CVaR",
  "Daily VaR": "日次VaR",
  "Daily CVaR": "日次CVaR",

  "Step 10 — Liquidation Cascade Analysis": "ステップ10 — 清算カスケード分析",
  "24h Long Liquidation Probability": "24時間ロング清算確率",
  "Leverage": "レバレッジ",
  "Probability": "確率",
  "Risk Level": "リスクレベル",

  "Step 11 — Intraday Seasonality": "ステップ11 — 日中季節性",

  "Step 12 — Autocorrelation & Hurst Exponent": "ステップ12 — 自己相関＆Hurst指数",

  "Step 13 — Tail Risk & Extreme Events": "ステップ13 — テールリスク＆極端事象",
  "Threshold": "閾値",
  "Actual Days": "実際の日数",
  "Normal Expects": "正規分布予測",
  "Ratio": "倍率",

  "Step 14 — Margin Tier Calibration": "ステップ14 — 証拠金ティア設計",
  "24h Max Adverse Excursion Percentiles": "24時間最大不利方向変動パーセンタイル",
  "Margin Tier Table": "証拠金ティア表",
  "Init Margin": "初期証拠金",
  "Maint Margin": "維持証拠金",
  "24h Liq Prob": "24時間清算確率",
  "Risk": "リスク",

  "Summary — Complete Perpetual Futures Analytics Stack": "まとめ — 無期限先物契約分析の全体像",
  "What We Built": "構築した分析体系",
  "Part 1 — Data & EDA": "パート1 — データ＆探索的分析",
  "Price & Volume Overview": "価格＆出来高概要",
  "Part 2 — Fair Price Primitives": "パート2 — 公正価格の構成要素",
  "Steps 1–6": "ステップ1〜6",
  "Returns, VWAP, order flow, realized vol, micro-spread, volume profile.":
    "リターン、VWAP、オーダーフロー、実現ボラティリティ、マイクロスプレッド、出来高プロファイル。",
  "Part 3 — Exchange Risk & Operations": "パート3 — 取引所リスク＆運営",
  "Steps 7–14": "ステップ7〜14",
  "Funding rates, mark price, VaR/CVaR, liquidation, seasonality, tail risk, margin calibration.":
    "ファンディングレート、マーク価格、VaR/CVaR、清算、季節性、テールリスク、証拠金設計。",
  "What Comes Next for Production": "本番環境への展開",
  "Real-time data feeds for live mark price and funding calculations.":
    "リアルタイムデータフィードによるライブマーク価格＆ファンディング計算。",
  "Multi-asset support (ETH, SOL perpetuals with cross-margin).":
    "マルチアセット対応（ETH、SOL無期限契約のクロスマージン）。",
  "ADL (auto-deleveraging) engine when insurance fund is insufficient.":
    "保険基金不足時のADL（自動デレバレッジ）エンジン。",
  "Dynamic margin adjustment based on rolling volatility regime.":
    "ローリングボラティリティレジームに基づく動的証拠金調整。",
  "Order book depth analysis and market maker incentive modeling.":
    "板の厚み分析＆マーケットメイカーインセンティブモデリング。",

  // ── Footers ──
  "Crypto Options Pricing Research · Built with Next.js, Plotly.js, Python":
    "暗号資産オプション価格研究 · Next.js、Plotly.js、Pythonで構築",
  "Data: BTCUSDT 1-second klines, Binance, Jan–Jun 2025":
    "データ：BTCUSDT 1秒足、Binance、2025年1月〜6月",
  "Perpetual Futures Research · Next.js + Plotly.js + Python":
    "無期限先物契約研究 · Next.js + Plotly.js + Python",
  "Crypto Derivatives Research · BTCUSDT 1s Klines · Binance · Next.js + Plotly.js + Python":
    "暗号資産デリバティブ研究 · BTCUSDT 1秒足 · Binance · Next.js + Plotly.js + Python",

  // ── Redesigned home page ──
  "Live Research · BTCUSDT · 2025": "ライブ研究 · BTCUSDT · 2025",
  "Quantitative": "定量的",
  "Crypto": "暗号資産",
  "Built for": "あらゆる",
  "every derivative": "デリバティブに対応",
  "From vanilla options pricing to perpetual futures microstructure — comprehensive quantitative analysis across the full crypto derivatives stack.":
    "バニラオプション価格算定から無期限先物マイクロストラクチャーまで — 暗号資産デリバティブ全体にわたる包括的な定量分析。",
  "What's inside the": "研究の",
  "research": "中身",
  "End-to-end quantitative pipeline — from raw tick data to actionable pricing and risk analytics.":
    "エンドツーエンドの定量パイプライン — 生ティックデータから実用的な価格算定・リスク分析まで。",
  "Return Distributions": "リターン分布",
  "Fat tails & QQ plots": "ファットテール＆QQプロット",
  "Realized Volatility": "実現ボラティリティ",
  "4 estimator methods": "4つの推定手法",
  "Jump Detection": "ジャンプ検出",
  "BNS & threshold tests": "BNS＆閾値検定",
  "Model Calibration": "モデル校正",
  "MoM & MLE fitting": "モーメント法＆最尤推定",
  "Option Pricing": "オプション価格算定",
  "5 stochastic models": "5つの確率モデル",
  "VWAP & Mark Price": "VWAP＆マーク価格",
  "Fair price construction": "公正価格の構築",
  "Order Flow": "オーダーフロー",
  "OFI predictive signal": "OFI予測シグナル",
  "Funding Rates": "ファンディングレート",
  "Basis trade analysis": "ベーシス取引分析",
  "VaR & CVaR": "VaR＆CVaR",
  "Tail risk management": "テールリスク管理",
  "Margin Calibration": "証拠金設計",
  "Leverage tier design": "レバレッジティア設計",
  "Built on": "基盤は",
  "real market data": "実際の市場データ",
  "All analysis is derived from 15,638,400 one-second BTCUSDT klines sourced from Binance, spanning January to June 2025. Models are calibrated to this production-grade tick dataset — no simulated or synthetic data.":
    "全ての分析はBinanceから取得した15,638,400件の1秒BTCUSDTローソク足データ（2025年1月〜6月）に基づく。プロダクショングレードのティックデータでモデルを校正 — シミュレーションや合成データは未使用。",
  "Tick observations": "ティック観測数",
  "Granularity": "データ粒度",
  "Time span": "期間",
  "Pricing models": "価格モデル数",
  "Start exploring the": "始めよう",
  "quantitative analysis": "定量分析",
  "Dive into options pricing models or perpetual futures risk analytics — interactive charts powered by Plotly.js with real Bitcoin market data.":
    "オプション価格モデルまたは無期限先物リスク分析へ — Plotly.jsによるインタラクティブチャート、実際のBitcoin市場データを使用。",
  "Options Pricing": "オプション価格算定",
  "Research": "研究",
  "Models & Methods": "モデルと手法",
  "Tech Stack": "技術スタック",

  // ── Risk Management page ──
  "Risk Management": "リスク管理",
  "Exchange Risk Management": "取引所リスク管理",
  "Portfolio Risk & Hedging": "ポートフォリオリスク＆ヘッジング",
  "Exchange Risk for Perps": "無期限先物の取引所リスク",
  "10 Risk Sections": "10のリスクセクション",
  "Comprehensive risk quantification for a crypto exchange offering BTC perpetual futures — directional risk, funding, liquidation cascades, basis, liquidity, and hedging.":
    "BTC無期限先物を提供する暗号資産取引所の包括的リスク定量化 — 方向性リスク、ファンディング、清算カスケード、ベーシス、流動性、ヘッジング。",
  "Comprehensive risk quantification for exchanges offering perpetual futures — delta exposure, funding risk, liquidation cascades, basis risk, market impact, and hedge simulation with full backtesting.":
    "無期限先物を提供する取引所の包括的リスク定量化 — デルタエクスポージャー、ファンディングリスク、清算カスケード、ベーシスリスク、マーケットインパクト、バックテスト付きヘッジシミュレーション。",
  "Net delta tracking & directional risk": "ネットデルタ追跡＆方向性リスク",
  "VaR, CVaR & historical stress tests": "VaR、CVaR＆ヒストリカルストレステスト",
  "Liquidation cascade simulation": "清算カスケードシミュレーション",
  "Insurance fund sizing & sustainability": "保険基金のサイジング＆持続可能性",
  "Hedge backtest with execution costs": "執行コスト付きヘッジバックテスト",
  "1. Delta Exposure": "1. デルタエクスポージャー",
  "2. VaR & Stress Tests": "2. VaR＆ストレステスト",
  "3. Funding Risk": "3. ファンディングリスク",
  "4. Cascades": "4. カスケード",
  "5. Insurance Fund": "5. 保険基金",
  "6. Basis Risk": "6. ベーシスリスク",
  "7. Market Impact": "7. マーケットインパクト",
  "8. Hedge Backtest": "8. ヘッジバックテスト",
  "9. Risk Dashboard": "9. リスクダッシュボード",

  // ── Options Risk Management page ──
  "Options Risk": "オプションリスク",
  "Options Risk Management": "オプションリスク管理",
  "Greeks, Hedging & Portfolio Risk": "グリークス、ヘッジング＆ポートフォリオリスク",
  "Quantifying and hedging the risks of being a counterparty to vanilla options — Greeks exposure, volatility risk, gamma hedging, and portfolio-level risk management.":
    "バニラオプションのカウンターパーティとしてのリスクの定量化とヘッジ — グリークスエクスポージャー、ボラティリティリスク、ガンマヘッジング、ポートフォリオレベルのリスク管理。",
  "Quantifying and hedging the exchange's risk from selling vanilla options — Greeks exposure, volatility surface risk, gamma hedging, and portfolio-level risk aggregation.":
    "バニラオプション販売による取引所リスクの定量化とヘッジ — グリークスエクスポージャー、ボラティリティサーフェスリスク、ガンマヘッジング、ポートフォリオレベルのリスク集約。",
  "Greeks exposure (Delta, Gamma, Vega, Theta)": "グリークスエクスポージャー（デルタ、ガンマ、ベガ、シータ）",
  "Dynamic delta & gamma hedging": "動的デルタ＆ガンマヘッジング",
  "Volatility surface & smile risk": "ボラティリティサーフェス＆スマイルリスク",
  "Portfolio-level risk aggregation": "ポートフォリオレベルのリスク集約",
  "Hedging P&L attribution": "ヘッジングP&Lアトリビューション",
  "Options Risk Management Dashboard": "オプションリスク管理ダッシュボード",
  "This module will quantify the exchange's risk from selling vanilla options to clients — including Greeks exposure (Delta, Gamma, Vega, Theta), hedging strategies, and portfolio-level risk aggregation.":
    "このモジュールは、クライアントへのバニラオプション販売による取引所リスクを定量化します — グリークスエクスポージャー（デルタ、ガンマ、ベガ、シータ）、ヘッジ戦略、ポートフォリオレベルのリスク集約を含みます。",
  "Options Risk Management Research · Built with Next.js, Plotly.js, Python":
    "オプションリスク管理研究 · Next.js、Plotly.js、Python構築",
  "Perps Risk": "先物リスク",

  // ── Options Risk: Pricing Engine ──
  "1. Pricing Engine": "1. プライシングエンジン",
  "2. Cross-Validation": "2. クロスバリデーション",
  "3. Model Selection": "3. モデル選択",
  "4. Pricing Surface": "4. プライシングサーフェス",
  "5. Put-Call Parity": "5. プットコールパリティ",
  "1. Pricing Engine Foundation": "1. プライシングエンジン基盤",
  "Why Build a Pricing Engine First?": "なぜまずプライシングエンジンを構築するのか？",
  "Before we can quantify any option risk (Delta, Gamma, Vega, Theta) or design a hedging strategy, we need a reliable pricing function. Every Greek is a derivative of the option price — if the price is wrong, all risk numbers downstream are wrong.":
    "オプションリスク（デルタ、ガンマ、ベガ、シータ）を定量化したりヘッジ戦略を設計する前に、信頼性の高いプライシング関数が必要です。すべてのグリークスはオプション価格の導関数であり、価格が間違っていれば下流のすべてのリスク数値が間違います。",
  "Phase 1 establishes this foundation: we lock in the Bates model as our primary pricing engine, validate it against our existing Options analysis, and confirm internal consistency via put-call parity. This gives us a battle-tested, callable function that all future phases import.":
    "フェーズ1はこの基盤を確立します：ベイツモデルをプライマリプライシングエンジンとして固定し、既存のオプション分析に対して検証し、プットコールパリティを通じて内部整合性を確認します。これにより、将来のすべてのフェーズがインポートする実証済みの呼び出し可能な関数が得られます。",
  "Primary Model": "プライマリモデル",
  "Parameters": "パラメータ",
  "MC Paths": "MCパス",
  "Spot": "スポット",
  "Stochastic volatility": "確率的ボラティリティ",
  "Mean-reverting variance": "平均回帰分散",
  "Vol-of-vol (smile curvature)": "ボラティリティのボラティリティ（スマイル曲率）",
  "Leverage effect (ρ)": "レバレッジ効果（ρ）",
  "Price jumps (fat tails)": "価格ジャンプ（ファットテール）",
  "Jump intensity + size distribution": "ジャンプ強度＋サイズ分布",
  "Bates Cross-Validation Summary (vs. existing 50K-path prices)": "ベイツクロスバリデーションサマリー（既存50Kパス価格との比較）",
  "The Bates model combines the two most important features of crypto price dynamics: (1) stochastic volatility (vol-of-vol + mean reversion, from Heston) captures volatility clustering and the smile shape, and (2) jumps (from Merton) capture sudden crashes/spikes that are frequent in crypto. Using Bates as primary ensures our Greeks reflect both tail risks and volatility regime changes.":
    "ベイツモデルは暗号資産価格ダイナミクスの2つの最も重要な特徴を組み合わせます：(1) 確率的ボラティリティ（ヘストンからのvol-of-vol＋平均回帰）はボラティリティクラスタリングとスマイル形状を捕捉し、(2) ジャンプ（マートンから）は暗号資産で頻繁に起こる突然の暴落/急騰を捕捉します。ベイツをプライマリとして使用することで、グリークスがテールリスクとボラティリティレジーム変化の両方を反映することを確保します。",
  "2. Cross-Validation: New Engine vs. Existing Prices": "2. クロスバリデーション：新エンジン vs. 既存価格",
  "What Is This Validating?": "何を検証しているのか？",
  "The Options page already priced calls and puts across 21 strikes × 7 maturities × 4 MC models using 50,000 paths. Our new pricing engine reprices the same grid using 100,000 paths. If the two sets of prices agree within a few percent, the engine is correctly implemented.":
    "オプションページは既に50,000パスを使用して21ストライク×7満期×4MCモデルのコールとプットの価格を計算しています。新しいプライシングエンジンは100,000パスを使用して同じグリッドを再計算します。2つの価格セットが数パーセント以内で一致すれば、エンジンは正しく実装されています。",
  "We expect small differences because: (1) different path counts produce different MC noise, and (2) 100K paths have lower variance than 50K. Mean Absolute Error (MAE) and Root Mean Square Error (RMSE) quantify the agreement.":
    "小さな差異が予想されます：(1) 異なるパス数は異なるMCノイズを生成し、(2) 100Kパスは50Kより低い分散を持ちます。平均絶対誤差（MAE）と二乗平均平方根誤差（RMSE）が一致度を定量化します。",
  "MAE of a few dollars on options worth thousands confirms the pricing engine is correctly implemented. The errors are pure Monte Carlo noise — they would converge to zero with infinite paths. For risk management, this level of precision is more than sufficient: Greeks computed from these prices will be accurate to within their MC standard error.":
    "数千ドルのオプションに対する数ドルのMAEは、プライシングエンジンが正しく実装されていることを確認します。誤差は純粋なモンテカルロノイズであり、無限パスでゼロに収束します。リスク管理にはこの精度レベルで十分であり、これらの価格から計算されるグリークスはMC標準誤差の範囲内で正確です。",
  "3. Model Selection Logic": "3. モデル選択ロジック",
  "Why Three Models?": "なぜ3つのモデルなのか？",
  "No single model is optimal across all time horizons. At very short expiries (< 1 day), price jumps dominate and stochastic volatility barely has time to evolve — Merton's pure jump-diffusion captures this efficiently. At longer horizons, volatility clustering becomes the dominant effect — Heston captures this without the computational overhead of jumps.":
    "すべての時間軸で最適な単一モデルはありません。非常に短い満期（1日未満）では価格ジャンプが支配的で確率的ボラティリティは進化する時間がほとんどなく、マートンの純粋なジャンプ拡散がこれを効率的に捕捉します。長い時間軸ではボラティリティクラスタリングが支配的な効果となり、ヘストンがジャンプの計算オーバーヘッドなしにこれを捕捉します。",
  "The Bates model (primary) handles both regimes but is the most expensive to simulate. By having dedicated backup models, we can: (1) cross-check Bates outputs, (2) stress-test under simpler assumptions, and (3) flag cases where Bates and backup diverge significantly (> 10%) for manual review.":
    "ベイツモデル（プライマリ）は両方のレジームを処理しますが、シミュレーションコストが最も高いです。専用のバックアップモデルを持つことで：(1) ベイツ出力のクロスチェック、(2) よりシンプルな仮定でのストレステスト、(3) ベイツとバックアップの乖離が大きい（>10%）ケースのフラグ付けが可能です。",
  "At 1hr expiry the spread is large (>100%) because with extremely short horizons, MC noise dominates and models diverge. At 4hr+ the Bates–backup spread drops to 1–4%, confirming model consistency. For practical risk management (positions typically 1day+), all three models agree well — but Bates captures both jump tails and vol clustering, making it the safest default.":
    "1時間満期ではスプレッドが大きい（>100%）ですが、これは極端に短い時間軸ではMCノイズが支配的でモデルが乖離するためです。4時間以上ではベイツ−バックアップスプレッドが1-4%に低下し、モデルの一貫性を確認します。実用的なリスク管理（通常1日以上のポジション）では、3つのモデルすべてがよく一致しますが、ベイツはジャンプテールとボラティリティクラスタリングの両方を捕捉するため、最も安全なデフォルトです。",
  "4. Bates Pricing Surface": "4. ベイツプライシングサーフェス",
  "What Is a Pricing Surface?": "プライシングサーフェスとは？",
  "A pricing surface maps option prices (or implied volatilities) across two dimensions: strike (moneyness K/S) and maturity. For the exchange, this surface IS the product — every option sold to a client is priced from this surface. Errors in the surface directly translate to mispriced risk.":
    "プライシングサーフェスは、ストライク（マネーネスK/S）と満期の2つの次元でオプション価格（またはインプライドボラティリティ）をマッピングします。取引所にとって、このサーフェスが商品そのものです — クライアントに販売されるすべてのオプションはこのサーフェスから価格設定されます。サーフェスのエラーは直接ミスプライスされたリスクに変換されます。",
  "The implied volatility smile (IV vs moneyness at a fixed maturity) reveals how the market prices tail risk. In crypto, the smile is typically: (1) steep on the left (OTM puts are expensive — crash protection), (2) moderate on the right (OTM calls have some premium — rally potential), and (3) higher overall than equities (crypto is inherently more volatile).":
    "インプライドボラティリティスマイル（固定満期でのIV対マネーネス）は、市場がテールリスクをどのように価格設定するかを明らかにします。暗号資産では、スマイルは通常：(1) 左側が急勾配（OTMプットは高価 — 暴落保護）、(2) 右側が緩やか（OTMコールにいくらかのプレミアム — 上昇ポテンシャル）、(3) 全体的に株式より高い（暗号資産は本質的にボラティリティが高い）です。",
  "The IV smile is steeper at short maturities — jumps have a bigger relative impact when there's less time for diffusive volatility to accumulate. At longer maturities the smile flattens as stochastic volatility dominates. This term structure of skew is critical for risk management: short-dated OTM puts carry disproportionate tail risk that a flat-vol model like Black-Scholes would completely miss.":
    "IVスマイルは短い満期でより急勾配です — 拡散ボラティリティが蓄積する時間が少ない場合、ジャンプの相対的影響が大きくなります。長い満期ではスマイルは確率的ボラティリティが支配するにつれて平坦化します。このスキューの期間構造はリスク管理に不可欠です：短期OTMプットはブラック-ショールズのようなフラットボラティリティモデルでは完全に見逃される不均衡なテールリスクを持っています。",
  "5. Put-Call Parity Verification": "5. プットコールパリティ検証",
  "Why Check Put-Call Parity?": "なぜプットコールパリティを確認するのか？",
  "Put-call parity is the fundamental no-arbitrage relationship for European options: C − P = S − K·e^(−rT). It holds regardless of which model you use (Black-Scholes, Bates, anything). If our MC prices violate this identity significantly, it means either a bug in the code or insufficient simulation paths.":
    "プットコールパリティはヨーロピアンオプションの基本的な無裁定関係です：C − P = S − K·e^(−rT)。使用するモデル（ブラック-ショールズ、ベイツ、何でも）に関係なく成立します。MCの価格がこの恒等式を大きく違反する場合、コードのバグまたはシミュレーションパスの不足を意味します。",
  "For a market-making exchange, put-call parity violations are free money for arbitrageurs. If we quote prices that violate parity, sophisticated traders will immediately exploit it. This check ensures our pricing engine is internally consistent and arbitrage-free (within MC noise).":
    "マーケットメイキング取引所にとって、プットコールパリティ違反はアービトラージャーにとっての無料のお金です。パリティに違反する価格を提示すると、洗練されたトレーダーが即座にそれを利用します。このチェックにより、プライシングエンジンが内部的に整合的で裁定取引フリー（MCノイズの範囲内）であることを確認します。",
  "All maturities pass with violations < 0.1% of spot price. The violation grows with maturity because longer simulations accumulate more MC noise (more timesteps = more random draws). At 30 days the max violation is ~$103 on a $107K spot — 0.096%, well within acceptable MC tolerance. With 100K paths we're confident the engine is arbitrage-free.":
    "すべての満期が違反<0.1%のスポット価格でパスします。長いシミュレーションはより多くのMCノイズを蓄積するため（より多くのタイムステップ=より多くのランダム抽出）、違反は満期とともに増加します。30日では、$107Kのスポットに対して最大違反は約$103 — 0.096%で、許容可能なMC許容範囲内です。100Kパスで、エンジンが裁定取引フリーであることを確信しています。",
  "Parity Check Summary": "パリティチェックサマリー",

  // ── Options Risk: Greeks Calculator ──
  "6. Greeks Calculator": "6. グリークス計算エンジン",
  "7. Greeks Heatmaps": "7. グリークスヒートマップ",
  "8. Smile-Risk Greeks": "8. スマイルリスクグリークス",
  "Why Greeks Matter for the Exchange": "なぜグリークスが取引所にとって重要か",
  "Greeks are the partial derivatives of the option price with respect to market variables. As a counterparty selling options to clients, the exchange's P&L is driven entirely by these sensitivities. Without knowing your Greeks, you're flying blind — you don't know how much you'll lose if BTC moves 5%, or if implied vol spikes 10%.":
    "グリークスはオプション価格の市場変数に対する偏導関数です。クライアントにオプションを販売するカウンターパーティとして、取引所のP&Lは完全にこれらの感度によって駆動されます。グリークスを知らなければ、BTCが5%動いた場合やインプライドボラティリティが10%急騰した場合にどれだけ損失するかわかりません。",
  "Every Greek answers a specific risk question: Delta → 'how much do I lose per $1 spot move?', Gamma → 'how fast does my delta change?' (nonlinear risk), Vega → 'what's my exposure to vol moves?', Theta → 'how much do I earn/lose per day from time decay?', Vanna → 'how does my delta exposure change when vol moves?' (cross-risk), Volga → 'how does my vol exposure change when vol moves?' (vol convexity).":
    "各グリークスは特定のリスク質問に答えます：Delta→「スポット$1移動あたりいくら損失するか？」、Gamma→「デルタはどれくらい速く変化するか？」（非線形リスク）、Vega→「ボラティリティ変動へのエクスポージャーは？」、Theta→「タイムディケイから1日あたりいくら稼ぐ/損失するか？」、Vanna→「ボラティリティが動くとデルタエクスポージャーはどう変化するか？」（クロスリスク）、Volga→「ボラティリティが動くとボラティリティエクスポージャーはどう変化するか？」（ボラティリティ凸性）。",
  "We compute these via central finite differences on the Bates MC pricer with Common Random Numbers (CRN). CRN ensures the same random draws are used for bumped and unbumped prices, so the finite-difference noise cancels — giving stable Greeks even with 50K paths.":
    "中心差分法とCommon Random Numbers（CRN）を使用してベイツMCプライサーでこれらを計算します。CRNはバンプされた価格とバンプされていない価格に同じ乱数が使用されることを保証するため、有限差分ノイズが相殺され、50Kパスでも安定したグリークスが得られます。",
  "MC Paths (CRN)": "MCパス（CRN）",
  "ATM Greeks Across All Maturities": "全満期のATMグリークス",
  "Key observations from the ATM table: (1) Delta ≈ 0.5 for all ATM options (by definition), with call Δ slightly above and put Δ slightly below due to the risk-neutral drift. (2) Gamma is highest for short-dated options — a 1-hour ATM option has enormous gamma because it's right at the exercise boundary. (3) Vega increases with maturity — longer options have more time for vol to affect the outcome. (4) Theta is most negative for short-dated ATM options — rapid time decay near expiry. (5) Vanna ≈ 0 at ATM (delta is at its inflection point w.r.t. vol). (6) The Gamma–Theta tradeoff: high gamma = high theta cost. This is the fundamental tension in options hedging.":
    "ATMテーブルからの主な観察：(1) すべてのATMオプションでDelta≈0.5（定義上）、リスク中立ドリフトによりコールΔはわずかに上、プットΔはわずかに下。(2) ガンマは短期オプションで最大 — 1時間ATMオプションは行使境界のすぐ近くにあるため巨大なガンマを持ちます。(3) ベガは満期とともに増加 — 長期オプションはボラティリティが結果に影響する時間が長い。(4) シータは短期ATMオプションで最もネガティブ — 満期近くの急速なタイムディケイ。(5) Vanna≈0（ATMではデルタがボラティリティに対する変曲点）。(6) ガンマ−シータのトレードオフ：高ガンマ=高シータコスト。これがオプションヘッジの根本的な緊張関係です。",
  "7. Greeks Heatmaps (Moneyness × Maturity)": "7. グリークスヒートマップ（マネーネス×満期）",
  "Reading the Heatmaps": "ヒートマップの読み方",
  "Each heatmap shows one Greek as a function of moneyness (x-axis, K/S from 0.90 to 1.10) and maturity (y-axis, from 1hr to 30 days). Bright/dark colours indicate large absolute values. These surfaces are what a trading desk monitors in real time — any unexpected shift signals a risk regime change.":
    "各ヒートマップは、マネーネス（x軸、K/S 0.90〜1.10）と満期（y軸、1時間〜30日）の関数として1つのグリークスを表示します。明るい/暗い色は大きな絶対値を示します。これらのサーフェスはトレーディングデスクがリアルタイムで監視するものであり、予期しないシフトはリスクレジームの変化を示唆します。",
  "Delta heatmap: shows the transition from 0 (deep OTM) to 1 (deep ITM), sharper for short maturities. Gamma heatmap: peaks at ATM, broadens with maturity. Vega heatmap: grows with maturity (more time = more vol exposure). Theta: most negative at short-dated ATM (rapid decay).":
    "デルタヒートマップ：0（ディープOTM）から1（ディープITM）への遷移を表示、短い満期ほど急峻。ガンマヒートマップ：ATMでピーク、満期とともに広がる。ベガヒートマップ：満期とともに増加（より多くの時間=より多くのボラティリティエクスポージャー）。シータ：短期ATMで最もネガティブ（急速なディケイ）。",
  "The heatmaps reveal the 'risk topology' of the options book. Gamma peaks sharply at ATM for short maturities — this is where your hedging error is largest (the delta changes fastest). Vega is concentrated in longer-dated ATM options — this is where a vol spike hurts most. Vanna is antisymmetric around ATM (positive on one side, negative on the other) — this means a vol move shifts your entire delta profile. Volga is positive at the wings — deep OTM options become more expensive in high-vol regimes.":
    "ヒートマップはオプションブックの「リスクトポロジー」を明らかにします。ガンマは短期満期のATMで鋭くピーク — ここがヘッジ誤差が最大の場所です（デルタの変化が最も速い）。ベガは長期ATMオプションに集中 — ここがボラティリティスパイクが最も痛い場所です。Vannaは ATM周りで反対称（片側が正、反対側が負）— ボラティリティの動きがデルタプロファイル全体をシフトさせることを意味します。VolgoはウィングでPositive — ディープOTMオプションは高ボラティリティレジームでより高価になります。",
  "8. Smile-Risk Greeks (IV Surface Sensitivity)": "8. スマイルリスクグリークス（IVサーフェス感度）",
  "Why Smile Risk Is Critical in Crypto": "なぜスマイルリスクが暗号資産で重要か",
  "In equity markets, the IV smile is relatively stable — it shifts up/down but rarely changes shape dramatically. In crypto, the smile can violently reshape in hours: skew can flip sign, wings can explode, and the term structure can invert. These smile deformations are driven by changes in the underlying model parameters: ξ (vol-of-vol), ρ (spot-vol correlation), and λ (jump intensity).":
    "株式市場ではIVスマイルは比較的安定しています — 上下にシフトしますが形状が劇的に変化することは稀です。暗号資産ではスマイルが数時間で激しく再形成される可能性があります：スキューが符号を反転し、ウィングが爆発し、期間構造が反転することがあります。これらのスマイル変形は基礎となるモデルパラメータの変化によって駆動されます：ξ（vol-of-vol）、ρ（スポット-ボラティリティ相関）、λ（ジャンプ強度）。",
  "Smile-risk Greeks measure: 'If the smile shape changes (not just a parallel vol shift), how much does each option in our book gain or lose?' Standard Vega only captures parallel shifts. These sensitivities capture the shape changes — the second-order effects that often dominate crypto option P&L.":
    "スマイルリスクグリークスは「スマイルの形状が変化した場合（単なる平行ボラティリティシフトではなく）、ブック内の各オプションはいくら得/損するか？」を測定します。標準ベガは平行シフトのみを捕捉します。これらの感度は形状変化を捕捉します — 暗号資産オプションP&Lを支配することが多い二次効果です。",
  "Each chart below shows the base IV smile (solid) versus the IV smile when a parameter is bumped up/down. The spread between the curves shows where in the moneyness spectrum the exposure is concentrated.":
    "以下の各チャートは、ベースのIVスマイル（実線）とパラメータがバンプアップ/ダウンされたときのIVスマイルを表示します。曲線間のスプレッドは、マネーネススペクトルのどこにエクスポージャーが集中しているかを示します。",
  "Increasing ξ makes the smile more convex — OTM wings get richer (higher IV). This is the 'butterfly' or 'kurtosis' risk. If you're short OTM options, a ξ spike will cost you.":
    "ξの増加はスマイルをより凸にします — OTMウィングがより豊か（より高いIV）になります。これは「バタフライ」または「尖度」リスクです。OTMオプションをショートしている場合、ξスパイクはコストがかかります。",
  "More negative ρ steepens the left skew — OTM puts become more expensive relative to OTM calls. In crypto, ρ tends to become sharply negative during crashes (spot drops + vol spikes), causing the put skew to explode.":
    "よりネガティブなρは左スキューを急峻にします — OTMプットがOTMコールに対してより高価になります。暗号資産では、ρはクラッシュ時に急激にネガティブになる傾向があり（スポット下落＋ボラティリティスパイク）、プットスキューを爆発させます。",
  "Higher λ fattens both tails — more frequent jumps increase the price of all OTM options. This is the 'tail risk premium'. After major market events, λ reprices upward as the market expects more jumps.":
    "より高いλは両テールを太くします — より頻繁なジャンプはすべてのOTMオプションの価格を引き上げます。これは「テールリスクプレミアム」です。主要な市場イベント後、市場がより多くのジャンプを期待するため、λは上方に再価格設定されます。",
  "For a crypto exchange selling options to retail, smile risk is often the dominant P&L driver — larger than delta or even vega. A sudden skew move (ρ shift) or vol-of-vol spike (ξ jump) can reprice your entire options book in minutes. These smile-risk sensitivities allow the risk desk to pre-compute worst-case scenarios and set appropriate margin requirements for each option.":
    "リテールにオプションを販売する暗号資産取引所にとって、スマイルリスクは多くの場合、支配的なP&Lドライバーです — デルタやベガよりも大きいことがあります。突然のスキュー変動（ρシフト）やvol-of-volスパイク（ξジャンプ）は数分でオプションブック全体を再価格設定する可能性があります。これらのスマイルリスク感度により、リスクデスクは最悪シナリオを事前に計算し、各オプションに適切な証拠金要件を設定できます。",

  // ── Options Risk: Portfolio, Hedging, Stress Tests ──
  "9. Portfolio Aggregation": "9. ポートフォリオ集約",
  "10. Hedging Strategies": "10. ヘッジ戦略",
  "11. Live Hedge Engine": "11. ライブヘッジエンジン",
  "12. Dynamic Hedging": "12. 動的ヘッジ",
  "13. Stress Tests & VaR": "13. ストレステスト & VaR",
  "9. Portfolio Aggregation & Hedging": "9. ポートフォリオ集約 & ヘッジ",
  "From Single-Option Greeks to Portfolio Risk": "個別オプションのグリークスからポートフォリオリスクへ",
  "In Phase 2, we computed Greeks for individual options. In reality, the exchange holds dozens (or thousands) of open option positions — a mix of calls and puts, various strikes and maturities, bought and sold by different clients. The exchange is the counterparty to all of them.":
    "フェーズ2では個別オプションのグリークスを計算しました。実際には、取引所は数十（または数千）のオープンオプションポジションを保持しています — コールとプット、様々なストライクと満期、異なるクライアントによる売買の組み合わせです。取引所はそのすべてのカウンターパーティです。",
  "Portfolio-level risk management means summing the Greeks across all positions. If Client A is long 2 BTC of ATM calls (exchange is short) and Client B is short 1 BTC of the same call (exchange is long), the net exposure is only −1 BTC of that call. Natural netting reduces risk.":
    "ポートフォリオレベルのリスク管理は、すべてのポジションのグリークスを合計することを意味します。クライアントAがATMコール2BTCをロング（取引所はショート）し、クライアントBが同じコール1BTCをショート（取引所はロング）している場合、ネットエクスポージャーはそのコールの-1BTCのみです。自然なネッティングがリスクを軽減します。",
  "We simulate a realistic 40-position client book: ~75% are exchange-short (clients bought options for leverage/protection), ~25% are exchange-long (clients sold covered calls or collected premium). The aggregate Greeks represent the exchange's total risk exposure.":
    "現実的な40ポジションのクライアントブックをシミュレーションします：約75%が取引所ショート（クライアントがレバレッジ/保護のためにオプションを購入）、約25%が取引所ロング（クライアントがカバードコールを売却またはプレミアムを回収）。集約グリークスは取引所の総リスクエクスポージャーを表します。",
  "Spot Price": "スポット価格",
  "The portfolio behaves like being short ~8.3 BTC. A $1,000 BTC rally costs ~$8,300.":
    "ポートフォリオは約8.3BTCのショートのように振る舞います。$1,000のBTC上昇は約$8,300のコストになります。",
  "Negative gamma — the delta exposure worsens as BTC moves further. A $5,000 move changes delta by Γ×$5,000 = ~7.6, doubling the directional risk. This is the 'convexity trap' of being short options.":
    "ネガティブガンマ — BTCがさらに動くにつれてデルタエクスポージャーが悪化します。$5,000の動きはΓ×$5,000 = ~7.6だけデルタを変化させ、方向性リスクを倍増させます。これがショートオプションの「凸性の罠」です。",
  "Short vega — a 1 percentage-point implied vol spike costs ~$9,600. Crypto vol can move 5-10pp in a day, making this a $48K-$96K daily risk.":
    "ショートベガ — インプライドボラティリティの1パーセントポイントの急騰は約$9,600のコストになります。暗号資産のボラティリティは1日に5-10pp動く可能性があり、$48K-$96Kの日次リスクとなります。",
  "Positive theta — the exchange earns ~$5,990 per day from time decay. This is the 'insurance premium' collected for bearing gamma and vega risk. Over 14 days: ~$83,850 earned.":
    "ポジティブシータ — 取引所はタイムディケイから1日あたり約$5,990を稼ぎます。これはガンマとベガリスクを負うために徴収される「保険料」です。14日間で約$83,850の収益。",
  "The portfolio is net short gamma and vega — the classic 'selling insurance' profile. The exchange earns steady theta income but faces tail risk from large BTC moves (gamma) and volatility spikes (vega). This is exactly the risk that hedging strategies in the next section address.":
    "ポートフォリオはネットショートガンマとベガ — 典型的な「保険販売」プロファイルです。取引所は安定したシータ収入を得ますが、大きなBTC変動（ガンマ）とボラティリティスパイク（ベガ）からのテールリスクに直面します。これがまさに次のセクションのヘッジ戦略が対処するリスクです。",
  "10. Hedging Strategies — Making Δ, Γ, V → 0": "10. ヘッジ戦略 — Δ, Γ, V → 0",
  "The Three Layers of Option Hedging": "オプションヘッジの3つのレイヤー",
  "Layer 1 — Δ-Neutral (Spot BTC):": "レイヤー1 — Δニュートラル（スポットBTC）：",
  "Trade spot BTC to zero out net delta. This removes first-order price risk — small BTC moves no longer affect P&L. Cost: just the bid-ask spread on spot. But gamma and vega risk remain untouched.":
    "ネットデルタをゼロにするためにスポットBTCを取引します。一次の価格リスクを除去します — 小さなBTC変動はP&Lに影響しなくなります。コスト：スポットのビッドアスクスプレッドのみ。ただしガンマとベガリスクはそのまま残ります。",
  "Layer 2 — Δ+Γ-Neutral (Spot + Short-Dated Option):": "レイヤー2 — Δ+Γニュートラル（スポット＋短期オプション）：",
  "Buy ATM options with high gamma to offset the portfolio's negative gamma. This protects against large moves AND reduces rebalancing frequency. You cannot gamma-hedge with spot alone — you NEED options. Cost: the theta of the hedge options (they bleed time value).":
    "ポートフォリオのネガティブガンマを相殺するために高ガンマのATMオプションを購入します。大きな変動から保護し、リバランス頻度も低減します。スポットだけではガンマヘッジできません — オプションが必要です。コスト：ヘッジオプションのシータ（タイムバリューの減衰）。",
  "Layer 3 — Δ+Γ+V-Neutral (Spot + 2 Options):": "レイヤー3 — Δ+Γ+Vニュートラル（スポット＋2つのオプション）：",
  "Add a longer-dated option (different gamma/vega ratio) to also zero out vega. This requires solving a 2×2 linear system. Now the portfolio is immune to both large moves AND volatility changes. Cost: higher theta bleed from two sets of hedge options.":
    "ベガもゼロにするために、長期オプション（異なるガンマ/ベガ比率）を追加します。2×2の線形システムを解く必要があります。これでポートフォリオは大きな変動とボラティリティ変化の両方に対して免疫になります。コスト：2セットのヘッジオプションからのより高いシータ損失。",
  "Gamma-Vega hedge: solve": "ガンマ-ベガヘッジ：解く",
  "Then": "次に",
  "to restore delta-neutrality": "デルタニュートラルを復元",
  "The Fundamental Tradeoff: Theta vs. Protection": "根本的トレードオフ：シータ vs. プロテクション",
  "Notice how Theta changes across strategies:": "各戦略間でシータがどのように変化するか注目してください：",
  "earning ~$6K/day from selling insurance": "保険販売から1日約$6Kの収益",
  "same (spot hedge has no theta)": "同じ（スポットヘッジにシータなし）",
  "theta dropped! Buying options to hedge costs theta": "シータが低下！ヘッジのためのオプション購入がシータコストに",
  "negative theta — hedging costs more than the premium earned": "ネガティブシータ — ヘッジコストが獲得プレミアムを超過",
  "Delta-hedging is essentially free (just trade spot). But gamma and vega hedging cost real money — you must buy options, which bleed theta. The exchange must decide: keep the theta income and bear the tail risk, or pay for full protection? Most professional desks delta-hedge always and selectively gamma/vega-hedge based on market conditions.":
    "デルタヘッジは本質的に無料です（スポットを取引するだけ）。しかしガンマとベガのヘッジには実際のコストがかかります — オプションを購入する必要があり、シータが減衰します。取引所は決断しなければなりません：シータ収入を維持してテールリスクを負うか、完全な保護にコストを払うか？ほとんどのプロフェッショナルデスクは常にデルタヘッジし、市場状況に基づいてガンマ/ベガヘッジを選択的に行います。",
  "11. Live Hedge Engine — Trade-by-Trade Rebalancing": "11. ライブヘッジエンジン — トレード毎のリバランス",
  "How the Hedge Engine Works in Real Time": "ヘッジエンジンのリアルタイム動作",
  "This simulates exactly what a production hedge engine does. Client trades arrive one by one. After EACH trade, the engine:":
    "これはプロダクションヘッジエンジンが行うことを正確にシミュレーションします。クライアントのトレードが1つずつ到着します。各トレードの後、エンジンは：",
  "Aggregates the new position into the running portfolio Greeks":
    "新しいポジションを実行中のポートフォリオグリークスに集約",
  "Solves the linear system: [Γ_A Γ_B; V_A V_B] · [n_A; n_B] = [−Γ_net; −V_net] to find the required option hedge quantities":
    "線形システムを解く：[Γ_A Γ_B; V_A V_B] · [n_A; n_B] = [−Γ_net; −V_net] で必要なオプションヘッジ数量を求める",
  "Computes the spot BTC hedge: n_spot = −(Δ_net + n_A·Δ_A + n_B·Δ_B)":
    "スポットBTCヘッジを計算：n_spot = −(Δ_net + n_A·Δ_A + n_B·Δ_B)",
  "Outputs a concrete prescription: 'Buy/Sell X contracts of instrument A, Y of instrument B, and Z BTC spot'":
    "具体的な処方を出力：「インスツルメントAのX契約、BのY契約、スポットBTC Z」を買い/売り",
  "In production, this exact computation runs every time a client opens or closes a position. The key differences from this simulation:":
    "プロダクションでは、この正確な計算がクライアントがポジションを開閉するたびに実行されます。このシミュレーションとの主な違い：",
  "Speed": "速度",
  "The linear system solve is O(1) — instant. The bottleneck is fetching live option prices from the hedging venue (Deribit, OKX) to compute current Greeks. Typical latency: 10-50ms.":
    "線形システムの解はO(1) — 瞬時。ボトルネックは、現在のグリークスを計算するためにヘッジ会場（Deribit、OKX）からライブオプション価格を取得することです。典型的なレイテンシ：10-50ms。",
  "Execution": "執行",
  "Hedge orders are sent via API to the external venue. Smart order routing splits large orders to minimize market impact.":
    "ヘッジ注文はAPIを介して外部会場に送信されます。スマートオーダールーティングが大きな注文を分割してマーケットインパクトを最小化します。",
  "Netting": "ネッティング",
  "If two clients trade opposite positions simultaneously (one buys, one sells the same option), they net out — no hedge needed. This natural netting reduces hedging costs significantly.":
    "2人のクライアントが同時に反対のポジションを取引する場合（1人が買い、1人が同じオプションを売る）、ネットアウトされます — ヘッジ不要。この自然なネッティングはヘッジコストを大幅に削減します。",
  "Frequency": "頻度",
  "Delta is rebalanced continuously (every new trade). Gamma/vega hedges are typically rebalanced less frequently (every few minutes or when exposure exceeds a threshold) because option trades have higher execution costs.":
    "デルタは継続的にリバランスされます（新規トレードごと）。ガンマ/ベガヘッジは通常、より低い頻度でリバランスされます（数分ごと、またはエクスポージャーが閾値を超えた場合）。オプション取引は執行コストが高いためです。",
  "This is the core of the exchange's risk engine. Every row above represents a real decision: 'a client just traded → here's exactly what we must do on the hedging venue to stay neutral.' The computation is trivially fast (just linear algebra). The hard part in production is execution: getting fills at good prices on illiquid crypto options markets.":
    "これが取引所のリスクエンジンの核心です。上の各行は実際の判断を表しています：「クライアントがトレードした → ニュートラルを維持するためにヘッジ会場で正確に何をすべきか」。計算は自明に高速です（線形代数のみ）。プロダクションでの難しい部分は執行：流動性の低い暗号資産オプション市場で良い価格でフィルを得ることです。",
  "Production Implementation": "プロダクション実装",
  "12. Dynamic Hedging Simulation (14 Days)": "12. 動的ヘッジシミュレーション（14日間）",
  "What This Simulation Shows": "このシミュレーションが示すもの",
  "We generate a realistic 14-day BTC price path (with jumps and stochastic volatility) and simulate four strategies in parallel: (1) do nothing (unhedged), (2) delta-hedge only, (3) delta+gamma-hedge, (4) fully hedge delta+gamma+vega. At each 4-hour rebalance, hedges are adjusted to current Greeks.":
    "現実的な14日間のBTC価格パス（ジャンプと確率的ボラティリティを含む）を生成し、4つの戦略を並行してシミュレーションします：(1) 何もしない（非ヘッジ）、(2) デルタヘッジのみ、(3) デルタ+ガンマヘッジ、(4) デルタ+ガンマ+ベガの完全ヘッジ。4時間ごとのリバランスで、ヘッジは現在のグリークスに調整されます。",
  "The cumulative P&L chart below shows how each strategy's P&L evolves over time. The fully hedged strategy should have the smallest variance — proving that systematic hedging reduces risk, even though it costs theta.":
    "以下の累積P&Lチャートは、各戦略のP&Lが時間の経過とともにどのように推移するかを示します。完全ヘッジ戦略は最小の分散を持つべきであり、システマティックなヘッジがシータのコストにもかかわらずリスクを軽減することを証明します。",
  "The key takeaway: Δ+Γ+V-Neutral has the smallest P&L variance (std ~$2.3K vs ~$31K unhedged — a 93% reduction). But it comes at a cost: the net theta is negative, meaning the hedge costs more per day than the premium earned. In practice, exchanges dynamically adjust how much gamma/vega to hedge based on market conditions: hedge more aggressively when vol is elevated, let more ride when markets are calm.":
    "重要なポイント：Δ+Γ+Vニュートラルは最小のP&L分散を持ちます（標準偏差約$2.3K vs 非ヘッジ約$31K — 93%の削減）。しかしコストが伴います：ネットシータがネガティブで、ヘッジコストが1日あたりの獲得プレミアムを超過します。実際には、取引所は市場状況に基づいてガンマ/ベガのヘッジ量を動的に調整します：ボラティリティが高いときにはより積極的にヘッジし、市場が穏やかなときにはより多くを放置します。",
  "13. Stress Testing & Value at Risk": "13. ストレステスト & バリュー・アット・リスク",
  "Why Stress Test?": "なぜストレステストを行うのか？",
  "Greeks give a local, linear approximation of risk. Stress tests show what happens under extreme but plausible scenarios — the kind of events that happen every few months in crypto. We shock the spot price (±10-30%) and implied volatility (±25-80%) and reprice every option in the portfolio.":
    "グリークスはリスクの局所的・線形近似を与えます。ストレステストは極端だが起こり得るシナリオ — 暗号資産では数ヶ月ごとに起こる種類のイベント — で何が起こるかを示します。スポット価格（±10-30%）とインプライドボラティリティ（±25-80%）にショックを与え、ポートフォリオ内のすべてのオプションを再価格設定します。",
  "Value at Risk (VaR) estimates the worst-case 1-day loss at a given confidence level. We simulate 10,000 random 1-day scenarios using the portfolio's Greeks and realistic BTC daily volatility. CVaR (Conditional VaR / Expected Shortfall) measures the average loss in the worst 1% of cases — capturing tail risk that VaR misses.":
    "バリュー・アット・リスク（VaR）は所与の信頼水準での最悪の1日損失を推定します。ポートフォリオのグリークスと現実的なBTCの日次ボラティリティを使用して10,000のランダムな1日シナリオをシミュレーションします。CVaR（条件付きVaR / 期待ショートフォール）は最悪の1%のケースの平均損失を測定し、VaRが見逃すテールリスクを捕捉します。",
  "Worst case": "最悪のケース",
  "A flash crash (−30% spot + 80% vol spike) would cost": "フラッシュクラッシュ（-30%スポット + 80%ボラティリティスパイク）のコスト",
  "This sets the minimum capital reserve the exchange needs.": "これが取引所に必要な最低資本準備金を設定します。",
  "Asymmetry": "非対称性",
  "The portfolio loses on both rallies and crashes — that's the signature of a short-gamma book. But crashes are worse because they come with vol spikes (double hit: gamma + vega loss).":
    "ポートフォリオは上昇でも下落でも損失を出します — これがショートガンマブックの特徴です。しかし下落はボラティリティスパイクを伴うためより悪い（ダブルヒット：ガンマ + ベガ損失）。",
  "VaR vs CVaR": "VaR vs CVaR",
  "VaR 99% says 'there's a 1% chance of losing more than this.' CVaR 99% says 'when we DO lose more, here's the average loss.' CVaR is always worse than VaR and is the preferred metric for capital allocation because it captures tail risk.":
    "VaR 99%は「これ以上損失する確率は1%」と言います。CVaR 99%は「実際にそれ以上損失した場合の平均損失」です。CVaRは常にVaRよりも悪く、テールリスクを捕捉するため資本配分の優先指標です。",
  "For an exchange launching options, the stress test results directly inform margin requirements: at minimum, each client's margin should cover the VaR 99% of their position. The flash crash scenario suggests the exchange needs a capital buffer of at least":
    "オプションを開始する取引所にとって、ストレステストの結果は直接証拠金要件に反映されます：最低限、各クライアントの証拠金はポジションのVaR 99%をカバーすべきです。フラッシュクラッシュシナリオは、取引所が少なくとも以下の資本バッファーを必要とすることを示唆します",
  "to survive a 2020-style crypto crash without becoming insolvent.":
    "2020年型の暗号資産クラッシュを債務超過にならずに生き残るために。",

  // ── Unified Risk Engine ──
  "Unified Risk": "統合リスク",
  "Perps + Options Combined": "パーペチュアル + オプション統合",
  "1. Unified Portfolio": "1. 統合ポートフォリオ",
  "2. Risk Dashboard": "2. リスクダッシュボード",
  "3. Unified Hedge Engine": "3. 統合ヘッジエンジン",
  "4. Cross-Product Netting": "4. クロスプロダクトネッティング",
  "5. Dynamic Simulation": "5. 動的シミュレーション",
  "6. Stress Tests & VaR": "6. ストレステスト & VaR",
  "Unified Risk Engine": "統合リスクエンジン",
  "Combined perpetual futures & vanilla options risk management — unified Greek exposure, cross-product netting, and a single hedge engine for the entire derivatives book.":
    "パーペチュアル先物とバニラオプションの統合リスク管理 — 統一されたグリークスエクスポージャー、クロスプロダクトネッティング、デリバティブブック全体に対する単一のヘッジエンジン。",
  "1. Unified Portfolio — Perps + Options": "1. 統合ポートフォリオ — パーペチュアル + オプション",
  "Why a Unified View?": "なぜ統合ビューが必要なのか？",
  "When the exchange offers both perpetual futures and vanilla options, clients trading either product create risk exposure for the exchange. A perpetual future is a linear instrument — it only creates Delta (directional) exposure. An option is nonlinear — it creates Delta, Gamma, Vega, and Theta exposure simultaneously.":
    "取引所がパーペチュアル先物とバニラオプションの両方を提供する場合、いずれの商品を取引するクライアントも取引所にリスクエクスポージャーを生じさせます。パーペチュアル先物は線形商品であり、デルタ（方向性）エクスポージャーのみを生じさせます。オプションは非線形であり、デルタ、ガンマ、ベガ、シータのエクスポージャーを同時に生じさせます。",
  "A unified risk engine aggregates Greeks across both product types into a single vector. This is essential because a client going long a perp and another client selling a call may partially offset each other's Delta — the exchange should not hedge both separately.":
    "統合リスクエンジンは両方の商品タイプのグリークスを単一のベクトルに集約します。これは、パーペチュアルをロングするクライアントとコールを売るクライアントのデルタが部分的に相殺される可能性があるため不可欠です — 取引所は両方を別々にヘッジすべきではありません。",
  "Greeks by Instrument Type": "商品タイプ別グリークス",
  "Perp Positions": "パーペチュアルポジション",
  "Option Positions": "オプションポジション",
  "Total Positions": "総ポジション",
  "2. Real-Time Risk Dashboard": "2. リアルタイムリスクダッシュボード",
  "What Does the Exchange See?": "取引所は何を見るのか？",
  "The risk dashboard shows the exchange's net exposure across the entire derivatives book at a glance. The key numbers are: net Delta (how much does the exchange gain/lose per $1 BTC move), net Gamma (how fast does Delta change — critical for large moves), and net Vega (how much does the exchange gain/lose per 1 percentage-point change in implied volatility).":
    "リスクダッシュボードは、デリバティブブック全体にわたる取引所の純エクスポージャーを一目で表示します。主要な数値は：純デルタ（BTC$1の動きごとの損益）、純ガンマ（デルタの変化速度 — 大きな動きに重要）、純ベガ（インプライドボラティリティ1パーセントポイントの変化ごとの損益）です。",
  "For the combined book, Gamma and Vega are nonzero only because of the options positions. If the exchange only offered perps, risk management would be purely about Delta — the moment options are introduced, Gamma and Vega become dominant risk factors.":
    "統合ブックでは、ガンマとベガがゼロでないのはオプションポジションがあるためだけです。取引所がパーペチュアルのみを提供していた場合、リスク管理は純粋にデルタに関するものでした — オプションが導入された瞬間、ガンマとベガが支配的なリスク要因になります。",
  "Net Delta (BTC)": "純デルタ（BTC）",
  "Net Gamma": "純ガンマ",
  "Net Vega ($)": "純ベガ（$）",
  "Net Theta ($/day)": "純シータ（$/日）",
  "Instant P&L Impact Estimates": "瞬時P&L影響推定",
  "Risk Contribution by Source ($)": "リスク寄与（ソース別、$）",
  "3. Unified Hedge Engine — Trade-by-Trade": "3. 統合ヘッジエンジン — トレード毎",
  "One Engine for All Derivatives": "全デリバティブに1つのエンジン",
  "As client trades arrive — whether perpetual futures or vanilla options — the engine updates the aggregate Greek vector and computes the DGV-neutral hedge prescription. This is the operational core: after every trade, the risk desk knows exactly what positions to open or close.":
    "クライアントの取引が到着すると — パーペチュアル先物であれバニラオプションであれ — エンジンは集約されたグリークスベクトルを更新し、DGVニュートラルヘッジ処方を計算します。これが運用の核心です：すべての取引後、リスクデスクはどのポジションを開くか閉じるかを正確に把握します。",
  "The key insight: a perp trade only changes Delta, so the hedge engine only needs to adjust the spot position. An option trade changes Delta, Gamma, and Vega simultaneously, requiring adjustments to both spot and the two hedge options.":
    "重要な洞察：パーペチュアル取引はデルタのみを変更するため、ヘッジエンジンはスポットポジションの調整のみが必要です。オプション取引はデルタ、ガンマ、ベガを同時に変更するため、スポットと2つのヘッジオプションの両方の調整が必要です。",
  "DGV-Neutral Solve (2×2 + spot)": "DGVニュートラル求解（2×2 + スポット）",
  "Perp Trades": "パーペチュアル取引",
  "Option Trades": "オプション取引",
  "Total Trades": "総取引",
  "Cumulative Greek Exposure as Trades Arrive": "取引到着に伴う累積グリークスエクスポージャー",
  "Hedge Prescription After Each Trade": "各取引後のヘッジ処方",
  "Trade Log (scroll)": "取引ログ（スクロール）",
  "4. Cross-Product Netting Benefit": "4. クロスプロダクトネッティングベネフィット",
  "Why Netting Matters": "なぜネッティングが重要か",
  "If the exchange hedges perps and options separately, it might be buying spot BTC to hedge a long perp book while simultaneously selling spot BTC to hedge a negative-delta options book. This is wasteful — the two Deltas partially cancel each other.":
    "取引所がパーペチュアルとオプションを別々にヘッジする場合、ロングパーペチュアルブックのヘッジにスポットBTCを買いながら、同時にマイナスデルタのオプションブックのヘッジにスポットBTCを売ることになりかねません。これは無駄です — 2つのデルタは部分的に相殺されます。",
  "Cross-product netting computes the combined Greeks first, then hedges the net exposure. The saving comes from: (1) Delta offsets between linear and nonlinear products, and (2) diversification in VaR — losses in one product may be partially offset by the other.":
    "クロスプロダクトネッティングはまず統合グリークスを計算し、次に純エクスポージャーをヘッジします。節約は以下から生まれます：(1) 線形商品と非線形商品間のデルタ相殺、(2) VaRの分散効果 — 一方の商品の損失が他方で部分的に相殺される可能性。",
  "Netting Principle": "ネッティング原則",
  "Perps": "パーペチュアル",
  "Options": "オプション",
  "Combined": "統合",
  "Offset": "相殺",
  "VaR 99% — Separate vs Combined": "VaR 99% — 個別 vs 統合",
  "5. Dynamic Hedging Simulation (14 Days)": "5. 動的ヘッジシミュレーション（14日間）",
  "Simulating the Real World": "実世界のシミュレーション",
  "This simulation runs a 14-day window with BTC prices following a stochastic volatility + jump process (Bates-like). Every 4 hours, the hedge engine rebalances the entire book. We compare three strategies: (1) Unhedged — do nothing, (2) Delta-only — hedge Delta with spot BTC, and (3) Full DGV-neutral — hedge Delta, Gamma, and Vega using spot + two ATM options.":
    "このシミュレーションは、BTC価格が確率的ボラティリティ + ジャンプ過程（ベイツ型）に従う14日間のウィンドウを実行します。4時間ごとに、ヘッジエンジンはブック全体をリバランスします。3つの戦略を比較します：(1) 非ヘッジ — 何もしない、(2) デルタのみ — スポットBTCでデルタをヘッジ、(3) 完全DGVニュートラル — スポット + 2つのATMオプションでデルタ、ガンマ、ベガをヘッジ。",
  "The mixed book includes both perp positions (constant Delta throughout) and option positions (time-decaying, vol-sensitive). The funding rate impact on perps is tracked separately.":
    "混合ブックにはパーペチュアルポジション（一定のデルタ）とオプションポジション（時間減衰、ボラティリティ感応）の両方が含まれます。パーペチュアルのファンディングレート影響は別途追跡されます。",
  "Unhedged P&L": "非ヘッジP&L",
  "Delta-Only P&L": "デルタのみP&L",
  "DGV-Neutral P&L": "DGVニュートラルP&L",
  "BTC Price & Cumulative P&L by Strategy": "BTC価格 & 戦略別累積P&L",
  "Delta Decomposition Over Time (Perps vs Options)": "時間経過に伴うデルタ分解（パーペチュアル vs オプション）",
  "Residual Greeks — DGV-Neutral Strategy": "残余グリークス — DGVニュートラル戦略",
  "P&L Attribution (Unhedged Book)": "P&Lアトリビューション（非ヘッジブック）",
  "Cumulative P&L Attribution (Book)": "累積P&Lアトリビューション（ブック）",
  "6. Stress Testing & Combined VaR": "6. ストレステスト & 統合VaR",
  "Why Stress Test the Combined Book?": "なぜ統合ブックをストレステストするのか？",
  "Stress testing the combined book reveals how perps and options interact under extreme conditions. In a crash, the exchange loses on long perp exposure (linear) AND loses on short gamma positions (nonlinear, accelerating losses). In a vol spike, only the options book is affected. Understanding these cross-product dynamics is essential for setting capital reserves.":
    "統合ブックのストレステストは、極端な状況下でパーペチュアルとオプションがどのように相互作用するかを明らかにします。暴落時、取引所はロングパーペチュアルエクスポージャー（線形）で損失し、かつショートガンマポジション（非線形、加速する損失）でも損失します。ボラティリティスパイク時はオプションブックのみが影響を受けます。これらのクロスプロダクトダイナミクスを理解することは資本準備金の設定に不可欠です。",
  "1-day VaR 95%": "1日VaR 95%",
  "1-day VaR 99%": "1日VaR 99%",
  "1-day CVaR 99%": "1日CVaR 99%",
  "Perp P&L": "パーペチュアルP&L",
  "Option P&L": "オプションP&L",
  "Total P&L": "合計P&L",
  "Stress P&L Decomposition: Perps vs Options": "ストレスP&L分解：パーペチュアル vs オプション",
  "1-Day P&L Distribution (MC 10K paths)": "1日P&L分布（MC 1万パス）",
  "Risk Contribution by Product Type": "商品タイプ別リスク寄与",
  "Unified Risk Engine · Built with Next.js, Plotly.js, Python": "統合リスクエンジン · Next.js、Plotly.js、Pythonで構築",
};
