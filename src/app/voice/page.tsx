"use client";
/**
 * voice_callcenter.tsx
 * コールセンター音声通話画面
 * 配置先: frontend/src/app/voice/page.tsx
 *
 * Phase 1: ブラウザマイク（MediaRecorder API）
 * Phase 2: Twilio連携（TWILIO_MODE=true で切り替え）
 *
 * 依存: React 18+, Next.js 14+, Tailwind CSS
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ===== 型定義 =====
type CallStatus = "idle" | "connecting" | "listening" | "processing" | "speaking" | "escalated" | "error";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: Date;
  llm_mode?: string;
  latency_ms?: number;
  pii_detected?: string[];
}

// ===== API =====
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function sendAudioToAPI(audioBlob: Blob): Promise<{
  text: string;
  audio_url?: string;
  llm_mode: string;
  latency_ms: number;
  escalate: boolean;
  pii_detected: string[];
}> {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  form.append("return_audio", "true");

  const res = await fetch(`${API_BASE}/api/voice/process`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ===== メインコンポーネント =====
export default function VoiceCallCenter() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // メッセージ末尾に自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 通話タイマー
  useEffect(() => {
    if (status !== "idle" && status !== "error") {
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (status === "idle") setCallDuration(0);
    }
    return () => { if (callTimerRef.current) clearInterval(callTimerRef.current); };
  }, [status]);

  // 音量レベル可視化
  const startLevelMonitor = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const tick = () => {
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setAudioLevel(avg / 128);
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const stopLevelMonitor = () => {
    cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
  };

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startLevelMonitor(stream);

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopLevelMonitor();
        stream.getTracks().forEach(t => t.stop());

        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processAudio(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setStatus("listening");
    } catch (e) {
      setErrorMsg("マイクへのアクセスが拒否されました");
      setStatus("error");
    }
  }, []);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus("processing");
    }
  }, []);

  // 音声処理
  const processAudio = async (blob: Blob) => {
    try {
      setStatus("processing");
      const result = await sendAudioToAPI(blob);

      // ユーザー発話をメッセージ追加（STT結果はAPIから返ってくる想定）
      addMessage("user", result.text || "（音声入力）", {});

      if (result.escalate) {
        addMessage("system", "オペレーターに転送しています...", {});
        setStatus("escalated");
        return;
      }

      // AI応答追加
      addMessage("assistant", result.text, {
        llm_mode: result.llm_mode,
        latency_ms: result.latency_ms,
        pii_detected: result.pii_detected,
      });

      // 音声再生
      if (result.audio_url) {
        setStatus("speaking");
        const audio = new Audio(`http://localhost:8000${result.audio_url}`);
        audioRef.current = audio;
        audio.onended = () => setStatus("listening");
        audio.play();
      } else {
        setStatus("listening");
      }
    } catch (e) {
      setErrorMsg("通信エラーが発生しました");
      setStatus("error");
    }
  };

  const addMessage = (role: Message["role"], text: string, meta: Partial<Message>) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role,
      text,
      timestamp: new Date(),
      ...meta,
    }]);
  };

  // 通話開始
  const startCall = async () => {
    setStatus("connecting");
    setMessages([{
      id: crypto.randomUUID(),
      role: "system",
      text: "AIコールセンターに接続しました。マイクボタンを押して話しかけてください。",
      timestamp: new Date(),
    }]);
    setTimeout(() => setStatus("listening"), 800);
  };

  // 通話終了
  const endCall = () => {
    mediaRecorderRef.current?.stop();
    stopLevelMonitor();
    audioRef.current?.pause();
    setIsRecording(false);
    setStatus("idle");
    setMessages([]);
  };

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel: Record<CallStatus, string> = {
    idle: "待機中",
    connecting: "接続中...",
    listening: "お話しください",
    processing: "処理中...",
    speaking: "応答中",
    escalated: "オペレーター転送中",
    error: "エラー",
  };

  const statusColor: Record<CallStatus, string> = {
    idle: "#6b7280",
    connecting: "#f59e0b",
    listening: "#10b981",
    processing: "#3b82f6",
    speaking: "#8b5cf6",
    escalated: "#ef4444",
    error: "#ef4444",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0e1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
    }}>

      {/* ヘッダー */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "0.3em", color: "#4b5563", marginBottom: "8px", textTransform: "uppercase" }}>
          KEIEI-AI CALLCENTER
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 300, color: "#e5e7eb", margin: 0, letterSpacing: "0.05em" }}>
          AIボイスアシスタント
        </h1>
      </div>

      {/* メインカード */}
      <div style={{
        width: "100%",
        maxWidth: "480px",
        background: "#111827",
        borderRadius: "24px",
        border: "1px solid #1f2937",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>

        {/* ステータスバー */}
        <div style={{
          padding: "16px 24px",
          background: "#0d1424",
          borderBottom: "1px solid #1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              background: statusColor[status],
              boxShadow: `0 0 8px ${statusColor[status]}`,
              animation: status === "listening" ? "pulse 1.5s infinite" : "none",
            }} />
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>{statusLabel[status]}</span>
          </div>
          {status !== "idle" && (
            <span style={{ fontSize: "13px", color: "#6b7280", fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(callDuration)}
            </span>
          )}
        </div>

        {/* 音声波形ビジュアライザー */}
        <div style={{
          height: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          position: "relative",
          overflow: "hidden",
        }}>
          {status === "idle" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>📞</div>
              <div style={{ fontSize: "13px", color: "#4b5563" }}>通話を開始してください</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "80px" }}>
              {Array.from({ length: 20 }).map((_, i) => {
                const isActive = isRecording || status === "speaking";
                const barHeight = isActive
                  ? Math.max(8, audioLevel * 80 * (0.4 + 0.6 * Math.sin(i * 0.8 + Date.now() * 0.01)))
                  : 8;
                return (
                  <div key={i} style={{
                    width: "4px",
                    height: `${isActive ? barHeight : 8}px`,
                    background: isRecording ? "#10b981" : status === "speaking" ? "#8b5cf6" : "#374151",
                    borderRadius: "2px",
                    transition: "height 0.1s ease",
                    opacity: 0.7 + 0.3 * (i % 3 === 0 ? 1 : 0),
                  }} />
                );
              })}
            </div>
          )}
        </div>

        {/* メッセージログ */}
        {messages.length > 0 && (
          <div style={{
            maxHeight: "280px",
            overflowY: "auto",
            padding: "16px",
            borderTop: "1px solid #1f2937",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}>
                {msg.role === "system" ? (
                  <div style={{
                    fontSize: "11px", color: "#6b7280",
                    textAlign: "center", width: "100%", padding: "4px 0",
                  }}>{msg.text}</div>
                ) : (
                  <>
                    <div style={{
                      maxWidth: "80%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user" ? "#1d4ed8" : "#1f2937",
                      color: "#e5e7eb",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}>{msg.text}</div>
                    {msg.latency_ms && (
                      <div style={{ fontSize: "10px", color: "#4b5563", marginTop: "4px", display: "flex", gap: "8px" }}>
                        <span>{msg.llm_mode === "groq" ? "⚡ Groq" : "🧠 Claude"}</span>
                        <span>{msg.latency_ms.toFixed(0)}ms</span>
                        {msg.pii_detected && msg.pii_detected.length > 0 && (
                          <span style={{ color: "#f59e0b" }}>🔒 PII除去: {msg.pii_detected.join(", ")}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* エラー表示 */}
        {status === "error" && (
          <div style={{
            margin: "0 16px 16px",
            padding: "12px",
            background: "#7f1d1d22",
            border: "1px solid #991b1b",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#fca5a5",
          }}>{errorMsg}</div>
        )}

        {/* コントロールボタン */}
        <div style={{
          padding: "24px",
          borderTop: "1px solid #1f2937",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "24px",
        }}>

          {status === "idle" ? (
            /* 通話開始ボタン */
            <button onClick={startCall} style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #059669)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "28px",
              boxShadow: "0 0 20px rgba(16,185,129,0.4)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >📞</button>
          ) : (
            <>
              {/* マイクボタン */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={status === "processing" || status === "speaking" || status === "escalated"}
                style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: isRecording
                    ? "linear-gradient(135deg, #ef4444, #dc2626)"
                    : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "28px",
                  boxShadow: isRecording ? "0 0 24px rgba(239,68,68,0.5)" : "0 0 16px rgba(59,130,246,0.3)",
                  opacity: (status === "processing" || status === "speaking") ? 0.4 : 1,
                  transition: "all 0.2s",
                  userSelect: "none",
                }}
              >{isRecording ? "🔴" : "🎙️"}</button>

              {/* 通話終了ボタン */}
              <button onClick={endCall} style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
                boxShadow: "0 0 16px rgba(239,68,68,0.3)",
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
              >📵</button>
            </>
          )}
        </div>

        {/* 操作ガイド */}
        {status === "listening" && (
          <div style={{
            textAlign: "center", padding: "0 24px 20px",
            fontSize: "12px", color: "#4b5563",
          }}>
            🎙️ ボタンを押している間、録音されます
          </div>
        )}
      </div>

      {/* Phase 2 告知 */}
      <div style={{
        marginTop: "24px",
        padding: "12px 20px",
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: "12px",
        fontSize: "12px",
        color: "#6b7280",
        textAlign: "center",
      }}>
        Phase 2: Twilio連携で実際の電話回線にも対応予定
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
