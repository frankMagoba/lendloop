import { HomeCallToAction } from "@/components/home-call-to-action";
import { PublicToolList } from "@/components/public-tool-list";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="pt-8 sm:pt-16">
        <p className="text-sm font-medium text-moss">LendLoop</p>
        <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Borrow what you need. Lend what you don&apos;t.
        </h1>
        <p className="mt-4 max-w-lg text-ink/70">
          A lending board for your street. List the ladder that sits in your
          shed all year, and borrow a tile saw for the weekend instead of buying
          one.
        </p>
        <div className="mt-8">
          <HomeCallToAction />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Available now</h2>
        <p className="mt-1 text-sm text-ink/60">
          Sign in to see who&apos;s lending and to ask for dates.
        </p>
        <div className="mt-4">
          <PublicToolList />
        </div>
      </section>
    </div>
  );
}
