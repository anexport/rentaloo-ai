import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Building2, Save, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  // Renter specific
  experience_level: z.string().optional(),
  preferences: z.string().optional(),
  // Owner specific
  business_name: z.string().optional(),
  business_description: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfileSettings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userRole, setUserRole] = useState<"renter" | "owner" | null>(null);
  const [renterProfileId, setRenterProfileId] = useState<string | null>(null);
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        // Fetch base profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setUserRole(profile.role);

        // Fetch role-specific profile
        if (profile.role === "renter") {
          const { data: renterProfile } = await supabase
            .from("renter_profiles")
            .select("*")
            .eq("profile_id", user.id)
            .single();

          if (renterProfile) {
            setRenterProfileId(renterProfile.id);
            setValue("experience_level", renterProfile.experience_level || "");
            setValue(
              "preferences",
              renterProfile.preferences
                ? JSON.stringify(renterProfile.preferences, null, 2)
                : ""
            );
          }
        } else if (profile.role === "owner") {
          const { data: ownerProfile } = await supabase
            .from("owner_profiles")
            .select("*")
            .eq("profile_id", user.id)
            .single();

          if (ownerProfile) {
            setOwnerProfileId(ownerProfile.id);
            const businessInfo = ownerProfile.business_info as {
              name?: string;
              description?: string;
            } | null;
            setValue("business_name", businessInfo?.name || "");
            setValue("business_description", businessInfo?.description || "");
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchProfile();
  }, [user, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      // Update role-specific profile
      if (userRole === "renter" && renterProfileId) {
        const preferences = data.preferences
          ? JSON.parse(data.preferences)
          : null;

        const { error } = await supabase
          .from("renter_profiles")
          .update({
            experience_level: data.experience_level || null,
            preferences,
            updated_at: new Date().toISOString(),
          })
          .eq("id", renterProfileId);

        if (error) throw error;
      } else if (userRole === "owner" && ownerProfileId) {
        const businessInfo = {
          name: data.business_name || null,
          description: data.business_description || null,
        };

        const { error } = await supabase
          .from("owner_profiles")
          .update({
            business_info: businessInfo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ownerProfileId);

        if (error) throw error;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const getDashboardLink = () => {
    return userRole === "owner" ? "/owner/dashboard" : "/renter/dashboard";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            to={getDashboardLink()}
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Profile updated successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {userRole === "owner" ? (
                <Building2 className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              <span>Profile Settings</span>
            </CardTitle>
            <CardDescription>
              {userRole === "owner"
                ? "Manage your business information and preferences"
                : "Manage your rental preferences and experience"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                void handleSubmit(onSubmit)(e);
              }}
              className="space-y-6"
            >
              {userRole === "renter" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="experience_level">Experience Level</Label>
                    <select
                      id="experience_level"
                      {...register("experience_level")}
                      className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select your experience</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="professional">Professional</option>
                    </select>
                    {errors.experience_level && (
                      <p className="text-sm text-red-600">
                        {errors.experience_level.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferences">
                      Preferences (JSON format)
                    </Label>
                    <Textarea
                      id="preferences"
                      {...register("preferences")}
                      placeholder='{"favorite_sports": ["skiing", "hiking"], "budget": "moderate"}'
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Add your preferences in JSON format
                    </p>
                    {errors.preferences && (
                      <p className="text-sm text-red-600">
                        {errors.preferences.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              {userRole === "owner" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="business_name">Business Name</Label>
                    <Input
                      id="business_name"
                      {...register("business_name")}
                      placeholder="Your Business Name"
                    />
                    {errors.business_name && (
                      <p className="text-sm text-red-600">
                        {errors.business_name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="business_description">
                      Business Description
                    </Label>
                    <Textarea
                      id="business_description"
                      {...register("business_description")}
                      placeholder="Tell renters about your business..."
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe your business and what makes your equipment
                      special
                    </p>
                    {errors.business_description && (
                      <p className="text-sm text-red-600">
                        {errors.business_description.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account Type:</span>
              <span className="font-medium capitalize">{userRole}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ProfileSettings;
