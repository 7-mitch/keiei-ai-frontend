"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface NodeData {
  id:         string;
  name:       string;
  role:       string;   // "executive" | "staff"
  score:      number;   // 平均認知整理スコア 1-10
  sessions:   number;   // セッション数
  skills:     string[]; // 関心領域
}

interface LinkData {
  source: string;
  target: string;
  weight: number; // スキル重複数
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

// モックデータ（APIが整うまでの仮データ）
const MOCK_DATA: GraphData = {
  nodes: [
    { id: "1", name: "経営者",   role: "executive", score: 8.2, sessions: 24, skills: ["戦略", "財務", "人事"] },
    { id: "2", name: "営業部長", role: "staff",     score: 7.1, sessions: 18, skills: ["戦略", "営業", "顧客"] },
    { id: "3", name: "開発リーダー", role: "staff", score: 6.8, sessions: 12, skills: ["技術", "工程管理", "品質"] },
    { id: "4", name: "経理担当", role: "staff",     score: 7.5, sessions: 15, skills: ["財務", "税務", "コスト"] },
    { id: "5", name: "人事担当", role: "staff",     score: 6.3, sessions: 9,  skills: ["人事", "採用", "育成"] },
    { id: "6", name: "マーケ担当", role: "staff",   score: 5.9, sessions: 7,  skills: ["営業", "顧客", "戦略"] },
  ],
  links: [
    { source: "1", target: "2", weight: 2 },
    { source: "1", target: "3", weight: 1 },
    { source: "1", target: "4", weight: 2 },
    { source: "1", target: "5", weight: 2 },
    { source: "2", target: "6", weight: 3 },
    { source: "3", target: "4", weight: 1 },
    { source: "4", target: "1", weight: 2 },
    { source: "5", target: "1", weight: 2 },
  ],
};

const roleColor = (role: string) => role === "executive" ? "#7c3aed" : "#0891b2";
const scoreToRadius = (score: number, sessions: number) =>
  20 + (score / 10) * 20 + Math.min(sessions / 5, 10);

export default function CognitivePage() {
  const svgRef   = useRef<SVGSVGElement>(null);
  const [data,   setData]   = useState<GraphData>(MOCK_DATA);
  const [selected, setSelected] = useState<NodeData | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState<any>(null);

  // 統計データ取得
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/feedback/stats");
        setStats(res.data.cognitive_clarity);
      } catch (e) {
        console.error("統計取得失敗", e);
      }
    };
    fetchStats();
  }, []);

  // D3グラフ描画
  useEffect(() => {
    if (!svgRef.current || typeof window === "undefined") return;

    const loadD3 = async () => {
      const d3 = await import("d3");
      const svgEl = svgRef.current!;
      const svg    = d3.select<SVGSVGElement, unknown>(svgEl);
      const width  = svgEl.clientWidth  || 700;
      const height = svgEl.clientHeight || 480;

      svg.selectAll("*").remove();

      const g = svg.append("g");

      // ズーム
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => g.attr("transform", event.transform));
      svg.call(zoom);

      // シミュレーション
      const nodes = data.nodes.map(d => ({ ...d })) as any[];
      const links = data.links.map(d => ({ ...d })) as any[];

      const simulation = d3.forceSimulation(nodes)
        .force("link",   d3.forceLink(links).id((d: any) => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius((d: any) => scoreToRadius(d.score, d.sessions) + 10));

      // エッジ
      const link = g.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", (d: any) => d.weight * 1.5)
        .attr("stroke-opacity", 0.6);

      // ノード
      const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("cursor", "pointer")
        .on("click", (_: any, d: any) => setSelected(d))
        .call(
          d3.drag<any, any>()
            .on("start", (event, d) => {
              if (!event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on("end",  (event, d) => {
              if (!event.active) simulation.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        );

      // ノード円
      node.append("circle")
        .attr("r",           (d: any) => scoreToRadius(d.score, d.sessions))
        .attr("fill",        (d: any) => roleColor(d.role))
        .attr("fill-opacity", 0.85)
        .attr("stroke",      "#fff")
        .attr("stroke-width", 2);

      // スコア表示
      node.append("text")
        .text((d: any) => d.score.toFixed(1))
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("fill",      "#fff")
        .attr("font-size", "13px")
        .attr("font-weight", "600");

      // 名前ラベル
      node.append("text")
        .text((d: any) => d.name)
        .attr("text-anchor", "middle")
        .attr("dy", (d: any) => scoreToRadius(d.score, d.sessions) + 14)
        .attr("fill",      "#374151")
        .attr("font-size", "11px");

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    };

    loadD3();
  }, [data]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">認知整理ネットワーク</h1>
          <p className="text-sm text-gray-500 mt-1">
            ノードの大きさ = 認知整理スコア × セッション数　／　線の太さ = スキル重複度
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#7c3aed" }} />経営者
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: "#0891b2" }} />従業員
          </span>
        </div>
      </div>

      {/* 統計サマリー */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-violet-50 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-600">総セッション数</p>
            <p className="text-2xl font-bold text-violet-800">{stats.total_sessions}</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-600">平均整理度スコア</p>
            <p className="text-2xl font-bold text-violet-800">{stats.avg_clarity_score}</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-3 text-center">
            <p className="text-xs text-violet-600">スコア範囲</p>
            <p className="text-2xl font-bold text-violet-800">
              {stats.min_score ?? "-"} 〜 {stats.max_score ?? "-"}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* グラフ */}
        <div className="flex-1 border rounded-xl overflow-hidden bg-gray-50" style={{ height: "480px" }}>
          <svg ref={svgRef} width="100%" height="100%" />
        </div>

        {/* 選択ノード詳細 */}
        {selected && (
          <div className="w-56 border rounded-xl p-4 bg-white shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-4 h-4 rounded-full inline-block"
                style={{ background: roleColor(selected.role) }} />
              <span className="font-bold text-sm">{selected.name}</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">役割</span>
                <span>{selected.role === "executive" ? "経営者" : "従業員"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">平均整理度</span>
                <span className="font-bold text-violet-700">{selected.score}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">セッション数</span>
                <span>{selected.sessions}</span>
              </div>
              <div className="mt-3">
                <p className="text-gray-500 text-xs mb-1">関心領域</p>
                <div className="flex flex-wrap gap-1">
                  {selected.skills.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600"
            >閉じる</button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        ※ 現在はサンプルデータを表示。実データはAI対話のフィードバック蓄積後に自動反映されます。
        ドラッグでノードを移動、スクロールでズーム可能。
      </p>
    </div>
  );
}
