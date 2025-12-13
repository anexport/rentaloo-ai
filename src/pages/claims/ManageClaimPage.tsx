import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, ExternalLink, Loader2, MessageSquare, LifeBuoy } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getClaimStatusColor, getClaimStatusText } from "@/lib/claim";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClaimStatus, RenterResponse } from "@/types/claim";

interface ClaimDetails {
  id: string;
  booking_id: string;
  damage_description: string;
  estimated_cost: number;
  evidence_photos: string[];
  repair_quotes: string[];
  status: ClaimStatus;
  filed_at: string;
  renter_response: RenterResponse | null;
  booking: {
    renter: {
      id: string;
      full_name: string | null;
      username: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
    equipment: {
      title: string;
      owner_id: string;
    } | null;
  } | null;
}

async function fetchClaimDetails(claimId: string, userId: string): Promise<ClaimDetails> {
  const { data, error } = await supabase
    .from("damage_claims")
    .select(
      `
      id,
      booking_id,
      damage_description,
      estimated_cost,
      evidence_photos,
      repair_quotes,
      status,
      filed_at,
      renter_response,
      booking:booking_requests(
        renter:renter_id(id, full_name, username, email, avatar_url),
        equipment:equipment(title, owner_id)
      )
    `
    )
    .eq("id", claimId)
    .single();

  if (error) throw error;

  const booking = data.booking as ClaimDetails["booking"];
  const equipment = booking?.equipment ?? null;

  if (!equipment || equipment.owner_id !== userId) {
    throw new Error("You are not authorized to view this claim");
  }

  return {
    ...(data as unknown as Omit<ClaimDetails, "evidence_photos" | "repair_quotes" | "booking" | "renter_response"> & {
      evidence_photos: string[] | null;
      repair_quotes: string[] | null;
      booking: unknown;
      renter_response: unknown;
    }),
    evidence_photos: (data as { evidence_photos: string[] | null }).evidence_photos ?? [],
    repair_quotes: (data as { repair_quotes: string[] | null }).repair_quotes ?? [],
    renter_response: (data as { renter_response: unknown }).renter_response as RenterResponse | null,
    booking,
  };
}

export default function ManageClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    data: claim,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["claim", claimId, user?.id],
    queryFn: () => fetchClaimDetails(claimId!, user!.id),
    enabled: !!claimId && !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const renterDisplayName = useMemo(() => {
    const renter = claim?.booking?.renter;
    if (!renter) return "Renter";
    return renter.full_name || renter.username || renter.email?.split("@")[0] || "Renter";
  }, [claim?.booking?.renter]);

  if (!claimId || !user) {
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>Invalid claim or not authenticated</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !claim) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return (
      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const equipmentTitle = claim.booking?.equipment?.title ?? "Equipment";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Button variant="ghost" className="px-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <CardTitle className="text-xl">Damage Claim</CardTitle>
                <p className="text-sm text-muted-foreground truncate">
                  {equipmentTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Filed {formatDistanceToNow(new Date(claim.filed_at))} ago · Renter:{" "}
                  {renterDisplayName}
                </p>
              </div>
              <Badge className={getClaimStatusColor(claim.status)}>
                {getClaimStatusText(claim.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Claimed amount</p>
                  <p className="text-2xl font-bold text-destructive">
                    ${claim.estimated_cost.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/messages">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Messages
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/support">
                      <LifeBuoy className="h-4 w-4 mr-2" />
                      Support
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Damage description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {claim.damage_description}
              </p>
            </div>

            {claim.evidence_photos.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Evidence photos</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {claim.evidence_photos.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      aria-label={`Open evidence photo ${index + 1} in new tab`}
                    >
                      <img
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="aspect-square w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[11px] text-foreground shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                        <ExternalLink className="h-3 w-3" />
                        Open
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {claim.repair_quotes.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Repair quotes</h3>
                <div className="space-y-2">
                  {claim.repair_quotes.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">Open quote</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Renter response</h3>
              {claim.renter_response ? (
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Action:</span>{" "}
                    {claim.renter_response.action}
                  </p>
                  {typeof claim.renter_response.counter_offer === "number" && (
                    <p className="text-sm">
                      <span className="font-medium">Counter offer:</span> $
                      {claim.renter_response.counter_offer.toFixed(2)}
                    </p>
                  )}
                  {claim.renter_response.notes && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {claim.renter_response.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Responded{" "}
                    {formatDistanceToNow(
                      new Date(claim.renter_response.responded_at)
                    )}{" "}
                    ago
                  </p>
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    Waiting for the renter to respond.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

