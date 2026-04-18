import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-1/3 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (user?.role !== "admin") {
    return (
      <div className="text-center py-16">
        <h1 className="font-display font-bold text-xl mb-2">Access denied</h1>
        <p className="text-muted-foreground text-sm">
          This area is restricted to administrators.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
