import { AccountGate } from "@/components/account-gate";
import { BoardNav } from "@/components/board-nav";

export default function BoardLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <BoardNav />
      <AccountGate>{children}</AccountGate>
    </>
  );
}
