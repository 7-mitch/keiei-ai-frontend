"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

function MermaidChart({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !chart) return;
    import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "default", securityLevel: "loose" });
      const id = "mermaid-" + Math.random().toString(36).substr(2, 9);
      m.default.render(id, chart).then(({ svg }) => {
        if (ref.current) ref.current.innerHTML = svg;
      }).catch(() => {
        if (ref.current) ref.current.innerHTML = `<pre>${chart}</pre>`;
      });
    });
  }, [chart]);
  return <div ref={ref} className="w-full overflow-x-auto bg-white rounded-lg p-3 min-h-[100px]" />;
}

type RequestStatus = "draft" | "pending" | "in_review" | "approved" | "rejected" | "withdrawn";
type Priority = "low" | "normal" | "high" | "urgent";

interface ApprovalRequest {
  id: string; title: string; request_type: string; status: RequestStatus;
  priority: Priority; requested_by: string; due_date: string | null;
  ai_risk_score: number | null; ai_risk_summary: string | null;
  created_at: string; step_order?: number; approver_role?: string;
}
interface ApprovalStep {
  id: string; step_order: number; approver_name: string; approver_role: string;
  status: string; comment: string | null; approved_at: string | null; rejected_at: string | null;
}
interface Notification {
  id: string; title: string; body: string; notification_type: string;
  is_read: boolean; created_at: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STATUS_LABEL: Record<RequestStatus, string> = {
  draft: "下書き", pending: "承認待ち", in_review: "審査中",
  approved: "承認済み", rejected: "差戻し", withdrawn: "取下げ",
};
const STATUS_COLOR: Record<RequestStatus, string> = {
  draft: "bg-gray-500/20 text-gray-300", pending: "bg-yellow-500/20 text-yellow-300",
  in_review: "bg-blue-500/20 text-blue-300", approved: "bg-green-500/20 text-green-300",
  rejected: "bg-red-500/20 text-red-300", withdrawn: "bg-gray-500/20 text-gray-400",
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "低", normal: "通常", high: "高", urgent: "緊急" };
const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-gray-400", normal: "text-blue-400", high: "text-orange-400", urgent: "text-red-400",
};
const TYPE_LABEL: Record<string, string> = {
  jsox_document: "J-SOX文書", audit_report: "監査レポート", financial_report: "財務レポート",
  budget_request: "予算申請", expense: "経費申請", general: "一般申請",
};

type Tab = "pending" | "notifications" | "new_request" | "jsox";

const Icons = {
  Clock: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  Bell: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
  Plus: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  FileText: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>),
  Check: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>),
  X: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  AlertTriangle: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  ChevronRight: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>),
  User: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
  Info: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>),
  Print: () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>),
};

