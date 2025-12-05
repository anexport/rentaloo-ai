import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import VerificationStatusGrid from "./VerificationStatusGrid";
import type { UserVerificationProfile } from "@/types/verification";
import { getVerificationProgress } from "@/lib/verification";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type VerificationProgressCardProps = {
  profile: UserVerificationProfile;
  onVerificationClick?: (key: string) => void;
  className?: string;
};

const VerificationProgressCard = ({
  profile,
  onVerificationClick,
  className,
}: VerificationProgressCardProps) => {
  const progress = getVerificationProgress(profile);

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Verification Progress</CardTitle>
            <CardDescription className="text-xs">
              Complete all verifications to maximize your trust
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
                <DialogTitle>Why Verify Your Identity?</DialogTitle>
                <DialogDescription>
                  Verification helps build trust in our community
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
                  <h4 className="font-semibold mb-1">Privacy & Security:</h4>
                  <p className="text-muted-foreground">
                    Your documents are encrypted and only used for verification.
                    They are never shared with other users.
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
            <span className="font-semibold text-foreground tabular-nums">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <VerificationStatusGrid
          profile={profile}
          interactive={!!onVerificationClick}
          onItemClick={onVerificationClick}
        />
      </CardContent>
    </Card>
  );
};

export default VerificationProgressCard;
