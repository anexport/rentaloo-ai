import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mountain,
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  MapPin,
  ArrowRight,
  Check,
  Shield,
  CreditCard,
  Award,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { StepProgress } from "@/components/ui/step-progress";
import { PasswordStrength } from "@/components/ui/password-strength";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Step 1 Schema
const step1Schema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    businessName: z.string().optional(),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Step 2 Schema
const step2Schema = z.object({
  location: z.string().min(2, "Please enter your location"),
  serviceArea: z.string().min(2, "Please enter your service area"),
  yearsExperience: z.coerce
    .number()
    .min(1, "Please enter your years of experience")
    .int("Years must be a whole number"),
});

// Step 3 Schema
const step3Schema = z.object({
  equipmentCategories: z
    .array(z.string())
    .min(1, "Please select at least one equipment category"),
});

// Step 4 Schema (optional - bank account can be skipped)
const step4Schema = z.object({
  bankAccount: z.string().optional(),
});

// Combined Schema
const ownerSchema = z.intersection(
  z.intersection(z.intersection(step1Schema, step2Schema), step3Schema),
  step4Schema
);

type OwnerFormData = z.infer<typeof ownerSchema>;

const STEPS = [
  { id: 1, title: "Account", description: "Basic information" },
  { id: 2, title: "Details", description: "Location & service" },
  { id: 3, title: "Categories", description: "Equipment types" },
  { id: 4, title: "Payment", description: "Bank information" },
];

const EQUIPMENT_CATEGORY_OPTIONS = [
  {
    value: "Hiking & Backpacking",
    label: "Hiking & Backpacking",
    description: "Trails and gear",
  },
  {
    value: "Climbing",
    label: "Climbing",
    description: "Rock and ice climbing",
  },
  {
    value: "Skiing & Snowboarding",
    label: "Skiing & Snowboarding",
    description: "Winter sports",
  },
  {
    value: "Cycling",
    label: "Cycling",
    description: "Road and mountain bikes",
  },
  {
    value: "Camping",
    label: "Camping",
    description: "Tents and gear",
  },
  {
    value: "Water Sports",
    label: "Water Sports",
    description: "Kayaks, SUPs, and more",
  },
  {
    value: "Mountain Biking",
    label: "Mountain Biking",
    description: "Trail and downhill",
  },
  {
    value: "Running",
    label: "Running",
    description: "Trail running gear",
  },
  {
    value: "Fitness",
    label: "Fitness",
    description: "Exercise equipment",
  },
  {
    value: "Photography",
    label: "Photography",
    description: "Cameras and lenses",
  },
  {
    value: "Other",
    label: "Other",
    description: "Additional equipment",
  },
];

type OwnerSignupFormProps = {
  onSuccess: (email: string) => void;
  onBack: () => void;
  onShowLogin: () => void;
  onScrollToTop: () => void;
};

