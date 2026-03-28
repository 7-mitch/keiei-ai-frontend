"use client";
import { useState } from "react";
import { fraudApi, FraudCheckResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function FraudPage() {
  const [txId,    setTxId]    = useState("");
  const [manual,  setManual]  = useState({
    account_id:       0,
    amount:           0,
    transaction_type: "debit",
    description:      "",
  });
  const [result,  setResult]  = useState<FraudCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [tab,     setTab]     = useState<"id" | "manual">("id");

  const handleCheckById = async () => {
    if (!txId || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fraudApi.check(Number(txId));
      setResult(res);
    } catch {
      setError("不正チェックに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckManual = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fraudApi.checkManual(manual);
      setResult(res);
    } catch {
      setError("不正チェックに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const severityColor: Record<string, string> = {
    low:      "bg-green-100 text-green-800",
    medium:   "bg-yellow-100 text-yellow-800",
    high:     "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🔍 不正検知</h1>

      {/* タブ */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("id")}
          className={`px-4 py-2 text-sm ${tab === "id" ? "border-b-2 border-blue-600 font-bold" : "text-muted-foreground"}`}
        >
          取引ID指定
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`px-4 py-2 text-sm ${tab === "manual" ? "border-b-2 border-blue-600 font-bold" : "text-muted-foreground"}`}
        >
          手動入力
        </button>
      </div>

      {/* 取引ID指定 */}
      {tab === "id" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              既存の取引IDで不正チェック
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <input
              type="number"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              placeholder="取引ID..."
              className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <Button onClick={handleCheckById} disabled={loading}>
              {loading ? "チェック中..." : "チェック"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 手動入力 */}
      {tab === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              取引データを手動入力してチェック
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">アカウントID</label>
                <input
                  type="number"
                  value={manual.account_id}
                  onChange={(e) => setManual({ ...manual, account_id: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">金額</label>
                <input
                  type="number"
                  value={manual.amount}
                  onChange={(e) => setManual({ ...manual, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">取引タイプ</label>
                <select
                  value={manual.transaction_type}
                  onChange={(e) => setManual({ ...manual, transaction_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                  disabled={loading}
                >
                  <option value="debit">debit</option>
                  <option value="credit">credit</option>
                  <option value="transfer">transfer</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">説明</label>
                <input
                  type="text"
                  value={manual.description}
                  onChange={(e) => setManual({ ...manual, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                  disabled={loading}
                />
              </div>
            </div>
            <Button onClick={handleCheckManual} disabled={loading}>
              {loading ? "チェック中..." : "不正チェック実行"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* エラー */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 結果 */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              チェック結果
              <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor[result.severity] || ""}`}>
                {result.severity}
              </span>
              {result.is_fraud && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-600 text-white">
                  不正検知
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">リスクスコア</p>
                <p className="text-2xl font-bold">{result.risk_score}</p>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${result.risk_score > 0.7 ? "bg-red-500" : result.risk_score > 0.4 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{ width: `${result.risk_score * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">判定理由</p>
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                {result.reasoning}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              セッションID: {result.session_id}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}