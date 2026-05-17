"use client";

/**
 * RagasDashboard.tsx — RAG品質評価ダッシュボード
 * 配置先: frontend/src/app/dashboard/RagasDashboard.tsx
 */

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── 型定義 ────────────────────────────────────────────

interface EvalStats {
  period: string;
  total: number;
  avg_overall: number;
  avg_faithfulness: number;
  avg_relevancy: number;
  avg_precision: number;
  avg_recall: number;
  hallucination_rate: number;
  hallucination_risk_count: number;
  requires_attention: boolean;
}

interface EvalRecord {
  id: number;
  created_at: string;
  question: string;
  answer: string;
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  overall_score: number | null;
  llm_model: string;
  notes: string;
}

// ── ユーティリティ ────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function scoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 0.8) return "text-emerald-600";
  if (score >= 0.5) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number | null): string {
  if (score === null) return "bg-gray-100";
  if (score >= 0.8) return "bg-emerald-50 border-emerald-200";
  if (score >= 0.5) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function ScoreBar({ value }: { value: number | null }) {
  const pct = value !== null ? Math.round(value * 100) : 0;
  const color =
    value === null
      ? "bg-gray-200"
      : value >= 0.8
      ? "bg-emerald-500"
      : value >= 0.5
      ? "bg-amber-400"
      : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-mono w-8 text-right ${scoreColor(value)}`}>
        {value !== null ? value.toFixed(2) : "—"}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <Card className={`border ${alert ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mb-1">
          {label}
        </p>
        <p className={`text-2xl font-bold font-mono ${alert ? "text-red-600" : "text-gray-900"}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MetricGauge({
  label,
  value,
  description,
}: {
  label: string;
  value: number | null;
  description: string;
}) {
  return (
    <div className={`rounded-lg border p-3 ${scoreBg(value)}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className={`text-sm font-bold font-mono ${scoreColor(value)}`}>
          {value !== null ? value.toFixed(3) : "—"}
        </span>
      </div>
      <ScoreBar value={value} />
      <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">{description}</p>
    </div>
  );
}

// ── メインコンポーネント ──────────────────────────────

export default function RagasDashboard() {
  const [stats, setStats] = useState<EvalStats | null>(null);
  const [records, setRecords] = useState<EvalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewedIds, setReviewedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch(`${API_BASE}/api/rag/evaluate/stats`),
        fetch(`${API_BASE}/api/rag/evaluate/recent?limit=20`),
      ]);

      if (!statsRes.ok || !recentRes.ok) throw new Error("APIエラー");

      const [statsData, recentData] = await Promise.all([
        statsRes.json(),
        recentRes.json(),
      ]);

      setStats(statsData);
      setRecords(recentData);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError("データの取得に失敗しました。バックエンドの接続を確認してください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchData]);

  // ── Human Review 承認・却下 ───────────────────────

  const handleReview = async (evaluationId: number, action: "approve" | "reject") => {
    setReviewingId(evaluationId);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE}/api/rag/evaluate/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          evaluation_id: evaluationId,
          action,
          reviewer_note: "",
        }),
      });

      if (!res.ok) throw new Error("レビュー保存失敗");

      const label = action === "approve" ? "承認" : "却下";
      setReviewedIds((prev) => new Set([...prev, evaluationId]));
      alert(`${label}しました。J-SOX監査証跡として保存されました。`);
      fetchData();
    } catch (e) {
      alert("エラーが発生しました。再度お試しください。");
    } finally {
      setReviewingId(null);
    }
  };

  // ── レンダリング ─────────────────────────────────

  if (loading) {
    return (
      <div className="mt-8 space-y-3">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  const hallucinationPct = stats
    ? Math.round((stats.hallucination_rate ?? 0) * 100)
    : 0;

  const reviewQueue = records.filter(
    (r) => r.faithfulness !== null && r.faithfulness < 0.5 && !reviewedIds.has(r.id)
  );

  return (
    <section className="mt-8 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            RAG品質評価
            <span className="ml-2 text-xs font-normal text-gray-400">powered by ragas</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats?.period} ／ {stats?.total ?? 0}件評価済み
            {lastUpdated && (
              <span className="ml-2">
                · 最終更新: {lastUpdated.toLocaleTimeString("ja-JP")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats?.requires_attention && (
            <Badge variant="destructive" className="text-xs">
              ⚠ 要注意
            </Badge>
          )}
          <a
            href="/api/rag/evaluate/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            AIGIS連携
          </a>
          <button
            onClick={fetchData}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="総合スコア"
          value={stats?.avg_overall?.toFixed(3) ?? "—"}
          sub="faithfulness等4指標の平均"
        />
        <StatCard
          label="忠実性"
          value={stats?.avg_faithfulness?.toFixed(3) ?? "—"}
          sub="ハルシネーション検知の主指標"
        />
        <StatCard
          label="ハルシネーション率"
          value={`${hallucinationPct}%`}
          sub={`${stats?.hallucination_risk_count ?? 0}件がリスクあり`}
          alert={(stats?.hallucination_rate ?? 0) > 0.1}
        />
        <StatCard
          label="評価件数"
          value={String(stats?.total ?? 0)}
          sub={stats?.period}
        />
      </div>

      {/* タブ */}
      <Tabs defaultValue="metrics">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="metrics" className="text-xs px-3">指標詳細</TabsTrigger>
          <TabsTrigger value="log" className="text-xs px-3">評価ログ</TabsTrigger>
          <TabsTrigger value="review" className="text-xs px-3">
            Human Review
            {reviewQueue.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                {reviewQueue.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 指標詳細タブ */}
        <TabsContent value="metrics" className="mt-3">
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MetricGauge
                  label="Faithfulness（忠実性）"
                  value={stats?.avg_faithfulness ?? null}
                  description="回答がコンテキストに根拠を持つ度合い。0.5未満でハルシネーションリスクとして自動検出"
                />
                <MetricGauge
                  label="Answer Relevancy（応答関連性）"
                  value={stats?.avg_relevancy ?? null}
                  description="質問に対して回答が適切かどうか。低い場合は検索精度またはプロンプト設計を見直す"
                />
                <MetricGauge
                  label="Context Precision（コンテキスト精度）"
                  value={stats?.avg_precision ?? null}
                  description="取得したコンテキストが正確かどうか。低い場合はRetrieverのチューニングが必要"
                />
                <MetricGauge
                  label="Context Recall（コンテキスト再現率）"
                  value={stats?.avg_recall ?? null}
                  description="必要な情報をすべて取得できているか。ground_truth（正解）が必要なため教師なし評価ではnull"
                />
              </div>

              <div className="mt-4 flex gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  0.8〜1.0: 正常
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  0.5〜0.8: 注意
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  0.0〜0.5: 警告
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 評価ログタブ */}
        <TabsContent value="log" className="mt-3">
          <Card className="border-gray-200">
            <CardContent className="pt-3 pb-2 px-0">
              {records.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">
                  評価データがありません
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-100">
                        <TableHead className="text-[11px] font-semibold text-gray-500 pl-4 w-32">日時</TableHead>
                        <TableHead className="text-[11px] font-semibold text-gray-500">質問</TableHead>
                        <TableHead className="text-[11px] font-semibold text-gray-500 w-20 text-center">忠実性</TableHead>
                        <TableHead className="text-[11px] font-semibold text-gray-500 w-20 text-center">関連性</TableHead>
                        <TableHead className="text-[11px] font-semibold text-gray-500 w-20 text-center">総合</TableHead>
                        <TableHead className="text-[11px] font-semibold text-gray-500 w-16 text-center">判定</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((r) => {
                        const isRisk = r.faithfulness !== null && r.faithfulness < 0.5;
                        return (
                          <TableRow
                            key={r.id}
                            className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isRisk ? "bg-red-50/50" : ""}`}
                          >
                            <TableCell className="text-[11px] text-gray-400 font-mono pl-4 whitespace-nowrap">
                              {new Date(r.created_at).toLocaleString("ja-JP", {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-xs text-gray-700 max-w-xs">
                              <span className="line-clamp-1">{r.question}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-mono font-semibold ${scoreColor(r.faithfulness)}`}>
                                {r.faithfulness?.toFixed(2) ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-mono font-semibold ${scoreColor(r.answer_relevancy)}`}>
                                {r.answer_relevancy?.toFixed(2) ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs font-mono font-semibold ${scoreColor(r.overall_score)}`}>
                                {r.overall_score?.toFixed(2) ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {isRisk ? (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  要確認
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-600 border-emerald-200">
                                  正常
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Human Reviewタブ */}
        <TabsContent value="review" className="mt-3">
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-4">
              {reviewQueue.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-emerald-600 font-medium">✓ レビュー待ちなし</p>
                  <p className="text-xs text-gray-400 mt-1">
                    ハルシネーションリスクのある回答は検出されていません
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-red-600 font-medium">
                    ⚠ 以下の回答はfaithfulness &lt; 0.5 のため人間によるレビューが必要です
                  </p>
                  {reviewQueue.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-800 flex-1">
                          {r.question}
                        </p>
                        <span className="text-[10px] font-mono text-red-600 font-bold whitespace-nowrap">
                          faith: {r.faithfulness?.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2">{r.answer}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">
                          {new Date(r.created_at).toLocaleString("ja-JP")}
                          {r.notes && ` · ${r.notes}`}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleReview(r.id, "approve")}
                            disabled={reviewingId === r.id}
                            className="text-[10px] px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            {reviewingId === r.id ? "処理中..." : "承認"}
                          </button>
                          <button
                            onClick={() => handleReview(r.id, "reject")}
                            disabled={reviewingId === r.id}
                            className="text-[10px] px-2 py-0.5 rounded border border-red-300 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {reviewingId === r.id ? "処理中..." : "却下"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  📋 このレビューキューは <code className="bg-gray-100 px-1 rounded">ragas_review_queue</code> テーブルと連動します。
                  承認・却下の記録はJ-SOX監査証跡として <code className="bg-gray-100 px-1 rounded">ragas_evaluation_logs</code> に保存されます。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
