import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVerification } from "@/hooks/useVerification";
import { Mountain, Shield, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import DocumentUpload from "@/components/verification/DocumentUpload";
import VerificationBadge from "@/components/verification/VerificationBadge";
import TrustScore from "@/components/verification/TrustScore";
import { getVerificationProgress } from "../../lib/verification";
import UserMenu from "@/components/UserMenu";

const VerifyIdentity = () => {
  const { user } = useAuth();
  const {
    profile,
    loading,
    uploading,
    uploadVerificationDocument,
    fetchVerificationProfile,
  } = useVerification();

  const [activeStep, setActiveStep] = useState<
    "overview" | "identity" | "phone"
  >("overview");

  const handleUpload = async (
    file: File,
    type: "identity" | "phone" | "email" | "address"
  ) => {
    await uploadVerificationDocument(file, type);
    await fetchVerificationProfile();
    setActiveStep("overview");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted animate-pulse" />
          <p className="text-muted-foreground">
            Loading verification status...
          </p>
        </div>
      </div>
    );
  }

  const progress = profile ? getVerificationProgress(profile) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Mountain className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-foreground">RentAloo</h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link
          to="/renter"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        {activeStep === "overview" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h2 className="text-3xl font-bold text-foreground mb-2">
                Verify Your Identity
              </h2>
              <p className="text-muted-foreground">
                Increase your trust score and access more rental opportunities
              </p>
            </div>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Progress</CardTitle>
                <CardDescription>
                  Complete all verifications to maximize your trust
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground">Overall Progress</span>
                    <span className="font-semibold text-foreground">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Identity</span>
                    </div>
                    <VerificationBadge
                      status={
                        profile?.identityVerified ? "verified" : "unverified"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <VerificationBadge
                      status={
                        profile?.emailVerified ? "verified" : "unverified"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Phone</span>
                    </div>
                    <VerificationBadge
                      status={
                        profile?.phoneVerified ? "verified" : "unverified"
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">Address</span>
                    </div>
                    <VerificationBadge
                      status={
                        profile?.addressVerified ? "verified" : "unverified"
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Score */}
            {profile && <TrustScore score={profile.trustScore} />}

            {/* Verification Steps */}
            <div className="grid gap-4">
              {!profile?.identityVerified && (
                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <span>Verify Identity</span>
                    </CardTitle>
                    <CardDescription>
                      Upload a government-issued ID to verify your identity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setActiveStep("identity")}
                      className="w-full"
                    >
                      Start Identity Verification
                    </Button>
                  </CardContent>
                </Card>
              )}

              {!profile?.phoneVerified && (
                <Card>
                  <CardHeader>
                    <CardTitle>Verify Phone Number</CardTitle>
                    <CardDescription>
                      Verify your phone number for better security
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={() => setActiveStep("phone")}
                      className="w-full"
                    >
                      Verify Phone
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Benefits */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Why verify?</strong> Verified users get more booking
                requests, higher trust scores, and access to premium equipment.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {activeStep === "identity" && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setActiveStep("overview")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Identity Verification</CardTitle>
                <CardDescription>
                  Upload a clear photo of your government-issued ID
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentUpload
                  type="identity"
                  onUpload={handleUpload}
                  isUploading={uploading}
                />

                <Alert className="mt-6">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Your privacy matters:</strong> Your documents are
                    encrypted and only used for verification. They are never
                    shared with other users.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        )}

        {activeStep === "phone" && (
          <div className="space-y-6">
            <Button
              variant="ghost"
              onClick={() => setActiveStep("overview")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Phone Verification</CardTitle>
                <CardDescription>
                  Coming soon - phone verification via SMS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Phone verification will be available in a future update.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default VerifyIdentity;
