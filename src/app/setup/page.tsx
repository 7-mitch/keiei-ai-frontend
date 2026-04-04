"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [rememberMe,  setRememberMe]  = useState(false);
  const [twoFaCode,   setTwoFaCode]   = useState("");
  const [step,        setStep]        = useState<"login" | "2fa">("login");
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  // 保存されたメールアドレスを復元
  useEffect(() => {
    const saved = localStorage.getItem("keiei_saved_email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.login(email, password);

      // メールアドレスを保存
      if (rememberMe) {
        localStorage.setItem("keiei_saved_email", email);
      } else {
        localStorage.removeItem("keiei_saved_email");
      }

      // 2FA画面へ
      setStep("2fa");
    } catch {
      setError("メールまたはパスワードが間違っています");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFa = async () => {
    if (!twoFaCode || twoFaCode.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }
    setLoading(true);
    setError("");
    try {
      // 2FA検証（将来実装・今は000000でスキップ可能）
      if (twoFaCode === "000000") {
        router.push("/dashboard");
        return;
      }
      setError("認証コードが正しくありません");
    } catch {
      setError("認証に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ show }: { show: boolean }) => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {show ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      ) : (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </>
      )}
    </svg>
  );

  // 2FA画面
  if (step === "2fa") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-center">二段階認証</CardTitle>
            <p className="text-center text-muted-foreground text-sm">
              認証アプリの6桁のコードを入力してください
            </p>
            <p className="text-center text-xs text-gray-400 mt-1">
              ※ 現在はテストモード: 000000 でスキップ可能
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">認証コード（6桁）</label>
              <input
                type="text"
                value={twoFaCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setTwoFaCode(v);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleTwoFa()}
                placeholder="000000"
                maxLength={6}
                className="w-full mt-1 px-3 py-3 border rounded-md text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={handleTwoFa} disabled={loading}>
              {loading ? "確認中..." : "確認"}
            </Button>
            <button
              onClick={() => { setStep("login"); setError(""); setTwoFaCode(""); }}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
            >
              ログイン画面に戻る
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ログイン画面
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-4">
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
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="メールアドレスを入力"
              autoComplete="email"
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* パスワード */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">パスワード</label>
              <a href="/reset-password" className="text-xs text-blue-500 hover:underline">
                パスワードをお忘れですか？
              </a>
            </div>
            <div className="relative mt-1">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="パスワードを入力"
                autoComplete="current-password"
                className="w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                <EyeIcon show={showPass} />
              </button>
            </div>
          </div>

          {/* メールアドレスを保存 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-500"
            />
            <label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
              メールアドレスを保存する
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading}
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