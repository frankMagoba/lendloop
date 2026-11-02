import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin-panel";

export const metadata: Metadata = { title: "Admin · LendLoop" };

export default function AdminPage() {
  return <AdminPanel />;
}
