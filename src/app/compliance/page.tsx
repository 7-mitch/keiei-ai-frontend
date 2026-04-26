"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ComplianceResult {
  result:          string;
  risk_level:      string;
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

const EXAMPLE_CATEGORIES = [
  {
    label: "労務",
    items: [
      "固定残業代の上限時間を超過しているが追加支払いをしていない",
      "名ばかり管理職に時間外割増賃金を支払っていない",
      "専属的・継続的な業務委託契約者に労働者性が認められるリスクがある",
      "育児短時間勤務者の評価・昇格を実質的に制限している",
    ],
  },
  {
    label: "ハラスメント",
    items: [
      "業務上の必要性を超えた叱責・罵倒が常態化している管理職がいる",
      "妊娠報告後に配置転換・降格を行った事案がある",
      "相談窓口への申告者の情報が行為者に漏洩した可能性がある",
    ],
  },
  {
    label: "情報管理",
    items: [
      "委託先への個人データ提供に関する安全管理措置の確認が取れていない",
      "保有個人データの利用目的の特定・公表が不十分な可能性がある",
      "退職者・異動者のシステム権限が即時失効されていない運用がある",
      "越境データ移転に際して本人同意または十分性認定の確認が未実施",
    ],
  },
  {
    label: "内部統制",
    items: [
      "同一担当者が取引の起票・承認・消込を兼務している（職務分離違反）",
      "重要な会計上の見積りに関する経営者の仮定が文書化されていない",
      "ITシステムへの特権IDの利用ログが保全されていない",
      "期末に大口取引の計上時期を操作できる環境がある",
    ],
  },
];

export default function CompliancePage() {
  const [question,    setQuestion]    = useState("");
  const [result,      setResult]      = useState<ComplianceResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const router = useRouter();

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
          "Content-Type":  "application/json",
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
        <p className="text-gray-400 mt-1 text-sm">
          労務・ハラスメント・個人情報・内部統制のリスクを審査します
        </p>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="審査したい事象を具体的に入力してください"
          className="w-full bg-gray-800 text-white rounded-lg p-3 text-sm resize-none border border-gray-700 focus:outline-none focus:border-gray-500 h-24"
        />

        {/* カテゴリタブ */}
        <div className="mt-3 border border-gray-700 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-700">
            {EXAMPLE_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(i)}
                className={`flex-1 text-xs py-1.5 font-medium transition-colors ${
                  activeCategory === i
                    ? "bg-gray-700 text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1 p-2">
            {EXAMPLE_CATEGORIES[activeCategory].items.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuestion(ex)}
                className="text-left text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded border border-gray-700 transition-colors leading-relaxed"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={handleSubmit}
            disabled={loading || !question.trim()}
            className="px-5 py-2 bg-white text-gray-950 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "審査中..." : "審査する"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 rounded-lg p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${RISK_COLORS[result.risk_level] || RISK_COLORS.caution}`}>
            <p className="font-bold text-sm">{RISK_LABELS[result.risk_level] || result.risk_level}</p>
            {result.requires_expert && (
              <p className="text-xs mt-1 opacity-80">
                社会保険労務士・弁護士への相談を推奨します
              </p>
            )}
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <pre className="whitespace-pre-wrap text-gray-300 text-sm font-sans leading-relaxed">
              {result.result}
            </pre>
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