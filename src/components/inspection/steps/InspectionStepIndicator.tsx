import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InspectionStep {
  id: string;
  title: string;
  description?: string;
}

interface InspectionStepIndicatorProps {
  steps: InspectionStep[];
  currentStep: number;
  className?: string;
}

export function InspectionStepIndicator({
  steps,
  currentStep,
  className,
}: InspectionStepIndicatorProps) {
  const clampedStep = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));
  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: Compact horizontal stepper */}
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < clampedStep;
          const isCurrent = index === clampedStep;
          const isUpcoming = index > clampedStep;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
                    isUpcoming &&
                      "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step title - visible on larger screens */}
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center line-clamp-1 hidden sm:block",
                    isCompleted && "text-primary",
                    isCurrent && "text-primary font-semibold",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors duration-300",
                    index < currentStep ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step info - mobile */}
      <div className="mt-4 text-center sm:hidden">
        <p className="text-sm font-semibold text-primary">
          Step {clampedStep + 1} of {steps.length}
        </p>
        <p className="text-base font-medium mt-1">
          {steps[clampedStep]?.title}
        </p>
        {steps[clampedStep]?.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {steps[clampedStep].description}
          </p>
        )}
      </div>
    </div>
  );
}
