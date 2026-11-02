"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Inbox, PackageCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { usePendingAction } from "@/lib/use-pending-action";
import { useAccountReady } from "@/components/account";
import { LoanCard, LoanSection } from "@/components/loan-card";
import { Person } from "@/components/person";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { FormError } from "@/components/ui/field";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui/states";

export function IncomingRequests() {
  const ready = useAccountReady();
  const loans = useQuery(api.loans.incoming, ready ? {} : "skip");
  const approve = useMutation(api.loans.approve);
  const decline = useMutation(api.loans.decline);
  const markReturned = useMutation(api.loans.markReturned);
  const { pending, error, run } = usePendingAction();
  const [confirm, confirmDialog] = useConfirm();

  const waiting = loans?.filter((loan) => loan.status === "pending") ?? [];
  const lent = loans?.filter((loan) => loan.status === "approved") ?? [];
  const history =
    loans?.filter(
      (loan) => loan.status !== "pending" && loan.status !== "approved",
    ) ?? [];

  return (
    <>
      <PageHeader
        title="Incoming requests"
        description="Neighbours asking to borrow your tools."
      />
      <FormError message={error} />

      {loans === undefined ? (
        <LoadingCards count={2} columns={1} />
      ) : loans.length === 0 ? (
        <EmptyState icon={Inbox} title="No requests yet">
          When someone asks to borrow one of your tools, it shows up here.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <LoanSection
            title="Waiting for you"
            loans={waiting}
            render={(loan) => (
              <LoanCard
                key={loan._id}
                loan={loan}
                person={
                  <Person
                    prefix="asked by"
                    firstName={loan.borrower.firstName}
                  />
                }
                actions={
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        confirm({
                          title: `Decline ${loan.borrower.firstName}'s request?`,
                          description: `They get an email saying you can't lend the ${loan.tool.name} for those dates.`,
                          confirmLabel: "Decline",
                          destructive: true,
                          action: () => decline({ loanId: loan._id }),
                        })
                      }
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="accent"
                      disabled={pending}
                      onClick={() => run(() => approve({ loanId: loan._id }))}
                    >
                      <Check aria-hidden />
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
                person={
                  <Person prefix="with" firstName={loan.borrower.firstName} />
                }
                actions={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      confirm({
                        title: `Is the ${loan.tool.name} back with you?`,
                        description: `This closes the loan and emails ${loan.borrower.firstName} a confirmation.`,
                        confirmLabel: "Mark returned",
                        action: () => markReturned({ loanId: loan._id }),
                      })
                    }
                  >
                    <PackageCheck aria-hidden />
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
                person={<Person firstName={loan.borrower.firstName} />}
              />
            )}
          />
        </div>
      )}
      {confirmDialog}
    </>
  );
}
