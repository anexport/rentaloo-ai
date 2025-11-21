import { useState, useRef } from "react";
import { Camera, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EvidencePhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  pickupPhotos?: string[];
  minPhotos?: number;
  maxPhotos?: number;
}

export default function EvidencePhotoUpload({
  photos,
  onPhotosChange,
  pickupPhotos,
  minPhotos = 2,
  maxPhotos = 10,
}: EvidencePhotoUploadProps) {
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = files.slice(0, maxPhotos - photos.length);
    onPhotosChange([...photos, ...newPhotos]);

    newPhotos.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPreviews((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Damage Evidence Photos</h3>
        <p className="text-sm text-muted-foreground">
          Upload clear photos showing the damage (minimum {minPhotos} required)
        </p>
      </div>

      {pickupPhotos && pickupPhotos.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Compare with pickup photos below to document the damage clearly
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {previews.map((preview, index) => (
          <Card
            key={index}
            className="relative aspect-square overflow-hidden"
          >
            <img
              src={preview}
              alt={`Evidence ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => removePhoto(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Card>
        ))}

        {photos.length < maxPhotos && (
          <Card
            className="aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Add Photo</span>
          </Card>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        capture="environment"
      />

      {photos.length < minPhotos && (
        <p className="text-sm text-destructive">
          Please add at least {minPhotos - photos.length} more photo(s)
        </p>
      )}

      {pickupPhotos && pickupPhotos.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-2">
            Pickup Inspection Photos (for reference)
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {pickupPhotos.slice(0, 6).map((url, index) => (
              <Card key={index} className="aspect-square overflow-hidden">
                <img
                  src={url}
                  alt={`Pickup ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
