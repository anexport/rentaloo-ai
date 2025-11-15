import { useState, useRef, useEffect } from "react";
import { Phone, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PhoneVerificationProps {
  onVerify?: (phoneNumber: string, code: string) => Promise<void>;
  isVerifying?: boolean;
}

const PhoneVerification = ({
  onVerify,
  isVerifying = false,
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
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
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
      value = value.slice(0, 1);
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
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

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

  const isOtpComplete = otp.every((digit) => digit !== "");

  return (
    <div className="space-y-6">
      {!codeSent ? (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1"
                  disabled={sending}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send a 6-digit verification code to this number
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => {
                void handleSendCode();
              }}
              disabled={sending || !phoneNumber}
              className="w-full"
              size="lg"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Enter Verification Code
                </h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-foreground">
                    {phoneNumber}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="sr-only">Verification Code</Label>
                <div
                  className="flex justify-center gap-2"
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
                      className="w-12 h-12 text-center text-lg font-semibold"
                      aria-label={`Digit ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => {
                  void handleVerify();
                }}
                disabled={!isOtpComplete || isVerifying}
                className="w-full"
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

              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={countdown > 0}
                  className="text-sm"
                >
                  {countdown > 0 ? (
                    <>Resend code in {countdown}s</>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>

              <button
                onClick={() => {
                  setCodeSent(false);
                  setOtp(["", "", "", "", "", ""]);
                  setError(null);
                }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change phone number
              </button>
            </CardContent>
          </Card>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Demo Mode:</strong> This is a demo interface. In production, you'll receive a real SMS with a verification code.
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default PhoneVerification;

