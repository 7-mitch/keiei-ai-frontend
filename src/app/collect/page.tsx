"use client";
import { useState } from "react";
import { collectApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CollectPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error,   setError]   = useState("");

  const handleInitialize = async () => {
    if (!confirm("DWHテーブルを初期化しますか？")) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await collectApi.initialize();
      setMessage(res.message);
    } catch {
      setError("初期化に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await collectApi.sync();
      setMessage(res.message);
    } catch {
      setError("同期に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📥 データ収集</h1>

      {/* メッセージ */}
      {message && (
        <div className="p-4 bg-green-50 text-green-800 rounded-md text-sm">
          ✅ {message}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm">
          ❌ {error}
        </div>
      )}

      {/* DWH初期化 */}
      <Card>
        <CardHeader>
          <CardTitle>DWH初期化</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            BigQueryのDWHテーブルを初期化します。初回セットアップ時に実行してください。
          </p>
          <Button
            variant="destructive"
            onClick={handleInitialize}
            disabled={loading}
          >
            {loading ? "処理中..." : "DWH初期化を実行"}
          </Button>
        </CardContent>
      </Card>

      {/* データ同期 */}
      <Card>
        <CardHeader>
          <CardTitle>データ同期</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            全データソースからDWHへデータを同期します。
          </p>
          <Button onClick={handleSync} disabled={loading}>
            {loading ? "同期中..." : "データ同期を実行"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}