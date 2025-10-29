import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "../lib/database.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, EyeOff, Calendar } from "lucide-react";
import EquipmentListingForm from "./EquipmentListingForm";
import AvailabilityCalendar from "./AvailabilityCalendar";

type EquipmentWithCategory =
  Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
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

  useEffect(() => {
    if (user) {
      fetchEquipment();
    }
  }, [user]);

  const fetchEquipment = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("equipment")
        .select(
          `
          *,
          category:categories(*)
        `
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEquipment(data || []);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!confirm("Are you sure you want to delete this equipment listing?"))
      return;

    try {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", equipmentId);

      if (error) throw error;

      setEquipment((prev) => prev.filter((item) => item.id !== equipmentId));
    } catch (error) {
      console.error("Error deleting equipment:", error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEquipment(null);
    fetchEquipment();
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
            <h2 className="text-2xl font-bold text-gray-900">
              {showingCalendar.title}
            </h2>
            <p className="text-gray-600">Manage availability and pricing</p>
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
          <h2 className="text-2xl font-bold text-gray-900">My Equipment</h2>
          <p className="text-gray-600">Manage your equipment listings</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {equipment.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.category.name}</CardDescription>
                  </div>
                  <Badge variant={item.is_available ? "default" : "secondary"}>
                    {item.is_available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      ${item.daily_rate}/day
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {item.condition}
                    </span>
                  </div>

                  <div className="text-sm text-gray-500">
                    📍 {item.location}
                  </div>

                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleToggleAvailability(item.id, item.is_available)
                        }
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
                        onClick={() => handleDeleteEquipment(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleShowCalendar(item)}
                      className="w-full"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Manage Availability
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EquipmentManagement;
