"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AlchemyPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult]     = useState<string>("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  const EXAMPLES = [
    "梱包作業のノウハウを登録したい。段ボールは底から組む、重いものを下に入れる、テープは十字に貼る",
    "接客の基本：挨拶は笑顔で、クレームは必ず上長に報告、お客様の名前は必ず復唱する",
    "機械のトラブル対応：まず電源を切る、次にエラーコードを記録する、メーカーに連絡する",
  ];

  const handleSubmit = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ question: "ナレッジ " + question, session_id: "alchemy" }),
      });

      if (!res.ok) throw new Error("APIエラー");
      const data = await res.json();
      setResult(data.answer);
    } catch {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ナレッジ錬成</h1>
        <p className="text-gray-400 mt-1 text-sm">現場のノウハウや暗黙知を構造化された形式知に変換します</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="現場のノウハウ・手順・注意点などを自由に入力してください"
          className="w-full bg-gray-800 text-white rounded-lg p-3 text-sm resize-none border border-gray-700 focus:outline-none focus:border-gray-500 h-32"
        />
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">入力例：</p>
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuestion(ex)}
                className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded border border-gray-700 transition-colors text-left"
              >
                {ex}
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !question.trim()}
              className="px-5 py-2 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "錬成中..." : "錬成する"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-4 text-sm">{error}</div>
      )}

      {result && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans leading-relaxed">{result}</pre>
        </div>
      )}

      {loading && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">ナレッジを構造化しています...</span>
          </div>
        </div>
      )}
    </div>
  );
}
