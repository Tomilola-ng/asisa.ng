import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PLATFORM_NAME, PLATFORM_NAME_LINES } from "@/lib/brand";
import {
  Book,
  ChatSquareText,
  List,
  ShieldLock,
  PersonBadge,
} from "react-bootstrap-icons";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function profileInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string;
  avatarUrl?: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
        {profileInitials(name || "?")}
      </AvatarFallback>
    </Avatar>
  );
}

function AppLayout() {
  const { user, loading } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const nav = [
    { title: "Courses", to: "/courses", icon: Book },
    { title: "Feed", to: "/feed", icon: ChatSquareText },
  ] as const;

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`);

  const navLinkClass = (to: string) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${
      isActive(to)
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const mobileNavLinkClass = (to: string) =>
    `flex items-center gap-3 border-b border-primary/25 py-4 text-base font-medium transition-colors first:border-t first:border-primary/25 ${
      isActive(to) ? "text-primary" : "text-foreground hover:text-primary"
    }`;

  const mobileAuthLinkClass =
    "flex items-center gap-3 border-b border-primary/25 py-4 text-base font-medium text-foreground transition-colors hover:text-primary";

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const displayName = user?.fullName || "Profile";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 justify-self-start">
            <img
              src="/asisa-logo.png"
              alt={PLATFORM_NAME}
              className="h-8 w-8 shrink-0 rounded-md object-contain"
            />
            <span className="font-display text-xs font-semibold leading-tight">
              {PLATFORM_NAME_LINES.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-0.5 sm:flex">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className={navLinkClass(item.to)}>
                <item.icon size={14} />
                {item.title}
              </Link>
            ))}
            {user && (user.role === "course_rep" || user.role === "super_admin") && (
              <Link to="/rep" className={navLinkClass("/rep")}>
                <PersonBadge size={14} />
                Rep
              </Link>
            )}
            {user?.role === "super_admin" && (
              <Link to="/admin" className={navLinkClass("/admin")}>
                <ShieldLock size={14} />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            {user ? (
              <Button asChild variant="ghost" size="sm" className="hidden gap-2 px-2 sm:inline-flex">
                <Link to="/profile">
                  <UserAvatar
                    name={displayName}
                    avatarUrl={user.avatarUrl}
                    className="h-8 w-8"
                  />
                  <span className="max-w-40 truncate">{displayName}</span>
                </Link>
              </Button>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ mode: "signin" }}>
                    Log in
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create account
                  </Link>
                </Button>
              </div>
            )}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="sm:hidden" aria-label="Open menu">
                  <List size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100vw-2rem,22rem)] px-6">
                <SheetHeader className="pb-2">
                  <SheetTitle className="text-left font-display text-xl">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col">
                  {nav.map((item) => (
                    <Link key={item.to} to={item.to} className={mobileNavLinkClass(item.to)}>
                      <item.icon size={20} />
                      {item.title}
                    </Link>
                  ))}
                  {user ? (
                    <>
                      {(user.role === "course_rep" || user.role === "super_admin") && (
                        <Link to="/rep" className={mobileNavLinkClass("/rep")}>
                          <PersonBadge size={20} />
                          Rep
                        </Link>
                      )}
                      {user.role === "super_admin" && (
                        <Link to="/admin" className={mobileNavLinkClass("/admin")}>
                          <ShieldLock size={20} />
                          Admin
                        </Link>
                      )}
                      <Link to="/profile" className={mobileNavLinkClass("/profile")}>
                        <UserAvatar
                          name={displayName}
                          avatarUrl={user.avatarUrl}
                          className="h-9 w-9"
                        />
                        {displayName}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/auth"
                        search={{ mode: "signin" }}
                        className={mobileAuthLinkClass}
                      >
                        Log in
                      </Link>
                      <Link
                        to="/auth"
                        search={{ mode: "signup" }}
                        className={mobileAuthLinkClass}
                      >
                        Create account
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
