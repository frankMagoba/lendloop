"use client";

import { SignInButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HomeCallToAction() {
  return (
    <>
      <AuthLoading>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-sand" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton mode="modal" forceRedirectUrl="/tools">
          <Button>Sign in to lend or borrow</Button>
        </SignInButton>
      </Unauthenticated>
      <Authenticated>
        <Link
          href="/tools"
          className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-paper hover:bg-ink/85"
        >
          Go to the board
        </Link>
      </Authenticated>
    </>
  );
}
