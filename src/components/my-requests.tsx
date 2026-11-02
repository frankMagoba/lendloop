"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { usePendingAction } from "@/lib/use-pending-action";
import { LoanCard, LoanSection } from "@/components/loan-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/states";

export function MyRequests() {
  const loans = useQuery(api.loans.myRequests);
  const cancel = useMutation(api.loans.cancel);
  const { pending, error, run } = usePendingAction();

  const header = (
    <PageHeader
      title="My requests"
      description="Things you've asked to borrow."
    />
  );

  if (loans === undefined) {
    return (
      <>
        {header}
        <LoadingRows />
      </>
    );
  }

  if (loans.length === 0) {
    return (
      <>
        {header}
        <EmptyState title="No requests yet">
          <Link href="/tools" className="underline">
            Browse the tools
          </Link>{" "}
          your neighbours are lending.
        </EmptyState>
      </>
    );
  }

  const open = loans.filter(
    (loan) => loan.status === "pending" || loan.status === "approved",
  );
  const past = loans.filter((loan) => !open.includes(loan));

  return (
    <>
      {header}
      <FormError message={error} />
      <div className="space-y-8">
        <LoanSection
          title="Open"
          loans={open}
          render={(loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={
                <>
                  from {loan.owner.firstName}{" "}
                  {loan.owner.trustedLender && (
                    <Badge tone="blue">Trusted Lender</Badge>
                  )}
                </>
              }
              actions={
                loan.status === "pending" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => cancel({ loanId: loan._id }))}
                  >
                    Cancel request
                  </Button>
                )
              }
            />
          )}
        />
        <LoanSection
          title="Past"
          loans={past}
          render={(loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={`from ${loan.owner.firstName}`}
            />
          )}
        />
      </div>
    </>
  );
}
