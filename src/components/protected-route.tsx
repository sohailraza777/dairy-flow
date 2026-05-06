import * as React from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // 1. Professional Loading State (Replaces the debug message)
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium animate-pulse">Syncing with Dairy Hub...</span>
        </div>
      </div>
    );
  }

  // 2. Auth Guard
  if (!user) {
    return <Redirect to="/login" />;
  }

  // 3. Render Dashboard Content
  return <>{children}</>;
}