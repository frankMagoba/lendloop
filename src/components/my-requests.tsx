"use client";

import { useMutation, useQuery } from "convex/react";
import { HandHelping } from "lucide-react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { useAccountReady } from "@/components/account";
import { LoanCard, LoanSection } from "@/components/loan-card";
import { Person } from "@/components/person";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { EmptyState, LoadingCards, PageHeader } from "@/components/ui/states";

export function MyRequests() {
  const ready = useAccountReady();
  const loans = useQuery(api.loans.myRequests, ready ? {} : "skip");
  const cancel = useMutation(api.loans.cancel);
  const [confirm, confirmDialog] = useConfirm();

  const open =
    loans?.filter(
      (loan) => loan.status === "pending" || loan.status === "approved",
    ) ?? [];
  const past = loans?.filter((loan) => !open.includes(loan)) ?? [];

  return (
    <>
      <PageHeader
        title="My requests"
        description="Things you've asked to borrow."
      />

      {loans === undefined ? (
        <LoadingCards count={2} columns={1} />
      ) : loans.length === 0 ? (
        <EmptyState icon={HandHelping} title="No requests yet">
          <Link href="/tools" className="font-medium text-moss underline">
            Browse the tools
          </Link>{" "}
          your neighbours are lending.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <LoanSection
            title="Open"
            loans={open}
            render={(loan) => (
              <LoanCard
                key={loan._id}
                loan={loan}
                person={
                  <Person
                    prefix="from"
                    firstName={loan.owner.firstName}
                    trusted={loan.owner.trustedLender}
                  />
                }
                actions={
                  loan.status === "pending" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        confirm({
                          title: `Cancel your request for the ${loan.tool.name}?`,
                          description: `${loan.owner.firstName} gets an email saying you withdrew it.`,
                          confirmLabel: "Cancel request",
                          destructive: true,
                          action: () => cancel({ loanId: loan._id }),
                        })
                      }
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
                person={
                  <Person prefix="from" firstName={loan.owner.firstName} />
                }
              />
            )}
          />
        </div>
      )}
      {confirmDialog}
    </>
  );
}
