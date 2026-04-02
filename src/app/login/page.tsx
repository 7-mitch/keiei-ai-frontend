"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState("");
  const [passError,   setPassError]   = useState("");
  const [loading,     setLoading]     = useState(false);

  // パスワードバリデーション
  const validatePassword = (value: string) => {
    if (value.length === 0) {
      setPassError("");
      return;
    }
    if (value.length < 8) {
      setPassError("8文字以上で入力してください");
    } else if (value.length > 20) {
      setPassError("20文字以内で入力してください");
    } else if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
      setPassError("英字と数字を両方含めてください");
    } else {
      setPassError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    validatePassword(e.target.value);
  };

  const handleLogin = async () => {
    if (passError) return;
    setLoading(true);
    setError("");
    try {
      await authApi.login(email, password);
      router.push("/dashboard");
    } catch {
      setError("メールまたはパスワードが間違っています");
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
            経営者支援AIシステム
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* メールアドレス */}
          <div>
            <label className="text-sm font-medium">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* パスワード */}
          <div>
            <label className="text-sm font-medium">パスワード</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              8〜20文字・英字と数字を含む
            </p>
            <div className="relative mt-1">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="パスワードを入力"
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                  passError
                    ? "border-red-400 focus:ring-red-400"
                    : "focus:ring-blue-500"
                }`}
              />
              {/* 👁 表示トグルボタン */}
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPass ? (
                  // 目を閉じるアイコン
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  // 目を開くアイコン
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {/* バリデーションエラー */}
            {passError && (
              <p className="text-red-500 text-xs mt-1">{passError}</p>
            )}
          </div>

          {/* ログインエラー */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading || !!passError}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            初めてご利用の方は
            <a href="/setup" className="text-blue-500 ml-1">初期セットアップ</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}