"use client";

import { useCallback, useState } from "react";
import { getErrorMessage } from "./format";

export function usePendingAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = useCallback(async (action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, error, attempt };
}
