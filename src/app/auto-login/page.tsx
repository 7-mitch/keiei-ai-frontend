"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AutoLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [msg, setMsg] = useState("認証中...");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setStatus("error"); setMsg("無効なQRコードです"); return; }

    fetch(`${API_BASE}/api/auth/qr/login/${token}`, { method: "POST" })
      .then(r => r.json())
      .then(data => {
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          router.push("/voice");
        } else {
          setStatus("error");
          setMsg(data.detail || "ログインに失敗しました");
        }
      })
      .catch(() => { setStatus("error"); setMsg("通信エラーが発生しました"); });
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0e1a", color:"white" }}>
      {status === "loading" ? (
        <>
          <div style={{ width:48, height:48, border:"4px solid #374151", borderTop:"4px solid #10b981", borderRadius:"50%", animation:"spin 1s linear infinite", marginBottom:16 }} />
          <p style={{ fontSize:16, color:"#9ca3af" }}>{msg}</p>
        </>
      ) : (
        <>
          <p style={{ fontSize:20, color:"#ef4444", marginBottom:16 }}>エラー</p>
          <p style={{ fontSize:14, color:"#9ca3af", marginBottom:24 }}>{msg}</p>
          <button onClick={() => router.push("/login")} style={{ padding:"10px 24px", background:"#10b981", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:14 }}>
            ログインページへ
          </button>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
