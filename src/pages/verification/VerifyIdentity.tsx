import { useVerification } from "@/hooks/useVerification";
import {
  Shield,
  CheckCircle,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import DocumentUpload from "@/components/verification/DocumentUpload";
import VerificationBadge from "@/components/verification/VerificationBadge";
import TrustScore from "@/components/verification/TrustScore";
import PhoneVerification from "@/components/verification/PhoneVerification";
import { getVerificationProgress } from "../../lib/verification";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const VerifyIdentity = () => {
  const { toast } = useToast();
  const {
    profile,
    loading,
    uploading,
    uploadVerificationDocument,
    fetchVerificationProfile,
  } = useVerification();

  const [activeTab, setActiveTab] = useState<string>("overview");
  const identitySectionRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Moved useMemo above all early returns to comply with the Rules of Hooks
  const hasAnyVerification = useMemo(() => {
    if (!profile) return false;
    return (
      profile.identityVerified ||
      profile.phoneVerified ||
      profile.emailVerified ||
      profile.addressVerified
    );
  }, [profile]);

  const handleUpload = async (
    file: File,
    type: "identity" | "phone" | "email" | "address"
  ) => {
    try {
      await uploadVerificationDocument(file, type);
      await fetchVerificationProfile();
      toast({
        title: "Document uploaded successfully",
        description: "Your verification document is being reviewed.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneVerify = async (_phoneNumber: string, code: string) => {
    // Simulate verification (in production, this would call an API)
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Demo: accept code "123456"
        if (code === "123456") {
          // Refresh profile to update phoneVerified status
          fetchVerificationProfile()
            .then(() => {
              toast({
                title: "Phone verified successfully",
                description: "Your phone number has been verified.",
              });
              resolve();
            })
            .catch((error) => {
              toast({
                title: "Verification incomplete",
                description:
                  "Phone verified but profile refresh failed. Please reload the page.",
                variant: "destructive",
              });
              reject(error);
            });
        } else {
          reject(new Error("Invalid verification code. Try 123456 for demo."));
        }
      }, 1500);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">
            Loading verification status...
          </p>
        </div>
      </div>
    );
  }

  const progress = profile ? getVerificationProgress(profile) : 0;

  const handleClickVerifyNow = () => {
    setActiveTab("identity");
    setTimeout(() => {
      const el = identitySectionRef.current;
      if (el && el instanceof HTMLElement) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "start",
        });
        el.focus({ preventScroll: true });
      }
    }, 50);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link
          to="/renter/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Verify Your Identity
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Increase your trust score and access more rental opportunities by
            completing verification
          </p>
        </div>

        {/* High-Emphasis Banner for 0% progress and no uploads */}
        {progress === 0 && !hasAnyVerification && (
          <Card className="border-destructive/40 bg-destructive/5 ring-1 ring-destructive/20">
            <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-base font-semibold text-destructive">
                    Complete your verification
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your account is unverified (0%). Verify now to start renting
                    safely.
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                size="lg"
                className="font-semibold shadow-lg ring-2 ring-primary/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                aria-label="Verify now"
                onClick={handleClickVerifyNow}
                data-testid="verify-now-banner"
              >
                Verify now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overall Progress Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Progress</CardTitle>
                <CardDescription>
                  Complete all verifications to maximize your trust
                </CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Why Verify Your Identity?</DialogTitle>
                    <DialogDescription>
                      Verification helps build trust in our community and
                      provides several benefits.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-1">For Renters:</h4>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Instant booking confirmation</li>
                        <li>Access to premium equipment</li>
                        <li>Build credibility with equipment owners</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">
                        Privacy & Security:
                      </h4>
                      <p className="text-muted-foreground">
                        Your documents are encrypted and only used for
                        verification. They are never shared with other users.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold text-foreground">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Identity</span>
                </div>
                <VerificationBadge
                  status={profile?.identityVerified ? "verified" : "unverified"}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Email</span>
                </div>
                <VerificationBadge
                  status={profile?.emailVerified ? "verified" : "unverified"}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Phone</span>
                </div>
                <VerificationBadge
                  status={profile?.phoneVerified ? "verified" : "unverified"}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Address</span>
                </div>
                <VerificationBadge
                  status={profile?.addressVerified ? "verified" : "unverified"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Score */}
        {profile && <TrustScore score={profile.trustScore} />}

        {/* Tabs for Verification Steps */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="identity">
              <Shield className="h-4 w-4 mr-2" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="phone">
              <Phone className="h-4 w-4 mr-2" />
              Phone
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Verifications</CardTitle>
                <CardDescription>
                  Choose a verification method to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div
                    className={`p-4 border-2 rounded-lg ${
                      !profile?.identityVerified
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">
                            Identity Verification
                          </h3>
                          {profile?.identityVerified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload a government-issued ID (Driver's License,
                          Passport, or State ID)
                        </p>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="font-medium"
                        aria-label="Verify identity now"
                        onClick={handleClickVerifyNow}
                      >
                        Verify now
                      </Button>
                    </div>
                    {!profile?.identityVerified && (
                      <p className="text-xs text-primary font-medium mt-3">
                        Recommended • Adds +30 points to Trust Score
                      </p>
                    )}
                  </div>

                  <div
                    className={`p-4 border-2 rounded-lg ${
                      !profile?.phoneVerified
                        ? "border-border"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Phone Verification</h3>
                          {profile?.phoneVerified && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Verify your phone number via SMS for better security
                        </p>
                      </div>
                    </div>
                    {!profile?.phoneVerified && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Quick verification • Takes less than 2 minutes
                      </p>
                    )}
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Pro tip:</strong> Complete all verifications to
                    unlock premium features and get instant booking
                    confirmation.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent
            value="identity"
            className="space-y-4 mt-6"
            ref={identitySectionRef}
          >
            <Card>
              <CardHeader>
                <CardTitle>Identity Verification</CardTitle>
                <CardDescription>
                  Upload a clear photo of your government-issued ID
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile?.identityVerified ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Identity Verified!</strong> Your identity has been
                      successfully verified.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <DocumentUpload
                      type="identity"
                      onUpload={handleUpload}
                      isUploading={uploading}
                    />

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">
                        Accepted Documents:
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
                          <span>Driver's License (front and back)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
                          <span>Passport (photo page)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-primary" />
                          <span>State-issued ID card</span>
                        </li>
                      </ul>
                    </div>

                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Your privacy matters:</strong> Your documents
                        are encrypted and only used for verification. They are
                        never shared with other users.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-6">
            {profile?.phoneVerified ? (
              <Card>
                <CardHeader>
                  <CardTitle>Phone Verification</CardTitle>
                  <CardDescription>
                    Your phone number has been verified
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Phone Verified!</strong> Your phone number has
                      been successfully verified.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Phone Verification</CardTitle>
                    <CardDescription>
                      Verify your phone number to enhance account security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Phone verification helps secure your account and allows
                      owners to contact you directly about bookings.
                    </p>
                  </CardContent>
                </Card>

                <PhoneVerification
                  onVerify={handlePhoneVerify}
                  isVerifying={uploading}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default VerifyIdentity;
