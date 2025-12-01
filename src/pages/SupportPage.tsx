import { LifeBuoy, MessageSquare, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SupportPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Support & Help
            </h1>
            <p className="text-sm text-muted-foreground">
              Get help fast, report an issue, or review your open tickets.
            </p>
          </div>
          <div className="hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LifeBuoy className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Message support
                </CardTitle>
                <CardDescription>
                  Chat with us if something feels off with your booking or listing.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                We respond quickest in Messages.
              </p>
              <Button asChild variant="default">
                <Link to="/messages">Open messages</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Report an issue
                </CardTitle>
                <CardDescription>
                  File a claim for damage or let us know about safety concerns.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Start from your booking to attach details automatically.
              </p>
              <Button asChild variant="outline">
                <Link to="/renter/dashboard?tab=bookings">Go to bookings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SupportPage;
