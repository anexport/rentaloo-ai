import { Link, useNavigate } from "react-router-dom";
import { Mountain, Users, Shield, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<"owner" | "renter" | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        // Get user role from metadata or profile
        const role = user.user_metadata?.role as "owner" | "renter" | undefined;
        if (role) {
          setUserRole(role);
        }
      }
    };

    fetchUserRole();
  }, [user]);

  const handleDashboardClick = () => {
    if (userRole === "owner") {
      navigate("/owner/dashboard");
    } else if (userRole === "renter") {
      navigate("/renter/dashboard");
    } else {
      // Fallback: try to navigate based on URL or default to renter
      navigate("/renter/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 py-6 border-b border-border">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Mountain className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">RentAloo</h1>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <>
                <ThemeToggle variant="icon" />
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register/renter"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Rent Outdoor Equipment
            <span className="block text-primary">From Local Owners</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Discover and rent high-quality outdoor sports equipment from
            verified owners in your area. From hiking gear to climbing
            equipment, find everything you need for your next adventure.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {user ? (
              <>
                <Link
                  to="/equipment"
                  className="px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
                >
                  Browse Equipment
                </Link>
                <Button
                  onClick={handleDashboardClick}
                  className="px-8 py-4 bg-card text-primary text-lg font-semibold rounded-lg hover:bg-accent transition-colors shadow-lg border-2 border-primary h-auto"
                >
                  Go to Dashboard
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/register/renter"
                  className="px-8 py-4 bg-primary text-primary-foreground text-lg font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-lg"
                >
                  I want to rent equipment
                </Link>
                <Link
                  to="/register/owner"
                  className="px-8 py-4 bg-card text-primary text-lg font-semibold rounded-lg hover:bg-accent transition-colors shadow-lg border-2 border-primary"
                >
                  I want to list my equipment
                </Link>
              </>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-card p-6 rounded-lg shadow-md border border-border">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                Trusted Community
              </h3>
              <p className="text-muted-foreground">
                Connect with verified equipment owners and renters in your local
                outdoor community.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-md border border-border">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                Secure & Safe
              </h3>
              <p className="text-muted-foreground">
                All transactions are protected with secure payments and
                comprehensive insurance coverage.
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-md border border-border">
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">
                Quality Guaranteed
              </h3>
              <p className="text-muted-foreground">
                Every piece of equipment is verified for quality and maintained
                to the highest standards.
              </p>
            </div>
          </div>

          {/* Browse Equipment CTA */}
          <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
            <h3 className="text-2xl font-semibold mb-4 text-card-foreground">
              Ready to start your adventure?
            </h3>
            <p className="text-muted-foreground mb-6">
              Browse available equipment and find the perfect gear for your next
              outdoor activity.
            </p>
            <Link
              to="/equipment"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Browse Equipment
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Mountain className="h-6 w-6 text-foreground" />
            <span className="text-xl font-bold text-foreground">RentAloo</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 RentAloo. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
