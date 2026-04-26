// frontend/src/app/financing/page.tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ── 型定義 ──────────────────────────────────────────────
type FiscalYear = {
  year: string;
  sales: string;
  operatingProfit: string;
  netAssets: string;
  totalDebt: string;
  cashFlow: string;
};

type FormData = {
  // 企業基本情報
  companyName: string;
  industry: string;
  established: string;
  representative: string;
  capital: string;
  employees: string;
  // 財務データ（3期分）
  fiscalYears: FiscalYear[];
  // 借入情報
  currentDebt: string;
  monthlyRepayment: string;
  // 事業計画
  loanAmount: string;
  loanPurpose: string;
  repaymentPeriod: string;
  salesPlan1: string;
  salesPlan2: string;
  salesPlan3: string;
  businessDescription: string;
};

const initialFiscalYear = (): FiscalYear => ({
  year: "", sales: "", operatingProfit: "",
  netAssets: "", totalDebt: "", cashFlow: "",
});

const INDUSTRIES = [
  "製造業", "建設業", "卸売業", "小売業", "飲食業",
  "宿泊業", "運輸業", "情報通信業", "医療・福祉",
  "不動産業", "サービス業", "その他",
];

export default function FinancingPage() {
  const [form, setForm] = useState<FormData>({
    companyName: "", industry: "", established: "",
    representative: "", capital: "", employees: "",
    fiscalYears: [initialFiscalYear(), initialFiscalYear(), initialFiscalYear()],
    currentDebt: "", monthlyRepayment: "",
    loanAmount: "", loanPurpose: "", repaymentPeriod: "",
    salesPlan1: "", salesPlan2: "", salesPlan3: "",
    businessDescription: "",
  });

  const [generating, setGenerating] = useState<"pdf" | "docx" | null>(null);
  const [message, setMessage]       = useState("");
  const [step, setStep]             = useState(1); // 1〜3のステップ

  const set = (key: keyof FormData, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setFiscal = (i: number, key: keyof FiscalYear, val: string) =>
    setForm((f) => {
      const fy = [...f.fiscalYears];
      fy[i] = { ...fy[i], [key]: val };
      return { ...f, fiscalYears: fy };
    });

  // ── レポート生成 ─────────────────────────────────────
  const generate = async (format: "pdf" | "docx") => {
    if (!form.companyName) {
      setMessage("❌ 会社名は必須です");
      return;
    }
    setGenerating(format);
    setMessage("");
    try {
      const res = await api.post(
        `/api/financing/generate?format=${format}`,
        form,
        { responseType: "blob" }
      );
      const ext  = format === "pdf" ? "pdf" : "docx";
      const mime = format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const url  = URL.createObjectURL(new Blob([res.data], { type: mime }));
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `融資対策レポート_${form.companyName}.${ext}`;
      a.click();
      setMessage(`✅ ${format.toUpperCase()}を出力しました`);
    } catch {
      setMessage("❌ 生成に失敗しました。入力内容を確認してください。");
    } finally {
      setGenerating(null);
    }
  };

  // ── 入力フィールド共通スタイル ────────────────────────
  const inputCls =
    "w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">融資対策レポート</h1>
          <p className="text-sm text-muted-foreground mt-1">
            金融機関提出用の事業計画書・財務分析レポートをAIが自動生成します
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "企業情報" },
          { n: 2, label: "財務データ" },
          { n: 3, label: "事業計画" },
        ].map(({ n, label }) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-colors ${
              step === n
                ? "bg-blue-500 text-white"
                : step > n
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              step === n ? "bg-white text-blue-500" : step > n ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
            }`}>{step > n ? "✓" : n}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── STEP 1: 企業基本情報 ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>企業基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>会社名 *</label>
                <input className={inputCls} value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder="株式会社○○" />
              </div>
              <div>
                <label className={labelCls}>業種</label>
                <select className={inputCls} value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}>
                  <option value="">選択してください</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>設立年月</label>
                <input className={inputCls} type="month" value={form.established}
                  onChange={(e) => set("established", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>代表者名</label>
                <input className={inputCls} value={form.representative}
                  onChange={(e) => set("representative", e.target.value)}
                  placeholder="山田 太郎" />
              </div>
              <div>
                <label className={labelCls}>資本金（万円）</label>
                <input className={inputCls} type="number" value={form.capital}
                  onChange={(e) => set("capital", e.target.value)}
                  placeholder="1000" />
              </div>
              <div>
                <label className={labelCls}>従業員数（名）</label>
                <input className={inputCls} type="number" value={form.employees}
                  onChange={(e) => set("employees", e.target.value)}
                  placeholder="20" />
              </div>
            </div>
            <div>
              <label className={labelCls}>事業内容の概要</label>
              <textarea className={inputCls} rows={3} value={form.businessDescription}
                onChange={(e) => set("businessDescription", e.target.value)}
                placeholder="主要な事業内容・強み・差別化ポイントを記載してください" />
            </div>
            <div className="flex justify-end">
              <button onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600">
                次へ：財務データ →
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: 財務データ（3期分） ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>財務データ（直近3期分）</CardTitle>
            <p className="text-xs text-muted-foreground">
              金融機関が最も重視する指標です。決算書を参照して入力してください（単位：万円）
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {form.fiscalYears.map((fy, i) => (
              <div key={i} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    第{["1", "2", "3"][i]}期（直近{i === 0 ? "3期前" : i === 1 ? "2期前" : "1期前"}）
                  </span>
                  <input className="px-2 py-1 border rounded text-sm w-32"
                    value={fy.year} onChange={(e) => setFiscal(i, "year", e.target.value)}
                    placeholder="2024年3月期" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "sales",           label: "売上高",       placeholder: "50000" },
                    { key: "operatingProfit", label: "経常利益",     placeholder: "2000"  },
                    { key: "netAssets",       label: "純資産",       placeholder: "5000"  },
                    { key: "totalDebt",       label: "借入残高合計", placeholder: "10000" },
                    { key: "cashFlow",        label: "営業CF",       placeholder: "3000"  },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className={labelCls}>{label}（万円）</label>
                      <input className={inputCls} type="number"
                        value={fy[key as keyof FiscalYear]}
                        onChange={(e) => setFiscal(i, key as keyof FiscalYear, e.target.value)}
                        placeholder={placeholder} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* 借入情報 */}
            <div className="border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium">現在の借入状況</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>現在の借入残高合計（万円）</label>
                  <input className={inputCls} type="number" value={form.currentDebt}
                    onChange={(e) => set("currentDebt", e.target.value)} placeholder="10000" />
                </div>
                <div>
                  <label className={labelCls}>月次返済額（万円）</label>
                  <input className={inputCls} type="number" value={form.monthlyRepayment}
                    onChange={(e) => set("monthlyRepayment", e.target.value)} placeholder="200" />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)}
                className="px-6 py-2 border rounded-md text-sm hover:bg-muted">
                ← 戻る
              </button>
              <button onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600">
                次へ：事業計画 →
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: 事業計画・融資希望 ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>事業計画・融資希望内容</CardTitle>
            <p className="text-xs text-muted-foreground">
              融資の目的と返済根拠を明確に記載すると審査通過率が上がります
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>融資希望額（万円）</label>
                <input className={inputCls} type="number" value={form.loanAmount}
                  onChange={(e) => set("loanAmount", e.target.value)} placeholder="5000" />
              </div>
              <div>
                <label className={labelCls}>希望返済期間（年）</label>
                <select className={inputCls} value={form.repaymentPeriod}
                  onChange={(e) => set("repaymentPeriod", e.target.value)}>
                  <option value="">選択</option>
                  {[3,5,7,10,15,20].map((y) => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>資金使途</label>
                <select className={inputCls} value={form.loanPurpose}
                  onChange={(e) => set("loanPurpose", e.target.value)}>
                  <option value="">選択</option>
                  {["設備投資","運転資金","借換え","事業拡大","M&A","その他"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 売上計画（3年） */}
            <div className="border rounded-md p-4 space-y-3">
              <p className="text-sm font-medium">売上計画（向こう3年・万円）</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "salesPlan1", label: "1年目" },
                  { key: "salesPlan2", label: "2年目" },
                  { key: "salesPlan3", label: "3年目" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputCls} type="number"
                      value={form[key as keyof FormData] as string}
                      onChange={(e) => set(key as keyof FormData, e.target.value)}
                      placeholder="55000" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ※ AIが売上根拠・収支計画・返済シミュレーションを自動生成します
              </p>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)}
                className="px-6 py-2 border rounded-md text-sm hover:bg-muted">
                ← 戻る
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── レポート生成ボタン（STEP3完了後に常時表示） ── */}
      {step === 3 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">レポート生成</CardTitle>
            <p className="text-xs text-blue-600">
              入力データをもとにAIが金融機関提出用レポートを自動作成します
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 生成内容プレビュー */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                "📊 財務3期比較分析（自己資本比率・流動比率・債務償還年数）",
                "💰 キャッシュフロー3区分分析（営業・投資・財務CF）",
                "📈 売上・利益トレンド評価",
                "🏦 融資返済シミュレーション表",
                "📋 事業計画書本文（会社概要〜返済計画）",
                "⚠️ リスク・課題と対応策",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 p-2 bg-white rounded border">
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* 出力ボタン */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => generate("pdf")}
                disabled={!!generating}
                className="flex-1 py-3 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {generating === "pdf" ? "生成中..." : "📄 PDF出力（金融機関提出用）"}
              </button>
              <button
                onClick={() => generate("docx")}
                disabled={!!generating}
                className="flex-1 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {generating === "docx" ? "生成中..." : "📝 Word出力（編集可能版）"}
              </button>
            </div>

            {generating && (
              <div className="p-4 bg-white border rounded-md text-sm text-center animate-pulse">
                AIが財務データを分析してレポートを生成中です...（30秒ほどかかる場合があります）
              </div>
            )}
            {message && (
              <p className={`text-sm ${message.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}