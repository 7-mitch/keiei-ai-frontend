"use client";
import { useEffect, useState } from "react";
import { reportApi, complianceApi, KpiData, AuditStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";

function KpiCard({
  title, value, sub, color
}: {
  title: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color || ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ===== 監査リスクパネル =====

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bar: string }> = {
  Critical: { label: "Critical", color: "text-red-400",    bar: "bg-red-500"    },
  High:     { label: "High",     color: "text-orange-400", bar: "bg-orange-500" },
  Medium:   { label: "Medium",   color: "text-yellow-400", bar: "bg-yellow-500" },
  Low:      { label: "Low",      color: "text-blue-400",   bar: "bg-blue-500"   },
};

function AuditRiskPanel({ stats }: { stats: AuditStats | null }) {
  if (!stats) return null;

  const total    = stats.total || 0;
  const critical = stats.by_severity?.Critical || 0;
  const jsox     = stats.by_framework?.["J-SOX"] || 0;
  const aigis    = stats.by_framework?.["AIGIS"]  || 0;

  const severities = ["Critical", "High", "Medium", "Low"];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">監査リスク概況</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              J-SOX {jsox}件
            </Badge>
            <Badge variant="outline" className="text-xs">
              AIGIS {aigis}件
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* サマリー数値 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">監査項目 総数</p>
          </div>
          <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${critical > 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {critical}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Critical 項目</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">
              {total > 0 ? Math.round((critical / total) * 100) : 0}
              <span className="text-sm font-normal text-muted-foreground">%</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Critical 比率</p>
          </div>
        </div>

        {/* 重要度別バー */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">重要度別内訳</p>
          {severities.map((sev) => {
            const count  = stats.by_severity?.[sev] || 0;
            const pct    = total > 0 ? (count / total) * 100 : 0;
            const config = SEVERITY_CONFIG[sev];
            return (
              <div key={sev} className="flex items-center gap-3">
                <span className={`text-xs w-14 shrink-0 ${config.color}`}>
                  {config.label}
                </span>
                <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${config.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* フレームワーク別 */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">フレームワーク別内訳</p>
          {[["J-SOX", jsox], ["AIGIS", aigis]].map(([fw, count]) => {
            const pct = total > 0 ? (Number(count) / total) * 100 : 0;
            return (
              <div key={fw} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14 shrink-0">{fw}</span>
                <div className="flex-1 bg-muted/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* ECS未投入の場合の注記 */}
        {total === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            監査データ未投入（ChromaDB同期待ち）
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ===== メインページ =====

export default function DashboardPage() {
  const [kpi,        setKpi]     = useState<KpiData | null>(null);
  const [monthlyData, setMonthly] = useState<any[]>([]);
  const [auditStats, setAudit]   = useState<AuditStats | null>(null);
  const [loading,    setLoading]  = useState(true);
  const [error,      setError]    = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [kpiData, txData] = await Promise.all([
          reportApi.getKpi(),
          reportApi.getTransactions(),
        ]);
        setKpi(kpiData);

        const grouped: Record<string, { amount: number; fraud: number }> = {};
        txData.forEach((tx: any) => {
          const date  = new Date(tx.created_at);
          const label = `${date.getMonth() + 1}月`;
          if (!grouped[label]) grouped[label] = { amount: 0, fraud: 0 };
          grouped[label].amount += Number(tx.amount);
          if (tx.is_flagged) grouped[label].fraud += 1;
        });
        setMonthly(
          Object.entries(grouped).map(([month, v]) => ({
            month, amount: v.amount, fraud: v.fraud,
          }))
        );

      } catch {
        setError("データの取得に失敗しました。ログインしてください。");
      } finally {
        setLoading(false);
      }
    };

    // 監査 stats は独立して取得（失敗してもダッシュボード全体を止めない）
    complianceApi.getAuditStats()
      .then(setAudit)
      .catch(() => {});

    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">読み込み中...</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-red-500">{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">経営ダッシュボード</h1>
        <Badge variant="outline">
          {new Date().toLocaleDateString("ja-JP")}
        </Badge>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="総資産"
          value={`¥${(kpi?.total_balance || 0).toLocaleString()}`}
          sub={`成長率 ${kpi?.growth_rate || 0}%`}
          color="text-blue-600"
        />
        <KpiCard
          title="今月の取引件数"
          value={`${(kpi?.tx_count || 0).toLocaleString()}件`}
          sub={`金額 ¥${(kpi?.tx_amount || 0).toLocaleString()}`}
        />
        <KpiCard
          title="未解決アラート"
          value={`${kpi?.open_alerts?.total || 0}件`}
          sub={`重大 ${kpi?.open_alerts?.critical || 0}件`}
          color={
            (kpi?.open_alerts?.critical || 0) > 0
              ? "text-red-600"
              : "text-green-600"
          }
        />
        <KpiCard
          title="アクティブユーザー"
          value={`${kpi?.user_count || 0}人`}
        />
      </div>

      {/* 監査リスクパネル */}
      <AuditRiskPanel stats={auditStats} />

      {/* チャート */}
      {monthlyData.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>月次取引金額推移</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `¥${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v) => [`¥${Number(v ?? 0).toLocaleString()}`, "取引金額"]} />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#dbeafe" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>月次不正検知件数</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => [Number(v ?? 0), "不正検知件数"]} />
                  <Bar dataKey="fraud" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            取引データがまだありません。
          </CardContent>
        </Card>
      )}
    </div>
  );
}