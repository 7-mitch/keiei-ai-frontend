"use client";
import { useState, useEffect } from "react";
import { webApi, WebCollectResponse, WebLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const INDUSTRIES = ["介護", "医療", "建設", "製造", "法律", "経理"];

export default function WebPage() {
  const [url,             setUrl]             = useState("");
  const [logs,            setLogs]            = useState<WebLog[]>([]);
  const [result,          setResult]          = useState<WebCollectResponse | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [loadingIndustry, setLoadingIndustry] = useState<string | null>(null);
  const [error,           setError]           = useState("");
  const [activeTab,       setActiveTab]       = useState<"news" | "industry" | "url">("news");

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

  const handleIndustryCollect = async (industry: string) => {
    setLoadingIndustry(industry);
    setError("");
    try {
      await webApi.collectUrl(`industry:${industry}`);
      await fetchLogs();
    } catch {
      setError(`${industry}の法令収集に失敗しました。`);
    } finally {
      setLoadingIndustry(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Web収集</h1>
          <p className="text-sm text-muted-foreground mt-1">
            業界別法令・金融ニュース・URL指定の自動収集とRAG自動追加
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      <div className="flex gap-2">
        {([
          { key: "news",     label: "金融ニュース" },
          { key: "industry", label: "業界別法令"   },
          { key: "url",      label: "URL指定"      },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm rounded-md border transition-colors ${
              activeTab === tab.key
                ? "bg-blue-500 text-white border-blue-500"
                : "text-muted-foreground border-gray-200 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "news" && (
        <Card>
          <CardHeader>
            <CardTitle>金融ニュース一括収集</CardTitle>
            <p className="text-xs text-muted-foreground">
              日本銀行・金融庁・日本経済新聞から最新情報を収集してRAGに追加します
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {["日本銀行", "金融庁", "日本経済新聞"].map((src) => (
                <div
                  key={src}
                  className="p-3 border rounded-md text-sm text-center text-muted-foreground"
                >
                  {src}
                </div>
              ))}
            </div>
            <Button onClick={handleCollect} disabled={loading}>
              {loading ? "収集中..." : "一括収集を実行"}
            </Button>
            {result && (
              <p className="text-sm text-green-700">{result.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "industry" && (
        <Card>
          <CardHeader>
            <CardTitle>業界別法令・規制情報収集</CardTitle>
            <p className="text-xs text-muted-foreground">
              各省庁サイトから最新の法令・規制情報を収集してRAGに自動追加します
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry}
                  onClick={() => handleIndustryCollect(industry)}
                  disabled={loadingIndustry !== null}
                  className="p-4 border rounded-md text-sm font-medium hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 transition-colors"
                >
                  {loadingIndustry === industry ? (
                    <span className="text-blue-500">収集中...</span>
                  ) : (
                    <span>{industry}</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 font-normal">
                    {industry === "介護"  && "厚労省・介護保険"}
                    {industry === "医療"  && "厚労省・診療報酬"}
                    {industry === "建設"  && "国交省・建築基準法"}
                    {industry === "製造"  && "経産省・ISO規格"}
                    {industry === "法律"  && "e-Gov法令検索"}
                    {industry === "経理"  && "国税庁・インボイス"}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>URL指定収集</CardTitle>
            <p className="text-xs text-muted-foreground">
              指定したURLのコンテンツを収集してRAGに自動追加します
            </p>
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
            <Button
              onClick={handleCollectUrl}
              disabled={loading || !url.trim()}
            >
              {loading ? "収集中..." : "収集"}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>収集ログ</CardTitle>
            <button
              onClick={fetchLogs}
              className="text-xs text-blue-500 hover:underline"
            >
              更新
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">ログがありません</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 text-sm border-b pb-2"
                >
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    log.status === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {log.status}
                  </span>
                  <span className="flex-1 truncate text-muted-foreground">
                    {log.url}
                  </span>
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