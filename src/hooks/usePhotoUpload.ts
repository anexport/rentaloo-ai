import { useState, useRef, useEffect } from "react";

export interface UsePhotoUploadOptions {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

export interface UsePhotoUploadReturn {
  previews: string[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removePhoto: (index: number) => void;
}

export function usePhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 10,
}: UsePhotoUploadOptions): UsePhotoUploadReturn {
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate previews from photos prop
  useEffect(() => {
    // Revoke old previews to prevent memory leaks
    previews.forEach((preview) => {
      URL.revokeObjectURL(preview);
    });

    // Create new blob URLs for current photos
    const newPreviews = photos.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);

    // Cleanup on unmount or when photos change
    return () => {
      newPreviews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, [photos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos = files.slice(0, maxPhotos - photos.length);
    onPhotosChange([...photos, ...newPhotos]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
    // Note: previews will be automatically updated by the useEffect
  };

  return {
    previews,
    fileInputRef,
    handleFileSelect,
    removePhoto,
  };
}
