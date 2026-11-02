import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Person({
  firstName,
  trusted = false,
  prefix,
}: {
  firstName: string;
  trusted?: boolean;
  prefix?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-sm text-ink/70">
      <Avatar name={firstName} />
      <span className="truncate">
        {prefix && <span className="text-ink/50">{prefix} </span>}
        {firstName}
      </span>
      {trusted && (
        <Badge tone="blue">
          <ShieldCheck aria-hidden />
          Trusted lender
        </Badge>
      )}
    </span>
  );
}
