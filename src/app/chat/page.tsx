"use client";
import { useState, useRef } from "react";
import { chatApi, ChatResponse, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Message {
  role:    "user" | "ai";
  content: string;
  route?:  string;
  file?:   string;
}

const routeColor: Record<string, string> = {
  sql:      "bg-blue-100 text-blue-800",
  rag:      "bg-purple-100 text-purple-800",
  fraud:    "bg-red-100 text-red-800",
  web:      "bg-green-100 text-green-800",
  general:  "bg-gray-100 text-gray-800",
  hr:       "bg-yellow-100 text-yellow-800",
  cash_flow:"bg-emerald-100 text-emerald-800",
  project:  "bg-orange-100 text-orange-800",
};

const routeLabel: Record<string, string> = {
  sql:      "DB検索",
  rag:      "文書検索",
  fraud:    "不正検知",
  web:      "Web収集",
  general:  "一般",
  hr:       "人事",
  cash_flow:"資金繰り",
  project:  "工程管理",
};

const ACCEPT_TYPES = ".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.docx,.doc";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role:    "ai",
      content: "こんにちは。経営に関するご質問をどうぞ。\n例: 「今月の取引件数は？」「不正アラートの状況は？」",
    },
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [file,     setFile]     = useState<File | null>(null);
  const [thinking, setThinking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sendMessage = async () => {
    if ((!input.trim() && !file) || loading) return;

    const question = input.trim() || `ファイル「${file?.name}」を分析してください`;
    setInput("");
    setMessages((prev) => [...prev, {
      role:    "user",
      content: question,
      file:    file?.name,
    }]);
    setLoading(true);

    try {
      let res: ChatResponse;

      if (file) {
        const formData = new FormData();
        formData.append("file",     file);
        formData.append("question", question);
        formData.append("thinking", String(thinking));
        const response = await api.post("/api/chat/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        res = response.data;
      } else {
        res = await chatApi.send(question, thinking);
      }

      setMessages((prev) => [
        ...prev,
        { role: "ai", content: res.answer, route: res.route },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "エラーが発生しました。再度お試しください。" },
      ]);
    } finally {
      setLoading(false);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">AIアシスタント</h1>

        {/* モード切替 */}
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <button
            onClick={() => setThinking(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !thinking
                ? "bg-blue-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            通常モード
          </button>
          <button
            onClick={() => setThinking(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              thinking
                ? "bg-purple-500 text-white"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            推論モード
          </button>
        </div>
      </div>

      {/* モード説明 */}
      <p className="text-xs text-muted-foreground mb-3">
        {thinking
          ? "推論モード：複雑な経営判断・財務分析に最適。回答に時間がかかります。"
          : "通常モード：高速回答。日常的な質問に最適です。"}
      </p>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            経営者支援AI（LangGraph + Claude）
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-muted"
                }`}
              >
                {msg.route && (
                  <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${routeColor[msg.route] || "bg-gray-100 text-gray-800"}`}>
                    {routeLabel[msg.route] || msg.route}
                  </span>
                )}
                {msg.file && (
                  <span className="text-xs px-2 py-0.5 rounded-full mr-2 bg-white/20">
                    {msg.file}
                  </span>
                )}
                <p className="text-sm whitespace-pre-wrap mt-1">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <p className="text-sm text-muted-foreground animate-pulse">
                  {thinking ? "推論中..." : "考え中..."}
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* ファイルプレビュー */}
        {file && (
          <div className="px-4 py-2 border-t bg-blue-50 flex items-center justify-between">
            <span className="text-xs text-blue-700">{file.name}</span>
            <button
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              削除
            </button>
          </div>
        )}

        {/* 入力欄 */}
        <div className="p-4 border-t flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_TYPES}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="px-3 py-2 border rounded-md text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            title="PDF・CSV・Excel・Word・画像をアップロード"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="質問を入力してください..."
            className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading}>
            送信
          </Button>
        </div>
      </Card>
    </div>
  );
}