import type { Metadata } from "next";
import { MyRequests } from "@/components/my-requests";

export const metadata: Metadata = { title: "My requests · LendLoop" };

export default function RequestsPage() {
  return <MyRequests />;
}
