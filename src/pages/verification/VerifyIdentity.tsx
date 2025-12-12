import { useVerification } from "@/hooks/useVerification";
import {
  Shield,
  CheckCircle,
  ArrowLeft,
  Phone,
  Info,
  Sparkles,
  Lock,
  ChevronRight,
  Clock,
  Users,
  Trophy,
  type LucideIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DocumentUpload from "@/components/verification/DocumentUpload";
import TrustScore from "@/components/verification/TrustScore";
import PhoneVerification from "@/components/verification/PhoneVerification";
import { getVerificationProgress } from "@/lib/verification";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type VerificationStep = "overview" | "identity" | "phone";

type StepConfig = {
  id: VerificationStep;
  label: string;
  icon: LucideIcon;
  description: string;
  points: number;
  duration: string;
};

const VERIFICATION_STEPS: StepConfig[] = [
  {
    id: "identity",
    label: "Identity",
    icon: Shield,
    description: "Upload a government-issued ID",
    points: 30,
    duration: "~2 min",
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    description: "Verify via SMS code",
    points: 10,
    duration: "~30 sec",
  },
];

const VerifyIdentity = () => {
  const { toast } = useToast();
  const {
    profile,
    loading,
    uploading,
    uploadVerificationDocument,
    fetchVerificationProfile,
  } = useVerification();

  const [activeStep, setActiveStep] = useState<VerificationStep>("overview");
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

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
    setIsVerifyingPhone(true);
    try {
      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (code !== "123456") {
        throw new Error("Invalid verification code. Try 123456 for demo.");
      }

      await fetchVerificationProfile();
      toast({
        title: "Phone verified successfully",
        description: "Your phone number has been verified.",
      });
    } catch (error) {
      const isInvalidCode =
        error instanceof Error && error.message.includes("Invalid");
      toast({
        title: isInvalidCode ? "Verification failed" : "Verification incomplete",
        description: isInvalidCode
          ? error.message
          : "Phone verified but profile refresh failed. Please reload the page.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 animate-pulse">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Loading verification status...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = profile ? getVerificationProgress(profile) : 0;
  const completedSteps = VERIFICATION_STEPS.filter(step => 
    step.id === "identity" ? profile?.identityVerified : profile?.phoneVerified
  ).length;
  const totalSteps = VERIFICATION_STEPS.length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">

        {/* Social Proof Banner */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/50">
            <Users className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-300">
              Join 5,000+ verified renters
            </span>
          </div>
        </div>

        {/* Hero Section with Trust Score */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-background to-primary/5 border border-primary/10">
          {/* Animated gradient orbs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary/20 to-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-blue-500/10 to-primary/20 rounded-full blur-2xl animate-pulse delay-700" />
          
          <div className="relative p-6 sm:p-8">
            {/* Header Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              {/* Left: Title */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg shadow-primary/20">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                      Verify Your Identity
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Build trust and unlock premium features
                    </p>
                  </div>
                </div>

                {/* Step Progress Indicator */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    {VERIFICATION_STEPS.map((step, index) => {
                      const isCompleted = step.id === "identity" 
                        ? profile?.identityVerified 
                        : profile?.phoneVerified;
                      const StepIcon = step.icon;
                      
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all",
                            isCompleted 
                              ? "bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-400" 
                              : "bg-muted border-muted-foreground/30"
                          )}>
                            {isCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <StepIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          {index < VERIFICATION_STEPS.length - 1 && (
                            <div className={cn(
                              "w-8 h-0.5 rounded-full",
                              isCompleted ? "bg-green-500" : "bg-muted-foreground/20"
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {completedSteps}/{totalSteps} complete
                  </span>
                </div>
              </div>

              {/* Right: Trust Score Hero */}
              {profile && (
                <div className="flex-shrink-0">
                  <TrustScore score={profile.trustScore} compact className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border" />
                </div>
              )}
            </div>

            {/* Time Estimate Bar */}
            <div className="mt-6 flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Estimated time:</span>
              </div>
              {VERIFICATION_STEPS.map((step) => {
                const isCompleted = step.id === "identity" ? profile?.identityVerified : profile?.phoneVerified;
                return (
                  <div 
                    key={step.id}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs",
                      isCompleted 
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" 
                        : "bg-background text-foreground"
                    )}
                  >
                    {isCompleted && <CheckCircle className="h-3 w-3" />}
                    <span className="font-medium">{step.label}:</span>
                    <span>{step.duration}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Urgent CTA for unverified users */}
        {progress === 0 && !hasAnyVerification && (
          <Card className="border-amber-200/50 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-orange-950/20 overflow-hidden">
            <CardContent className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-orange-200/20 dark:from-amber-800/20 dark:to-orange-800/10 rounded-full blur-2xl -mr-10 -mt-10" />
              
              <div className="relative flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/60 dark:to-amber-900/30 shadow-sm">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    Start your verification journey
                    <span className="text-xs font-normal bg-amber-200/50 dark:bg-amber-800/50 px-2 py-0.5 rounded-full">+40 points</span>
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                    Takes less than 3 minutes to complete both steps
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveStep("identity")}
                className="relative w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Full Width */}
        <div className="space-y-6">
          {activeStep === "overview" ? (
            /* Overview - Step Selection */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Choose Verification Method</CardTitle>
                    <CardDescription>
                      Complete both steps to maximize your trust score
                    </CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Why Verify?</DialogTitle>
                        <DialogDescription>
                          Verification builds trust in our community
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Benefits:</h4>
                          <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Instant booking confirmation
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Access to premium equipment
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Build credibility with owners
                            </li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="flex items-start gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-xs text-muted-foreground">
                              Your documents are encrypted and never shared with other users.
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  {VERIFICATION_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted =
                      step.id === "identity"
                        ? profile?.identityVerified
                        : profile?.phoneVerified;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStep(step.id)}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all group",
                          "hover:border-primary/50 hover:bg-accent/30 hover:scale-[1.02]",
                          isCompleted
                            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                            : "border-border"
                        )}
                      >
                        {/* Step Number Badge */}
                        <div className="absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                          {index + 1}
                        </div>

                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "p-3 rounded-xl transition-all",
                              isCompleted
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-primary/10 group-hover:bg-primary/20"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-6 w-6",
                                isCompleted
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-primary"
                              )}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {step.label}
                              </h3>
                              {isCompleted && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {step.description}
                            </p>
                            
                            {/* Tags Row */}
                            <div className="flex items-center gap-2 mt-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                isCompleted 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                  : "bg-primary/10 text-primary"
                              )}>
                                {isCompleted ? "✓ Complete" : `+${step.points} pts`}
                              </span>
                              {!isCompleted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {step.duration}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Benefits Alert */}
                <Alert className="mt-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <strong>Quick tip:</strong> Complete both verifications in under 3 minutes
                    and unlock instant booking plus access to premium equipment.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : activeStep === "identity" ? (
              /* Identity Verification */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Identity Verification</CardTitle>
                      <CardDescription>
                        Upload a clear photo of your government ID
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStep("overview")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile?.identityVerified ? (
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
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

                      <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                        <h4 className="text-sm font-semibold">Accepted Documents:</h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            Driver's License (front and back)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            Passport (photo page)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            State-issued ID card
                          </li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-start gap-2">
                          <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Your privacy matters:</strong>{" "}
                            Documents are encrypted and only used for verification.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Phone Verification */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Phone Verification</CardTitle>
                      <CardDescription>
                        Verify your phone number via SMS
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStep("overview")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile?.phoneVerified ? (
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        <strong>Phone Verified!</strong> Your phone number has been
                        successfully verified.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <PhoneVerification
                      onVerify={handlePhoneVerify}
                      isVerifying={isVerifyingPhone}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trust Score Breakdown - Shown below on mobile */}
            {profile && activeStep === "overview" && (
              <div className="lg:hidden">
                <TrustScore score={profile.trustScore} />
              </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VerifyIdentity;
