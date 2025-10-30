import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Info, Shield, Mail, Phone, MapPin } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import type { UserVerificationProfile } from "../../types/verification";
import { Progress } from "@/components/ui/progress";
import { getVerificationProgress } from "@/lib/verification";

interface VerificationProgressCardProps {
  profile: UserVerificationProfile;
}

const VerificationProgressCard: React.FC<VerificationProgressCardProps> = ({
  profile,
}) => {
  const progress = getVerificationProgress(profile);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Verification Progress</CardTitle>
            <CardDescription>
              Complete all verifications to maximize your trust
            </CardDescription>
          </div>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold text-foreground">{progress}%</span>
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
              status={profile.identityVerified ? "verified" : "unverified"}
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
              status={profile.emailVerified ? "verified" : "unverified"}
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
              status={profile.phoneVerified ? "verified" : "unverified"}
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
              status={profile.addressVerified ? "verified" : "unverified"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerificationProgressCard;
