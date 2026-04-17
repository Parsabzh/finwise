"use client";
import { useState } from "react";
import { Wallet, AlertTriangle, Check, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Card, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { login as loginApi, register as registerApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import s from "./Auth.module.css";

export function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (isLogin) {
        const data = await loginApi(email, password);
        login(data.access_token, remember);
      } else {
        await registerApi({ email, name, password });
        setSuccess("Account created! Logging you in...");
        setTimeout(async () => {
          try {
            const data = await loginApi(email, password);
            login(data.access_token, remember);
          } catch { setError("Auto-login failed. Please login manually."); setIsLogin(true); }
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className={s.page}>
      <div className={s.container}>
        <div className={s.logoWrap}>
          <div className={s.logoIcon}><Wallet size={24} color="#fff" /></div>
          <h1 className={s.logoTitle}>FinWise</h1>
          <p className={s.logoSub}>Smart personal finance tracking</p>
        </div>

        <Card style={{ padding: 32, boxShadow: "var(--shadow-md)" }}>
          <div className={s.tabs}>
            {["Sign in", "Create account"].map((tab, i) => (
              <button key={tab} className={cn(s.tab, (i === 0 ? isLogin : !isLogin) && s["tab--active"])}
                onClick={() => { setIsLogin(i === 0); setError(""); setSuccess(""); }}>{tab}</button>
            ))}
          </div>

          {error && <div className={cn(s.alert, s["alert--error"])}><AlertTriangle size={15} /> {error}</div>}
          {success && <div className={cn(s.alert, s["alert--success"])}><Check size={15} /> {success}</div>}

          <div className={s.form} onKeyDown={handleKeyDown}>
            {!isLogin && <Input label="Full Name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}
            <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className={s.passwordWrap}>
              <Input label="Password" type={showPw ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className={s.eyeBtn} onClick={() => setShowPw(!showPw)} type="button">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {isLogin && (
              <div className={s.rememberRow}>
                <label className={s.rememberLabel} onClick={() => setRemember(!remember)}>
                  <div className={cn(s.checkbox, remember && s["checkbox--checked"])}>
                    {remember && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                  Remember me
                </label>
                <button className={s.forgotBtn} type="button">Forgot password?</button>
              </div>
            )}

            <button className={s.submitBtn} onClick={handleSubmit} disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </button>
          </div>

          <div className={s.divider}>
            <div className={s.dividerLine} />
            <span className={s.dividerText}>or continue with</span>
            <div className={s.dividerLine} />
          </div>
          <div className={s.socialRow}>
            {["Google", "GitHub"].map((p) => <button key={p} className={s.socialBtn}>{p}</button>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
