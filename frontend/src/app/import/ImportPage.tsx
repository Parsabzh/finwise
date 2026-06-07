"use client";
import { useRef, useState } from "react";
import { FileUp, Upload, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { Card, Button, Input, Spinner } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { parseCsvImport, commitCsvImport } from "@/lib/api";
import type { ParsedTransaction } from "@/types";
import s from "./Import.module.css";

export function ImportPage() {
  const { token } = useAuth();
  const { categories } = useCategories();
  const fileRef = useRef<HTMLInputElement>(null);

  const [account, setAccount] = useState("");
  const [personName, setPersonName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [rows, setRows] = useState<ParsedTransaction[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const canParse = !!file && !!account.trim() && !!personName.trim();

  const handleParse = async () => {
    if (!token || !file) return;
    setError(""); setDone(null); setParsing(true);
    try {
      const preview = await parseCsvImport(token, file);
      setRows(preview.transactions);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (i: number, patch: Partial<ParsedTransaction>) => {
    setRows(prev => prev ? prev.map((r, idx) => idx === i ? { ...r, ...patch } : r) : prev);
  };
  const removeRow = (i: number) => {
    setRows(prev => prev ? prev.filter((_, idx) => idx !== i) : prev);
  };

  const handleImport = async () => {
    if (!token || !rows || rows.length === 0) return;
    setError(""); setImporting(true);
    try {
      const res = await commitCsvImport(token, { source: account.trim(), person_name: personName.trim(), transactions: rows });
      setDone(res.imported);
      setRows(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Import CSV</h1>
          <p className={s.subtitle}>Upload a bank statement — Gemini extracts &amp; categorizes each transaction</p>
        </div>
      </div>

      <Card className={s.setupCard}>
        <div className={s.formRow}>
          <Input label="Account" placeholder="e.g., ING" value={account} onChange={e => setAccount(e.target.value)} />
          <Input label="Person" placeholder="e.g., Alice" value={personName} onChange={e => setPersonName(e.target.value)} />
        </div>

        <div className={s.dropzone} onClick={() => fileRef.current?.click()}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden
            onChange={e => { setFile(e.target.files?.[0] ?? null); setRows(null); setDone(null); }} />
          <FileUp size={22} />
          <span className={s.dropText}>{file ? file.name : "Click to choose a CSV file"}</span>
        </div>

        <div className={s.actions}>
          <Button variant="indigo" onClick={handleParse} loading={parsing} disabled={!canParse}>
            <Sparkles size={15} /> Parse with Gemini
          </Button>
        </div>

        {error && <p className={s.error}>{error}</p>}
        {done !== null && (
          <p className={s.success}><CheckCircle2 size={15} /> Imported {done} transaction{done === 1 ? "" : "s"} for {personName || "the selected person"}.</p>
        )}
      </Card>

      {parsing && <div className={s.loading}><Spinner /><span>Reading your statement…</span></div>}

      {rows && (
        <Card className={s.previewCard}>
          <div className={s.previewHead}>
            <h2 className={s.previewTitle}>{rows.length} transaction{rows.length === 1 ? "" : "s"} found</h2>
            <Button variant="teal" onClick={handleImport} loading={importing} disabled={rows.length === 0}>
              <Upload size={15} /> Import {rows.length}
            </Button>
          </div>

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Date</th><th>Description</th><th>Type</th><th>Category</th><th className={s.right}>Amount</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className={s.nowrap}>{r.date}</td>
                    <td>{r.description}</td>
                    <td>
                      <select className={s.cell} value={r.type} onChange={e => updateRow(i, { type: e.target.value as ParsedTransaction["type"] })}>
                        <option value="expense">expense</option>
                        <option value="income">income</option>
                      </select>
                    </td>
                    <td>
                      <select className={s.cell} value={r.category} onChange={e => updateRow(i, { category: e.target.value })}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        {!categories.includes(r.category) && <option value={r.category}>{r.category}</option>}
                      </select>
                    </td>
                    <td className={`${s.right} ${s.nowrap} ${r.type === "income" ? s.income : s.expense}`}>
                      {r.type === "income" ? "+" : "-"}€{Number(r.amount).toFixed(2)}
                    </td>
                    <td>
                      <button className={s.removeBtn} onClick={() => removeRow(i)} title="Remove row"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
