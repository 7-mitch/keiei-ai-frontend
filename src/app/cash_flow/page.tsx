"use client";
import { useState, useEffect } from "react";
import { api, chatApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const QUICK_QUESTIONS = [
  "今月の資金繰り状況を分析してください",
  "30日後の資金予測とリスクを教えてください",
  "資金ショートを防ぐための改善策を提案してください",
  "キャッシュフロー改善に効果的な施策を3つ提案してください",
];

type PeriodType = "3m" | "6m" | "12m" | "custom";

export default function CashFlowPage() {
  const [chartData,  setChartData]  = useState<any[]>([]);
  const [period,     setPeriod]     = useState<PeriodType>("12m");
  const [startDate,  setStartDate]  = useState("");
  const [endDate,    setEndDate]    = useState("");
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState("");
  const [question,   setQuestion]   = useState("");
  const [result,     setResult]     = useState("");
  const [loading,    setLoading]    = useState(false);

  const getDateRange = () => {
    const end   = new Date();
    const start = new Date();
    if (period === "3m")  start.setMonth(end.getMonth() - 3);
    if (period === "6m")  start.setMonth(end.getMonth() - 6);
    if (period === "12m") start.setFullYear(end.getFullYear() - 1);
    return {
      start: period === "custom" ? startDate : start.toISOString().split("T")[0],
      end:   period === "custom" ? endDate   : end.toISOString().split("T")[0],
    };
  };

  const fetchSummary = async () => {
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams();
      if (start) params.append("start", start);
      if (end)   params.append("end",   end);
      const res = await api.get(`/api/cash_flow/summary?${params.toString()}`);
      setChartData(res.data);
    } catch {
      setChartData([]);
    }
  };

  useEffect(() => { fetchSummary(); }, [period]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/api/cash_flow/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg(`✅ ${res.data.message}`);
      fetchSummary();
    } catch (err: any) {
      setUploadMsg(`❌ ${err?.response?.data?.detail || "取込に失敗しました"}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAsk = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await chatApi.send(q);
      setResult(res.answer || res.result || res.response || "回答を取得できませんでした。");
    } catch {
      setResult("エラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const totalIncome  = chartData.reduce((s, d) => s + (d.income  || 0), 0);
  const totalExpense = chartData.reduce((s, d) => s + (d.expense || 0), 0);
  const totalNet     = chartData.reduce((s, d) => s + (d.net     || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">資金繰り監視</h1>
          <p className="text-sm text-muted-foreground mt-1">
            キャッシュフローの自動集計・予測・アラート管理
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "総収入",    value: `¥${totalIncome.toLocaleString()}`,  color: "text-blue-600"  },
          { label: "総支出",    value: `¥${totalExpense.toLocaleString()}`, color: "text-red-600"   },
          { label: "純利益",    value: `¥${totalNet.toLocaleString()}`,     color: totalNet >= 0 ? "text-green-600" : "text-red-600" },
          { label: "データ件数", value: `${chartData.length}ヶ月`,           color: "text-gray-600"  },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ファイル取込 */}
      <Card>
        <CardHeader>
          <CardTitle>データ取込（CSV / Excel）</CardTitle>
          <p className="text-xs text-muted-foreground">
            必須カラム: date（YYYY-MM-DD）, amount（金額）, type（income/expense）, description（摘要）
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors">
              {uploading ? "取込中..." : "ファイルを選択"}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <span className="text-xs text-muted-foreground">CSV・Excel (.xlsx/.xls) 対応</span>
          </div>
          {uploadMsg && (
            <p className={`text-sm ${uploadMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
              {uploadMsg}
            </p>
          )}

          {/* サンプルCSVダウンロード */}
          <button
            onClick={() => {
              const csv = "date,amount,type,description\n2026-01-01,500000,income,売上\n2026-01-15,200000,expense,仕入れ";
              const blob = new Blob([csv], { type: "text/csv" });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href = url; a.download = "sample_cash_flow.csv"; a.click();
            }}
            className="text-xs text-blue-500 hover:underline"
          >
            📥 サンプルCSVをダウンロード
          </button>
        </CardContent>
      </Card>

      {/* 期間選択 + グラフ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>月次収支推移</CardTitle>
            <div className="flex items-center gap-2">
              {(["3m", "6m", "12m", "custom"] as PeriodType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                    period === p
                      ? "bg-blue-500 text-white border-blue-500"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p === "3m" ? "3ヶ月" : p === "6m" ? "6ヶ月" : p === "12m" ? "1年" : "カスタム"}
                </button>
              ))}
            </div>
          </div>

          {/* カスタム期間 */}
          {period === "custom" && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-muted-foreground">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchSummary}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
              >
                表示
              </button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `¥${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => [`¥${Number(v).toLocaleString()}`, ""]} />
                <Area type="monotone" dataKey="income"  stroke="#2563eb" fill="#dbeafe" name="収入" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#fee2e2" name="支出" />
                <Area type="monotone" dataKey="net"     stroke="#16a34a" fill="#dcfce7" name="純利益" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              データがありません。CSVまたはExcelファイルを取り込んでください。
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI分析 */}
      <Card>
        <CardHeader>
          <CardTitle>AI資金繰りアドバイス</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {loading && (
            <div className="p-4 bg-gray-50 rounded-md text-sm text-muted-foreground animate-pulse">
              AIが分析中です...
            </div>
          )}
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