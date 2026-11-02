import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolsBoard } from "@/components/tools-board";
import { LoadingRows, PageHeader } from "@/components/ui/states";

export const metadata: Metadata = { title: "All tools · LendLoop" };

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        title="All tools"
        description="Everything your neighbours are lending."
      />
      <Suspense fallback={<LoadingRows />}>
        <ToolsBoard />
      </Suspense>
    </>
  );
}
