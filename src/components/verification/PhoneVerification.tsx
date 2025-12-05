import { useState, useRef, useEffect } from "react";
import {
  Phone,
  CheckCircle,
  Loader2,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type PhoneVerificationProps = {
  onVerify?: (phoneNumber: string, code: string) => Promise<void>;
  isVerifying?: boolean;
  className?: string;
};

const PhoneVerification = ({
  onVerify,
  isVerifying = false,
  className,
}: PhoneVerificationProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    const phoneRegex = /^[\d\s\-+()]+$/;
    const digitsOnly = phoneNumber.replace(/\D/g, "");

    if (!phoneNumber) {
      setError("Phone number is required");
      return;
    }

    if (!phoneRegex.test(phoneNumber)) {
      setError("Phone number contains invalid characters");
      return;
    }

    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      setError("Please enter a valid phone number (10-15 digits)");
      return;
    }

    setError(null);
    setSending(true);

    // Simulate sending code
    setTimeout(() => {
      setSending(false);
      setCodeSent(true);
      setCountdown(60);
      // Focus first OTP input
      inputRefs.current[0]?.focus();
    }, 1500);
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    void handleSendCode();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or last input
    const nextEmptyIndex = newOtp.findIndex((digit) => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete verification code");
      return;
    }

    setError(null);
    if (onVerify) {
      try {
        await onVerify(phoneNumber, code);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    }
  };

  const handleBack = () => {
    setCodeSent(false);
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <div className={cn("space-y-4", className)}>
      {!codeSent ? (
        /* Step 1: Enter Phone Number */
        <Card>
          <CardContent className="pt-6 space-y-5">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-2">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Verify Your Phone
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We'll send a 6-digit code to verify your phone number
              </p>
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={sending}
                className="h-12 text-base"
              />
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Send Button */}
            <Button
              onClick={() => void handleSendCode()}
              disabled={sending || !phoneNumber}
              className="w-full h-12"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Step 2: Enter OTP */
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-2">
                  <MessageSquare className="h-7 w-7 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">{phoneNumber}</span>
                </p>
              </div>

              {/* OTP Input */}
              <div className="space-y-3">
                <Label className="sr-only">Verification Code</Label>
                <div
                  className="flex justify-center gap-2 sm:gap-3"
                  onPaste={handleOtpPaste}
                >
                  {otp.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={cn(
                        "w-11 h-14 sm:w-12 sm:h-14 text-center text-xl font-bold",
                        "focus:ring-2 focus:ring-primary focus:border-primary",
                        "transition-all duration-150",
                        digit && "border-primary bg-primary/5"
                      )}
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Tip: You can paste the code directly
                </p>
              </div>

              {/* Error */}
              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Verify Button */}
              <Button
                onClick={() => void handleVerify()}
                disabled={!isOtpComplete || isVerifying}
                className="w-full h-12"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify Phone Number
                  </>
                )}
              </Button>

              {/* Resend & Back */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Change number
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={countdown > 0}
                  className={cn(
                    countdown > 0 && "text-muted-foreground"
                  )}
                >
                  {countdown > 0 ? (
                    <span className="tabular-nums">Resend in {countdown}s</span>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Demo Notice */}
          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Demo Mode:</strong> Use code <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">123456</code> to verify.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;
