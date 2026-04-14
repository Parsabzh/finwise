"use client";

import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <Loader2
      size={size}
      className={className}
      style={{ animation: "spin 1s linear infinite" }}
    />
  );
}
