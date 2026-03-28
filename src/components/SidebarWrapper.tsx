"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarWrapper() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const links = [
    { href: "/dashboard", label: "📊 ダッシュボード" },
    { href: "/chat",      label: "💬 AIチャット" },
    { href: "/alerts",    label: "🚨 不正アラート" },
    { href: "/fraud",     label: "🔍 不正検知" },
    { href: "/rag",       label: "📚 RAG検索" },
    { href: "/web",       label: "🌐 Web収集" },
    { href: "/collect",   label: "📥 データ収集" },
  ];

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">KEIEI-AI</h1>
        <p className="text-xs text-gray-400">経営者支援AIシステム</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center px-3 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-400">v1.0.0</p>
      </div>
    </aside>
  );
}