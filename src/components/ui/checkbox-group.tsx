import { useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  columns?: number;
}

export const CheckboxGroup = ({
  options,
  value,
  onChange,
  label,
  error,
  columns = 2,
}: CheckboxGroupProps) => {
  const handleToggle = useCallback(
    (optionValue: string) => {
      const newValue = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];
      onChange(newValue);
    },
    [value, onChange]
  );

  return (
    <div className="space-y-3">
      {label && <Label className="text-base font-medium">{label}</Label>}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
              value.includes(option.value) && "border-primary bg-accent"
            )}
            htmlFor={option.value}
          >
            <Checkbox
              id={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={() => {
                handleToggle(option.value);
              }}
            />
            <div className="flex-1 space-y-1">
              <span className="text-sm font-medium leading-none">
                {option.label}
              </span>
              {option.description && (
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
