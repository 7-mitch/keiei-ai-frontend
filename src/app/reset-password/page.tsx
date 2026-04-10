"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email) return;
    setLoading(true);
    // 現在はメール送信未実装のため2秒後に完了画面へ
    await new Promise((r) => setTimeout(r, 2000));
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">📧 メールを送信しました</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{email}</span> に
              パスワードリセット用のリンクを送信しました。
            </p>
            <p className="text-xs text-gray-400">
              メールが届かない場合は、管理者（nvisio@outlook.jp）にお問い合わせください。
            </p>
            <a href="/login" className="block">
              <Button className="w-full" variant="outline">
                ログイン画面に戻る
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">パスワードをリセット</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            登録済みのメールアドレスを入力してください
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          <div>
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="メールアドレスを入力"
              autoComplete="email"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p className="text-xs text-gray-400">
            ※ 現在はメール送信機能準備中です。お急ぎの場合は管理者にお問い合わせください。
          </p>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !email}
          >
            {loading ? "送信中..." : "リセットリンクを送信"}
          </Button>

          <a href="/login" className="block text-center text-xs text-gray-400 hover:text-gray-600">
            ログイン画面に戻る
          </a>
        </CardContent>
      </Card>
    </div>
  );
}