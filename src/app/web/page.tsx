"use client";
import { useState, useEffect } from "react";
import { webApi, WebCollectResponse, WebLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WebPage() {
  const [url,      setUrl]      = useState("");
  const [logs,     setLogs]     = useState<WebLog[]>([]);
  const [result,   setResult]   = useState<WebCollectResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const fetchLogs = async () => {
    try {
      const data = await webApi.getLogs();
      setLogs(data);
    } catch {
      setError("ログ取得に失敗しました。");
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleCollect = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await webApi.collect();
      setResult(res);
      await fetchLogs();
    } catch {
      setError("収集に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleCollectUrl = async () => {
    if (!url.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      await webApi.collectUrl(url);
      setUrl("");
      await fetchLogs();
    } catch {
      setError("URL収集に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🌐 Web収集</h1>

      {/* 一括収集 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            金融ニュース一括収集
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCollect} disabled={loading}>
            {loading ? "収集中..." : "一括収集を実行"}
          </Button>
          {result && (
            <p className="mt-2 text-sm text-green-700">{result.message}</p>
          )}
        </CardContent>
      </Card>

      {/* URL指定収集 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            URL指定収集
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCollectUrl()}
            placeholder="https://..."
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <Button onClick={handleCollectUrl} disabled={loading}>
            収集
          </Button>
        </CardContent>
      </Card>

      {/* エラー */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 収集ログ */}
      <Card>
        <CardHeader>
          <CardTitle>収集ログ</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ログがありません</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center gap-4 text-sm border-b pb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    log.status === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {log.status}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">{log.url}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.processed_at).toLocaleString("ja-JP")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}