import { v, type Infer } from "convex/values";

export const CATEGORIES = {
  power_tools: "Power tools",
  hand_tools: "Hand tools",
  garden: "Garden",
  kitchen: "Kitchen",
  camping: "Camping",
  cleaning: "Cleaning",
  other: "Other",
} as const;

export const CONDITIONS = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  well_used: "Well used",
} as const;

export type Category = keyof typeof CATEGORIES;
export type Condition = keyof typeof CONDITIONS;

function literalUnion<T extends string>(values: readonly T[]) {
  const [first, second, ...rest] = values.map((value) => v.literal(value));
  return v.union(first, second, ...rest);
}

export const categoryValidator = literalUnion(
  Object.keys(CATEGORIES) as Category[],
);
export const conditionValidator = literalUnion(
  Object.keys(CONDITIONS) as Condition[],
);

export const roleValidator = v.union(v.literal("admin"), v.literal("user"));

export const loanStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("cancelled"),
  v.literal("returned"),
);
export type LoanStatus = Infer<typeof loanStatusValidator>;

export const loanEventTypeValidator = v.union(
  v.literal("loan.requested"),
  v.literal("loan.approved"),
  v.literal("loan.declined"),
  v.literal("loan.cancelled"),
  v.literal("loan.returned"),
);
export type LoanEventType = Infer<typeof loanEventTypeValidator>;

export const automationKindValidator = v.union(
  v.literal("request_notification"),
  v.literal("overdue_reminder"),
);
export type AutomationKind = Infer<typeof automationKindValidator>;

export const automationStatusValidator = v.union(
  v.literal("sent"),
  v.literal("failed"),
);

export const deliveryStatusValidator = v.union(
  v.literal("pending"),
  v.literal("delivered"),
  v.literal("failed"),
  v.literal("skipped"),
);

export const LIMITS = {
  toolName: 60,
  description: 280,
  loanDays: 30,
  openRequestsPerBorrower: 10,
} as const;
