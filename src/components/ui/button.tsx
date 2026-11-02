import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-ink text-white shadow-card hover:bg-ink/88",
  accent: "bg-moss text-white shadow-card hover:bg-moss/90",
  secondary:
    "border border-line bg-surface text-ink shadow-card hover:border-ink/20 hover:bg-sand/50",
  ghost: "text-ink/65 hover:bg-sand hover:text-ink",
  danger: "text-rust hover:bg-rust-soft",
} as const;

const sizes = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
  icon: "size-8",
} as const;

export type ButtonStyle = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyle = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 select-none active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-moss/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none",
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyle;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
