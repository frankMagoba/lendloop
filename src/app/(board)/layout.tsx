import { AccountProvider } from "@/components/account";
import { BoardNav } from "@/components/board-nav";

export default function BoardLayout({ children }: LayoutProps<"/">) {
  return (
    <AccountProvider>
      <BoardNav />
      {children}
    </AccountProvider>
  );
}
