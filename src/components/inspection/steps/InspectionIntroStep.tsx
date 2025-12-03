import { Camera, ClipboardCheck, FileCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { InspectionType } from "@/types/inspection";

interface InspectionIntroStepProps {
  equipmentTitle: string;
  inspectionType: InspectionType;
  isOwner: boolean;
  onContinue: () => void;
  className?: string;
}

const INSPECTION_STEPS = [
  {
    icon: Camera,
    title: "Take Photos",
    description: "Capture at least 3 photos of the equipment from different angles",
  },
  {
    icon: ClipboardCheck,
    title: "Check Condition",
    description: "Review each item on the checklist and note any issues",
  },
  {
    icon: FileCheck,
    title: "Confirm & Submit",
    description: "Review your inspection and confirm everything is accurate",
  },
];

export default function InspectionIntroStep({
  equipmentTitle,
  inspectionType,
  isOwner,
  onContinue,
  className,
}: InspectionIntroStepProps) {
  const isPickup = inspectionType === "pickup";
  const role = isOwner ? "owner" : "renter";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isPickup ? "Pickup" : "Return"} Inspection
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {isPickup
            ? `As the ${role}, document the equipment condition before the rental begins.`
            : `As the ${role}, document the equipment condition upon return.`}
        </p>
      </div>

      {/* Equipment info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Equipment</p>
              <p className="font-semibold truncate">{equipmentTitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What to expect */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">What you&apos;ll do</h2>
        <div className="space-y-3">
          {INSPECTION_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex items-start gap-4 p-4 rounded-xl bg-card border"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why it matters */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Why this matters
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {isPickup
              ? "This inspection protects both parties by documenting the equipment's condition before the rental. It helps resolve any disputes about damage."
              : "The return inspection confirms the equipment's condition and is required to complete the rental and release the security deposit."}
          </p>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="pt-2">
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full h-14 text-base font-semibold"
        >
          <Camera className="h-5 w-5 mr-2" />
          Begin Inspection
        </Button>
      </div>
    </div>
  );
}

