import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SidebarWrapper from "@/components/SidebarWrapper";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:       "KEIEI-AI | 経営者支援AIシステム",
  description: "LangGraph + FastAPI による経営者支援AIシステム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={geist.className}>
        <div className="flex min-h-screen">
          <SidebarWrapper />
          <main className="flex-1 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}