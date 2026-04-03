"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CATEGORIES = [
  "売上高", "売上原価", "粗利益",
  "人件費", "家賃", "広告費", "その他経費", "営業利益",
];

const ACCOUNT_ID = 1;

export default function BudgetPage() {
  const now   = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [data,    setData]    = useState<any>(null);
  const [annual,  setAnnual]  = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Record<string, { budget: string; actual: string }>>({});
  const [saved,   setSaved]   = useState(false);

  // ===== 月次データ取得 =====
  const fetchData = async () => {
    try {
      const res = await api.get(`/api/budget/${ACCOUNT_ID}/${year}/${month}`);
      setData(res.data);

      const init: Record<string, { budget: string; actual: string }> = {};
      res.data.items.forEach((item: any) => {
        init[item.category] = {
          budget: String(item.budget_amt),
          actual: String(item.actual_amt),
        };
      });
      CATEGORIES.forEach((cat) => {
        if (!init[cat]) init[cat] = { budget: "0", actual: "0" };
      });
      setEditing(init);
    } catch {
      const init: Record<string, { budget: string; actual: string }> = {};
      CATEGORIES.forEach((cat) => {
        init[cat] = { budget: "0", actual: "0" };
      });
      setEditing(init);
    }
  };

  // ===== 年間サマリー取得 =====
  const fetchAnnual = async () => {
    try {
      const res = await api.get(`/api/budget/summary/${ACCOUNT_ID}/${year}`);
      setAnnual(res.data.map((r: any) => ({
        month:  `${r.month}月`,
        予算:   Number(r.budget),
        実績:   Number(r.actual),
      })));
    } catch {
      setAnnual([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnnual();
  }, [year, month]);

  // ===== 保存 =====
  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      for (const [category, vals] of Object.entries(editing)) {
        await api.post("/api/budget/", {
          account_id: ACCOUNT_ID,
          year,
          month,
          category,
          budget_amt: Number(vals.budget) || 0,
          actual_amt: Number(vals.actual) || 0,
        });
      }
      await fetchData();
      await fetchAnnual();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const variance     = data ? data.variance     : 0;
  const total_budget = data ? data.total_budget : 0;
  const total_actual = data ? data.total_actual : 0;
  const rate         = data ? data.rate         : 0;

  return (
    <div className="p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">予実管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            予算と実績を入力してAIが差異を分析します
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* 期間選択 */}
      <div className="flex gap-3 items-center">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "予算合計",   value: `¥${total_budget.toLocaleString()}`, color: "text-blue-600"  },
          { label: "実績合計",   value: `¥${total_actual.toLocaleString()}`, color: "text-green-600" },
          { label: "差異",       value: `¥${variance.toLocaleString()}`,     color: variance >= 0 ? "text-green-600" : "text-red-600" },
          { label: "達成率",     value: `${rate}%`,                          color: rate >= 100 ? "text-green-600" : "text-orange-500" },
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

      {/* 年間グラフ */}
      {annual.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{year}年 年間予実推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={annual}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                <Tooltip formatter={(v) => [`¥${Number(v).toLocaleString()}`, ""]} />
                <Legend />
                <Bar dataKey="予算" fill="#93c5fd" />
                <Bar dataKey="実績" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 予実入力テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{year}年{month}月 予実入力</CardTitle>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
          {saved && (
            <p className="text-green-600 text-sm mt-1">保存しました！</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground">科目</th>
                  <th className="text-right py-2 px-3 text-muted-foreground">予算（円）</th>
                  <th className="text-right py-2 px-3 text-muted-foreground">実績（円）</th>
                  <th className="text-right py-2 px-3 text-muted-foreground">差異</th>
                  <th className="text-right py-2 px-3 text-muted-foreground">達成率</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((cat) => {
                  const b   = Number(editing[cat]?.budget) || 0;
                  const a   = Number(editing[cat]?.actual) || 0;
                  const v   = a - b;
                  const r   = b > 0 ? Math.round(a / b * 100) : 0;
                  return (
                    <tr key={cat} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{cat}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={editing[cat]?.budget || "0"}
                          onChange={(e) => setEditing((prev) => ({
                            ...prev,
                            [cat]: { ...prev[cat], budget: e.target.value },
                          }))}
                          className="w-full text-right px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          value={editing[cat]?.actual || "0"}
                          onChange={(e) => setEditing((prev) => ({
                            ...prev,
                            [cat]: { ...prev[cat], actual: e.target.value },
                          }))}
                          className="w-full text-right px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className={`py-2 px-3 text-right font-medium ${v >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {v >= 0 ? "+" : ""}{v.toLocaleString()}
                      </td>
                      <td className={`py-2 px-3 text-right ${r >= 100 ? "text-green-600" : "text-orange-500"}`}>
                        {r}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}