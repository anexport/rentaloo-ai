import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "../lib/database.types";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const equipmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category_id: z.string().min(1, "Category is required"),
  daily_rate: z
    .union([z.number(), z.string()])
    .pipe(
      z.coerce.number({
        required_error: "Daily rate is required",
        invalid_type_error: "Daily rate must be a valid number",
      })
    )
    .refine((n) => Number.isFinite(n) && n >= 1, {
      message: "Daily rate must be at least $1",
    }),
  condition: z.enum(["new", "excellent", "good", "fair"]),
  location: z.string().min(1, "Location is required"),
  latitude: z.preprocess((val) => {
    // Handle empty values and NaN from valueAsNumber: true
    if (
      val === "" ||
      val === null ||
      val === undefined ||
      (typeof val === "number" && isNaN(val))
    )
      return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().optional()),
  longitude: z.preprocess((val) => {
    // Handle empty values and NaN from valueAsNumber: true
    if (
      val === "" ||
      val === null ||
      val === undefined ||
      (typeof val === "number" && isNaN(val))
    )
      return undefined;
    const num = typeof val === "number" ? val : Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().optional()),
});

export type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface EquipmentListingFormProps {
  equipment?: Database["public"]["Tables"]["equipment"]["Row"];
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EquipmentListingForm = ({
  equipment,
  onSuccess,
  onCancel,
}: EquipmentListingFormProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<
    Database["public"]["Tables"]["categories"]["Row"][]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EquipmentFormData>({
    resolver: zodResolver<EquipmentFormData>(equipmentFormSchema),
    defaultValues: equipment
      ? {
          title: equipment.title,
          description: equipment.description,
          category_id: equipment.category_id,
          daily_rate: equipment.daily_rate,
          condition: equipment.condition,
          location: equipment.location,
          latitude: equipment.latitude || undefined,
          longitude: equipment.longitude || undefined,
        }
      : {
          condition: "good",
        },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    };

    void fetchCategories();
  }, []);

  // Fetch existing photos if editing
  useEffect(() => {
    const fetchExistingPhotos = async () => {
      if (!equipment) return;

      const { data, error } = await supabase
        .from("equipment_photos")
        .select("photo_url")
        .eq("equipment_id", equipment.id)
        .order("order_index");

      if (error) {
        console.error("Error fetching photos:", error);
        return;
      }

      setExistingPhotos((data || []).map((p) => p.photo_url));
    };

    void fetchExistingPhotos();
  }, [equipment]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos total
    const newPhotos = files.slice(0, 5 - photos.length);
    setPhotos((prev) => [...prev, ...newPhotos]);

    // Create previews
    newPhotos.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Validate that result is a string (readAsDataURL returns string or null)
        if (typeof reader.result === "string") {
          setPhotoPreviews((prev) => [...prev, reader.result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = async (photoUrl: string) => {
    if (!equipment) return;

    try {
      // Derive the original storage path (uploads use <userId>/<equipmentId>/<file>)
      const marker = "/object/public/equipment-photos/";
      let relativePath: string | null = null;

      try {
        const { pathname } = new URL(photoUrl);
        const idx = pathname.indexOf(marker);
        if (idx >= 0) {
          relativePath = decodeURIComponent(
            pathname.slice(idx + marker.length)
          );
        }
      } catch (parseError) {
        console.warn("Invalid photo URL provided for removal", {
          photoUrl,
          parseError,
        });
      }

      if (relativePath) {
        const { error: removeError } = await supabase.storage
          .from("equipment-photos")
          .remove([relativePath]);
        if (removeError) {
          throw removeError;
        }
      } else {
        console.warn("Could not derive storage path for", photoUrl);
      }

      // Delete from database
      await supabase
        .from("equipment_photos")
        .delete()
        .eq("equipment_id", equipment.id)
        .eq("photo_url", photoUrl);

      setExistingPhotos((prev) => prev.filter((url) => url !== photoUrl));
    } catch (error) {
      console.error("Error removing photo:", error);
    }
  };

  const uploadPhotos = async (equipmentId: string) => {
    if (photos.length === 0 || !user) return;

    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${
        user.id
      }/${equipmentId}/${Date.now()}_${i}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("equipment-photos")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Error uploading photo:", uploadError);
        continue;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("equipment-photos").getPublicUrl(fileName);

      // Save to database
      await supabase.from("equipment_photos").insert({
        equipment_id: equipmentId,
        photo_url: publicUrl,
        is_primary: i === 0 && existingPhotos.length === 0,
        order_index: existingPhotos.length + i,
      });
    }
  };

  const onSubmit = async (data: EquipmentFormData) => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      const baseEquipmentData = {
        owner_id: user.id,
        title: data.title,
        description: data.description,
        category_id: data.category_id,
        daily_rate: data.daily_rate,
        condition: data.condition,
        location: data.location,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      };

      let equipmentId: string;

      if (equipment) {
        // Update existing equipment
        const { error } = await supabase
          .from("equipment")
          .update(baseEquipmentData)
          .eq("id", equipment.id);

        if (error) throw error;
        equipmentId = equipment.id;
      } else {
        // Create new equipment
        const { data: newEquipment, error } = await supabase
          .from("equipment")
          .insert({ ...baseEquipmentData, is_available: true })
          .select()
          .single();

        if (error) throw error;
        if (!newEquipment) {
          throw new Error("Failed to create equipment");
        }
        equipmentId = newEquipment.id;
      }

      // Upload photos
      await uploadPhotos(equipmentId);

      onSuccess?.();
    } catch (error) {
      console.error("Error saving equipment:", error);
      alert("Failed to save equipment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {equipment ? "Edit Equipment" : "Add New Equipment"}
        </CardTitle>
        <CardDescription>
          {equipment
            ? "Update your equipment listing details"
            : "List your equipment for rent and start earning"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Equipment Title *</Label>
              <Input
                id="title"
                type="text"
                autoComplete="off"
                {...register("title")}
                placeholder="e.g., Professional Mountain Bike"
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select
                value={watch("category_id")}
                onValueChange={(value) => setValue("category_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-600">
                  {errors.category_id.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              autoComplete="off"
              {...register("description")}
              placeholder="Describe your equipment, its features, and any important details..."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate ($) *</Label>
              <Input
                id="daily_rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="1"
                {...register("daily_rate", { valueAsNumber: true })}
                placeholder="25.00"
              />
              {errors.daily_rate && (
                <p className="text-sm text-red-600">
                  {errors.daily_rate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condition *</Label>
              <Select
                value={watch("condition")}
                onValueChange={(value) =>
                  setValue(
                    "condition",
                    value as Database["public"]["Enums"]["equipment_condition"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-sm text-red-600">
                  {errors.condition.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                type="text"
                autoComplete="address-level2"
                {...register("location")}
                placeholder="City, State"
              />
              {errors.location && (
                <p className="text-sm text-red-600">
                  {errors.location.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (Optional)</Label>
              <Input
                id="latitude"
                type="number"
                inputMode="decimal"
                step="any"
                {...register("latitude", { valueAsNumber: true })}
                placeholder="40.7128"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (Optional)</Label>
              <Input
                id="longitude"
                type="number"
                inputMode="decimal"
                step="any"
                {...register("longitude", { valueAsNumber: true })}
                placeholder="-74.0060"
              />
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-4">
            <Label>Equipment Photos (Max 5)</Label>

            {/* Existing Photos */}
            {existingPhotos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingPhotos.map((url, index) => (
                  <div key={url} className="relative group">
                    <img
                      src={url}
                      alt={`Existing ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => {
                        void removeExistingPhoto(url);
                      }}
                      className="absolute top-2 right-2 rounded-full max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      aria-label="Delete photo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* New Photo Previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 rounded-full max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      aria-label="Delete photo"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === 0 && existingPhotos.length === 0 && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length + existingPhotos.length < 5 && (
              <div className="border-2 border-dashed border-border rounded-lg p-6">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center cursor-pointer"
                >
                  <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-3">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground mb-1">
                    Upload Photos
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {5 - photos.length - existingPhotos.length} remaining • JPG,
                    PNG, or WebP up to 5MB
                  </span>
                </label>
              </div>
            )}

            {photos.length + existingPhotos.length === 0 && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>
                  Adding photos helps renters see your equipment better and
                  increases booking chances
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : equipment
                ? "Update Equipment"
                : "List Equipment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EquipmentListingForm;
