import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Loader2, Package, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/payment";
import { formatDateLabel } from "@/lib/format";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Partial types for dashboard list views (only columns we select)
type UserListItem = Pick<ProfileRow, "id" | "email" | "role" | "created_at">;
type EquipmentListItem = {
  id: string;
  title: string;
  is_available: boolean | null;
  location: string;
  created_at: string | null;
  owner: { email: string; role: ProfileRow["role"] } | null;
};
type PaymentListItem = {
  id: string;
  owner_id: string;
  renter_id: string;
  payout_status: string;
  owner_payout_amount: number;
  total_amount: number;
  payout_processed_at: string | null;
  created_at: string | null;
  owner: { email: string } | null;
  renter: { email: string } | null;
};

type SummaryStats = {
  totalUsers: number;
  totalListings: number;
  pendingPayouts: number;
};

type AdminData = {
  summary: SummaryStats;
  users: UserListItem[];
  listings: EquipmentListItem[];
  payouts: PaymentListItem[];
};

async function fetchAdminData(): Promise<AdminData> {
  const [userCount, listingCount, pendingPayoutCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .throwOnError(),
    supabase
      .from("equipment")
      .select("*", { count: "exact", head: true })
      .throwOnError(),
    supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("payout_status", "pending")
      .throwOnError(),
  ]);

  const [{ data: userRows }, { data: equipmentRows }, { data: payoutRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,role,created_at")
        .order("created_at", { ascending: false })
        .throwOnError(),
      supabase
        .from("equipment")
        .select(
          "id,title,is_available,location,created_at,owner:owner_id(email,role)"
        )
        .order("created_at", { ascending: false })
        .limit(50)
        .throwOnError(),
      supabase
        .from("payments")
        .select(
          "id,owner_id,renter_id,payout_status,owner_payout_amount,total_amount,payout_processed_at,created_at,owner:owner_id(email),renter:renter_id(email)"
        )
        .order("created_at", { ascending: false })
        .limit(50)
        .throwOnError(),
    ]);

  return {
    summary: {
      totalUsers: userCount.count ?? 0,
      totalListings: listingCount.count ?? 0,
      pendingPayouts: pendingPayoutCount.count ?? 0,
    },
    users: userRows || [],
    listings: equipmentRows || [],
    payouts: payoutRows || [],
  };
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentUserId = user?.id;
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: fetchAdminData,
    staleTime: 5 * 60 * 1000,
  });

  const summary = data?.summary ?? { totalUsers: 0, totalListings: 0, pendingPayouts: 0 };
  const users = data?.users ?? [];
  const listings = data?.listings ?? [];
  const payouts = data?.payouts ?? [];

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.toLowerCase();
    return users.filter((profile) =>
      profile.email?.toLowerCase().includes(query)
    );
  }, [search, users]);

  const adminCount = useMemo(
    () => users.filter((profile) => profile.role === "admin").length,
    [users]
  );

  const canChangeRole = useCallback(
    (targetUserId: string, newRole: ProfileRow["role"]) => {
      const targetUser = users.find((profile) => profile.id === targetUserId);
      if (!targetUser) return false;

      const isCurrentUserTarget = targetUserId === currentUserId;
      const isTargetCurrentlyAdmin = targetUser.role === "admin";
      const isDemotion = isTargetCurrentlyAdmin && newRole !== "admin";

      // Prevent self-demotion
      if (isCurrentUserTarget && isDemotion) {
        return false;
      }

      // Prevent demoting the last admin
      if (isDemotion && adminCount <= 1) {
        return false;
      }

      return true;
    },
    [users, currentUserId, adminCount]
  );

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: ProfileRow["role"] }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "Role updated", description: "User role updated successfully." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update role",
        description: error.message,
      });
    },
  });

  const updateUserRole = (id: string, role: ProfileRow["role"]) => {
    if (!canChangeRole(id, role)) {
      const targetUser = users.find((profile) => profile.id === id);
      const isSelf = id === currentUserId;

      toast({
        variant: "destructive",
        title: "Cannot change role",
        description: isSelf
          ? "You cannot demote yourself. Ask another admin to change your role."
          : targetUser?.role === "admin" && adminCount <= 1
            ? "Cannot demote the last admin. Promote another user to admin first."
            : "Role change not permitted.",
      });
      return;
    }

    updateRoleMutation.mutate({ id, role });
  };

  const toggleListingMutation = useMutation({
    mutationFn: async ({ id, newAvailability }: { id: string; newAvailability: boolean }) => {
      const { error } = await supabase
        .from("equipment")
        .update({ is_available: newAvailability })
        .eq("id", id);
      if (error) throw error;
      return newAvailability;
    },
    onSuccess: (newAvailability) => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({
        title: "Listing updated",
        description: `Listing marked as ${newAvailability ? "active" : "inactive"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update listing",
        description: error.message,
      });
    },
  });

  const toggleListingAvailability = (id: string, current: boolean) => {
    toggleListingMutation.mutate({ id, newAvailability: !current });
  };

  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, payout_status }: { id: string; payout_status: string }) => {
      // Let the database handle the timestamp via trigger or default
      const { error } = await supabase
        .from("payments")
        .update({ payout_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast({ title: "Payout updated", description: "Payout status changed." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update payout",
        description: error.message,
      });
    },
  });

  const updatePayoutStatus = (id: string, payout_status: string) => {
    updatePayoutMutation.mutate({ id, payout_status });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-destructive">Failed to load admin data</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong"}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Secure admin workspace</p>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            Admin Access
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalUsers}</p>
              <p className="text-sm text-muted-foreground">Profiles in the system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Listings</CardTitle>
              <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalListings}</p>
              <p className="text-sm text-muted-foreground">Equipment records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending payouts</CardTitle>
              <Banknote className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.pendingPayouts}</p>
              <p className="text-sm text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>User management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Promote owners, add admins, and review account creation dates.
              </p>
            </div>
            <Input
              placeholder="Search by email"
              aria-label="Search users by email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-60"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.email}</TableCell>
                    <TableCell className="capitalize">{profile.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateLabel(profile.created_at ?? null)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(profile.id, "renter")}
                        disabled={
                          profile.role === "renter" ||
                          !canChangeRole(profile.id, "renter")
                        }
                      >
                        Set renter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateUserRole(profile.id, "owner")}
                        disabled={
                          profile.role === "owner" ||
                          !canChangeRole(profile.id, "owner")
                        }
                      >
                        Set owner
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateUserRole(profile.id, "admin")}
                        disabled={profile.role === "admin"}
                      >
                        Grant admin
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listing moderation</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quickly disable problematic equipment or re-enable approved items.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">{listing.title}</TableCell>
                    <TableCell>{listing.owner?.email ?? "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant={listing.is_available ? "outline" : "secondary"}>
                        {listing.is_available ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {listing.location || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={listing.is_available ? "outline" : "default"}
                        size="sm"
                        onClick={() =>
                          toggleListingAvailability(
                            listing.id,
                            Boolean(listing.is_available)
                          )
                        }
                      >
                        {listing.is_available ? "Disable" : "Enable"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payouts</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track owner payouts and mark them processed when funds are released.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
                  <TableHead>Renter</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.owner?.email ?? "-"}</TableCell>
                    <TableCell>{payment.renter?.email ?? "-"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatCurrency(payment.owner_payout_amount)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(payment.total_amount)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.payout_status === "completed"
                            ? "secondary"
                            : payment.payout_status === "failed"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {payment.payout_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateLabel(payment.created_at ?? null)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePayoutStatus(payment.id, "processing")}
                        disabled={payment.payout_status === "processing"}
                      >
                        Processing
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updatePayoutStatus(payment.id, "completed")}
                        disabled={payment.payout_status === "completed"}
                      >
                        Mark paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
