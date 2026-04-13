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
};
