"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/cn";

const BOARD_LINKS = [
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
      ? [...BOARD_LINKS, { href: "/admin", label: "Admin" }]
      : BOARD_LINKS;
  const activeLink = useRef<HTMLAnchorElement>(null);

  // On phones the nav scrolls sideways, so bring the current tab into view.
  useEffect(() => {
    activeLink.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname, items.length]);

  return (
    <nav
      aria-label="Board"
      className="mb-8 flex w-fit max-w-full gap-1 overflow-x-auto [scrollbar-width:none] rounded-2xl border border-line bg-surface p-1 shadow-card"
    >
      {items.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            ref={active ? activeLink : undefined}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:outline-none",
              active
                ? "bg-ink font-medium text-white"
                : "text-ink/60 hover:bg-sand hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
