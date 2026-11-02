"use client";

import { SignInButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { Repeat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:outline-none"
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg bg-moss text-white"
          >
            <Repeat className="size-4" />
          </span>
          LendLoop
        </Link>
        <Unauthenticated>
          <SignInButton mode="modal" forceRedirectUrl="/tools">
            <Button size="sm" variant="secondary">
              Sign in
            </Button>
          </SignInButton>
        </Unauthenticated>
        <Authenticated>
          <UserButton />
        </Authenticated>
      </div>
    </header>
  );
}
