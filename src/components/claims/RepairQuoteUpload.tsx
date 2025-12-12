import { useRef } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RepairQuoteUploadProps {
  quotes: File[];
  onQuotesChange: (quotes: File[]) => void;
  required: boolean;
  maxQuotes?: number;
}

export default function RepairQuoteUpload({
  quotes,
  onQuotesChange,
  required,
  maxQuotes = 3,
}: RepairQuoteUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newQuotes = files.slice(0, maxQuotes - quotes.length);
    onQuotesChange([...quotes, ...newQuotes]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeQuote = (index: number) => {
    onQuotesChange(quotes.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">
          Repair Quotes{" "}
          {required && <span className="text-destructive">*</span>}
        </h3>
        <p className="text-sm text-muted-foreground">
          {required
            ? "Required for claims over $100"
            : "Optional supporting documentation"}
        </p>
      </div>

      <div className="space-y-2">
        {quotes.map((file, index) => (
          <Card key={index} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeQuote(index)}
              aria-label={`Remove quote ${index + 1}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}

        {quotes.length < maxQuotes && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <FileText className="h-4 w-4 mr-2" />
            Upload Repair Quote
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {required && quotes.length === 0 && (
        <p className="text-sm text-destructive">
          At least one repair quote is required for this claim amount
        </p>
      )}
    </div>
  );
}
