"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  development: {
    label: "Ollama（ローカル）",
    color: "bg-green-100 text-green-800",
    desc:  "完全オンプレ・APIコストゼロ・Qwen3:8b",
  },
  production: {
    label: "Claude API",
    color: "bg-blue-100 text-blue-800",
    desc:  "クラウド・高精度・Anthropic Claude Sonnet",
  },
  vllm: {
    label: "vLLM（GPU）",
    color: "bg-purple-100 text-purple-800",
    desc:  "オンプレGPU・高速推論・Qwen3-8B",
  },
  qlora: {
    label: "DPOモデル",
    color: "bg-orange-100 text-orange-800",
    desc:  "ファインチューニング済み・業界特化モデル",
  },
};

export default function SettingsPage() {
  const [currentMode, setCurrentMode] = useState("");
  const [selectedMode, setSelectedMode] = useState("");
  const [password, setPassword]         = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");
  const [error, setError]               = useState("");

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const res = await api.get("/api/admin/llm-mode");
        setCurrentMode(res.data.mode);
        setSelectedMode(res.data.mode);
      } catch {
        setError("設定の取得に失敗しました。");
      }
    };
    fetchMode();
  }, []);

  const handleChange = async () => {
    if (!password) {
      setError("パスワードを入力してください");
      return;
    }
    if (selectedMode === currentMode) {
      setError("現在と同じモードです");
      return;
    }
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await api.post("/api/admin/llm-mode", {
        mode:     selectedMode,
        password: password,
      });
      setCurrentMode(selectedMode);
      setMessage(res.data.message);
      setPassword("");
    } catch (e: any) {
      setError(e.response?.data?.detail || "変更に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">システム設定</h1>
          <p className="text-sm text-muted-foreground mt-1">
            LLM環境の切り替えと管理者設定
          </p>
        </div>
        <Badge variant="outline">{new Date().toLocaleDateString("ja-JP")}</Badge>
      </div>

      {/* 現在のモード */}
      <Card>
        <CardHeader>
          <CardTitle>現在のLLMモード</CardTitle>
        </CardHeader>
        <CardContent>
          {currentMode && MODE_INFO[currentMode] && (
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${MODE_INFO[currentMode].color}`}>
                {MODE_INFO[currentMode].label}
              </span>
              <span className="text-sm text-muted-foreground">
                {MODE_INFO[currentMode].desc}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* LLMモード切り替え */}
      <Card>
        <CardHeader>
          <CardTitle>LLMモード切り替え</CardTitle>
          <p className="text-xs text-muted-foreground">
            変更にはパスワード認証が必要です
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* モード選択 */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(MODE_INFO).map(([mode, info]) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`p-4 border rounded-md text-left transition-colors ${
                  selectedMode === mode
                    ? "border-blue-500 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                    {info.label}
                  </span>
                  {currentMode === mode && (
                    <span className="text-xs text-green-600 font-medium">現在</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{info.desc}</p>
              </button>
            ))}
          </div>

          {/* パスワード入力 */}
          <div>
            <label className="text-sm font-medium">
              管理者パスワード
            </label>
            <div className="relative mt-1">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                className="w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          {message && (
            <p className="text-green-600 text-sm">{message}</p>
          )}

          {/* 変更ボタン */}
          <button
            onClick={handleChange}
            disabled={loading || selectedMode === currentMode || !password}
            className="w-full py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "変更中..." : "LLMモードを変更する"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}