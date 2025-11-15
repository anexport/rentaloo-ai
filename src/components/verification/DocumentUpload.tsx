import { useState, useCallback } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateDocument } from "../../lib/verification";
import type { VerificationType } from "../../types/verification";

interface DocumentUploadProps {
  type: VerificationType;
  onUpload: (file: File, type: VerificationType) => Promise<void>;
  isUploading?: boolean;
}

const DocumentUpload = ({
  type,
  onUpload,
  isUploading = false,
}: DocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getTypeLabel = () => {
    switch (type) {
      case "identity":
        return "Government ID (Driver's License, Passport, or State ID)";
      case "address":
        return "Proof of Address (Utility Bill or Bank Statement)";
      case "phone":
        return "Phone Verification Document";
      default:
        return "Document";
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    const validation = validateDocument(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Validate that result is a string (readAsDataURL returns string or null)
        if (typeof reader.result === "string") {
          setPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile, type);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">
          {getTypeLabel()}
        </h3>
        <p className="text-xs text-muted-foreground">
          Upload a clear photo or scan (max 5MB, JPG/PNG/PDF)
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.02]"
              : "border-border bg-card hover:border-primary/50 hover:bg-accent/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className={`transition-transform duration-200 ${isDragging ? 'scale-110' : 'scale-100'}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">
            {isDragging ? "Drop your file here" : "Drag and drop your document"}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or click below to browse
          </p>
          <label htmlFor={`file-upload-${type}`}>
            <Button variant="outline" asChild>
              <span className="cursor-pointer">Browse Files</span>
            </Button>
            <input
              id={`file-upload-${type}`}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <p className="text-xs text-muted-foreground mt-4">
            Supported: JPG, PNG, WebP, PDF
          </p>
        </div>
      ) : (
        <Card className="border-2 border-primary/20">
          <CardContent className="p-4 space-y-4">
            {/* Preview */}
            {preview ? (
              <div className="relative group">
                <img
                  src={preview}
                  alt="Document preview"
                  className="w-full h-64 object-contain bg-muted rounded-lg"
                />
                <button
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Remove file"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRemove();
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="p-3 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Remove file"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRemove();
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={() => void handleUpload()}
              disabled={isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUpload;
