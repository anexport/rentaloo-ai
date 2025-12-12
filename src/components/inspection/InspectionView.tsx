import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Calendar,
  Camera,
  ClipboardCheck,
  ShieldCheck,
  User,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";

type InspectionData = Database["public"]["Tables"]["equipment_inspections"]["Row"];

interface ChecklistItemData {
  item: string;
  status: "good" | "fair" | "damaged";
  notes?: string;
}

const STATUS_CONFIG = {
  good: {
    label: "Good",
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  fair: {
    label: "Fair",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  damaged: {
    label: "Damaged",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

export default function InspectionView() {
  const { bookingId, inspectionType } = useParams<{
    bookingId: string;
    inspectionType: "pickup" | "return";
  }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchInspection = async () => {
      if (!bookingId || !inspectionType) {
        setError("Invalid inspection parameters");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("equipment_inspections")
          .select("*")
          .eq("booking_id", bookingId)
          .eq("inspection_type", inspectionType)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching inspection:", fetchError);
          setError("Failed to load inspection details");
          return;
        }

        if (!data) {
          setError("Inspection not found");
          return;
        }

        setInspection(data);
      } catch (err) {
        console.error("Error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    void fetchInspection();
  }, [bookingId, inspectionType]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatLocation = (location: unknown) => {
    if (!location || typeof location !== "object") return "Location recorded";
    if ("lat" in location && "lng" in location) {
      const { lat, lng } = location as { lat: number; lng: number };
      if (typeof lat === "number" && typeof lng === "number") {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }
    }
    if ("latitude" in location && "longitude" in location) {
      const { latitude, longitude } = location as { latitude: number; longitude: number };
      if (typeof latitude === "number" && typeof longitude === "number") {
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }
    }
    return "Location recorded";
  };

  // Parse checklist items with proper typing
  const getChecklistItems = (): ChecklistItemData[] => {
    if (!inspection?.checklist_items || !Array.isArray(inspection.checklist_items)) {
      return [];
    }
    return inspection.checklist_items
      .filter((item): item is Partial<ChecklistItemData> => typeof item === "object" && item !== null)
      .map((item) => ({
        item: typeof item.item === "string" ? item.item : "Item",
        status: item.status === "fair" || item.status === "damaged" ? item.status : "good",
        notes: typeof item.notes === "string" ? item.notes : undefined,
      }));
  };

  // Count statuses
  const getStatusCounts = () => {
    const items = getChecklistItems();
    return items.reduce(
      (acc, item) => {
        const status = item.status || "good";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading inspection...</p>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-medium mb-2">
                {error || "Inspection not found"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                The inspection record could not be loaded.
              </p>
              <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const checklistItems = getChecklistItems();
  const statusCounts = getStatusCounts();
  const hasIssues = (statusCounts.fair || 0) > 0 || (statusCounts.damaged || 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold capitalize truncate">
              {inspectionType} Inspection
            </h1>
            <p className="text-xs text-muted-foreground">
              {formatShortDate(inspection.timestamp || inspection.created_at)}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Verification status */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className={cn(
              "border-2",
              inspection.verified_by_owner
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                : "border-muted"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    inspection.verified_by_owner
                      ? "bg-green-100 dark:bg-green-900/50"
                      : "bg-muted"
                  )}
                >
                  <User
                    className={cn(
                      "h-5 w-5",
                      inspection.verified_by_owner
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p
                    className={cn(
                      "text-xs",
                      inspection.verified_by_owner
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {inspection.verified_by_owner ? "✓ Confirmed" : "Pending"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-2",
              inspection.verified_by_renter
                ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
                : "border-muted"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    inspection.verified_by_renter
                      ? "bg-green-100 dark:bg-green-900/50"
                      : "bg-muted"
                  )}
                >
                  <User
                    className={cn(
                      "h-5 w-5",
                      inspection.verified_by_renter
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">Renter</p>
                  <p
                    className={cn(
                      "text-xs",
                      inspection.verified_by_renter
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {inspection.verified_by_renter ? "✓ Confirmed" : "Pending"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Metadata */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                {formatDate(inspection.timestamp || inspection.created_at)}
              </span>
            </div>

            {inspection.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  {formatLocation(inspection.location)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos section */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Photos</h2>
              <p className="text-sm text-muted-foreground">
                {inspection.photos.length} photo
                {inspection.photos.length !== 1 ? "s" : ""} documented
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {inspection.photos.map((photoUrl, index) => (
              <button
                key={index}
                onClick={() => setSelectedPhoto(photoUrl)}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={photoUrl}
                  alt={`Inspection photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Photo modal/lightbox */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close"
            >
              <AlertCircle className="h-6 w-6 rotate-45" />
            </Button>
            <img
              src={selectedPhoto}
              alt="Inspection photo"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <a
              href={selectedPhoto}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 right-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="secondary" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Original
              </Button>
            </a>
          </div>
        )}

        {/* Condition checklist */}
        {checklistItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Condition Checklist</h2>
                <p className="text-sm text-muted-foreground">
                  {checklistItems.length} items reviewed
                </p>
              </div>
            </div>

            {/* Status summary badges */}
            <div className="flex flex-wrap gap-2">
              {(["good", "fair", "damaged"] as const).map((status) => {
                const count = statusCounts[status] || 0;
                if (count === 0) return null;
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                return (
                  <div
                    key={status}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
                      config.bgColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.color)} />
                    <span className={config.color}>
                      {count} {config.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Checklist items */}
            <div className="space-y-2">
              {checklistItems.map((item, index) => {
                const status = item.status || "good";
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;

                return (
                  <Card key={index} className={cn("border-2", config.borderColor)}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                            config.bgColor
                          )}
                        >
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{item.item}</p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", config.bgColor, config.color)}
                            >
                              {config.label}
                            </Badge>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Condition notes */}
        {inspection.condition_notes && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-semibold">Additional Notes</h2>
            </div>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {inspection.condition_notes}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirmation status (replacing signature display) */}
        <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  Inspection Confirmed
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {inspection.verified_by_owner && inspection.verified_by_renter
                    ? "Both owner and renter have confirmed this inspection is accurate."
                    : inspection.verified_by_owner
                    ? "Owner has confirmed this inspection is accurate."
                    : inspection.verified_by_renter
                    ? "Renter has confirmed this inspection is accurate."
                    : "This inspection has been recorded."}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Record ID: {inspection.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues warning */}
        {hasIssues && (
          <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    Condition Issues Noted
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    {(statusCounts.fair || 0) > 0 && (
                      <span>{statusCounts.fair} item(s) in fair condition. </span>
                    )}
                    {(statusCounts.damaged || 0) > 0 && (
                      <span>{statusCounts.damaged} item(s) damaged. </span>
                    )}
                    Review the checklist above for details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom spacing for mobile */}
        <div className="h-4" />
      </div>
    </div>
  );
}
