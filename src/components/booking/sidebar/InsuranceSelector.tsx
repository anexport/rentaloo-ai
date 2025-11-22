import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Shield, Check } from 'lucide-react';
import { INSURANCE_OPTIONS, calculateInsuranceCost } from '@/lib/booking';
import type { InsuranceType } from '@/types/booking';

interface InsuranceSelectorProps {
  selectedInsurance: InsuranceType;
  onInsuranceChange: (type: InsuranceType) => void;
  rentalSubtotal: number;
}

const InsuranceSelector = ({
  selectedInsurance,
  onInsuranceChange,
  rentalSubtotal,
}: InsuranceSelectorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Protection Plan</h3>
      </div>

      <RadioGroup value={selectedInsurance} onValueChange={onInsuranceChange}>
        {INSURANCE_OPTIONS.map((option) => {
          const cost = calculateInsuranceCost(rentalSubtotal, option.type);
          const isSelected = selectedInsurance === option.type;

          return (
            <Card
              key={option.type}
              className={`p-4 cursor-pointer transition-colors ${
                isSelected ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/50'
              }`}
              onClick={() => onInsuranceChange(option.type)}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={option.type} id={`insurance-${option.type}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`insurance-${option.type}`}
                      className="font-semibold cursor-pointer"
                    >
                      {option.label}
                    </Label>
                    <span className="font-semibold">
                      {cost > 0 ? `+$${cost.toFixed(2)}` : 'Free'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-muted-foreground">{option.coverage}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </RadioGroup>

      <p className="text-xs text-muted-foreground">
        Insurance covers accidental damage during your rental period. Normal wear and tear is expected.
      </p>
    </div>
  );
};

export default InsuranceSelector;
