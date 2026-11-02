"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowRight,
  Lock,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { timeAgo } from "@/lib/format";
import { usePendingAction } from "@/lib/use-pending-action";
import { useAccountReady } from "@/components/account";
import { LoanCard } from "@/components/loan-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui/states";

export function AdminPanel() {
  const ready = useAccountReady();
  const me = useQuery(api.users.me);
  if (!ready || me === undefined) return <LoadingCards columns={1} />;
  if (me?.role !== "admin") {
    return (
      <EmptyState icon={Lock} title="Admins only">
        This page is for admins.
      </EmptyState>
    );
  }
  return (
    <>
      <PageHeader
        title="Admin"
        description="Neighbours, every loan, and automation failures."
      />
      <div className="space-y-10">
        <FailedDeliveries />
        <Neighbours />
        <AllLoans />
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Neighbours() {
  const users = useQuery(api.admin.users);
  const setTrusted = useMutation(api.admin.setTrustedLender);
  const { pending, error, run } = usePendingAction();

  return (
    <Section title="Neighbours">
      <FormError message={error} />
      {users === undefined ? (
        <LoadingCards count={1} columns={1} />
      ) : (
        <ul className={cardClass("divide-y divide-line/70")}>
          {users.map((user) => (
            <li
              key={user._id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <Avatar name={user.firstName} />
                <span className="font-medium">{user.firstName}</span>
                {user.role === "admin" && <Badge>Admin</Badge>}
                {user.trustedLender && (
                  <Badge tone="blue">
                    <ShieldCheck aria-hidden />
                    Trusted lender
                  </Badge>
                )}
                <span className="text-sm text-ink/45">
                  {user.listings} listing{user.listings === 1 ? "" : "s"}
                </span>
              </div>
              <Button
                size="sm"
                variant={user.trustedLender ? "ghost" : "secondary"}
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
                {user.trustedLender ? (
                  <>
                    <ShieldOff aria-hidden />
                    Remove trusted
                  </>
                ) : (
                  <>
                    <ShieldCheck aria-hidden />
                    Mark trusted
                  </>
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function FailedDeliveries() {
  const failures = useQuery(api.admin.failedDeliveries);
  if (!failures || failures.length === 0) return null;

  return (
    <Section title="Notifications that failed">
      <ul className="space-y-2">
        {failures.map((failure) => (
          <li
            key={failure._id}
            className="flex items-start gap-3 rounded-2xl border border-rust/20 bg-rust-soft px-4 py-3 text-sm"
          >
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-rust"
            />
            <div>
              <span className="font-medium">{failure.type}</span> after{" "}
              {failure.attempts} attempt{failure.attempts === 1 ? "" : "s"},{" "}
              {timeAgo(failure._creationTime)}
              {failure.lastError && (
                <span className="block text-ink/60">{failure.lastError}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function AllLoans() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.loans.listAll,
    {},
    { initialNumItems: 20 },
  );

  return (
    <Section title="All loans">
      {status === "LoadingFirstPage" ? (
        <LoadingCards count={2} columns={1} />
      ) : results.length === 0 ? (
        <EmptyState icon={ArrowRight} title="No loans yet" />
      ) : (
        <ul className="space-y-3">
          {results.map((loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              person={
                <span className="flex items-center gap-1.5 text-sm text-ink/65">
                  <Avatar name={loan.owner.firstName} size="sm" />
                  {loan.owner.firstName}
                  <ArrowRight aria-hidden className="size-3.5 text-ink/35" />
                  <Avatar name={loan.borrower.firstName} size="sm" />
                  {loan.borrower.firstName}
                </span>
              }
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
    </Section>
  );
}
