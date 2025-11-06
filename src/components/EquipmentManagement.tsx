import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "../lib/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Trash2, Eye, EyeOff, Calendar, MapPin } from "lucide-react";
import EquipmentListingForm from "./EquipmentListingForm";
import AvailabilityCalendar from "./AvailabilityCalendar";

type EquipmentWithCategory =
  Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
    photos: Database["public"]["Tables"]["equipment_photos"]["Row"][];
  };

const EquipmentManagement = () => {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<
    Database["public"]["Tables"]["equipment"]["Row"] | null
  >(null);
  const [showingCalendar, setShowingCalendar] = useState<
    Database["public"]["Tables"]["equipment"]["Row"] | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(
    null
  );
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const fetchEquipment = useCallback(async () => {
    if (!user) return;

    // Reset failed images on refetch to allow retrying previously failed URLs
    setFailedImages(new Set());

    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(
          `
          *,
          category:categories(*),
          photos:equipment_photos(*)
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Sort photos by order_index and is_primary
      const equipmentWithSortedPhotos = (data || []).map((item) => ({
        ...item,
        photos: (item.photos || []).sort((a, b) => {
          // Primary photos first
          const aPrimary = a.is_primary === true;
          const bPrimary = b.is_primary === true;
          if (aPrimary && !bPrimary) return -1;
          if (!aPrimary && bPrimary) return 1;
          // Then by order_index
          return (a.order_index || 0) - (b.order_index || 0);
        }),
      }));

      setEquipment(equipmentWithSortedPhotos);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchEquipment();
    }
  }, [user, fetchEquipment]);

  const handleToggleAvailability = async (
    equipmentId: string,
    currentStatus: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("equipment")
        .update({ is_available: !currentStatus })
        .eq("id", equipmentId);

      if (error) throw error;

      setEquipment((prev) =>
        prev.map((item) =>
          item.id === equipmentId
            ? { ...item, is_available: !currentStatus }
            : item
        )
      );
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  const handleDeleteClick = (equipmentId: string) => {
    setEquipmentToDelete(equipmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!equipmentToDelete) return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", equipmentToDelete);

      if (error) throw error;

      setEquipment((prev) =>
        prev.filter((item) => item.id !== equipmentToDelete)
      );
      setDeleteDialogOpen(false);
      setEquipmentToDelete(null);
    } catch (error) {
      console.error("Error deleting equipment:", error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEquipment(null);
    void fetchEquipment();
  };

  const handleEdit = (
    equipment: Database["public"]["Tables"]["equipment"]["Row"]
  ) => {
    setEditingEquipment(equipment);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingEquipment(null);
  };

  const handleShowCalendar = (
    equipment: Database["public"]["Tables"]["equipment"]["Row"]
  ) => {
    setShowingCalendar(equipment);
  };

  const handleCloseCalendar = () => {
    setShowingCalendar(null);
  };

  if (showForm) {
    return (
      <EquipmentListingForm
        equipment={editingEquipment || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleCancel}
      />
    );
  }

  if (showingCalendar) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {showingCalendar.title}
            </h2>
            <p className="text-muted-foreground">
              Manage availability and pricing
            </p>
          </div>
          <Button variant="outline" onClick={handleCloseCalendar}>
            Back to Equipment
          </Button>
        </div>
        <AvailabilityCalendar
          equipmentId={showingCalendar.id}
          defaultDailyRate={showingCalendar.daily_rate}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading equipment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Equipment</h2>
          <p className="text-muted-foreground">
            Manage your equipment listings
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add New Equipment</Button>
      </div>

      {equipment.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <p className="text-lg mb-2">No equipment listed yet</p>
              <p className="text-sm mb-4">
                Start by adding your first piece of equipment
              </p>
              <Button onClick={() => setShowForm(true)}>Add Equipment</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item) => {
            const primaryPhoto =
              item.photos?.find((p) => p.is_primary) || item.photos?.[0];
            const imageHasError = primaryPhoto
              ? failedImages.has(primaryPhoto.id)
              : true;
            const showImage = primaryPhoto && !imageHasError;

            return (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
              >
                {/* Image Section - Airbnb Style */}
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {showImage ? (
                    <img
                      src={primaryPhoto.photo_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={() => {
                        if (primaryPhoto) {
                          setFailedImages((prev) =>
                            new Set(prev).add(primaryPhoto.id)
                          );
                        }
                      }}
                    />
                  ) : null}
                  {!showImage && (
                    <div
                      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50"
                      role="img"
                      aria-label={`No photo available for ${item.title}`}
                    >
                      <div className="text-center text-muted-foreground">
                        <div className="text-4xl mb-2" aria-hidden="true">
                          📷
                        </div>
                        <p className="text-xs">No photo</p>
                      </div>
                    </div>
                  )}

                  {/* Availability Badge Overlay */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={item.is_available ? "default" : "secondary"}
                      className="shadow-md"
                    >
                      {item.is_available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>

                  {/* Category Badge Overlay */}
                  <div className="absolute top-3 left-3">
                    <Badge
                      variant="secondary"
                      className="shadow-md bg-background/80 backdrop-blur-sm"
                    >
                      {item.category.name}
                    </Badge>
                  </div>
                </div>

                {/* Content Section */}
                <CardContent className="p-4 space-y-3">
                  {/* Title and Location */}
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold line-clamp-1 leading-tight">
                      {item.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="line-clamp-1">{item.location}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Price and Condition */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <span className="text-lg font-semibold text-foreground">
                        ${item.daily_rate}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        /day
                      </span>
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {item.condition}
                    </Badge>
                  </div>
                </CardContent>

                {/* Actions Footer */}
                <CardFooter className="p-4 pt-0 flex-col gap-2 border-t">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleShowCalendar(item)}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Manage Availability
                  </Button>
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void handleToggleAvailability(item.id, item.is_available);
                      }}
                      className="flex-1"
                    >
                      {item.is_available ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Show
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteClick(item.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this equipment listing? This
              action cannot be undone and will remove all associated photos and
              booking history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setEquipmentToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleDeleteConfirm();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EquipmentManagement;
