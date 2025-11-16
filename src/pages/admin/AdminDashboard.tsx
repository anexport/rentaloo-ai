import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Package, BarChart3, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { role } = useUserRole();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Manage users, equipment, bookings, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle>User Management</CardTitle>
            </div>
            <CardDescription>
              Manage renters, owners, and admin accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Users:</span>
                <span className="font-semibold">1,234</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Renters:</span>
                <span className="font-semibold">890</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Owners:</span>
                <span className="font-semibold">344</span>
              </div>
            </div>
            <Link to="/admin/users">
              <Button className="w-full">Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Equipment Management */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              <CardTitle>Equipment</CardTitle>
            </div>
            <CardDescription>
              Monitor and moderate equipment listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Listings:</span>
                <span className="font-semibold">567</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active:</span>
                <span className="font-semibold">489</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Review:</span>
                <span className="font-semibold text-yellow-600">12</span>
              </div>
            </div>
            <Link to="/admin/equipment">
              <Button className="w-full">Manage Equipment</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Analytics */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              <CardTitle>Analytics</CardTitle>
            </div>
            <CardDescription>
              View platform statistics and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Revenue:</span>
                <span className="font-semibold">$45,678</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Bookings:</span>
                <span className="font-semibold">123</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-semibold">2,345</span>
              </div>
            </div>
            <Link to="/admin/analytics">
              <Button className="w-full">View Analytics</Button>
            </Link>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <CardTitle>System Settings</CardTitle>
            </div>
            <CardDescription>
              Configure platform settings and policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/admin/settings">
              <Button className="w-full">Manage Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Role Debug Info (Remove in production) */}
      <Card className="mt-8 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Current Role: <span className="font-semibold">{role}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Remove this card in production
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
