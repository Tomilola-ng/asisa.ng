import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { EXECUTIVES, EXECUTIVES_GROUP_IMAGE } from "@/lib/executives";
import { ArrowLeft } from "react-bootstrap-icons";

export const Route = createFileRoute("/_app/executives")({
  head: () => ({ meta: [{ title: "Executives · ASISA" }] }),
  component: ExecutivesPage,
});

function ExecutivesPage() {
  return (
    <div className="space-y-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 gap-1.5 text-muted-foreground">
          <Link to="/dashboard">
            <ArrowLeft size={14} />
            Home
          </Link>
        </Button>
      </div>

      <section className="overflow-hidden rounded-2xl bg-evergreen">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-14">
            <p className="text-sm font-medium tracking-wide text-lime-cream/90">
              Actuarial Science &amp; Insurance Students&apos; Association
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome to ASISA
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/85 sm:text-base">
              The Actuarial Science and Insurance Students&apos; Association (ASISA) represents
              students of Actuarial Science and Insurance in the Faculty of Management Sciences,
              University of Lagos. Members study risk, insurance, and the actuarial profession.
            </p>
          </div>
          <div className="relative min-h-[220px] md:min-h-full">
            <img
              src={EXECUTIVES_GROUP_IMAGE}
              alt="ASISA executive team"
              className="absolute inset-0 h-full w-full object-cover object-[center_20%]"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
        <div>
          <h2 className="font-display text-2xl font-semibold">Who we are</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            ASISA represents students, supports coursework, and helps people work together on
            professional development.
          </p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">
          Most of us are heading toward actuarial, risk, or insurance careers. We want a place to
          learn from each other and meet people outside lectures.
        </p>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">Meet the executives</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This year&apos;s student executive team for Actuarial Science and Insurance at UNILAG.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl">
          <img
            src={EXECUTIVES_GROUP_IMAGE}
            alt="ASISA executives group photo"
            className="aspect-[16/9] w-full object-cover object-[center_20%] sm:aspect-[21/9]"
          />
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {EXECUTIVES.map((exec) => (
            <li key={exec.id} className="group">
              <article className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-[4/5] overflow-hidden bg-muted">
                  <img
                    src={exec.image}
                    alt={exec.name}
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-0.5 px-3.5 py-3">
                  <h3 className="font-display text-base font-semibold leading-snug">{exec.name}</h3>
                  <p className="text-xs font-medium uppercase tracking-wide text-fern">{exec.role}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
