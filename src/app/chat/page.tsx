"use client";
import { useState, useRef, useEffect } from "react";
import { chatApi, ChatResponse, api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

interface Message {
  role:          "user" | "ai";
  content:       string;
  route?:        string;
  file?:         string;
  graph_base64?: string;
  session_id?:   string;
  question?:     string;
  feedback?:     "good" | "bad";
  latency_ms?:   number;
}

const routeColor: Record<string, string> = {
  sql:           "bg-blue-100 text-blue-800",
  rag:           "bg-purple-100 text-purple-800",
  fraud:         "bg-red-100 text-red-800",
  web:           "bg-green-100 text-green-800",
  general:       "bg-gray-100 text-gray-800",
  hr:            "bg-yellow-100 text-yellow-800",
  cash_flow:     "bg-emerald-100 text-emerald-800",
  project:       "bg-orange-100 text-orange-800",
  file_analysis: "bg-sky-100 text-sky-800",
};

const routeLabel: Record<string, string> = {
  sql:           "データ分析",
  rag:           "社内文書検索",
  fraud:         "不正検知",
  web:           "Web収集",
  general:       "一般",
  hr:            "人事",
  cash_flow:     "資金繰り",
  project:       "工程管理",
  file_analysis: "ファイル解析",
};

const ACCEPT_TYPES = ".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.docx,.doc";

export default function ChatPage() {
  const [messages,   setMessages]   = useState<Message[]>([
    {
      role:    "ai",
      content: "こんにちは。経営に関するご質問をどうぞ。\n例: 「今月の取引件数は？」「補助金について教えて」",
    },
  ]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [file,       setFile]       = useState<File | null>(null);
  const [thinking,   setThinking]   = useState(false);
  const [listening,  setListening]  = useState(false);
  const fileRef        = useRef<HTMLInputElement>(null);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ===== 音声認識 =====
  const startVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("このブラウザは音声認識に対応していません。Chromeをお使いください。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang             = "ja-JP";
    recognition.interimResults   = false;
    recognition.maxAlternatives  = 1;

    recognition.onstart  = () => setListening(true);
    recognition.onerror  = () => setListening(false);
    recognition.onend    = () => setListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ===== フィードバック =====
  const sendFeedback = async (msgIndex: number, feedback: "good" | "bad") => {
    const msg = messages[msgIndex];
    if (!msg.session_id || msg.feedback) return;

    setMessages((prev) => prev.map((m, i) =>
      i === msgIndex ? { ...m, feedback } : m
    ));

    try {
      await api.post("/api/feedback", {
        session_id: msg.session_id,
        question:   msg.question || "",
        answer:     msg.content,
        route:      msg.route || "general",
        feedback,
        latency_ms: msg.latency_ms,
      });
    } catch (e) {
      console.error("フィードバック送信失敗", e);
    }
  };

  // ===== メッセージ送信 =====
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
    const startTime = Date.now();

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

      const latency_ms = Date.now() - startTime;

      setMessages((prev) => [
        ...prev,
        {
          role:         "ai",
          content:      res.answer,
          route:        res.route,
          graph_base64: res.graph_base64 ?? undefined,
          session_id:   res.session_id,
          question:     question,
          latency_ms,
        },
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
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
        <h1 className="text-3xl font-bold">AIアシスタント</h1>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <button
            onClick={() => setThinking(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !thinking ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            通常モード
          </button>
          <button
            onClick={() => setThinking(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              thinking ? "bg-purple-500 text-white" : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            推論モード
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground px-6 pb-3 shrink-0">
        {thinking
          ? "推論モード：複雑な経営判断・財務分析に最適。回答に時間がかかります。"
          : "通常モード：高速回答。日常的な質問に最適です。"}
      </p>

      <Card className="mx-6 mb-6 flex flex-col flex-1 overflow-hidden">
        <CardHeader className="pb-2 shrink-0">
          <CardTitle className="text-sm text-muted-foreground">
            経営者支援AI（LangGraph + Ollama）
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
                {msg.latency_ms && (
                  <span className="text-xs text-gray-400 mr-2">
                    {(msg.latency_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {msg.file && (
                  <span className="text-xs px-2 py-0.5 rounded-full mr-2 bg-white/20">
                    {msg.file}
                  </span>
                )}

                {/* Markdownレンダリング */}
                <div className="text-sm mt-1 prose prose-sm max-w-none
                  prose-headings:font-bold prose-headings:text-gray-800
                  prose-strong:font-bold prose-strong:text-gray-800
                  prose-ul:list-disc prose-ul:pl-4
                  prose-ol:list-decimal prose-ol:pl-4
                  prose-li:my-0.5
                  prose-p:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.graph_base64 && (
                  <img
                    src={`data:image/png;base64,${msg.graph_base64}`}
                    alt="データグラフ"
                    className="mt-3 rounded-lg max-w-full border"
                  />
                )}

                {/* 👍👎 フィードバックボタン */}
                {msg.role === "ai" && msg.session_id && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => sendFeedback(i, "good")}
                      disabled={!!msg.feedback}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        msg.feedback === "good"
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 hover:bg-green-100 text-gray-600"
                      }`}
                      title="役に立った"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => sendFeedback(i, "bad")}
                      disabled={!!msg.feedback}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        msg.feedback === "bad"
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 hover:bg-red-100 text-gray-600"
                      }`}
                      title="改善が必要"
                    >
                      👎
                    </button>
                    {msg.feedback && (
                      <span className="text-xs text-gray-400 self-center">
                        フィードバック送信済み
                      </span>
                    )}
                  </div>
                )}
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
          <div ref={bottomRef} />
        </CardContent>

        {file && (
          <div className="px-4 py-2 border-t bg-blue-50 flex items-center justify-between shrink-0">
            <span className="text-xs text-blue-700">{file.name}</span>
            <button
              onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              削除
            </button>
          </div>
        )}

        {listening && (
          <div className="px-4 py-2 border-t bg-red-50 flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs text-red-600">音声認識中...話しかけてください</span>
          </div>
        )}

        <div className="p-4 border-t flex gap-2 shrink-0">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_TYPES}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {/* ファイルアップロードボタン */}
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

          {/* 音声認識ボタン */}
          <button
            onClick={listening ? stopVoice : startVoice}
            disabled={loading}
            className={`px-3 py-2 border rounded-md text-sm disabled:opacity-50 transition-colors ${
              listening
                ? "bg-red-500 text-white border-red-500"
                : "text-gray-500 hover:bg-gray-50"
            }`}
            title={listening ? "録音停止" : "音声入力"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder={listening ? "音声認識中..." : "質問を入力してください..."}
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
