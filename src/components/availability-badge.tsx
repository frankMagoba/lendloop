import type { Availability } from "@/convex/model/loans";
import { formatDay } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function AvailabilityBadge({
  availability,
}: {
  availability: Availability;
}) {
  if (availability.status === "on_loan") {
    return availability.overdue ? (
      <Badge tone="red" dot>
        Overdue since {formatDay(availability.dueBack)}
      </Badge>
    ) : (
      <Badge tone="amber" dot>
        On loan until {formatDay(availability.dueBack)}
      </Badge>
    );
  }
  return (
    <Badge tone="green" dot>
      {availability.nextBookingFrom
        ? `Free until ${formatDay(availability.nextBookingFrom)}`
        : "Available"}
    </Badge>
  );
}
