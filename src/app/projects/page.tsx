"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Task = {
  id: number; phase: number; name: string;
  assign: string; status: string; progress: number;
};

const STATUS_LABEL: Record<string, string> = {
  done: "✅ 完了", doing: "🔵 進行中", todo: "⬜ 未着手", risk: "⚠️ 遅延リスク",
};
const PHASE_LABEL: Record<number, string> = {
  1: "フェーズ1: 計画・設計", 2: "フェーズ2: 開発", 3: "フェーズ3: 検証・リリース",
};

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/projects/1/tasks")
      .then((res) => { setTasks(Array.isArray(res.data) ? res.data : []); setLoading(false); })
      .catch(() => { setError("データの取得に失敗しました。ログインしてください。"); setLoading(false); });
  }, []);

  const phases = [1, 2, 3];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">📋 工程管理</h1>
      {loading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        phases.map((ph) => {
          const pTasks = tasks.filter((t) => t.phase === ph);
          if (!pTasks.length) return null;
          return (
            <div key={ph}>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{PHASE_LABEL[ph]}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-3 border">タスク名</th>
                      <th className="text-left p-3 border">担当者</th>
                      <th className="text-left p-3 border">ステータス</th>
                      <th className="text-left p-3 border w-48">進捗</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pTasks.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/50">
                        <td className="p-3 border font-medium">{t.name}</td>
                        <td className="p-3 border text-muted-foreground">{t.assign}</td>
                        <td className="p-3 border">{STATUS_LABEL[t.status] ?? t.status}</td>
                        <td className="p-3 border">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full bg-blue-500" style={{ width: t.progress + "%" }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-8">{t.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
