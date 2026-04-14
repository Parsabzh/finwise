"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Input, Button } from "@/components/ui";
import styles from "../auth/Auth.module.css";
import { resetPassword } from "@/lib/api";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    if (!token) return setError("Missing token");
    if (newPassword.length < 4) return setError("Password too short");
    if (newPassword !== confirm) return setError("Passwords do not match");

    setLoading(true);
    try {
      const res = await resetPassword(token, newPassword);
      setMessage(res.message || "Password reset successfully");
      setTimeout(() => router.push("/"), 1400);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Card style={{ padding: 32 }}>
          <h2 style={{ marginBottom: 12 }}>Choose a new password</h2>
          {error && <div className={styles.alert}>{error}</div>}
          {message && <div className={styles.alert}>{message}</div>}

          {!token && (
            <p style={{ marginBottom: 12 }}>
              No token provided. Use the link we emailed you or paste the token below.
            </p>
          )}

          {!token && (
            <Input label="Token" value={token ?? ""} onChange={(e) => setToken(e.target.value)} />
          )}

          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={handleSubmit} loading={loading}>
              Reset password
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>Back</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
