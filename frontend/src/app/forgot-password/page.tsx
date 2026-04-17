"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { Input, Button } from "@/components/ui";
import styles from "../auth/Auth.module.css";
import { forgotPassword } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMessage(res.message || "If an account exists, a reset link was sent.");
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
          <h2 style={{ marginBottom: 12 }}>Reset your password</h2>
          <p style={{ marginBottom: 16 }}>
            {"Enter the email address for your account and we'll send a reset link."}
          </p>

          {error && <div className={styles.alert}>{error}</div>}
          {message && <div className={styles.alert}>{message}</div>}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Button onClick={handleSubmit} loading={loading}>
              Send reset link
            </Button>
            <Button variant="secondary" onClick={() => router.push("/")}>Back</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
