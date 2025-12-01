import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { StepProgress } from "@/components/ui/step-progress";
import {
  Loader2,
  Sparkles,
  CreditCard,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Check,
  Package,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ownerUpgradeSchema = z.object({
  businessName: z.string().optional(),
  businessDescription: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  serviceArea: z.string().min(2, "Service area is required"),
  yearsExperience: z.coerce
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be a whole number")
    .nonnegative("Cannot be negative"),
  equipmentCategories: z.array(z.string()).min(1, "Select at least one category"),
  bankAccount: z.string().optional(),
});

type OwnerUpgradeForm = z.infer<typeof ownerUpgradeSchema>;

const EQUIPMENT_CATEGORY_OPTIONS = [
  { value: "Hiking & Backpacking", icon: "🥾" },
  { value: "Climbing", icon: "🧗" },
  { value: "Skiing & Snowboarding", icon: "⛷️" },
  { value: "Cycling", icon: "🚴" },
  { value: "Camping", icon: "⛺" },
  { value: "Water Sports", icon: "🏄" },
  { value: "Mountain Biking", icon: "🚵" },
  { value: "Running", icon: "🏃" },
  { value: "Fitness", icon: "💪" },
  { value: "Photography", icon: "📷" },
  { value: "Other", icon: "📦" },
];

const STEPS = [
  { id: 1, title: "Benefits", description: "Why become an owner" },
  { id: 2, title: "Location", description: "Where you operate" },
  { id: 3, title: "Equipment", description: "What you'll list" },
  { id: 4, title: "Payouts", description: "Get paid" },
];

const BENEFITS = [
  {
    icon: DollarSign,
    title: "Earn Passive Income",
    description: "Turn idle gear into revenue. Owners earn an average of $200-500/month.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Users,
    title: "Join a Community",
    description: "Connect with outdoor enthusiasts and help them experience adventures.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Calendar,
    title: "Flexible Schedule",
    description: "You control availability. Rent when it works for you.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: ShieldCheck,
    title: "Protected Rentals",
    description: "Every booking includes damage protection and secure payments.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

const OWNER_PERKS = [
  "Priority customer support",
  "Verified owner badge",
  "Analytics dashboard",
  "Direct messaging with renters",
  "Secure escrow payments",
  "Damage claim protection",
];

const OwnerUpgrade = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [authWarning, setAuthWarning] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
    trigger,
  } = useForm<OwnerUpgradeForm>({
    resolver: zodResolver(ownerUpgradeSchema),
    defaultValues: {
      equipmentCategories: [],
    },
  });

  const { data: existingBusinessInfo } = useQuery({
    queryKey: ["owner-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_profiles")
        .select("business_info")
        .eq("profile_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.business_info ?? null;
    },
  });

  useEffect(() => {
    if (!existingBusinessInfo || typeof existingBusinessInfo !== "object" || Array.isArray(existingBusinessInfo)) return;
    const info = existingBusinessInfo as Record<string, unknown>;
    if (info.name) setValue("businessName", String(info.name));
    if (info.description) setValue("businessDescription", String(info.description));
    if (info.location) setValue("location", String(info.location));
    if (info.serviceArea) setValue("serviceArea", String(info.serviceArea));
    if (info.yearsExperience !== undefined && info.yearsExperience !== null) {
      const parsedYears = Number(info.yearsExperience);
      if (!Number.isNaN(parsedYears)) {
        setValue("yearsExperience", parsedYears);
      }
    }
    if (info.bankAccount) setValue("bankAccount", String(info.bankAccount));
    const categories = (info as { equipmentCategories?: unknown }).equipmentCategories;
    if (Array.isArray(categories)) {
      setValue(
        "equipmentCategories",
        categories.map(String)
      );
    }
  }, [existingBusinessInfo, setValue]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login?redirect=/owner/become-owner");
    }
  }, [loading, user, navigate]);

  if (!user) {
    return null;
  }

  const handleNextStep = async () => {
    let isValid = true;

    if (currentStep === 2) {
      isValid = await trigger(["location", "serviceArea", "yearsExperience"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["equipmentCategories"]);
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setError(null);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const onSubmit = async (formData: OwnerUpgradeForm) => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    setAuthWarning(null);

    const businessInfo = {
      name: formData.businessName || null,
      description: formData.businessDescription || null,
      location: formData.location,
      serviceArea: formData.serviceArea,
      yearsExperience: formData.yearsExperience,
      equipmentCategories: formData.equipmentCategories,
      bankAccount: formData.bankAccount || null,
    };

    try {
      // Upsert owner profile first (single statement, avoids partial creation)
      const { error: ownerUpsertError } = await supabase
        .from("owner_profiles")
        .upsert(
          {
            profile_id: user.id,
            business_info: businessInfo,
          },
          { onConflict: "profile_id" }
        );
      if (ownerUpsertError) throw ownerUpsertError;

      // Update profile role next (core source of truth for capabilities)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "owner" })
        .eq("id", user.id);
      if (profileError) throw profileError;

      // Update auth metadata last (non-blocking; warn if it fails)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          role: "owner",
          businessName: formData.businessName,
          businessDescription: formData.businessDescription,
          location: formData.location,
          serviceArea: formData.serviceArea,
          yearsExperience: formData.yearsExperience,
          equipmentCategories: formData.equipmentCategories,
          bankAccount: formData.bankAccount,
        },
      });
      if (authError) {
        console.error("Auth metadata update failed:", authError);
        setAuthWarning("Owner upgrade saved, but we couldn't sync your auth metadata. Sign out/in if navigation seems off.");
      }

      setSuccess(true);
      timeoutRef.current = setTimeout(() => {
        try {
          navigate("/owner/dashboard?tab=equipment");
        } catch (navError) {
          console.error("Navigation failed after owner upgrade:", navError);
        }
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upgrade account.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategories = watch("equipmentCategories");

  // Success state celebration
  if (success) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-in fade-in zoom-in-95 duration-500 text-center space-y-6 max-w-md">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30">
              <Check className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome, Owner! 🎉
              </h1>
              <p className="text-muted-foreground">
                You&apos;re all set to start listing your equipment and earning.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["Verified Owner", "Secure Payouts", "Protected Listings"].map((perk) => (
                <Badge key={perk} variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  {perk}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">
              Redirecting to your owner dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 px-4 py-1.5">
            <Sparkles className="mr-2 h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Upgrade Your Account</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Become an Equipment Owner
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Turn your outdoor gear into income. List equipment, connect with renters, and start earning.
          </p>
        </div>

        {/* Step Progress */}
        <StepProgress steps={STEPS} currentStep={currentStep} />

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="space-y-6"
        >
          {/* Step 1: Benefits Overview */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              {/* Benefits Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {BENEFITS.map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <Card key={benefit.title} className="border-border/50 hover:border-primary/30 transition-colors">
                      <CardContent className="flex items-start gap-4 p-5">
                        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", benefit.bg)}>
                          <Icon className={cn("h-5 w-5", benefit.color)} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-semibold">{benefit.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {benefit.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Perks List */}
              <Card className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Star className="h-5 w-5 text-primary" />
                    What you&apos;ll unlock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {OWNER_PERKS.map((perk) => (
                      <div key={perk} className="flex items-center gap-2 text-sm">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="text-center space-y-3 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleNextStep}
                  className="gap-2 px-8"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  Takes about 2 minutes to complete
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Location & Business Details */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Where do you operate?
                  </CardTitle>
                  <CardDescription>
                    Tell renters where they can pick up your equipment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">
                        Business name <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="businessName"
                        placeholder="e.g., Summit Gear Rentals"
                        {...register("businessName")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearsExperience">
                        Years of experience <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="yearsExperience"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="e.g., 5"
                        {...register("yearsExperience", { valueAsNumber: true })}
                        className={errors.yearsExperience ? "border-destructive" : ""}
                      />
                      {errors.yearsExperience && (
                        <p className="text-sm text-destructive">{errors.yearsExperience.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location">
                        Base location <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="e.g., Boulder, CO"
                        {...register("location")}
                        className={errors.location ? "border-destructive" : ""}
                      />
                      {errors.location && (
                        <p className="text-sm text-destructive">{errors.location.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceArea">
                        Service area <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="serviceArea"
                        placeholder="e.g., Front Range, CO"
                        {...register("serviceArea")}
                        className={errors.serviceArea ? "border-destructive" : ""}
                      />
                      {errors.serviceArea && (
                        <p className="text-sm text-destructive">{errors.serviceArea.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">
                      About your rentals <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Textarea
                      id="businessDescription"
                      placeholder="Tell renters what makes your gear special, your experience level, or pickup arrangements..."
                      rows={3}
                      {...register("businessDescription")}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 3: Equipment Categories */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    What will you rent out?
                  </CardTitle>
                  <CardDescription>
                    Select the categories that match your equipment. Choose at least one.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Pick categories that match your gear
                    </p>
                    <Badge variant={selectedCategories.length > 0 ? "default" : "secondary"}>
                      {selectedCategories.length} selected
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {EQUIPMENT_CATEGORY_OPTIONS.map((option) => {
                      const isSelected = selectedCategories.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all hover:border-primary/50",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border/70 hover:bg-accent/50"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = new Set(selectedCategories);
                              if (checked) {
                                current.add(option.value);
                              } else {
                                current.delete(option.value);
                              }
                              setValue("equipmentCategories", Array.from(current), {
                                shouldValidate: true,
                              });
                            }}
                          />
                          <span className="text-xl" role="img" aria-hidden="true">
                            {option.icon}
                          </span>
                          <span className={cn("text-sm font-medium", isSelected && "text-primary")}>
                            {option.value}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {errors.equipmentCategories && (
                    <p className="text-sm text-destructive">{errors.equipmentCategories.message}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Payment Setup */}
          {currentStep === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    How should we pay you?
                  </CardTitle>
                  <CardDescription>
                    Add your payout details to receive earnings. You can always update this later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4 border border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">Secure Payments</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          We use bank-level encryption and hold funds in escrow until rentals are complete.
                          Your earnings are always protected.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">
                      Payment details <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="bankAccount"
                      placeholder="Bank account or payout method"
                      {...register("bankAccount")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to set this up later in your owner dashboard.
                    </p>
                  </div>

                  <div className="rounded-lg border border-dashed border-border/70 p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="text-sm font-medium">Ready to start earning?</p>
                        <p className="text-xs text-muted-foreground">
                          Complete your profile and list your first item today.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={submitting}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="gap-2 ml-auto"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="gap-2 ml-auto">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Become an Owner
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default OwnerUpgrade;
