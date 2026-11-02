"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/format";
import { LoadingRows } from "@/components/ui/states";

// Board queries need a users row, so hold the page until it exists.
export function AccountGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    storeUser().catch((err) => setError(errorMessage(err)));
  }, [isAuthenticated, storeUser]);

  if (error) {
    return <p className="text-sm text-rust">{error}</p>;
  }
  if (isLoading || !isAuthenticated || !me) {
    return <LoadingRows />;
  }
  return children;
}
