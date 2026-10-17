"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setSourceActive } from "../services/backend";
import type { SourceActivation } from "../types/sources";

type ActivationOptions = {
  onSuccess: (source: SourceActivation) => void;
  onError: (error: unknown) => void;
  request?: typeof setSourceActive;
};

export function useSourceActivation({ onSuccess, onError, request = setSourceActive }: ActivationOptions) {
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const controllers = useRef(new Map<string, AbortController>());

  useEffect(() => {
    const active = controllers.current;
    return () => {
      active.forEach((controller) => controller.abort());
      active.clear();
    };
  }, []);

  const toggle = useCallback(async (source: { id: string; isActive: boolean }) => {
    // El lock es inmediato, incluso antes del siguiente render de React.
    if (controllers.current.has(source.id)) return;
    const controller = new AbortController();
    controllers.current.set(source.id, controller);
    const nextActive = !source.isActive;
    setPending((current) => new Set(current).add(source.id));

    try {
      const updated = await request(source.id, nextActive, controller.signal);
      if (!controller.signal.aborted) onSuccess(updated);
    } catch (error) {
      if (!controller.signal.aborted) onError(error);
    } finally {
      if (controllers.current.get(source.id) === controller) controllers.current.delete(source.id);
      if (!controller.signal.aborted) setPending((current) => {
        const next = new Set(current);
        next.delete(source.id);
        return next;
      });
    }
  }, [onSuccess, onError, request]);

  return { pending, toggle };
}
