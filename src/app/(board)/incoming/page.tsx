import type { Metadata } from "next";
import { IncomingRequests } from "@/components/incoming-requests";

export const metadata: Metadata = { title: "Incoming requests · LendLoop" };

export default function IncomingPage() {
  return <IncomingRequests />;
}
