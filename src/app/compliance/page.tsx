"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ComplianceResult {
  result: string;
  risk_level: string;
  requires_expert: boolean;
}

const RISK_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 border-red-700 text-red-300",
  warning:  "bg-orange-900/40 border-orange-700 text-orange-300",
  caution:  "bg-yellow-900/40 border-yellow-700 text-yellow-300",
  safe:     "bg-green-900/40 border-green-700 text-green-300",
};

const RISK_LABELS: Record<string, string> = {
  critical: "[緊急] 即時対応が必要",
  warning:  "[警告] 専門家への相談を推奨",
  caution:  "[注意] 確認が必要",
  safe:     "[OK] 問題なし",
};

export default function CompliancePage() {
  const [question, setQuestion]   = useState("");
  const [result, setResult]       = useState<ComplianceResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const router = useRouter();

  const EXAMPLES = [
    "残業代を払わずに働かせてもいいですか",
    "パワハラが起きているかもしれません",
    "従業員を解雇したいのですが、手続きを教えてください",
    "個人情報の取り扱いについて確認したい",
  ];

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }

      const res = await fetch("/api/compliance/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ question, session_id: "compliance" }),
      });

      if (!res.ok) throw new Error("APIエラー");
      const data: ComplianceResult = await res.json();
      setResult(data);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">コンプライアンス審査</h1>
        <p className="text-gray-400 mt-1 text-sm">労務・ハラスメント・契約・情報管理のリスクを審査します</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="審査したい内容を入力してください（労務問題・ハラスメント・契約違反など）"
          className="w-full bg-gray-800 text-white rounded-lg p-3 text-sm resize-none border border-gray-700 focus:outline-none focus:border-gray-500 h-24"
        />
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2 flex-wrap">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuestion(ex)}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-700 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || !question.trim()}
            className="ml-3 px-5 py-2 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? "審査中..." : "審査する"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-4 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${RISK_COLORS[result.risk_level] || RISK_COLORS.caution}`}>
            <p className="font-bold text-sm">{RISK_LABELS[result.risk_level] || result.risk_level}</p>
            {result.requires_expert && (
              <p className="text-xs mt-1 opacity-80">社会保険労務士・弁護士への相談を推奨します</p>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans leading-relaxed">{result.result}</pre>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">審査しています...</span>
          </div>
        </div>
      )}
    </div>
  );
}
