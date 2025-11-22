import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, MapPin, Calendar, User } from "lucide-react";
import type { Database } from "@/lib/database.types";

type InspectionData = Database["public"]["Tables"]["equipment_inspections"]["Row"];

export default function InspectionView() {
  const { bookingId, inspectionType } = useParams<{
    bookingId: string;
    inspectionType: "pickup" | "return";
  }>();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading inspection...</p>
        </div>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-destructive mb-4">{error || "Inspection not found"}</p>
              <Button onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl capitalize">
                {inspectionType} Inspection
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Completed on {formatDate(inspection.timestamp || inspection.created_at)}
              </p>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Verification Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Owner Verified</p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.verified_by_owner ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-gray-500">Not verified</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Renter Verified</p>
                    <p className="text-xs text-muted-foreground">
                      {inspection.verified_by_renter ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-gray-500">Not verified</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inspection.timestamp && (
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatDate(inspection.timestamp)}
                </span>
              </div>
            )}

            {inspection.location && (
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Location:{" "}
                  {typeof inspection.location === "object" &&
                  inspection.location !== null &&
                  "latitude" in inspection.location &&
                  "longitude" in inspection.location
                    ? `${(inspection.location as { latitude: number; longitude: number }).latitude.toFixed(6)}, ${(inspection.location as { latitude: number; longitude: number }).longitude.toFixed(6)}`
                    : "Not recorded"}
                </span>
              </div>
            )}
          </div>

          {/* Photos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Inspection Photos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {inspection.photos.map((photoUrl, index) => (
                <a
                  key={index}
                  href={photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors group"
                >
                  <img
                    src={photoUrl}
                    alt={`Inspection photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
                </a>
              ))}
            </div>
          </div>

          {/* Condition Notes */}
          {inspection.condition_notes && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Condition Notes</h3>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm whitespace-pre-wrap">
                    {inspection.condition_notes}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Checklist Items */}
          {inspection.checklist_items &&
            Array.isArray(inspection.checklist_items) &&
            inspection.checklist_items.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Checklist</h3>
                <Card>
                  <CardContent className="pt-6">
                    <ul className="space-y-2">
                      {(
                        inspection.checklist_items as Array<{
                          item: string;
                          checked: boolean;
                        }>
                      ).map((item, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle
                            className={`h-4 w-4 ${
                              item.checked
                                ? "text-green-600"
                                : "text-gray-300"
                            }`}
                          />
                          <span className="text-sm">{item.item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inspection.owner_signature && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Owner Signature</h3>
                <Card>
                  <CardContent className="pt-6">
                    <img
                      src={inspection.owner_signature}
                      alt="Owner signature"
                      className="w-full h-32 object-contain border border-border rounded"
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {inspection.renter_signature && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Renter Signature</h3>
                <Card>
                  <CardContent className="pt-6">
                    <img
                      src={inspection.renter_signature}
                      alt="Renter signature"
                      className="w-full h-32 object-contain border border-border rounded"
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
