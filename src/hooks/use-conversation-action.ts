"use client";

import { useState } from "react";
import { ApiError } from "@/services/api";

//
// Gestiona el estado de carga y error de una acción sobre una conversación.
//
export function useConversationAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "No pudimos comunicarnos con el servicio de conversaciones. Intentá nuevamente.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, setError, run };
}
