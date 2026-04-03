"use client";
import { useState } from "react";
import { chatApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ===== リスクカラー =====
const RISK_COLOR: Record<string, string> = {
  critical: "text-red-600",
  high:     "text-orange-500",
  medium:   "text-yellow-500",
  low:      "text-green-600",
};

const RISK_LABEL: Record<string, string> = {
  critical: "危険",
  high:     "要注意",
  medium:   "注意",
  low:      "安全",
};

// ===== サンプルデータ（API接続前の表示用）=====
const SAMPLE_MONTHLY = [
  { month: "1月", income: 0, expense: 0, net: 0 },
  { month: "2月", income: 0, expense: 0, net: 0 },
  { month: "3月", income: 0, expense: 0, net: 0 },
];

// ===== クイック質問 =====
const QUICK_QUESTIONS = [
  "今月の資金繰り状況を分析してください",
  "30日後の資金予測とリスクを教えてください",
  "資金ショートを防ぐための改善策を提案してください",
  "インボイス制度の経過措置変更で注意すべき点を教えてください",
  "月次決算を早期化するための具体的な手順を教えてください",
  "キャッシュフロー改善に効果的な施策を3つ提案してください",
];

export default function CashFlowPage() {
  const [question, setQuestion] = useState("");
  const [result,   setResult]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleAsk = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await chatApi.send(q);
      setResult(res.result || "回答を取得できませんでした。");
    } catch {
      setResult("エラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">資金繰り監視</h1>
          <p className="text-sm text-muted-foreground mt-1">
            キャッシュフローの自動集計・予測・アラート管理
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* KPIカード（DB接続後に実データに切り替え）*/}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "現在残高",       value: "—",   sub: "DBから取得",     color: "text-blue-600"  },
          { label: "30日後予測",     value: "—",   sub: "過去3ヶ月平均",  color: "text-green-600" },
          { label: "月次純利益（平均）", value: "—", sub: "直近3ヶ月",     color: ""              },
          { label: "リスク判定",     value: "—",   sub: "自動算出",       color: "text-gray-400"  },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${item.color}`}>
                {item.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 月次収支グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>月次収支推移</CardTitle>
          <p className="text-xs text-muted-foreground">
            取引データが蓄積されると自動でグラフに反映されます
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={SAMPLE_MONTHLY}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `¥${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v) => [`¥${Number(v).toLocaleString()}`, ""]} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#2563eb"
                fill="#dbeafe"
                name="収入"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#ef4444"
                fill="#fee2e2"
                name="支出"
              />
              <Area
                type="monotone"
                dataKey="net"
                stroke="#16a34a"
                fill="#dcfce7"
                name="純利益"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* アラートセクション */}
      <Card>
        <CardHeader>
          <CardTitle>自動アラート</CardTitle>
          <p className="text-xs text-muted-foreground">
            資金ショートリスク・試算表遅延・インボイス対応を自動検知
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { severity: "info",   message: "2026年インボイス制度：経過措置の控除割合が縮小されています。仕入税額控除の確認を推奨します。" },
              { severity: "low",    message: "資金繰りは現在安定しています。取引データが蓄積されると精度が上がります。" },
            ].map((alert, i) => (
              <div
                key={i}
                className={`p-3 rounded-md text-sm border-l-4 ${
                  alert.severity === "info"
                    ? "bg-blue-50 border-blue-400 text-blue-700"
                    : "bg-green-50 border-green-400 text-green-700"
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI資金繰りアドバイス */}
      <Card>
        <CardHeader>
          <CardTitle>AI資金繰りアドバイス</CardTitle>
          <p className="text-xs text-muted-foreground">
            資金繰りに関する質問を入力してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* クイック質問 */}
          <div className="grid grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                disabled={loading}
                className="p-2 text-xs text-left border rounded-md hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* カスタム入力 */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="資金繰りについて質問してください..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk(question)}
            />
            <button
              onClick={() => handleAsk(question)}
              disabled={loading || !question.trim()}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "分析中..." : "分析"}
            </button>
          </div>

          {/* ローディング */}
          {loading && (
            <div className="p-4 bg-gray-50 rounded-md text-sm text-muted-foreground animate-pulse">
              AI が分析中です...
            </div>
          )}

          {/* 結果 */}
          {result && !loading && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}