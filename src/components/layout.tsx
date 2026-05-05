import * as React from "react";
import { Link, useLocation } from "wouter";
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
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Droplets,
  Users,
  ShoppingCart,
  CreditCard,
  LineChart,
  Activity,
  LogOut,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Command Center", url: "/command-center", icon: Activity },
  { title: "Collections", url: "/collections", icon: Droplets },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Analytics", url: "/analytics", icon: LineChart },
];

function initialsFor(nameOrEmail: string): string {
  const base = nameOrEmail.trim();
  if (!base) return "?";
  if (base.includes("@")) return base[0]!.toUpperCase();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0] + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, role, logout } = useAuth();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = React.useState(false);

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Account";
  const email = user?.email ?? "";
  const initials = initialsFor(user?.displayName || user?.email || "?");

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      toast({ title: "Signed out", description: "See you next time." });
    } catch {
      toast({
        title: "Couldn't sign out",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        
        {/* ADDED: bg-muted/40 and border-r for a clean visual separation */}
        <Sidebar variant="inset" className="bg-muted/40 border-r shadow-sm">
          <SidebarHeader className="h-16 flex items-center justify-center px-4 border-b bg-transparent">
            <span className="text-xl font-bold text-primary flex items-center gap-2 w-full">
              <Droplets className="h-6 w-6" />
              Dairy Flow
            </span>
          </SidebarHeader>
          <SidebarContent className="bg-transparent">
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={location === item.url}>
                        <Link href={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t p-4 bg-transparent">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-sm min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate" data-testid="text-user-name">
                    {displayName}
                  </span>
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px] uppercase tracking-wide"
                    data-testid="badge-user-role"
                  >
                    {role}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                  {email}
                </span>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-4 px-6 border-b shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 sticky top-0">
            <SidebarTrigger />
            <div className="flex-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 px-2"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium truncate">{displayName}</span>
                    <span className="text-xs text-muted-foreground truncate">{email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={signingOut}
                  data-testid="button-sign-out"
                  className="text-rose-600 focus:text-rose-700"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <div className="mx-auto max-w-6xl w-full h-full">{children}</div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}