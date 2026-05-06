"use client";
import dynamic from "next/dynamic";

const AutoLoginContent = dynamic(() => import("./AutoLoginContent"), {
  ssr: false,
  loading: () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0e1a", color:"white" }}>
      <p style={{ color:"#9ca3af" }}>読み込み中...</p>
    </div>
  ),
});

export default function AutoLoginPage() {
  return <AutoLoginContent />;
}
