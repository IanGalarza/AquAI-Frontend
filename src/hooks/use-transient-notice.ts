"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Notice = { id: number; message: string; tone: "success" | "error" | "info" };
export const NOTICE_DURATION_MS = 4500;

export function useTransientNotice(duration = NOTICE_DURATION_MS) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const nextId = useRef(0);
  const show = useCallback((message: string, tone: Notice["tone"] = "success") => {
    setNotice({ id: nextId.current++, message, tone });
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (notice === null) return;
    const timer = setTimeout(() => setNotice((current) => current?.id === notice.id ? null : current), duration);
    return () => clearTimeout(timer);
  }, [notice, duration]);

  return { notice, show, dismiss };
}