const OwnerSignupForm = ({
  onSuccess,
  onBack,
  onShowLogin,
  onScrollToTop,
}: OwnerSignupFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();

  // Scroll to top when step changes
  useEffect(() => {
    onScrollToTop();
  }, [currentStep, onScrollToTop]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    mode: "onBlur",
    defaultValues: {
      equipmentCategories: [],
      bankAccount: "",
    },
  });

  const password = watch("password");
  const selectedCategories = watch("equipmentCategories");

  const handleNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger([
        "fullName",
        "email",
        "password",
        "confirmPassword",
      ]);
    } else if (currentStep === 2) {
      isValid = await trigger(["location", "serviceArea", "yearsExperience"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["equipmentCategories"]);
    } else if (currentStep === 4) {
      // Step 4 is optional, so we can always proceed
      isValid = true;
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setError(null);
    }
  };

  const handlePrevStep = () => {
    if (isLoading) return;
    
    if (currentStep === 1) {
      onBack();
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 1));
      setError(null);
    }
  };

  const onSubmit = async (data: OwnerFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signUp(data.email, data.password, {
        role: "owner",
        fullName: data.fullName,
        businessName: data.businessName,
        location: data.location,
        serviceArea: data.serviceArea,
        equipmentCategories: data.equipmentCategories,
        yearsExperience: data.yearsExperience,
        bankAccount: data.bankAccount || undefined,
      });

      if (error) {
        setError(error.message);
      } else {
        onSuccess(data.email);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPayment = () => {
    if (isLoading) return;
    
    setValue("bankAccount", "");
    void handleSubmit(onSubmit)();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pb-4">
        <div className="flex justify-center mb-2">
          <Mountain className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Join as an Owner</h2>
        <p className="text-base text-muted-foreground">
          Create your account to start listing your equipment
        </p>
        <div className="flex justify-center mt-2">
          <Badge variant="secondary" className="text-sm">
            Start Earning Today
          </Badge>
        </div>
      </div>

      {/* Step Progress */}
      <StepProgress steps={STEPS} currentStep={currentStep} />

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-6"
      >
        {/* Step 1: Account Setup */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                type="text"
                autoComplete="name"
                {...register("fullName")}
                placeholder="John Doe"
                className={errors.fullName ? "border-destructive" : ""}
                aria-invalid={!!errors.fullName}
                aria-describedby={
                  errors.fullName ? "fullName-error" : undefined
                }
              />
              {errors.fullName && (
                <p id="fullName-error" className="text-sm text-destructive">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Business Name (Optional)
              </Label>
              <Input
                id="businessName"
                type="text"
                autoComplete="organization"
                {...register("businessName")}
                placeholder="Your business name"
                className={errors.businessName ? "border-destructive" : ""}
                aria-invalid={!!errors.businessName}
                aria-describedby={
                  errors.businessName ? "businessName-error" : undefined
                }
              />
              {errors.businessName && (
                <p id="businessName-error" className="text-sm text-destructive">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="off"
                spellCheck="false"
                {...register("email")}
                placeholder="john@example.com"
                className={errors.email ? "border-destructive" : ""}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("password")}
                  placeholder="Create a strong password"
                  className={errors.password ? "border-destructive pr-12" : "pr-12"}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <PasswordStrength password={password || ""} />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Confirm Password
                <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  placeholder="Confirm your password"
                  className={errors.confirmPassword ? "border-destructive pr-12" : "pr-12"}
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={
                    errors.confirmPassword ? "confirmPassword-error" : undefined
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p
                  id="confirmPassword-error"
                  className="text-sm text-destructive"
                >
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Location & Service Details */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Location
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="location"
                type="text"
                autoComplete="address-level2"
                {...register("location")}
                placeholder="San Francisco, CA"
                className={errors.location ? "border-destructive" : ""}
                aria-invalid={!!errors.location}
                aria-describedby={
                  errors.location ? "location-error" : undefined
                }
              />
              {errors.location && (
                <p id="location-error" className="text-sm text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Service Area */}
            <div className="space-y-2">
              <Label htmlFor="serviceArea" className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                Service Area
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serviceArea"
                type="text"
                autoComplete="off"
                {...register("serviceArea")}
                placeholder="50 miles radius"
                className={errors.serviceArea ? "border-destructive" : ""}
                aria-invalid={!!errors.serviceArea}
                aria-describedby={
                  errors.serviceArea
                    ? "serviceArea-error"
                    : "serviceArea-description"
                }
              />
              <p
                id="serviceArea-description"
                className="text-xs text-muted-foreground"
              >
                The area you're willing to serve for equipment rentals
              </p>
              {errors.serviceArea && (
                <p id="serviceArea-error" className="text-sm text-destructive">
                  {errors.serviceArea.message}
                </p>
              )}
            </div>

            {/* Years of Experience */}
            <div className="space-y-2">
              <Label
                htmlFor="yearsExperience"
                className="flex items-center gap-2"
              >
                <Award className="h-4 w-4 text-muted-foreground" />
                Years of Experience
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="yearsExperience"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min="1"
                {...register("yearsExperience", { valueAsNumber: true })}
                placeholder="5"
                className={errors.yearsExperience ? "border-destructive" : ""}
                aria-invalid={!!errors.yearsExperience}
                aria-describedby={
                  errors.yearsExperience ? "yearsExperience-error" : undefined
                }
              />
              {errors.yearsExperience && (
                <p
                  id="yearsExperience-error"
                  className="text-sm text-destructive"
                >
                  {errors.yearsExperience.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Equipment Categories */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-1">
                What equipment do you offer?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select all that apply
              </p>
            </div>

            <CheckboxGroup
              options={EQUIPMENT_CATEGORY_OPTIONS}
              value={selectedCategories || []}
              onChange={(value) =>
                setValue("equipmentCategories", value, { shouldValidate: true })
              }
              error={errors.equipmentCategories?.message}
              columns={2}
            />
          </div>
        )}

        {/* Step 4: Payment Information */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-1">
                Payment Information
              </h3>
              <p className="text-sm text-muted-foreground">
                Add your bank details to receive payouts
              </p>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your bank information is encrypted and secure. We use bank-level
                encryption to protect your data. You can update this anytime.
              </AlertDescription>
            </Alert>

            {/* Bank Account */}
            <div className="space-y-2">
              <Label htmlFor="bankAccount" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Bank Account Number
              </Label>
              <Input
                id="bankAccount"
                {...register("bankAccount")}
                placeholder="Enter your bank account number"
                className={errors.bankAccount ? "border-destructive" : ""}
                aria-invalid={!!errors.bankAccount}
                aria-describedby={
                  errors.bankAccount
                    ? "bankAccount-error"
                    : "bankAccount-description"
                }
              />
              <p
                id="bankAccount-description"
                className="text-xs text-muted-foreground"
              >
                This is optional. You can add it later in your account settings.
              </p>
              {errors.bankAccount && (
                <p id="bankAccount-error" className="text-sm text-destructive">
                  {errors.bankAccount.message}
                </p>
              )}
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={handleSkipPayment}
                className="text-sm text-muted-foreground"
                disabled={isLoading}
              >
                Skip for now, I'll add this later
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            className="flex-1"
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < STEPS.length ? (
            <Button type="button" onClick={handleNextStep} className="flex-1">
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">Creating Account...</span>
                </>
              ) : (
                <>
                  Create Account
                  <Check className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Login Link */}
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              onClick={isLoading ? undefined : onShowLogin}
              disabled={isLoading}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default OwnerSignupForm;
