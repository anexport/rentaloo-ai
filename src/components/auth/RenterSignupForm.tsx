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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { StepProgress } from "@/components/ui/step-progress";
import { PasswordStrength } from "@/components/ui/password-strength";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Step 1 Schema
const step1Schema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
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
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
});

// Step 3 Schema
const step3Schema = z.object({
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
});

// Combined Schema
const renterSchema = z.intersection(
  z.intersection(step1Schema, step2Schema),
  step3Schema
);

type RenterFormData = z.infer<typeof renterSchema>;

const STEPS = [
  { id: 1, title: "Account", description: "Basic information" },
  { id: 2, title: "Details", description: "Location & experience" },
  { id: 3, title: "Interests", description: "Your activities" },
];

const INTEREST_OPTIONS = [
  { value: "hiking", label: "Hiking", description: "Trails and backpacking" },
  {
    value: "climbing",
    label: "Climbing",
    description: "Rock and ice climbing",
  },
  { value: "skiing", label: "Skiing", description: "Alpine and backcountry" },
  {
    value: "snowboarding",
    label: "Snowboarding",
    description: "Resort and powder",
  },
  { value: "cycling", label: "Cycling", description: "Road and gravel" },
  { value: "camping", label: "Camping", description: "Car and backcountry" },
  { value: "kayaking", label: "Kayaking", description: "Rivers and lakes" },
  {
    value: "paddleboarding",
    label: "Paddleboarding",
    description: "SUP adventures",
  },
  { value: "surfing", label: "Surfing", description: "Ocean waves" },
  {
    value: "mountain-biking",
    label: "Mountain Biking",
    description: "Trails and jumps",
  },
  { value: "running", label: "Running", description: "Trail running" },
];

const EXPERIENCE_LEVELS = [
  {
    value: "beginner",
    label: "Beginner",
    description: "Just starting out",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Experienced enthusiast",
  },
];

type RenterSignupFormProps = {
  onSuccess: (email: string) => void;
  onBack: () => void;
  onShowLogin: () => void;
  onScrollToTop: () => void;
};

const RenterSignupForm = ({
  onSuccess,
  onBack,
  onShowLogin,
  onScrollToTop,
}: RenterSignupFormProps) => {
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
  } = useForm<RenterFormData>({
    resolver: zodResolver(renterSchema),
    mode: "onBlur",
    defaultValues: {
      interests: [],
      experienceLevel: undefined,
    },
  });

  const password = watch("password");
  const selectedInterests = watch("interests");
  const experienceLevel = watch("experienceLevel");

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
      isValid = await trigger(["location", "experienceLevel"]);
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

  const onSubmit = async (data: RenterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signUp(data.email, data.password, {
        role: "renter",
        fullName: data.fullName,
        location: data.location,
        interests: data.interests,
        experienceLevel: data.experienceLevel,
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pb-4">
        <div className="flex justify-center mb-2">
          <Mountain className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Join as a Renter</h2>
        <p className="text-base text-muted-foreground">
          Create your account to start renting outdoor equipment
        </p>
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
                <p id="fullName-error" className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors.fullName.message}</span>
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
                <p id="email-error" className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors.email.message}</span>
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
                <p id="password-error" className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors.password.message}</span>
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

        {/* Step 2: Location & Experience */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-1">
                Help us personalize your experience
              </h3>
              <p className="text-sm text-muted-foreground">
                We'll show you the most relevant equipment near you
              </p>
            </div>

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
                  errors.location ? "location-error" : "location-description"
                }
              />
              <p
                id="location-description"
                className="text-xs text-muted-foreground"
              >
                We'll use this to show you nearby equipment
              </p>
              {errors.location && (
                <p id="location-error" className="text-sm text-destructive">
                  {errors.location.message}
                </p>
              )}
            </div>

            {/* Experience Level */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Experience Level
                <span className="text-destructive">*</span>
              </Label>
              <RadioGroup
                value={experienceLevel || ""}
                onValueChange={(value) =>
                  setValue(
                    "experienceLevel",
                    value as "beginner" | "intermediate" | "advanced",
                    { shouldValidate: true }
                  )
                }
                role="group"
                aria-label="Experience level selection"
              >
                <div className="space-y-3">
                  {EXPERIENCE_LEVELS.map((level) => (
                    <div
                      key={level.value}
                      className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent ${
                        experienceLevel === level.value
                          ? "border-primary bg-accent"
                          : ""
                      }`}
                    >
                      <RadioGroupItem value={level.value} id={level.value} />
                      <div className="flex-1">
                        <Label
                          htmlFor={level.value}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {level.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {level.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
              {errors.experienceLevel && (
                <p className="text-sm text-destructive">
                  {errors.experienceLevel.message}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Interests */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold mb-1">
                What are you interested in?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select all activities that interest you
              </p>
            </div>

            <CheckboxGroup
              options={INTEREST_OPTIONS}
              value={selectedInterests || []}
              onChange={(value) =>
                setValue("interests", value, { shouldValidate: true })
              }
              error={errors.interests?.message}
              columns={2}
            />
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

export default RenterSignupForm;
