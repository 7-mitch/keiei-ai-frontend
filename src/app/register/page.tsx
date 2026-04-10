"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [passError, setPassError] = useState("");
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);

  const validatePassword = (value: string) => {
    if (value.length === 0) { setPassError(""); return; }
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

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("すべての項目を入力してください");
      return;
    }
    if (passError) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/register", {
        name,
        email,
        password,
        role: "operator",
      });
      router.push("/login");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">新規登録</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            KEIEI-AI アカウントを作成
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* 名前 */}
          <div>
            <label htmlFor="name" className="text-sm font-medium">お名前</label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：山田 太郎"
              autoComplete="name"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* メールアドレス */}
          <div>
            <label htmlFor="email" className="text-sm font-medium">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              autoComplete="email"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* パスワード */}
          <div>
            <label htmlFor="password" className="text-sm font-medium">パスワード</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              8〜20文字・英字と数字を含む
            </p>
            <div className="relative mt-1">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); validatePassword(e.target.value); }}
                placeholder="パスワードを入力"
                autoComplete="new-password"
                className={`w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                  passError ? "border-red-400 focus:ring-red-400" : "focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? "パスワードを隠す" : "パスワードを表示"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPass ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {passError && <p className="text-red-500 text-xs mt-1">{passError}</p>}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            className="w-full"
            onClick={handleRegister}
            disabled={loading || !!passError}
          >
            {loading ? "登録中..." : "アカウントを作成"}
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