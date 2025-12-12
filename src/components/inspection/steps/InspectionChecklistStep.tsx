import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ChecklistItemStatus } from "@/types/inspection";

interface InspectionChecklistStepProps {
  categorySlug?: string;
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
  onBack: () => void;
  onContinue: () => void;
  className?: string;
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  hiking: [
    "Straps and buckles",
    "Zippers",
    "Frame integrity",
    "Fabric condition",
  ],
  climbing: ["Harness webbing", "Buckles", "Belay loops", "Stitching"],
  skiing: ["Boot shells", "Buckles", "Liners", "Sole condition"],
  snowboarding: ["Board surface", "Bindings", "Edges", "Base condition"],
  camping: ["Tent poles", "Fabric", "Zippers", "Stakes and guy lines"],
  cycling: ["Frame", "Wheels", "Brakes", "Gears and chain"],
  water_sports: ["Hull condition", "Paddles", "Safety equipment", "Straps"],
  default: [
    "Overall condition",
    "Functional components",
    "Visible wear",
    "Safety features",
  ],
};

const STATUS_CONFIG: Record<
  ChecklistItemStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  good: {
    label: "Good",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
  },
  fair: {
    label: "Fair",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  damaged: {
    label: "Damaged",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

export default function InspectionChecklistStep({
  categorySlug,
  items,
  onItemsChange,
  onBack,
  onContinue,
  className,
}: InspectionChecklistStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const template =
    CHECKLIST_TEMPLATES[categorySlug || ""] || CHECKLIST_TEMPLATES.default;

  // Initialize items if empty
  useEffect(() => {
    if (items.length === 0) {
      const initialItems: ChecklistItem[] = template.map((item) => ({
        item,
        status: "good" as ChecklistItemStatus,
        notes: "",
      }));
      onItemsChange(initialItems);
    }
  }, [items.length, template, onItemsChange]);

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onItemsChange(newItems);
  };

  const handleStatusChange = (index: number, status: ChecklistItemStatus) => {
    updateItem(index, { status });
    // Auto-expand notes for fair/damaged items
    if (status !== "good") {
      setExpandedIndex(index);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Step content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Condition Checklist
            </h2>
            <p className="text-muted-foreground">
              Rate each item&apos;s condition. Add notes for anything not in good
              condition.
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {(Object.keys(STATUS_CONFIG) as ChecklistItemStatus[]).map(
              (status) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                return (
                  <div
                    key={status}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className={config.color}>{config.label}</span>
                  </div>
                );
              }
            )}
          </div>

          {/* Checklist items */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const config = STATUS_CONFIG[item.status];
              const Icon = config.icon;
              const isExpanded = expandedIndex === index;
              const showNotes = item.status !== "good" || isExpanded;

              return (
                <Card
                  key={index}
                  className={cn(
                    "transition-all duration-200",
                    config.borderColor,
                    "border-2"
                  )}
                >
                  <CardContent className="p-4 space-y-4">
                    {/* Item header */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <span className="font-medium truncate">{item.item}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(index)}
                        className="shrink-0"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </Button>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-2">
                      {(Object.keys(STATUS_CONFIG) as ChecklistItemStatus[]).map(
                        (status) => {
                          const statusConfig = STATUS_CONFIG[status];
                          const StatusIcon = statusConfig.icon;
                          const isSelected = item.status === status;

                          return (
                            <Button
                              key={status}
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(index, status)}
                              className={cn(
                                "flex-1 h-12 transition-all",
                                isSelected && [
                                  statusConfig.bgColor,
                                  statusConfig.borderColor,
                                  statusConfig.color,
                                ]
                              )}
                              aria-pressed={isSelected}
                            >
                              <StatusIcon
                                className={cn(
                                  "h-4 w-4 mr-1.5",
                                  isSelected
                                    ? statusConfig.color
                                    : "text-muted-foreground"
                                )}
                              />
                              {statusConfig.label}
                            </Button>
                          );
                        }
                      )}
                    </div>

                    {/* Notes section */}
                    {showNotes && (
                      <div className="space-y-2">
                        <label
                          htmlFor={`notes-${index}`}
                          className="text-sm font-medium text-muted-foreground"
                        >
                          {item.status !== "good"
                            ? "Please describe the issue"
                            : "Additional notes (optional)"}
                        </label>
                        <Textarea
                          id={`notes-${index}`}
                          value={item.notes || ""}
                          onChange={(e) =>
                            updateItem(index, { notes: e.target.value })
                          }
                          placeholder={
                            item.status !== "good"
                              ? "Describe the condition or damage..."
                              : "Any additional observations..."
                          }
                          rows={2}
                          className="resize-none"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t safe-area-bottom">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="h-12"
            aria-label="Go back to photos"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={onContinue}
            className="flex-1 h-12 font-semibold"
            aria-label="Continue to review"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

