"use client";
/**
 * voice/settings/page.tsx
 * ボイスボット設定管理画面
 * 配置先: frontend/src/app/voice/settings/page.tsx
 *
 * 機能:
 * - システムプロンプト編集
 * - VOICEVOXスピーカー選択
 * - エスカレーションキーワード管理
 * - 定型パターン管理
 * - FAQ登録・編集・削除
 */

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ===== 型定義 =====
interface Speaker { id: number; name: string; }
interface FAQItem { id?: number; question: string; answer: string; category: string; is_active: boolean; }
interface Settings {
  system_prompt: string;
  speaker_id: number;
  speaker_name: string;
  escalate_keywords: string[];
  simple_patterns: string[];
}

// ===== APIヘルパー =====
function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers as Record<string, string> ?? {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// ===== タブコンポーネント =====
type Tab = "prompt" | "speaker" | "keywords" | "faq";

export default function VoiceSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 設定読み込み
  const loadSettings = useCallback(async () => {
    try {
      const [s, sp, f] = await Promise.all([
        apiFetch("/api/voice/settings/"),
        apiFetch("/api/voice/settings/speakers"),
        apiFetch("/api/voice/settings/faq"),
      ]);
      setSettings(s);
      setSpeakers(sp.speakers);
      setFaqs(f.faqs);
    } catch (e) {
      showMessage("error", "設定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // ===== プロンプト保存 =====
  const savePrompt = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/voice/settings/prompt", {
        method: "PUT",
        body: JSON.stringify({ prompt: settings.system_prompt }),
      });
      showMessage("success", "システムプロンプトを保存しました");
    } catch { showMessage("error", "保存に失敗しました"); }
    finally { setSaving(false); }
  };

  // ===== スピーカー保存 =====
  const saveSpeaker = async (speaker: Speaker) => {
    setSaving(true);
    try {
      await apiFetch("/api/voice/settings/speaker", {
        method: "PUT",
        body: JSON.stringify({ speaker_id: speaker.id, speaker_name: speaker.name }),
      });
      setSettings(s => s ? { ...s, speaker_id: speaker.id, speaker_name: speaker.name } : s);
      showMessage("success", `スピーカーを「${speaker.name}」に変更しました`);
    } catch { showMessage("error", "保存に失敗しました"); }
    finally { setSaving(false); }
  };

  // ===== キーワード保存 =====
  const saveKeywords = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/voice/settings/keywords", {
        method: "PUT",
        body: JSON.stringify({
          escalate_keywords: settings.escalate_keywords,
          simple_patterns: settings.simple_patterns,
        }),
      });
      showMessage("success", "キーワード設定を保存しました");
    } catch { showMessage("error", "保存に失敗しました"); }
    finally { setSaving(false); }
  };

  // ===== FAQ操作 =====
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [showFaqForm, setShowFaqForm] = useState(false);

  const saveFaq = async () => {
    if (!editingFaq) return;
    setSaving(true);
    try {
      if (editingFaq.id) {
        await apiFetch(`/api/voice/settings/faq/${editingFaq.id}`, {
          method: "PUT", body: JSON.stringify(editingFaq),
        });
      } else {
        await apiFetch("/api/voice/settings/faq", {
          method: "POST", body: JSON.stringify(editingFaq),
        });
      }
      showMessage("success", "FAQを保存しました");
      setShowFaqForm(false);
      setEditingFaq(null);
      const f = await apiFetch("/api/voice/settings/faq");
      setFaqs(f.faqs);
    } catch { showMessage("error", "保存に失敗しました"); }
    finally { setSaving(false); }
  };

  const deleteFaq = async (id: number) => {
    if (!confirm("このFAQを削除しますか？")) return;
    try {
      await apiFetch(`/api/voice/settings/faq/${id}`, { method: "DELETE" });
      setFaqs(faqs.filter(f => f.id !== id));
      showMessage("success", "FAQを削除しました");
    } catch { showMessage("error", "削除に失敗しました"); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ color: "#6b7280", fontSize: "14px" }}>設定を読み込み中...</div>
    </div>
  );

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "prompt",   label: "システムプロンプト", icon: "📝" },
    { id: "speaker",  label: "音声設定",           icon: "🔊" },
    { id: "keywords", label: "キーワード管理",      icon: "🔑" },
    { id: "faq",      label: "FAQ管理",             icon: "❓" },
  ];

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px", fontFamily: "'Noto Sans JP', sans-serif" }}>

      {/* ヘッダー */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", letterSpacing: "0.05em" }}>
          KEIEI-AI / ボイスボット
        </div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#111827", margin: 0 }}>
          ボイスボット設定
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
          AIエンジニア不在でも、ここから設定を変更できます
        </p>
      </div>

      {/* メッセージ */}
      {message && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "24px",
          background: message.type === "success" ? "#f0fdf4" : "#fef2f2",
          border: `1px solid ${message.type === "success" ? "#86efac" : "#fca5a5"}`,
          color: message.type === "success" ? "#166534" : "#991b1b",
          fontSize: "14px",
        }}>
          {message.type === "success" ? "✅ " : "❌ "}{message.text}
        </div>
      )}

      {/* タブ */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "10px 16px", border: "none", cursor: "pointer", fontSize: "14px",
            background: "none", fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#1d4ed8" : "#6b7280",
            borderBottom: activeTab === tab.id ? "2px solid #1d4ed8" : "2px solid transparent",
            transition: "all 0.2s",
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ===== プロンプトタブ ===== */}
      {activeTab === "prompt" && settings && (
        <div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
              システムプロンプト
            </label>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
              AIの回答スタイル・禁止事項・トーンを設定します。業種に合わせて変更してください。
            </p>
            <textarea
              value={settings.system_prompt}
              onChange={e => setSettings({ ...settings, system_prompt: e.target.value })}
              rows={16}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #d1d5db", fontSize: "13px", fontFamily: "monospace",
                lineHeight: "1.6", resize: "vertical", outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px", textAlign: "right" }}>
              {settings.system_prompt.length} / 5000文字
            </div>
          </div>
          <button onClick={savePrompt} disabled={saving} style={{
            padding: "10px 24px", background: saving ? "#9ca3af" : "#1d4ed8",
            color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px",
            fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "保存中..." : "💾 保存する"}
          </button>
        </div>
      )}

      {/* ===== スピーカータブ ===== */}
      {activeTab === "speaker" && settings && (
        <div>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "20px" }}>
            VOICEVOXの音声キャラクターを選択します。コールセンター向けには落ち着いた声が推奨です。
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
            {speakers.map(speaker => (
              <div key={speaker.id} onClick={() => saveSpeaker(speaker)} style={{
                padding: "16px", borderRadius: "12px", cursor: "pointer",
                border: settings.speaker_id === speaker.id ? "2px solid #1d4ed8" : "1px solid #e5e7eb",
                background: settings.speaker_id === speaker.id ? "#eff6ff" : "#fff",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔊</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>{speaker.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>ID: {speaker.id}</div>
                {settings.speaker_id === speaker.id && (
                  <div style={{ fontSize: "12px", color: "#1d4ed8", marginTop: "8px", fontWeight: 600 }}>
                    ✅ 現在使用中
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== キーワードタブ ===== */}
      {activeTab === "keywords" && settings && (
        <div>
          {/* エスカレーションキーワード */}
          <div style={{ marginBottom: "32px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
              🚨 エスカレーションキーワード
            </label>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
              これらのキーワードが検出されると、オペレーターに転送します。1行に1キーワード。
            </p>
            <textarea
              value={settings.escalate_keywords.join("\n")}
              onChange={e => setSettings({
                ...settings,
                escalate_keywords: e.target.value.split("\n").filter(k => k.trim())
              })}
              rows={8}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #fca5a5", fontSize: "13px", fontFamily: "monospace",
                lineHeight: "1.8", resize: "vertical", outline: "none",
                boxSizing: "border-box", background: "#fff5f5",
              }}
            />
          </div>

          {/* 定型パターン */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "8px" }}>
              ⚡ 定型パターン（Groq高速処理）
            </label>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px" }}>
              これらのキーワードを含む質問はGroqで高速処理（約1.5秒）されます。1行に1キーワード。
            </p>
            <textarea
              value={settings.simple_patterns.join("\n")}
              onChange={e => setSettings({
                ...settings,
                simple_patterns: e.target.value.split("\n").filter(k => k.trim())
              })}
              rows={10}
              style={{
                width: "100%", padding: "12px", borderRadius: "8px",
                border: "1px solid #86efac", fontSize: "13px", fontFamily: "monospace",
                lineHeight: "1.8", resize: "vertical", outline: "none",
                boxSizing: "border-box", background: "#f0fdf4",
              }}
            />
          </div>

          <button onClick={saveKeywords} disabled={saving} style={{
            padding: "10px 24px", background: saving ? "#9ca3af" : "#1d4ed8",
            color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px",
            fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>
            {saving ? "保存中..." : "💾 保存する"}
          </button>
        </div>
      )}

      {/* ===== FAQタブ ===== */}
      {activeTab === "faq" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
              よくある質問と回答を登録します。RAGと連携してAIの回答精度を向上させます。
            </p>
            <button onClick={() => { setEditingFaq({ question: "", answer: "", category: "一般", is_active: true }); setShowFaqForm(true); }} style={{
              padding: "8px 16px", background: "#1d4ed8", color: "#fff",
              border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: 600,
            }}>
              ＋ FAQ追加
            </button>
          </div>

          {/* FAQフォーム */}
          {showFaqForm && editingFaq && (
            <div style={{
              padding: "20px", background: "#f8fafc", borderRadius: "12px",
              border: "1px solid #e2e8f0", marginBottom: "20px",
            }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, marginTop: 0, marginBottom: "16px" }}>
                {editingFaq.id ? "FAQ編集" : "FAQ追加"}
              </h3>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>カテゴリ</label>
                <input value={editingFaq.category}
                  onChange={e => setEditingFaq({ ...editingFaq, category: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", marginTop: "4px", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>質問</label>
                <input value={editingFaq.question}
                  onChange={e => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  placeholder="例：営業時間を教えてください"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", marginTop: "4px", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>回答</label>
                <textarea value={editingFaq.answer}
                  onChange={e => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  placeholder="例：営業時間は平日9時から18時でございます。"
                  rows={3}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", marginTop: "4px", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={saveFaq} disabled={saving} style={{
                  padding: "8px 20px", background: "#1d4ed8", color: "#fff",
                  border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer",
                }}>
                  {saving ? "保存中..." : "保存"}
                </button>
                <button onClick={() => { setShowFaqForm(false); setEditingFaq(null); }} style={{
                  padding: "8px 20px", background: "#f3f4f6", color: "#374151",
                  border: "none", borderRadius: "6px", fontSize: "14px", cursor: "pointer",
                }}>
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* FAQリスト */}
          {faqs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
              FAQがまだ登録されていません
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {faqs.map(faq => (
                <div key={faq.id} style={{
                  padding: "16px", background: "#fff", borderRadius: "10px",
                  border: "1px solid #e5e7eb", opacity: faq.is_active ? 1 : 0.5,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                        📁 {faq.category}
                        {!faq.is_active && <span style={{ marginLeft: "8px", color: "#ef4444" }}>（無効）</span>}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>
                        Q: {faq.question}
                      </div>
                      <div style={{ fontSize: "13px", color: "#4b5563" }}>
                        A: {faq.answer}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginLeft: "12px" }}>
                      <button onClick={() => { setEditingFaq({ ...faq }); setShowFaqForm(true); }} style={{
                        padding: "4px 10px", background: "#f3f4f6", border: "none",
                        borderRadius: "6px", fontSize: "12px", cursor: "pointer",
                      }}>編集</button>
                      <button onClick={() => deleteFaq(faq.id!)} style={{
                        padding: "4px 10px", background: "#fee2e2", color: "#dc2626",
                        border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
                      }}>削除</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


