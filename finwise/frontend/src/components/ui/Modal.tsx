"use client";
import { type ReactNode } from "react";
import { X } from "lucide-react";
import s from "./Modal.module.css";

interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: number; }

export function Modal({ open, onClose, title, children, maxWidth = 480 }: ModalProps) {
  if (!open) return null;
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className={s.header}>
          <h3 className={s.title}>{title}</h3>
          <button className={s.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={s.body}>{children}</div>
      </div>
    </div>
  );
}
