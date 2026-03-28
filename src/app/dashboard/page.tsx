"use client";
import { useEffect, useState } from "react";
import { reportApi, KpiData } from "@/lib/api";
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

export default function DashboardPage() {
  const [kpi, setKpi]             = useState<KpiData | null>(null);
  const [monthlyData, setMonthly] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const kpiData = await reportApi.getKpi();
        setKpi(kpiData);

        const txData = await reportApi.getTransactions();
        const grouped: Record<string, { amount: number; fraud: number }> = {};

        txData.forEach((tx: any) => {
          const date  = new Date(tx.created_at);
          const label = `${date.getMonth() + 1}月`;
          if (!grouped[label]) grouped[label] = { amount: 0, fraud: 0 };
          grouped[label].amount += Number(tx.amount);
          if (tx.is_flagged) grouped[label].fraud += 1;
        });

        const chartData = Object.entries(grouped).map(([month, v]) => ({
          month,
          amount: v.amount,
          fraud:  v.fraud,
        }));
        setMonthly(chartData);

      } catch {
        setError("データの取得に失敗しました。ログインしてください。");
      } finally {
        setLoading(false);
      }
    };
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
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    fill="#dbeafe"
                  />
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