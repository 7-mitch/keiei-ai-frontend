"use client";
import { useState } from "react";
import { chatApi, ChatResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ===== メッセージの型 =====
interface Message {
  role:    "user" | "ai";
  content: string;
  route?:  string;
}

// ===== ルートバッジの色 =====
const routeColor: Record<string, string> = {
  sql:     "bg-blue-100 text-blue-800",
  rag:     "bg-purple-100 text-purple-800",
  fraud:   "bg-red-100 text-red-800",
  web:     "bg-green-100 text-green-800",
  general: "bg-gray-100 text-gray-800",
};

const routeLabel: Record<string, string> = {
  sql:     "DB検索",
  rag:     "文書検索",
  fraud:   "不正検知",
  web:     "Web収集",
  general: "一般",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role:    "ai",
      content: "こんにちは。経営に関するご質問をどうぞ。\n例: 「今月の取引件数は？」「不正アラートの状況は？」",
    },
  ]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res: ChatResponse = await chatApi.send(question);
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
    }
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <h1 className="text-3xl font-bold mb-4">AIアシスタント</h1>

      {/* チャット画面 */}
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
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-muted"
                }`}
              >
                {msg.route && (
                  <span className={`text-xs px-2 py-0.5 rounded-full mr-2 ${routeColor[msg.route] || ""}`}>
                    {routeLabel[msg.route] || msg.route}
                  </span>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <p className="text-sm text-muted-foreground">考え中...</p>
              </div>
            </div>
          )}
        </CardContent>

        {/* 入力欄 */}
        <div className="p-4 border-t flex gap-2">
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