"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";

const links = [
  { href: "/tools", label: "All tools" },
  { href: "/listings", label: "My listings" },
  { href: "/requests", label: "My requests" },
  { href: "/incoming", label: "Incoming" },
];

export function BoardNav() {
  const pathname = usePathname();
  const me = useQuery(api.users.me);
  const items =
    me?.role === "admin"
      ? [...links, { href: "/admin", label: "Admin" }]
      : links;

  return (
    <nav className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "border-ink font-medium text-ink"
                : "border-transparent text-ink/60 hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
