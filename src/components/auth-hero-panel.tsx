import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

function AuthLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img src="/asisa-logo.png" alt="ASISA" className={cn("rounded-md object-contain", className)} />
  );
}

interface AuthHeroPanelProps {
  className?: string;
  compact?: boolean;
}

export function AuthHeroPanel({ className, compact = false }: AuthHeroPanelProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden text-white",
        compact ? "min-h-[200px] p-6" : "p-10",
        className,
      )}
    >
      <img
        src="/asisa-girl-library.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
      />
      <div className="absolute inset-0 bg-evergreen/78" aria-hidden />

      <div className={cn("relative z-10 flex flex-col", compact ? "gap-4" : "h-full justify-between")}>
        <Link to="/dashboard" className="flex items-center gap-2">
          <AuthLogo className={compact ? "h-9 w-9" : "h-10 w-10"} />
          <div className="leading-tight">
            <div className="font-display font-semibold">ASISA</div>
            <div className="text-xs opacity-80">UNILAG</div>
          </div>
        </Link>

        {!compact && (
          <>
            <div>
              <h2 className="font-display text-4xl font-semibold leading-tight text-white">
                Your class, your coursework, your community.
              </h2>
              <p className="mt-4 max-w-md text-sm text-white/85">
                Sign in with your student credentials to access course files, class feeds and ASISA
                announcements.
              </p>
            </div>
            <p className="text-xs text-white/65">
              Department of Actuarial Science & Insurance, University of Lagos.
            </p>
          </>
        )}

        {compact && (
          <p className="max-w-xs text-sm text-white/85">
            Your class, your coursework, your community.
          </p>
        )}
      </div>
    </div>
  );
}
