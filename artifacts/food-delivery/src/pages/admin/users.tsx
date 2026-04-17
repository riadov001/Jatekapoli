import { useLocation } from "wouter";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUsers, useUpdateUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const roleColors: Record<string, string> = {
  customer: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  driver: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  restaurant_owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function AdminUsersPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: users, isLoading, refetch } = useListUsers();
  const updateUser = useUpdateUser();

  const toggleActive = (id: number, currentActive: boolean) => {
    updateUser.mutate({ id, data: { isActive: !currentActive } }, {
      onSuccess: () => {
        toast({ title: `User ${!currentActive ? "activated" : "deactivated"}` });
        refetch();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/admin/dashboard")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-display font-bold text-xl">Manage Users</h1>
          <p className="text-muted-foreground text-sm">{users?.length ?? 0} total users</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Points</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            ) : (users ?? []).map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0" data-testid={`row-user-${user.id}`}>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <Badge className={`text-xs border-0 ${roleColors[user.role] || ""}`}>{user.role}</Badge>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{user.loyaltyPoints}</td>
                <td className="px-4 py-3">
                  <Badge className={`text-xs border-0 ${user.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleActive(user.id, user.isActive)}
                    data-testid={`button-toggle-user-${user.id}`}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
