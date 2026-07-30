import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

interface LoginGateFadeProps {
  title: string;
  description?: string;
  message?: string;
  /** Kept for API compatibility — layout is illustration-first for all variants */
  variant?: "feed" | "courses" | "generic";
}

export function LoginGateFade({
  title,
  description,
  message = "You need to be logged in to get access to this section.",
}: LoginGateFadeProps) {
  return (
    <section className={title || description ? "space-y-3" : ""}>
      {(title || description) && (
        <div>
          {title ? <h2 className="font-display text-xl font-semibold">{title}</h2> : null}
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-muted/30">
        <div className="flex flex-col items-center px-6 py-8 text-center sm:px-10 sm:py-10">
          <img
            src="/asisa-girl-access-denied.png"
            alt=""
            className="h-auto w-full max-w-[140px] object-contain sm:max-w-[160px]"
          />
          <p className="mt-4 max-w-md font-medium">{message}</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            Sign in or create a free ASISA account to continue.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link to="/auth" search={{ mode: "signin" }}>
                Log in
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth" search={{ mode: "signup" }}>
                Create account
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export const GUEST_COURSE_LIMIT = 3;
