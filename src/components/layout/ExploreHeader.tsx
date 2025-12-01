import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu,
  Mountain,
  User,
  Settings,
  LogOut,
  Package,
  Home,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSelector from "@/components/LanguageSelector";
import { toast } from "@/hooks/useToast";

type Props = {
  scrolled?: boolean;
  onLoginClick?: () => void;
  onSignupClick?: () => void;
};

const ExploreHeader = ({
  scrolled: controlledScrolled,
  onLoginClick,
  onSignupClick,
}: Props) => {
  const { t } = useTranslation("navigation");
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (controlledScrolled !== undefined) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [controlledScrolled]);

  const scrolled =
    controlledScrolled !== undefined ? controlledScrolled : isScrolled;

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        console.error("Sign out error:", error);
        toast({
          title: t("errors.signout_failed_title"),
          description: error.message || t("errors.signout_failed_message"),
          variant: "destructive",
        });
        return;
      }
      void navigate("/");
    } catch (err) {
      console.error("Unexpected sign out error:", err);
      const message =
        err instanceof Error ? err.message : t("errors.signout_failed_message");
      toast({
        title: t("errors.signout_failed_title"),
        description: message,
        variant: "destructive",
      });
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200 ${
        scrolled ? "shadow-sm" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Mountain className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">RentAloo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <ThemeToggle variant="icon" />
                <LanguageSelector variant="default" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar>
                        <AvatarImage
                          src={user.user_metadata?.avatar_url || ""}
                          alt={user.email || ""}
                        />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/renter/dashboard"
                        className="flex items-center cursor-pointer"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        {t("menu.dashboard")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/owner/dashboard"
                        className="flex items-center cursor-pointer"
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {t("menu.my_listings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        to="/settings"
                        className="flex items-center cursor-pointer"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        {t("menu.settings")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        void handleSignOut();
                      }}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("menu.sign_out")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <ThemeToggle variant="icon" />
                <LanguageSelector variant="default" />
                <Button variant="ghost" onClick={() => onLoginClick?.()}>
                  {t("auth.sign_in")}
                </Button>
                <Button onClick={() => onSignupClick?.()}>{t("auth.get_started")}</Button>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeToggle variant="icon" />
            <LanguageSelector variant="default" />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("aria.open_menu")}>
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>{t("common:navigation.menu")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-6">
                  {user ? (
                    <>
                      <div className="flex items-center space-x-3 pb-4 border-b">
                        <Avatar>
                          <AvatarImage
                            src={user.user_metadata?.avatar_url || ""}
                            alt={user.email || ""}
                          />
                          <AvatarFallback>{getUserInitials()}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium">{user.email}</div>
                        </div>
                      </div>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/renter/dashboard">
                          <User className="mr-2 h-4 w-4" />
                          {t("menu.dashboard")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/owner/dashboard">
                          <Package className="mr-2 h-4 w-4" />
                          {t("menu.my_listings")}
                        </Link>
                      </Button>
                      <Button variant="ghost" className="justify-start" asChild>
                        <Link to="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          {t("menu.settings")}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          void handleSignOut();
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t("menu.sign_out")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => onLoginClick?.()}
                      >
                        {t("auth.sign_in")}
                      </Button>
                      <Button
                        className="justify-start"
                        onClick={() => onSignupClick?.()}
                      >
                        {t("auth.get_started")}
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ExploreHeader;
