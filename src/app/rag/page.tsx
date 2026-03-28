"use client";
import { useState } from "react";
import { ragApi, RagResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RagPage() {
  const [query,   setQuery]   = useState("");
  const [result,  setResult]  = useState<RagResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleSearch = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await ragApi.search(query);
      setResult(res);
    } catch {
      setError("検索に失敗しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    if (!confirm("インデックスを再構築しますか？")) return;
    setLoading(true);
    try {
      await ragApi.rebuild();
      alert("インデックスを再構築しました");
    } catch {
      setError("再構築に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">📚 RAG検索</h1>
        <Button variant="outline" onClick={handleRebuild} disabled={loading}>
          インデックス再構築
        </Button>
      </div>

      {/* 検索フォーム */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            審査規程・社内文書を検索
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="検索キーワードを入力..."
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "検索中..." : "検索"}
          </Button>
        </CardContent>
      </Card>

      {/* エラー */}
      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* 検索結果 */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              クエリ: {result.query}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
              品質: {result.quality}
            </span>
          </div>
          {result.results.map((doc, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-sm">
                  検索結果 {i + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm whitespace-pre-wrap">{doc.content}</p>
                {Object.keys(doc.metadata).length > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    {Object.entries(doc.metadata).map(([k, v]) => (
                      <span key={k} className="mr-4">{k}: {v}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}