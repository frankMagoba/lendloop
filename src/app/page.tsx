import { BellRing, CalendarCheck, PackagePlus } from "lucide-react";
import {
  AvailableNowHint,
  HomeCallToAction,
} from "@/components/home-call-to-action";
import { PublicToolList } from "@/components/public-tool-list";

const steps = [
  {
    icon: PackagePlus,
    title: "List what you own",
    text: "The ladder in the shed, the tent you use once a year.",
  },
  {
    icon: CalendarCheck,
    title: "Ask for dates",
    text: "Neighbours request a date range and the owner approves.",
  },
  {
    icon: BellRing,
    title: "Get reminders",
    text: "Emails go out when a request changes or a loan runs late.",
  },
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="pt-6 sm:pt-14">
        <p className="inline-flex items-center rounded-full bg-moss-soft px-3 py-1 text-[13px] font-medium text-moss">
          A lending board for your street
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Borrow what you need. Lend what you don&apos;t.
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-ink/65">
          Borrow a tile saw for the weekend instead of buying one, and let the
          ladder in your shed earn its keep.
        </p>
        <div className="mt-8">
          <HomeCallToAction />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3 rounded-2xl bg-sand/60 p-4">
            <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-moss" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-sm text-ink/60">{text}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Available now</h2>
        <AvailableNowHint />
        <div className="mt-4">
          <PublicToolList />
        </div>
      </section>
    </div>
  );
}
