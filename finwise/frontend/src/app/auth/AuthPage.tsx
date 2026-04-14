"use client";

import { useState } from "react";
import { Wallet, AlertTriangle, Check, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Card, Input, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { login as loginApi, register as registerApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import styles from "./Auth.module.css";
import { useRouter } from "next/navigation";

export function AuthPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const data = await loginApi(email, password, rememberMe);
        login(data.access_token, rememberMe);
      } else {
        await registerApi({ email, name, password });
        setSuccess("Account created! Logging you in...");
        // Auto-login after registration
        setTimeout(async () => {
          try {
            const data = await loginApi(email, password, rememberMe);
            login(data.access_token, rememberMe);
          } catch {
            setError("Auto-login failed. Please login manually.");
            setIsLogin(true);
          }
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>
            <Wallet size={26} color="#fff" />
          </div>
          <h1 className={styles.logoTitle}>FinWise</h1>
          <p className={styles.logoSub}>Smart personal finance tracking</p>
        </div>

        <Card style={{ padding: 32 }}>
          {/* Tab switcher */}
          <div className={styles.tabs}>
            {["Login", "Register"].map((tab, i) => (
              <button
                key={tab}
                className={cn(styles.tab, (i === 0 ? isLogin : !isLogin) && styles["tab--active"])}
                onClick={() => { setIsLogin(i === 0); setError(""); setSuccess(""); }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div className={cn(styles.alert, styles["alert--error"])}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}
          {success && (
            <div className={cn(styles.alert, styles["alert--success"])}>
              <Check size={15} /> {success}
            </div>
          )}

          {/* Form */}
          <div className={styles.form} onKeyDown={handleKeyDown}>
            {!isLogin && (
              <Input
                label="Name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div className={styles.passwordWrap}>
              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className={styles.eyeBtn} onClick={() => setShowPw(!showPw)} type="button">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {isLogin && (
              <div className={styles.row} style={{ justifyContent: "space-between", alignItems: "center" }}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Remember me
                </label>
                <button
                  className={styles.forgotBtn}
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              loading={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {isLogin ? "Sign in" : "Create account"} <ArrowRight size={16} />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
