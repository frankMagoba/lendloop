"use client";

import { useEffect } from "react";
import { errorMessage } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function BoardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-line px-6 py-12 text-center">
      <p className="font-medium">This page couldn&apos;t load</p>
      <p className="mt-2 text-sm text-ink/60">{errorMessage(error)}</p>
      <Button variant="secondary" className="mt-4" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
