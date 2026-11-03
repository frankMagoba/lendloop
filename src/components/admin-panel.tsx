"use client";

import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowRight,
  History,
  Lock,
  ShieldCheck,
  ShieldOff,
  TriangleAlert,
} from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import { formatTimeAgo } from "@/lib/format";
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
        <RecentActivity />
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
  const { pending, error, attempt } = usePendingAction();

  return (
    <Section title="Neighbours">
      <FormError message={error} />
      {users === undefined ? (
        <LoadingCards count={1} columns={1} />
      ) : (
        <ul className={cardClass("divide-y divide-line/70")}>
          {users.map((user) => (
            <li key={user._id} className="flex items-center gap-3 px-5 py-3.5">
              <Avatar name={user.firstName} />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
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
                aria-label={
                  user.trustedLender
                    ? `Remove trusted lender from ${user.firstName}`
                    : `Mark ${user.firstName} as a trusted lender`
                }
                disabled={pending}
                onClick={() =>
                  attempt(() =>
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
                    <span className="hidden sm:inline">Remove trusted</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck aria-hidden />
                    <span className="hidden sm:inline">Mark trusted</span>
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

type AuditEntry = FunctionReturnType<typeof api.admin.auditLog>[number];

function describeAuditEntry({ action, actor, target, detail }: AuditEntry) {
  switch (action) {
    case "loan.requested":
      return `${actor} asked to borrow the ${target}`;
    case "loan.approved":
      return `${actor} approved a loan of the ${target}`;
    case "loan.declined":
      return `${actor} declined a request for the ${target}`;
    case "loan.cancelled":
      return `${actor} cancelled a request for the ${target}`;
    case "loan.returned":
      return `${actor} marked the ${target} returned`;
    case "tool.removed":
      return `${actor} removed the ${target} listing`;
    case "user.trusted_lender_changed":
      return detail === "trusted"
        ? `${actor} marked ${target} as a trusted lender`
        : `${actor} removed ${target}'s trusted lender badge`;
    case "user.role_changed":
      return `${actor} set ${target}'s role to ${detail}`;
  }
}

function RecentActivity() {
  const entries = useQuery(api.admin.auditLog);

  return (
    <Section title="Recent activity">
      {entries === undefined ? (
        <LoadingCards count={1} columns={1} />
      ) : entries.length === 0 ? (
        <EmptyState icon={History} title="Nothing recorded yet" />
      ) : (
        <ul className={cardClass("divide-y divide-line/70 text-sm")}>
          {entries.map((entry) => (
            <li
              key={entry._id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-5 py-3"
            >
              <span>{describeAuditEntry(entry)}</span>
              <span className="text-xs text-ink/45">
                {formatTimeAgo(entry._creationTime)}
              </span>
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
              {formatTimeAgo(failure._creationTime)}
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
