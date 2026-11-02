"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/format";
import { FormError } from "@/components/ui/field";

const AccountReady = createContext(false);

// Pages always render so their shell can stream straight away. Only the
// board queries wait, because they need the caller's users row to exist.
export function AccountProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const storeUser = useMutation(api.users.store);
  const me = useQuery(api.users.me, isAuthenticated ? {} : "skip");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    storeUser().catch((err) => setError(errorMessage(err)));
  }, [isAuthenticated, storeUser]);

  return (
    <AccountReady value={!!me}>
      <FormError message={error} />
      {children}
    </AccountReady>
  );
}

export function useAccountReady() {
  return use(AccountReady);
}
