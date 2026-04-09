"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyllabusPage() {
  const [question, setQuestion] = useState("");
  const [result, setResult]     = useState<string>("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  const EXAMPLES = [
    "接客マニュアルのeラーニングを作って",
    "新入社員向けの安全教育シラバスを作成してください",
    "ITシステム操作の研修プログラムを作って",
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
        body: JSON.stringify({ question, session_id: "syllabus" }),
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
        <h1 className="text-2xl font-bold text-white">研修生成</h1>
        <p className="text-gray-400 mt-1 text-sm">ナレッジからeラーニングシラバス・研修プログラムを自動生成します</p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="作成したい研修の内容・対象者・目的を入力してください"
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
            {loading ? "生成中..." : "生成する"}
          </button>
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
            <span className="text-sm">シラバスを生成しています...</span>
          </div>
        </div>
      )}
    </div>
  );
}
