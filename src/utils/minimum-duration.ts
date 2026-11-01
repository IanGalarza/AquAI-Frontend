//
// Ejecuta una solicitud y espera, si hace falta, hasta cumplir una duración mínima.
//
export async function withMinimumDuration<T>(
  request: () => Promise<T>,
  minimumMs: number,
  signal: AbortSignal,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await request();
  } finally {
    const remainingMs = minimumMs - (performance.now() - startedAt);
    if (remainingMs > 0 && !signal.aborted) {
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          clearTimeout(timer);
          reject(signal.reason);
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, remainingMs);
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
  }
}
