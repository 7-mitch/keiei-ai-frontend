"use client";
import { useEffect, useState } from "react";
import { alertApi, FraudAlert } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// ===== 重要度の色 =====
const severityColor: Record<string, string> = {
  critical: "bg-red-600 text-white",
  high:     "bg-orange-500 text-white",
  medium:   "bg-yellow-500 text-white",
  low:      "bg-green-500 text-white",
};

const severityLabel: Record<string, string> = {
  critical: "緊急",
  high:     "高",
  medium:   "中",
  low:      "低",
};

const statusLabel: Record<string, string> = {
  open:           "未対応",
  investigating:  "調査中",
  resolved:       "解決済み",
  false_positive: "誤検知",
};

export default function AlertsPage() {
  const [alerts,  setAlerts]  = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("open");

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertApi.getAlerts(filter);
      setAlerts(data);
    } catch {
      console.error("アラート取得失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [filter]);

  const handleUpdate = async (id: number, status: string) => {
    try {
      await alertApi.updateAlert(id, status, "");
      fetchAlerts();
    } catch {
      console.error("更新失敗");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">不正アラート</h1>
        <Button onClick={fetchAlerts} variant="outline">更新</Button>
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        {["open", "investigating", "resolved", "false_positive"].map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {statusLabel[s]}
          </Button>
        ))}
      </div>

      {/* アラートテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>
            アラート一覧
            <Badge variant="outline" className="ml-2">
              {alerts.length}件
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">
              読み込み中...
            </p>
          ) : alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              アラートはありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>重要度</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>ユーザー</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>日時</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{alert.id}</TableCell>
                    <TableCell>
                      <Badge className={severityColor[alert.severity]}>
                        {severityLabel[alert.severity] || alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {alert.description}
                    </TableCell>
                    <TableCell>{alert.user_name || "-"}</TableCell>
                    <TableCell>
                      {alert.amount
                        ? `¥${alert.amount.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(alert.created_at).toLocaleString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {alert.status === "open" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(alert.id, "investigating")}
                            >
                              調査
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(alert.id, "false_positive")}
                            >
                              誤検知
                            </Button>
                          </>
                        )}
                        {alert.status === "investigating" && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(alert.id, "resolved")}
                          >
                            解決
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}