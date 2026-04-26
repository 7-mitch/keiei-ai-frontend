"use client";
import { useState, useEffect } from "react";
import { webApi, WebCollectResponse, WebLog } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const INDUSTRIES = ["介護", "医療", "建設", "製造", "法律", "経理"];

const DATA_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  financial_news:           { label: "金融ニュース", color: "bg-blue-100 text-blue-800"    },
  regulatory_news:          { label: "金融庁",       color: "bg-purple-100 text-purple-800" },
  market_news:              { label: "市場情報",     color: "bg-indigo-100 text-indigo-800" },
  regulatory_care:          { label: "介護法令",     color: "bg-pink-100 text-pink-800"     },
  regulatory_medical:       { label: "医療法令",     color: "bg-red-100 text-red-800"       },
  regulatory_construction:  { label: "建設法令",     color: "bg-orange-100 text-orange-800" },
  regulatory_manufacturing: { label: "製造法令",     color: "bg-yellow-100 text-yellow-800" },
  regulatory_legal:         { label: "法令検索",     color: "bg-green-100 text-green-800"   },
  regulatory_accounting:    { label: "経理・税務",   color: "bg-teal-100 text-teal-800"     },
  custom_url:               { label: "URL指定",      color: "bg-gray-100 text-gray-800"     },
  sns_insight:              { label: "SNS",          color: "bg-cyan-100 text-cyan-800"     },
  tech_insight:             { label: "技術情報",     color: "bg-violet-100 text-violet-800" },
};

const DOMAIN_NAME: Record<string, string> = {
  "mhlw.go.jp":           "厚生労働省",
  "meti.go.jp":           "経済産業省",
  "mlit.go.jp":           "国土交通省",
  "nta.go.jp":            "国税庁",
  "fsa.go.jp":            "金融庁",
  "boj.or.jp":            "日本銀行",
  "cao.go.jp":            "内閣府",
  "laws.e-gov.go.jp":     "e-Gov法令検索",
  "e-gov.go.jp":          "e-Gov",
  "nikkei.com":           "日本経済新聞",
  "reuters.com":          "ロイター",
  "asahi.com":            "朝日新聞",
  "yomiuri.co.jp":        "読売新聞",
  "mainichi.jp":          "毎日新聞",
  "nhk.or.jp":            "NHK",
  "traders.co.jp":        "トレーダーズ",
  "minkabu.jp":           "みんかぶ",
  "investing.com":        "Investing.com",
  "zenhokan.or.jp":       "全国老人保健施設協会",
  "roken.or.jp":          "全国老人福祉施設協議会",
  "fukushi.metro.tokyo":  "東京都福祉局",
  "smacare.jp":           "スマケア",
  "kaipoke.biz":          "カイポケ",
  "hokennomadoguchi.com": "保険の窓口",
  "ricoh.co.jp":          "リコー",
  "keyence.co.jp":        "キーエンス",
  "nttdata-kansai.co.jp": "NTTデータ関西",
  "youtube.com":          "YouTube",
};

const getDomainName = (url: string): string => {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    for (const [domain, name] of Object.entries(DOMAIN_NAME)) {
      if (hostname.includes(domain)) return name;
    }
    return hostname;
  } catch {
    return url;
  }
};

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
      await webApi.collectIndustry(industry);
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
              {logs.map((log) => {
                const typeInfo   = DATA_TYPE_LABEL[log.data_type] ?? { label: log.data_type, color: "bg-gray-100 text-gray-800" };
                const sourceName = getDomainName(log.url);
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 text-sm border-b pb-2"
                  >
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                      log.status === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                      {log.status === "success" ? "成功" : "失敗"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs whitespace-nowrap bg-gray-50 text-gray-700 border">
                      {sourceName}
                    </span>
                    <span className="flex-1 truncate text-muted-foreground">
                      {log.url}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.processed_at).toLocaleString("ja-JP")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}