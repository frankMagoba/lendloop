import { cn } from "@/lib/cn";

const AVATAR_TONES = [
  "bg-moss-soft text-moss",
  "bg-sky-soft text-sky-ink",
  "bg-amber-soft text-amber-ink",
  "bg-rust-soft text-rust",
  "bg-sand text-ink/70",
];

function pickAvatarTone(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-semibold uppercase",
        size === "sm" ? "size-5 text-[10px]" : "size-7 text-xs",
        pickAvatarTone(name),
      )}
    >
      {name.charAt(0)}
    </span>
  );
}
