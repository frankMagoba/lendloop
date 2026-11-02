"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { timeAgo } from "@/lib/format";
import { usePendingAction } from "@/lib/use-pending-action";
import { LoanCard } from "@/components/loan-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/states";

export function AdminPanel() {
  const me = useQuery(api.users.me);
  if (me === undefined) return <LoadingRows />;
  if (me?.role !== "admin") {
    return (
      <EmptyState title="Admins only">This page is for admins.</EmptyState>
    );
  }
  return (
    <>
      <PageHeader
        title="Admin"
        description="Neighbours, every loan, and automation failures."
      />
      <div className="space-y-10">
        <Neighbours />
        <FailedDeliveries />
        <AllLoans />
      </div>
    </>
  );
}

function Neighbours() {
  const users = useQuery(api.admin.users);
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const { pending, error, run } = usePendingAction();

  return (
    <section>
      <h2 className="mb-3 font-semibold">Neighbours</h2>
      <FormError message={error} />
      {users === undefined ? (
        <LoadingRows count={2} />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {users.map((user) => (
            <li
              key={user._id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{user.firstName}</span>
                {user.role === "admin" && <Badge>Admin</Badge>}
                {user.trustedLender && (
                  <Badge tone="blue">Trusted Lender</Badge>
                )}
                <span className="text-sm text-ink/50">
                  {user.listings} listing{user.listings === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    setTrusted({
                      userId: user._id,
                      trusted: !user.trustedLender,
                    }),
                  )
                }
              >
                {user.trustedLender ? "Remove trusted" : "Mark trusted"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FailedDeliveries() {
  const failures = useQuery(api.admin.failedDeliveries);
  if (!failures || failures.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-semibold">Notifications that failed</h2>
      <ul className="space-y-2 text-sm">
        {failures.map((failure) => (
          <li
            key={failure._id}
            className="rounded-xl border border-rust/30 bg-rust/5 px-4 py-3"
          >
            <span className="font-medium">{failure.type}</span> after{" "}
            {failure.attempts} attempt{failure.attempts === 1 ? "" : "s"},{" "}
            {timeAgo(failure._creationTime)}
            {failure.lastError && (
              <span className="block text-ink/60">{failure.lastError}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AllLoans() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.loans.listAll,
    {},
    { initialNumItems: 20 },
  );

  return (
    <section>
      <h2 className="mb-3 font-semibold">All loans</h2>
      {status === "LoadingFirstPage" ? (
        <LoadingRows count={2} />
      ) : results.length === 0 ? (
        <EmptyState title="No loans yet" />
      ) : (
        <ul className="space-y-3">
          {results.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={`${loan.owner.firstName} → ${loan.borrower.firstName}`}
            />
          ))}
        </ul>
      )}
      {status === "CanLoadMore" && (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => loadMore(20)}
        >
          Load more
        </Button>
      )}
    </section>
  );
}
