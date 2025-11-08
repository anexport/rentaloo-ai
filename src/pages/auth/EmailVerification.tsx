import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MailCheck, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabase";

const EmailVerification = () => {
  const { session } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const user = session?.user;
  
  // Get email from location state (passed from registration) or session
  const email = (location.state as { email?: string })?.email || user?.email;

  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [nextAllowedResend, setNextAllowedResend] = useState<number | null>(null);

  // Clear the throttle when it expires
  useEffect(() => {
    if (nextAllowedResend === null) return;

    const timeRemaining = nextAllowedResend - Date.now();
    if (timeRemaining <= 0) {
      setNextAllowedResend(null);
      return;
    }

    const timer = setTimeout(() => {
      setNextAllowedResend(null);
    }, timeRemaining);

    return () => clearTimeout(timer);
  }, [nextAllowedResend]);

  const handleResend = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "No email found",
        description: "Please sign up again to receive a verification email.",
      });
      return;
    }

    // Throttle resend attempts
    if (nextAllowedResend && Date.now() < nextAllowedResend) {
      const secondsLeft = Math.ceil((nextAllowedResend - Date.now()) / 1000);
      toast({
        variant: "destructive",
        title: "Please wait",
        description: `You can resend the email in ${secondsLeft} seconds.`,
      });
      return;
    }

    setIsSending(true);
    setStatus("idle");
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        toast({
          variant: "destructive",
          title: "Unable to resend",
          description: error.message,
        });
        return;
      }

      setStatus("success");
      setMessage("Verification email resent. Please check your inbox.");
      setNextAllowedResend(Date.now() + 30_000); // 30 second throttle
      toast({
        title: "Email sent",
        description: "We just resent your verification link.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unexpected error";
      setStatus("error");
      setMessage(errorMessage);
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: errorMessage,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" />
          <CardTitle className="text-2xl font-semibold">Verify your e-mail</CardTitle>
          <CardDescription>
            Please check your inbox for a verification link to continue creating your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {email && (
            <Alert>
              <AlertTitle>Sent to {email}</AlertTitle>
              <AlertDescription>
                Didn't get it? Double-check spam or use the button below to resend the link.
              </AlertDescription>
            </Alert>
          )}

          <p className="text-sm text-muted-foreground">
            After verifying your email, you'll be able to access all features of your account.
            Click the verification link in the email we sent you.
          </p>

          {message && (
            <p
              className={`text-sm ${
                status === "error" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {message}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button
            className="w-full"
            disabled={isSending || (nextAllowedResend !== null && Date.now() < nextAllowedResend)}
            onClick={handleResend}
          >
            {isSending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>
          <Button variant="link" asChild className="w-full">
            <Link to="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailVerification;

