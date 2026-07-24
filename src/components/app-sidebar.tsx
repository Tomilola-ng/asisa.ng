import { Link, useRouterState } from "@tanstack/react-router";
import {
  HouseDoor,
  Book,
  People,
  ChatSquareText,
  Building,
  Mortarboard,
  ShieldLock,
  PersonBadge,
  BoxArrowRight,
  PersonCircle,
} from "react-bootstrap-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";

const primaryNav = [
  { title: "Home", to: "/dashboard", icon: HouseDoor },
  { title: "Courses", to: "/courses", icon: Book },
  { title: "Public feed", to: "/feed", icon: ChatSquareText },
  { title: "Department", to: "/feed/department", icon: Building },
  { title: "My class", to: "/feed/class", icon: Mortarboard },
  { title: "Groups", to: "/groups", icon: People },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-primary-foreground">
            A
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold">ASISA</span>
            <span className="text-xs text-muted-foreground">UNILAG</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Explore</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryNav.map((i) => (
                <SidebarMenuItem key={i.to}>
                  <SidebarMenuButton asChild isActive={isActive(i.to)}>
                    <Link to={i.to} className="flex items-center gap-2">
                      <i.icon size={16} />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === "course_rep" && (
          <SidebarGroup>
            <SidebarGroupLabel>Course rep</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/rep")}>
                    <Link to="/rep" className="flex items-center gap-2">
                      <PersonBadge size={16} />
                      <span>Rep dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {user?.role === "super_admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")}>
                    <Link to="/admin" className="flex items-center gap-2">
                      <ShieldLock size={16} />
                      <span>Super admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/profile")}>
              <Link to="/profile" className="flex items-center gap-2">
                <PersonCircle size={16} />
                <span className="truncate">{user?.fullName ?? "Profile"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <BoxArrowRight size={16} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
