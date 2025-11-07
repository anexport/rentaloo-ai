import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Info,
  FileText,
  Package,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import type { Category } from "./EquipmentMetadataCard";

interface EquipmentSpecificationsProps {
  dailyRate: number;
  condition: string;
  category: Category | null;
  location: string;
}

export const EquipmentSpecifications = ({
  dailyRate,
  condition,
  category,
  location,
}: EquipmentSpecificationsProps) => {
  return (
    <Accordion type="multiple" className="w-full">
      {/* Basic Information */}
      <AccordionItem value="basic-info">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Basic Information</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Daily Rate</p>
              <p className="font-semibold text-lg text-primary">
                ${dailyRate}<span className="text-sm text-muted-foreground">/day</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Condition</p>
              <Badge variant="outline" className="capitalize">
                {condition}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Category</p>
              <Badge variant="secondary">
                {category?.name || "Uncategorized"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Location</p>
              <p className="font-medium flex items-center gap-1 text-sm">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {location}
              </p>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Rental Terms */}
      <AccordionItem value="rental-terms">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Rental Terms</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Minimum Rental</p>
                <p className="text-xs text-muted-foreground">1 day minimum rental period</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Security Deposit</p>
                <p className="text-xs text-muted-foreground">
                  May be required depending on equipment value
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Cancellation Policy</p>
                <p className="text-xs text-muted-foreground">
                  Free cancellation up to 24 hours before rental start
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Late Returns</p>
                <p className="text-xs text-muted-foreground">
                  Additional charges may apply for late returns
                </p>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* What's Included */}
      <AccordionItem value="whats-included">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>What's Included</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Equipment As Listed</p>
                <p className="text-xs text-muted-foreground">
                  Equipment delivered in the condition described
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Usage Instructions</p>
                <p className="text-xs text-muted-foreground">
                  Basic operation guide and safety information
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Owner Support</p>
                <p className="text-xs text-muted-foreground">
                  Direct communication with owner during rental period
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Pickup Coordination</p>
                <p className="text-xs text-muted-foreground">
                  Flexible pickup and return arrangements
                </p>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

