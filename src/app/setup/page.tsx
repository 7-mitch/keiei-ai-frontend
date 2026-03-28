"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  const router = useRouter();
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const handleSetup = async () => {
    if (!name || !email || !password) {
      setError("全ての項目を入力してください");
      return;
    }
    if (password !== password2) {
      setError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/setup", { name, email, password, role: "executive" });
      alert("セットアップが完了しました。ログインしてください。");
      router.push("/login");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "セットアップに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">KEIEI-AI</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            初期セットアップ
          </p>
          <p className="text-center text-xs text-muted-foreground mt-1">
            管理者アカウントを作成してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">お名前</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：経営者"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例：ceo@example.com"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium">パスワード（8文字以上）</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium">パスワード（確認）</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <Button
            className="w-full"
            onClick={handleSetup}
            disabled={loading}
          >
            {loading ? "セットアップ中..." : "セットアップ開始"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            既にアカウントをお持ちの方は
            <a href="/login" className="text-blue-500 ml-1">ログイン</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}