// A4印刷用HTML生成
function generatePrintHTML(result: any, processName: string, fiscalYear: string): string {
  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const businessDescHTML = Array.isArray(result.business_description)
    ? result.business_description.map((sec: any) => `
        <div class="section">
          <h3>${sec.section}</h3>
          <table class="desc-table">
            <thead><tr><th style="width:60px">No</th><th>内容</th></tr></thead>
            <tbody>
              ${(sec.items || []).map((item: string, j: number) => `
                <tr><td>${j + 1}</td><td>${item}</td></tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `).join("")
    : `<pre>${String(result.business_description)}</pre>`;

  const rcmHTML = Array.isArray(result.rcm) ? `
    <table class="rcm-table">
      <thead>
        <tr>
          <th>No</th><th>業務名</th><th>リスク内容</th><th>統制活動</th>
          <th>実在性</th><th>網羅性</th><th>権利</th><th>評価</th><th>期間</th><th>表示</th>
          <th>種別</th><th>頻度</th><th>評価者</th><th>承認者</th>
        </tr>
      </thead>
      <tbody>
        ${result.rcm.map((row: any, i: number) => `
          <tr>
            <td>${row.no ?? i + 1}</td>
            <td>${row.business ?? "-"}</td>
            <td class="risk">${row.risk ?? "-"}</td>
            <td class="control">${row.control ?? "-"}</td>
            <td class="center">${row.assertions?.existence ? "○" : "-"}</td>
            <td class="center">${row.assertions?.completeness ? "○" : "-"}</td>
            <td class="center">${row.assertions?.rights ? "○" : "-"}</td>
            <td class="center">${row.assertions?.valuation ? "○" : "-"}</td>
            <td class="center">${row.assertions?.cutoff ? "○" : "-"}</td>
            <td class="center">${row.assertions?.presentation ? "○" : "-"}</td>
            <td>${row.type ?? "-"}</td>
            <td>${row.frequency ?? "-"}</td>
            <td>${row.evaluator ?? "-"}</td>
            <td>${row.reviewer ?? "-"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : "<p>データなし</p>";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>J-SOX 3点セット - ${processName}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif; font-size: 9pt; color: #1a1a1a; background: white; }
    .cover { text-align: center; padding: 60mm 0 40mm; page-break-after: always; }
    .cover h1 { font-size: 24pt; font-weight: bold; color: #1a3a5c; margin-bottom: 8mm; }
    .cover h2 { font-size: 16pt; color: #2c5f8a; margin-bottom: 15mm; }
    .cover .meta { font-size: 10pt; color: #555; line-height: 2; }
    .cover .border-line { width: 80mm; height: 2px; background: #1a3a5c; margin: 10mm auto; }
    .doc-section { page-break-before: always; padding-top: 5mm; }
    .doc-title { font-size: 14pt; font-weight: bold; color: #1a3a5c; border-bottom: 2px solid #1a3a5c; padding-bottom: 3mm; margin-bottom: 5mm; }
    .section { margin-bottom: 6mm; }
    .section h3 { font-size: 10pt; font-weight: bold; background: #e8f0f8; padding: 2mm 3mm; margin-bottom: 2mm; color: #1a3a5c; }
    .desc-table { width: 100%; border-collapse: collapse; }
    .desc-table th { background: #1a3a5c; color: white; padding: 2mm 3mm; font-size: 8.5pt; text-align: left; }
    .desc-table td { padding: 2mm 3mm; border: 1px solid #ccc; font-size: 8.5pt; vertical-align: top; line-height: 1.5; }
    .desc-table tr:nth-child(even) td { background: #f5f8fc; }
    .flowchart-box { background: #f5f8fc; border: 1px solid #ccc; padding: 5mm; font-family: monospace; font-size: 8pt; white-space: pre; line-height: 1.6; margin-top: 3mm; }
    .flowchart-note { font-size: 8pt; color: #666; margin-top: 3mm; font-style: italic; }
    .rcm-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
    .rcm-table th { background: #1a3a5c; color: white; padding: 1.5mm 2mm; text-align: center; font-size: 7.5pt; border: 1px solid #999; }
    .rcm-table td { padding: 1.5mm 2mm; border: 1px solid #ccc; vertical-align: top; line-height: 1.4; }
    .rcm-table tr:nth-child(even) td { background: #f5f8fc; }
    .rcm-table .risk { color: #c0392b; font-weight: bold; }
    .rcm-table .control { color: #1a6b3a; }
    .rcm-table .center { text-align: center; }
    .disclaimer { margin-top: 8mm; padding: 3mm 4mm; background: #fff8e1; border: 1px solid #f0c040; font-size: 8pt; color: #7a5c00; }
    .footer { position: fixed; bottom: 8mm; right: 20mm; font-size: 7pt; color: #999; }
    .header-bar { background: #1a3a5c; color: white; padding: 2mm 3mm; font-size: 8pt; margin-bottom: 4mm; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <!-- 表紙 -->
  <div class="cover">
    <div class="border-line"></div>
    <h1>J-SOX 内部統制</h1>
    <h2>3点セット</h2>
    <div class="border-line"></div>
    <div class="meta">
      <div><strong>業務プロセス名：</strong>${processName}</div>
      <div><strong>対象年度：</strong>${fiscalYear}年度</div>
      <div><strong>作成日：</strong>${today}</div>
      <div><strong>作成方法：</strong>KEIEI-AI（AIによる自動生成）</div>
    </div>
    <div style="margin-top:20mm; font-size:8pt; color:#c00;">
      ※ 本書はAIが生成した草案です。必ず内部監査人が内容を確認・修正の上、承認してください。
    </div>
  </div>

  <!-- 業務記述書 -->
  <div class="doc-section">
    <div class="header-bar">
      <span>■ 業務記述書</span>
      <span>${processName} ／ ${fiscalYear}年度</span>
    </div>
    <div class="doc-title">業務記述書（Business Process Description）</div>
    ${businessDescHTML}
  </div>

  <!-- フローチャート -->
  <div class="doc-section">
    <div class="header-bar">
      <span>■ フローチャート</span>
      <span>${processName} ／ ${fiscalYear}年度</span>
    </div>
    <div class="doc-title">業務フローチャート（Flowchart）</div>
    <div class="flowchart-box">${result.flowchart || "フローチャートデータなし"}</div>
    <div class="flowchart-note">※ 上記はMermaid記法によるフローチャート定義です。draw.io等の図形ツールに貼り付けて視覚化できます。</div>
  </div>

  <!-- RCM -->
  <div class="doc-section">
    <div class="header-bar">
      <span>■ リスクコントロールマトリクス（RCM）</span>
      <span>${processName} ／ ${fiscalYear}年度</span>
    </div>
    <div class="doc-title">リスクコントロールマトリクス（Risk Control Matrix）</div>
    ${rcmHTML}
    <div class="disclaimer">
      【免責事項】本書はKEIEI-AIが自動生成した内部統制文書の草案です。金融庁の実施基準に基づく最終的な評価・判断は、必ず専門の内部監査人または公認会計士が行ってください。
    </div>
  </div>

  <div class="footer">KEIEI-AI | 経営者支援AIシステム | ${today}</div>
</body>
</html>`;
}

export default function ApprovalPage() {
  const [tab, setTab] = useState<Tab>("pending");
  const [pendingList, setPendingList] = useState<ApprovalRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [steps, setSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({
    request_type: "general", title: "", description: "", priority: "normal",
    due_date: "", approvers: [{ id: "", name: "", role: "" }],
  });
  const [jsoxForm, setJsoxForm] = useState({
    process_name: "", process_description: "",
    fiscal_year: new Date().getFullYear().toString(), risk_focus: "",
  });
  const [jsoxResult, setJsoxResult] = useState<any>(null);
  const [jsoxLoading, setJsoxLoading] = useState(false);
  const [consistencyResult, setConsistencyResult] = useState<any>(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : "";
  const headers = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/approval/requests/pending`, { headers: headers() });
      setPendingList(res.data.items || []);
    } catch (e: any) {
      if (e.response?.status !== 401) showToast("データ取得に失敗しました", "error");
    } finally { setLoading(false); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/api/approval/notifications`, { headers: headers() });
      setNotifications(res.data.items || []);
    } catch {}
  };

  const fetchDetail = async (req: ApprovalRequest) => {
    setSelectedRequest(req);
    try {
      const res = await axios.get(`${API}/api/approval/requests/${req.id}`, { headers: headers() });
      setSteps(res.data.data?.steps || []);
    } catch {}
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      await axios.post(`${API}/api/approval/requests/${selectedRequest.id}/approve`, { comment }, { headers: headers() });
      showToast("承認しました", "success");
      setSelectedRequest(null); setComment(""); fetchPending();
    } catch (e: any) { showToast(e.response?.data?.detail || "承認に失敗しました", "error"); }
  };

  const handleReject = async () => {
    if (!selectedRequest || !comment.trim()) { showToast("差戻し理由を入力してください", "error"); return; }
    try {
      await axios.post(`${API}/api/approval/requests/${selectedRequest.id}/reject`, { comment }, { headers: headers() });
      showToast("差戻しました", "success");
      setSelectedRequest(null); setComment(""); fetchPending();
    } catch (e: any) { showToast(e.response?.data?.detail || "差戻しに失敗しました", "error"); }
  };

  const handleCreateRequest = async () => {
    if (!form.title.trim()) { showToast("タイトルを入力してください", "error"); return; }
    const validApprovers = form.approvers.filter(a => a.id?.trim() && a.name?.trim() && a.role?.trim());
    if (validApprovers.length === 0) { showToast("承認者のID・氏名・役職をすべて入力してください", "error"); return; }
    try {
      await axios.post(`${API}/api/approval/requests`,
        { ...form, due_date: form.due_date || null, approvers: validApprovers },
        { headers: headers() });
      showToast("申請を作成しました", "success");
      setTab("pending"); fetchPending();
      setForm({ request_type: "general", title: "", description: "", priority: "normal", due_date: "", approvers: [{ id: "", name: "", role: "" }] });
    } catch (e: any) { showToast(e.response?.data?.detail || "申請作成に失敗しました", "error"); }
  };

  const handleJSOX = async () => {
    if (!jsoxForm.process_name.trim()) { showToast("業務プロセス名を入力してください", "error"); return; }
    setJsoxLoading(true); setJsoxResult(null);
    try {
      const res = await axios.post(`${API}/api/approval/jsox/generate`, {
        process_name: jsoxForm.process_name,
        process_description: jsoxForm.process_description,
        fiscal_year: jsoxForm.fiscal_year,
        risk_focus: jsoxForm.risk_focus ? jsoxForm.risk_focus.split(",").map(s => s.trim()) : [],
        auto_submit: false, uploaded_content: [],
      }, { headers: headers() });
      setJsoxResult({ ...res.data.data, _document_id: res.data.document_id });
      showToast("J-SOX 3点セットを生成しました", "success");
    } catch (e: any) { showToast(e.response?.data?.detail || "生成に失敗しました", "error"); }
    finally { setJsoxLoading(false); }
  };

  const handleConsistencyCheck = async () => {
    if (!jsoxResult) return;
    setConsistencyLoading(true);
    setConsistencyResult(null);
    try {
      const res = await axios.post(`${API}/api/approval/jsox/consistency-check`, {
        business_description: jsoxResult.business_description,
        flowchart: jsoxResult.flowchart,
        rcm: jsoxResult.rcm,
      }, { headers: headers() });
      setConsistencyResult(res.data.data);
      showToast("整合性チェック完了", "success");
    } catch (e: any) {
      showToast("チェックに失敗しました", "error");
    } finally {
      setConsistencyLoading(false);
    }
  };

  const handlePrint = () => {
    if (!jsoxResult) return;
    const html = generatePrintHTML(jsoxResult, jsoxForm.process_name, jsoxForm.fiscal_year);
    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    }
  };

  useEffect(() => {
    if (tab === "pending") fetchPending();
    if (tab === "notifications") fetchNotifications();
  }, [tab]);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const tabs: { key: Tab; label: string; Icon: () => React.ReactElement }[] = [
    { key: "pending", label: "承認待ち", Icon: Icons.Clock },
    { key: "notifications", label: `通知${unreadCount > 0 ? ` (${unreadCount})` : ""}`, Icon: Icons.Bell },
    { key: "new_request", label: "新規申請", Icon: Icons.Plus },
    { key: "jsox", label: "J-SOX 3点セット", Icon: Icons.FileText },
  ];

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50";
  const labelCls = "text-xs text-gray-400 block mb-1";

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}

      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600/30 rounded-lg flex items-center justify-center text-blue-400"><Icons.FileText /></div>
        <div>
          <h1 className="text-lg font-semibold text-white">承認ワークフロー</h1>
          <p className="text-xs text-gray-400">稟議・申請の作成・承認・J-SOX 3点セット生成</p>
        </div>
      </div>

      <div className="flex border-b border-white/10 px-6">
        {tabs.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => { setTab(key); setSelectedRequest(null); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === key ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-white"}`}>
            <Icon />{label}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* 承認待ち */}
        {tab === "pending" && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
            ) : pendingList.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Icons.Check /></div>
                <p className="text-sm">承認待ちの申請はありません</p>
              </div>
            ) : (
              pendingList.map(req => (
                <div key={req.id} onClick={() => fetchDetail(req)}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>{STATUS_LABEL[req.status]}</span>
                        <span className="text-xs text-gray-500">{TYPE_LABEL[req.request_type] || req.request_type}</span>
                        <span className={`text-xs font-medium ${PRIORITY_COLOR[req.priority]}`}>{PRIORITY_LABEL[req.priority]}</span>
                      </div>
                      <h3 className="font-medium text-white truncate text-sm">{req.title}</h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Icons.User />{req.step_order}次承認</span>
                        {req.approver_role && <span>{req.approver_role}</span>}
                        {req.due_date && <span className="flex items-center gap-1"><Icons.Clock />{new Date(req.due_date).toLocaleDateString("ja-JP")}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.ai_risk_score !== null && (
                        <div className={`text-center px-2.5 py-1 rounded-lg text-xs min-w-[48px] ${req.ai_risk_score > 0.7 ? "bg-red-500/20 text-red-300" : req.ai_risk_score > 0.4 ? "bg-yellow-500/20 text-yellow-300" : "bg-green-500/20 text-green-300"}`}>
                          <div className="font-bold">{Math.round(req.ai_risk_score * 100)}</div>
                          <div className="text-[10px]">リスク</div>
                        </div>
                      )}
                      <Icons.ChevronRight />
                    </div>
                  </div>
                </div>
              ))
            )}
            {selectedRequest && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
                <div className="bg-[#1a1d27] border border-white/15 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[selectedRequest.status]} mb-2 inline-block`}>{STATUS_LABEL[selectedRequest.status]}</span>
                        <h2 className="font-semibold text-white">{selectedRequest.title}</h2>
                      </div>
                      <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"><Icons.X /></button>
                    </div>
                    {selectedRequest.ai_risk_summary && (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-xs text-yellow-300 flex gap-2">
                        <Icons.AlertTriangle />
                        <div><span className="font-medium">AIリスク評価: </span>{selectedRequest.ai_risk_summary}</div>
                      </div>
                    )}
                    {steps.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">承認ステップ</h3>
                        <div className="space-y-2">
                          {steps.map((step, i) => (
                            <div key={step.id} className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.status === "approved" ? "bg-green-500/30 text-green-300" : step.status === "rejected" ? "bg-red-500/30 text-red-300" : i === 0 ? "bg-blue-500/30 text-blue-300" : "bg-white/10 text-gray-400"}`}>
                                {step.status === "approved" ? <Icons.Check /> : step.status === "rejected" ? <Icons.X /> : step.step_order}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-200">{step.approver_name}</span>
                                {step.approver_role && <span className="text-xs text-gray-500 ml-2">{step.approver_role}</span>}
                                {step.comment && <p className="text-xs text-gray-400 mt-0.5 italic">"{step.comment}"</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mb-4">
                      <label className={labelCls}>コメント（差戻し時は必須）</label>
                      <textarea value={comment} onChange={e => setComment(e.target.value)} className={`${inputCls} resize-none`} rows={3} placeholder="承認・差戻しの理由を入力..." />
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-5 flex gap-2 text-xs text-blue-300">
                      <Icons.Info /><span>HITL設計: この操作は最終的な人間の判断です。AIの提案を参考にしつつ、ご自身の判断で承認・差戻しを行ってください。</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"><Icons.Check />承認する</button>
                      <button onClick={handleReject} className="flex-1 bg-red-600/80 hover:bg-red-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"><Icons.X />差戻す</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 通知 */}
        {tab === "notifications" && (
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="w-12 h-12 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Icons.Bell /></div>
                <p className="text-sm">通知はありません</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`border rounded-xl p-4 transition-colors ${n.is_read ? "bg-white/3 border-white/5 opacity-50" : "bg-white/6 border-white/15"}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-2 flex-1 min-w-0">
                      <div className="mt-0.5 text-gray-400 flex-shrink-0"><Icons.Bell /></div>
                      <div>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{new Date(n.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 新規申請 */}
        {tab === "new_request" && (
          <div className="max-w-2xl space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>申請種別</label>
                <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} className={inputCls}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-[#1a1d27]">{v}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>優先度</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k} className="bg-[#1a1d27]">{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>タイトル <span className="text-red-400">*</span></label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="申請タイトルを入力..." />
            </div>
            <div>
              <label className={labelCls}>詳細説明</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} rows={4} placeholder="申請の詳細を入力..." />
            </div>
            <div>
              <label className={labelCls}>期限</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className={labelCls}>承認者</label>
                <button onClick={() => setForm({ ...form, approvers: [...form.approvers, { id: "", name: "", role: "" }] })} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Icons.Plus />追加</button>
              </div>
              <div className="space-y-2">
                {form.approvers.map((a, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <input value={a.id} onChange={e => { const u = [...form.approvers]; u[i] = { ...a, id: e.target.value }; setForm({ ...form, approvers: u }); }} className={inputCls} placeholder="ユーザーID" />
                    <input value={a.name} onChange={e => { const u = [...form.approvers]; u[i] = { ...a, name: e.target.value }; setForm({ ...form, approvers: u }); }} className={inputCls} placeholder="氏名" />
                    <input value={a.role} onChange={e => { const u = [...form.approvers]; u[i] = { ...a, role: e.target.value }; setForm({ ...form, approvers: u }); }} className={inputCls} placeholder="役職" />
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleCreateRequest} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"><Icons.Plus />申請を提出する</button>
          </div>
        )}

        {/* J-SOX */}
        {tab === "jsox" && (
          <div className="max-w-2xl space-y-5">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <div className="text-blue-400 flex-shrink-0 mt-0.5"><Icons.Info /></div>
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">J-SOX 3点セット自動生成</p>
                <p className="text-xs">業務プロセスの概要を入力するだけで、業務記述書・フローチャート・RCMをAIが自動生成します。生成された文書は必ず内部監査人が確認・承認してください。</p>
              </div>
            </div>
            <div>
              <label className={labelCls}>業務プロセス名 <span className="text-red-400">*</span></label>
              <input value={jsoxForm.process_name} onChange={e => setJsoxForm({ ...jsoxForm, process_name: e.target.value })} className={inputCls} placeholder="例: 売上計上プロセス、購買・支払プロセス..." />
            </div>
            <div>
              <label className={labelCls}>プロセス概要</label>
              <textarea value={jsoxForm.process_description} onChange={e => setJsoxForm({ ...jsoxForm, process_description: e.target.value })} className={`${inputCls} resize-none`} rows={4} placeholder="業務の流れ・担当者・使用システムなどを記載..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>対象年度</label>
                <input value={jsoxForm.fiscal_year} onChange={e => setJsoxForm({ ...jsoxForm, fiscal_year: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>注目リスク（カンマ区切り）</label>
                <input value={jsoxForm.risk_focus} onChange={e => setJsoxForm({ ...jsoxForm, risk_focus: e.target.value })} className={inputCls} placeholder="例: 不正リスク, IT全般統制" />
              </div>
            </div>
            <button onClick={handleJSOX} disabled={jsoxLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              <Icons.FileText />{jsoxLoading ? "生成中..." : "3点セットを生成する"}
            </button>

            {jsoxResult && (
              <div className="space-y-4 border-t border-white/10 pt-6">
                {/* ヘッダー・印刷ボタン */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <Icons.Check />生成完了: {jsoxForm.process_name}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleConsistencyCheck} disabled={consistencyLoading} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-medium rounded-lg transition-colors">{consistencyLoading ? "チェック中..." : "整合性チェック"}</button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 hover:bg-gray-100 text-xs font-medium rounded-lg transition-colors"><Icons.Print />A4印刷・PDF保存</button>
                  </div>
                </div>

                {/* 業務記述書（表形式） */}
                <div className="bg-white/5 border border-blue-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2"><Icons.FileText />業務記述書</h4>
                  {Array.isArray(jsoxResult.business_description)
                    ? jsoxResult.business_description.map((sec: any, i: number) => (
                        <div key={i} className="mb-4">
                          <p className="text-xs font-medium text-white mb-2 bg-white/10 px-2 py-1 rounded">{sec.section}</p>
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-blue-900/30">
                                <th className="text-left p-2 text-gray-400 font-medium border border-white/10 w-8">No</th>
                                <th className="text-left p-2 text-gray-400 font-medium border border-white/10">内容</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(Array.isArray(sec.items) ? sec.items : String(sec.items).split(/(?=\(\d+\))/)).filter(Boolean).map((item: string, j: number) => (
                                <tr key={j} className="border border-white/10 hover:bg-white/5">
                                  <td className="p-2 text-gray-400 border border-white/10 text-center">{j + 1}</td>
                                  <td className="p-2 text-gray-200 border border-white/10 leading-relaxed">{item}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))
                    : <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-black/20 p-3 rounded-lg">{String(jsoxResult.business_description)}</pre>
                  }
                </div>

                {/* フローチャート */}
                <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2"><Icons.FileText />フローチャート（Mermaid）</h4>
                  <MermaidChart chart={jsoxResult.flowchart} />
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer">Mermaidソースを表示</summary>
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap bg-black/20 p-3 rounded-lg mt-1">{jsoxResult.flowchart}</pre>
                  </details>
                </div>

                {/* RCM（詳細版） */}
                <div className="bg-white/5 border border-orange-500/20 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-orange-300 mb-3 flex items-center gap-2"><Icons.FileText />RCM（リスクコントロールマトリクス）</h4>
                  {Array.isArray(jsoxResult.rcm) ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-orange-900/30">
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">No</th>
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">業務</th>
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">リスク</th>
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">統制活動</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="実在性">実</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="網羅性">網</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="権利">権</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="評価">評</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="期間帰属">期</th>
                            <th className="text-center p-2 text-gray-400 font-medium border border-white/10" title="表示">表</th>
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">種別</th>
                            <th className="text-left p-2 text-gray-400 font-medium border border-white/10">頻度</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jsoxResult.rcm.map((row: any, i: number) => (
                            <tr key={i} className="border border-white/10 hover:bg-white/5">
                              <td className="p-2 text-gray-400 border border-white/10">{row.no ?? i + 1}</td>
                              <td className="p-2 text-gray-300 border border-white/10">{row.business ?? "-"}</td>
                              <td className="p-2 text-red-300 border border-white/10 font-medium">{row.risk}</td>
                              <td className="p-2 text-green-300 border border-white/10">{row.control}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.existence ? "○" : "-"}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.completeness ? "○" : "-"}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.rights ? "○" : "-"}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.valuation ? "○" : "-"}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.cutoff ? "○" : "-"}</td>
                              <td className="p-2 text-center border border-white/10">{row.assertions?.presentation ? "○" : "-"}</td>
                              <td className="p-2 text-gray-300 border border-white/10">{row.type}</td>
                              <td className="p-2 text-gray-300 border border-white/10">{row.frequency}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>実=実在性</span><span>網=網羅性</span><span>権=権利・義務</span>
                        <span>評=評価・測定</span><span>期=期間帰属</span><span>表=表示・開示</span>
                      </div>
                    </div>
                  ) : <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-black/20 p-3 rounded-lg">{JSON.stringify(jsoxResult.rcm, null, 2)}</pre>}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-2 text-xs text-yellow-300">
                {consistencyResult && (
                  <div className="bg-white/5 border border-white/15 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white">整合性チェック結果</h4>
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${consistencyResult.score >= 80 ? "bg-green-500/20 text-green-300" : consistencyResult.score >= 60 ? "bg-yellow-500/20 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>
                        スコア: {consistencyResult.score}点 / {consistencyResult.status}
                      </div>
                    </div>
                    <p className="text-xs text-gray-300">{consistencyResult.summary}</p>
                    {consistencyResult.issues?.length > 0 ? (
                      <div className="space-y-2">
                        {consistencyResult.issues.map((issue: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg border text-xs ${issue.severity === "高" ? "bg-red-500/10 border-red-500/30" : issue.severity === "中" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-blue-500/10 border-blue-500/30"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${issue.severity === "高" ? "bg-red-500/30 text-red-300" : issue.severity === "中" ? "bg-yellow-500/30 text-yellow-300" : "bg-blue-500/30 text-blue-300"}`}>{issue.severity}</span>
                              <span className="text-gray-400">{issue.category}</span>
                            </div>
                            <p className="text-gray-200 mb-1">{issue.description}</p>
                            <p className="text-green-300">修正提案: {issue.suggestion}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-xs text-green-300">
                        矛盾・問題は検出されませんでした
                      </div>
                    )}
                  </div>
                )}

                  <Icons.AlertTriangle />
                  <span>本書はAIが生成した草案です。必ず内部監査人が内容を確認・修正の上、承認してください。金融庁の実施基準に準拠した最終判断は専門家が行ってください。</span>
                </div>

                {/* 内部監査人コメント */}
                <div className="bg-white/5 border border-white/15 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-white mb-3">内部監査人コメント（監査証跡）</h4>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} className={`${inputCls} resize-none mb-3`} rows={3} placeholder="確認内容・修正指示・承認コメントを入力..." />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { if (!comment.trim()) { showToast("コメントを入力してください", "error"); return; } try { await axios.post(`${API}/api/approval/jsox/${jsoxResult._document_id}/comment`, { comment, action: "approve" }, { headers: headers() }); showToast("承認・監査コメントを記録しました", "success"); setComment(""); } catch { showToast("記録に失敗しました", "error"); } }}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Icons.Check />承認・記録
                    </button>
                    <button
                      onClick={async () => { if (!comment.trim()) { showToast("差戻し理由を入力してください", "error"); return; } try { await axios.post(`${API}/api/approval/jsox/${jsoxResult._document_id}/comment`, { comment, action: "reject" }, { headers: headers() }); showToast("差戻しコメントを記録しました", "success"); setComment(""); } catch { showToast("記録に失敗しました", "error"); } }}
                      className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <Icons.X />差戻し
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


