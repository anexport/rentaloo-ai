import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChecklistItem, ChecklistItemStatus } from "@/types/inspection";

interface ConditionChecklistProps {
  categorySlug?: string;
  items: ChecklistItem[];
  onItemsChange: (items: ChecklistItem[]) => void;
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

export default function ConditionChecklist({
  categorySlug,
  items,
  onItemsChange,
}: ConditionChecklistProps) {
  const template =
    CHECKLIST_TEMPLATES[categorySlug || ""] || CHECKLIST_TEMPLATES.default;

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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Condition Checklist</h3>

      {items.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-3">
          <Label className="font-medium">{item.item}</Label>

          <RadioGroup
            value={item.status}
            onValueChange={(value) =>
              updateItem(index, { status: value as ChecklistItemStatus })
            }
          >
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="good" id={`${index}-good`} />
                <Label htmlFor={`${index}-good`} className="cursor-pointer">
                  Good
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fair" id={`${index}-fair`} />
                <Label htmlFor={`${index}-fair`} className="cursor-pointer">
                  Fair
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="damaged" id={`${index}-damaged`} />
                <Label htmlFor={`${index}-damaged`} className="cursor-pointer">
                  Damaged
                </Label>
              </div>
            </div>
          </RadioGroup>

          {item.status !== "good" && (
            <Textarea
              placeholder="Describe the issue..."
              value={item.notes || ""}
              onChange={(e) => updateItem(index, { notes: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
