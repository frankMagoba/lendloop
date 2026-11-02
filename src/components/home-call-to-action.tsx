"use client";

import { SignInButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

export function HomeCallToAction() {
  return (
    <>
      <AuthLoading>
        <div className="h-11 w-56 animate-pulse rounded-xl bg-sand" />
      </AuthLoading>
      <Unauthenticated>
        <SignInButton mode="modal" forceRedirectUrl="/tools">
          <Button size="lg">
            Sign in to lend or borrow
            <ArrowRight aria-hidden />
          </Button>
        </SignInButton>
      </Unauthenticated>
      <Authenticated>
        <Link href="/tools" className={buttonClass({ size: "lg" })}>
          Go to the board
          <ArrowRight aria-hidden />
        </Link>
      </Authenticated>
    </>
  );
}

export function AvailableNowHint() {
  return (
    <p className="mt-1 text-sm text-ink/60">
      <Unauthenticated>
        Sign in to see who&apos;s lending and to ask for dates.
      </Unauthenticated>
      <Authenticated>
        Open{" "}
        <Link href="/tools" className="font-medium text-moss underline">
          the board
        </Link>{" "}
        to see who&apos;s lending and to ask for dates.
      </Authenticated>
    </p>
  );
}
