"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { usePendingAction } from "@/lib/use-pending-action";
import { LoanCard, LoanSection } from "@/components/loan-card";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingRows, PageHeader } from "@/components/ui/states";

export function IncomingRequests() {
  const loans = useQuery(api.loans.incoming);
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const { pending, error, run } = usePendingAction();

  const header = (
    <PageHeader
      title="Incoming requests"
      description="Neighbours asking to borrow your tools."
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
          When someone asks to borrow one of your tools, it shows up here.
        </EmptyState>
      </>
    );
  }

  const waiting = loans.filter((loan) => loan.status === "pending");
  const lent = loans.filter((loan) => loan.status === "approved");
  const history = loans.filter(
    (loan) => loan.status !== "pending" && loan.status !== "approved",
  );

  return (
    <>
      {header}
      <FormError message={error} />
      <div className="space-y-8">
        <LoanSection
          title="Waiting for you"
          loans={waiting}
          render={(loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={`asked by ${loan.borrower.firstName}`}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => run(() => decline({ loanId: loan._id }))}
                  >
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => run(() => approve({ loanId: loan._id }))}
                  >
                    Approve
                  </Button>
                </>
              }
            />
          )}
        />
        <LoanSection
          title="Lent out"
          loans={lent}
          render={(loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={`with ${loan.borrower.firstName}`}
              actions={
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => markReturned({ loanId: loan._id }))}
                >
                  Mark returned
                </Button>
              }
            />
          )}
        />
        <LoanSection
          title="History"
          loans={history}
          render={(loan) => (
            <LoanCard
              key={loan._id}
              loan={loan}
              subtitle={`${loan.borrower.firstName}`}
            />
          )}
        />
      </div>
    </>
  );
}
