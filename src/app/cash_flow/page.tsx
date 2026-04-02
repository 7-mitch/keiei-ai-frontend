"use client";
import { useState } from "react";
import { chatApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function AptitudeInput({
  trait,
  score,
  onChange,
}: {
  trait: string;
  score: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 text-muted-foreground">{trait}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            className={`w-7 h-7 rounded-sm text-xs font-medium transition-colors ${
              i <= score
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-400 hover:bg-blue-100"
            }`}
          >
            {i}
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{score}/5</span>
    </div>
  );
}

const INITIAL_APTITUDE: Record<string, number> = {
  独創性:         3,
  俊敏性:         3,
  現実思考:       3,
  自己信頼:       3,
  継続力:         3,
  協調性:         3,
  分析力:         3,
  リーダーシップ: 3,
  共感力:         3,
  計画性:         3,
};

type TabType = "advice" | "learning" | "matching" | "eval";

const TAB_LABELS: Record<TabType, string> = {
  advice:   "強みアドバイス",
  learning: "学習パス",
  matching: "役割提案",
  eval:     "評価コメント",
};

export default function HrPage() {
  const [aptitude,  setAptitude]  = useState(INITIAL_APTITUDE);
  const [question,  setQuestion]  = useState("");
  const [result,    setResult]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("advice");
  const [goal,      setGoal]      = useState("");

  const updateScore = (trait: string, value: number) => {
    setAptitude((prev) => ({ ...prev, [trait]: value }));
  };

  const topTraits = Object.entries(aptitude)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const aptitudeText = Object.entries(aptitude)
    .map(([k, v]) => `${k}: ${v}/5`)
    .join("、");

  const QUICK_QUESTIONS: Record<TabType, string> = {
    advice:   `以下の適性診断結果を持つ人材が最大限活躍できる業務アドバイスを3つ提案してください。\n\n【適性診断結果】\n${aptitudeText}`,
    learning: `以下の適性診断結果と目標を踏まえ、強みを活かした3ヶ月の学習パスを提案してください。\n\n【適性診断結果】\n${aptitudeText}\n\n【目標】\n${goal || "（目標を入力してください）"}`,
    matching: `以下の適性診断結果を持つ人材に最適なプロジェクト役割と、チーム内での強みの活かし方を提案してください。\n\n【適性診断結果】\n${aptitudeText}`,
    eval:     `以下の適性診断結果を踏まえ、人事評価コメントのテンプレートを生成してください。\n成果・強み・改善点・来期への期待の4セクションで出力してください。\n\n【適性診断結果】\n${aptitudeText}`,
  };

  const handleAsk = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setResult("");
    try {
      const res = await chatApi.send(q);
      setResult(res.result || res.response || "回答を取得できませんでした。");
    } catch {
      setResult("エラーが発生しました。再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">人事・適性診断</h1>
          <p className="text-sm text-muted-foreground mt-1">
            適性スコアを入力してAIによる分析・アドバイスを生成します
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* 強みTOP3 */}
      <div className="grid grid-cols-3 gap-4">
        {topTraits.map(([trait, score], i) => (
          <Card key={trait}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {i === 0 ? "最大の強み" : i === 1 ? "強み 2位" : "強み 3位"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">{trait}</div>
              <div className="flex gap-0.5 mt-1">
                {[1,2,3,4,5].map((n) => (
                  <div
                    key={n}
                    className={`w-4 h-2 rounded-sm ${
                      n <= score ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{score}/5点</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 適性スコア入力 */}
        <Card>
          <CardHeader>
            <CardTitle>適性スコア入力</CardTitle>
            <p className="text-xs text-muted-foreground">
              各項目を1〜5で評価してください
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(aptitude).map(([trait, score]) => (
              <AptitudeInput
                key={trait}
                trait={trait}
                score={score}
                onChange={(v) => updateScore(trait, v)}
              />
            ))}
            <button
              onClick={() => setAptitude(INITIAL_APTITUDE)}
              className="mt-2 text-xs text-muted-foreground hover:text-gray-600 underline"
            >
              リセット
            </button>
          </CardContent>
        </Card>

        {/* AIアドバイス */}
        <Card>
          <CardHeader>
            <CardTitle>AI分析・アドバイス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-1">
              {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                    activeTab === tab
                      ? "bg-blue-500 text-white border-blue-500"
                      : "text-muted-foreground border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {activeTab === "learning" && (
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="目標を入力（例：マネージャーに昇進したい）"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            )}

            <textarea
              className="w-full p-3 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="カスタム質問を入力（任意）"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={() => handleAsk(QUICK_QUESTIONS[activeTab])}
                disabled={loading}
                className="flex-1 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "生成中..." : `${TAB_LABELS[activeTab]}を生成`}
              </button>
              <button
                onClick={() => handleAsk(question)}
                disabled={loading || !question.trim()}
                className="flex-1 py-2 border text-sm rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                カスタム質問
              </button>
            </div>

            {loading && (
              <div className="p-4 bg-gray-50 rounded-md text-sm text-muted-foreground animate-pulse">
                AI が分析中です...
              </div>
            )}

            {result && !loading && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-md text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {result}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}