"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, isTransientError } from "../services/api";

type ResourceState<T> = { key: string | null; data: T | null; loading: boolean; error: string | null };

// Una sola solicitud por recurso. El siguiente sondeo se agenda al terminar el anterior.
export function useSourceResource<T>(
  key: string | null,
  request: (signal: AbortSignal) => Promise<T>,
  shouldPoll: (data: T) => boolean,
) {
  const [state, setState] = useState<ResourceState<T>>({ key: null, data: null, loading: true, error: null });
  const [revision, setRevision] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    controllerRef.current?.abort();
    setRevision((current) => current + 1);
  }, []);

  const replace = useCallback((data: T) => {
    controllerRef.current?.abort();
    setState({ key, data, loading: false, error: null });
    setRevision((current) => current + 1);
  }, [key]);

  useEffect(() => {
    if (key === null) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const controller = new AbortController();
    controllerRef.current = controller;

    async function load(initial = false) {
      if (!active || controller.signal.aborted) return;
      if (initial) setState((current) => ({
        key, data: current.key === key ? current.data : null, loading: true, error: null,
      }));
      try {
        const data = await request(controller.signal);
        if (!active || controller.signal.aborted) return;
        failures = 0;
        setState({ key, data, loading: false, error: null });
        if (shouldPoll(data)) timer = setTimeout(() => void load(), 2500);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setState((current) => ({ ...current, key, loading: false, error: errorMessage(error) }));
        if (isTransientError(error)) {
          failures += 1;
          timer = setTimeout(() => void load(), Math.min(2500 * 2 ** Math.min(failures, 3), 15_000));
        }
      }
    }

    void load(true);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, request, shouldPoll, revision]);

  return {
    data: state.key === key ? state.data : null,
    loading: key !== null && (state.key !== key || state.loading),
    error: state.key === key ? state.error : null,
    refresh, replace,
  };
}
