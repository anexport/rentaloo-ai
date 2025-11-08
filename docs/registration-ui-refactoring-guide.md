# Registration Pages UI Refactoring Guide

**Version:** 1.0  
**Date:** November 8, 2025  
**Target Files:**
- `/src/pages/auth/OwnerRegistration.tsx`
- `/src/pages/auth/RenterRegistration.tsx`
- `/src/pages/auth/LoginPage.tsx`

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Airbnb Design Principles](#airbnb-design-principles)
4. [Refactoring Strategy](#refactoring-strategy)
5. [Implementation Details](#implementation-details)
6. [Component Specifications](#component-specifications)
7. [Code Examples](#code-examples)
8. [Accessibility Requirements](#accessibility-requirements)
9. [Testing Checklist](#testing-checklist)

---

## Executive Summary

### Goals
- Transform registration pages to follow Airbnb-inspired design system
- Implement proper shadcn/ui components for consistency
- Improve user experience with progressive disclosure and better visual hierarchy
- Enhance accessibility and mobile responsiveness
- Reduce cognitive load with multi-step forms

### Key Improvements
1. **Multi-step forms** instead of long single-page forms
2. **Progress indicators** to show completion status
3. **Better visual hierarchy** with proper spacing and typography
4. **Enhanced form controls** using shadcn RadioGroup, Checkbox, and Select
5. **Password strength indicator** for security feedback
6. **Form field descriptions** with tooltips and helper text
7. **Success animations** and micro-interactions
8. **Responsive layout** optimized for mobile and desktop

---

## Current State Analysis

### Issues Identified

#### 1. **Form Length & Cognitive Overload**
- **Owner Registration:** 10+ fields on a single page
- **Renter Registration:** 7+ fields on a single page
- Users face decision fatigue with all fields visible at once

#### 2. **UI Component Usage**
- Using Button components for checkbox-like selections (categories, interests)
- No progress indication for form completion
- No password strength feedback
- Limited use of shadcn form components (Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage)

#### 3. **Visual Hierarchy**
- All fields have equal visual weight
- No clear grouping of related fields
- Bank account field appears too prominent for a sensitive input

#### 4. **Airbnb Style Gaps**
- Missing the clean, spacious layout Airbnb is known for
- No progressive disclosure of information
- Lacks the friendly, conversational tone
- Missing visual feedback during interactions

#### 5. **Accessibility Concerns**
- Button-based selections may confuse screen readers
- No ARIA labels for complex form sections
- Password toggle lacks proper ARIA attributes

---

## Airbnb Design Principles

### Core Principles to Implement

#### 1. **Unified & Universal**
- Consistent spacing system (4px base unit)
- Unified color palette
- Consistent component behavior across forms

#### 2. **Iconic & Conversational**
- Use icons strategically to guide users
- Friendly, clear microcopy
- Informative placeholder text

#### 3. **Focused & Flowing**
- One primary action per screen
- Clear visual flow from top to bottom
- Minimize distractions

#### 4. **Responsive & Adaptive**
- Mobile-first approach
- Touch-friendly targets (min 44px)
- Adaptive layouts for all screen sizes

---

## Refactoring Strategy

### Phase 1: Component Setup (30 minutes)
1. Install missing shadcn components
2. Create custom form components
3. Set up form step components

### Phase 2: Multi-Step Form Implementation (2-3 hours per registration type)
1. Break forms into logical steps
2. Implement step navigation
3. Add progress indicators
4. Implement form state persistence

### Phase 3: Enhanced Components (1-2 hours)
1. Replace button-based selections with proper components
2. Add password strength indicator
3. Implement form field descriptions
4. Add success animations

### Phase 4: Polish & Testing (1-2 hours)
1. Responsive design testing
2. Accessibility audit
3. Cross-browser testing
4. Performance optimization

---

## Implementation Details

### Step 1: Install Required shadcn Components

Run these commands in your terminal:

```bash
npx shadcn@latest add form
npx shadcn@latest add radio-group
npx shadcn@latest add checkbox
npx shadcn@latest add select
npx shadcn@latest add tooltip
npx shadcn@latest add progress
npx shadcn@latest add separator
npx shadcn@latest add alert
npx shadcn@latest add badge
```

### Step 2: Create Custom Components

#### 2.1: Password Strength Indicator Component

**File:** `/src/components/ui/password-strength.tsx`

```tsx
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthProps {
  password: string;
}

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength += 25;
  
  return strength;
};

const getStrengthLabel = (strength: number) => {
  if (strength === 0) return { label: "", color: "" };
  if (strength <= 25) return { label: "Weak", color: "text-destructive" };
  if (strength <= 50) return { label: "Fair", color: "text-orange-500" };
  if (strength <= 75) return { label: "Good", color: "text-yellow-500" };
  return { label: "Strong", color: "text-green-500" };
};

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const { label, color } = getStrengthLabel(strength);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <Progress value={strength} className="h-2" />
      <p className={cn("text-xs font-medium", color)}>{label}</p>
    </div>
  );
}
```

#### 2.2: Step Progress Indicator Component

**File:** `/src/components/ui/step-progress.tsx`

```tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                  currentStep > step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "border-primary bg-background text-primary"
                    : "border-muted bg-background text-muted-foreground"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    currentStep >= step.id
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-8">
                <div
                  className={cn(
                    "h-full transition-all",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 2.3: Form Field with Icon Component

**File:** `/src/components/ui/form-field-with-icon.tsx`

```tsx
import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldWithIconProps {
  id: string;
  label: string;
  icon: ReactNode;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  type?: string;
  className?: string;
  [key: string]: any; // For register props
}

export function FormFieldWithIcon({
  id,
  label,
  icon,
  placeholder,
  description,
  error,
  required,
  type = "text",
  className,
  ...inputProps
}: FormFieldWithIconProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        {icon}
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        className={cn(error && "border-destructive", className)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
        {...inputProps}
      />
      {description && !error && (
        <p id={`${id}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
```

#### 2.4: Multi-Select Checkbox Group Component

**File:** `/src/components/ui/checkbox-group.tsx`

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  columns?: number;
}

export function CheckboxGroup({
  options,
  value,
  onChange,
  label,
  error,
  columns = 2,
}: CheckboxGroupProps) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-base font-medium">{label}</Label>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
              value.includes(option.value) && "border-primary bg-accent"
            )}
            onClick={() => handleToggle(option.value)}
          >
            <Checkbox
              id={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={() => handleToggle(option.value)}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={option.value}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

---

## Component Specifications

### Renter Registration - Multi-Step Breakdown

#### **Step 1: Account Setup** (Basic Information)
**Fields:**
- Full Name
- Email
- Password (with strength indicator)
- Confirm Password

**UI Elements:**
- Logo and "Join as a Renter" heading
- Progress indicator (Step 1 of 3)
- "Continue" button (primary action)
- "Already have an account? Sign in" link

**Validation:**
- Real-time email validation
- Password strength check
- Password match validation

---

#### **Step 2: Location & Experience**
**Fields:**
- Location (with icon - MapPin)
- Experience Level (Radio Group)
  - Beginner
  - Intermediate
  - Advanced

**UI Elements:**
- Progress indicator (Step 2 of 3)
- "Back" and "Continue" buttons
- Friendly helper text: "Help us personalize your experience"

**Design Notes:**
- Use RadioGroup component instead of buttons
- Add subtle descriptions under each experience level
- Implement location autocomplete (future enhancement)

---

#### **Step 3: Interests & Preferences**
**Fields:**
- Interests (Checkbox Group)
  - Display with icons for each activity
  - Multi-select with proper checkbox UI

**UI Elements:**
- Progress indicator (Step 3 of 3)
- "Back" and "Create Account" buttons
- Success animation on submission
- Loading state with spinner

**Design Notes:**
- Use CheckboxGroup component
- Add activity icons (from lucide-react)
- Minimum 1 selection required

---

### Owner Registration - Multi-Step Breakdown

#### **Step 1: Account Setup** (Basic Information)
**Fields:**
- Full Name
- Business Name (Optional)
- Email
- Password (with strength indicator)
- Confirm Password

**UI Elements:**
- Logo and "Join as an Owner" heading
- Progress indicator (Step 1 of 4)
- Badge: "Start Earning Today"
- "Continue" button

---

#### **Step 2: Location & Service Details**
**Fields:**
- Location (with MapPin icon)
- Service Area (with Radius icon)
- Years of Experience (with Award icon)

**UI Elements:**
- Progress indicator (Step 2 of 4)
- Helper text for service area
- Tooltip explaining service area
- "Back" and "Continue" buttons

---

#### **Step 3: Equipment Categories**
**Fields:**
- Equipment Categories (Checkbox Group)
  - Multi-select with icons
  - Minimum 1 selection

**UI Elements:**
- Progress indicator (Step 3 of 4)
- "Select all that apply" helper text
- Category icons for each option
- "Back" and "Continue" buttons

---

#### **Step 4: Payment Information**
**Fields:**
- Bank Account Number (masked input)

**UI Elements:**
- Progress indicator (Step 4 of 4)
- Lock icon for security
- Alert component with security message
- "You can update this later" skip option
- "Back" and "Create Account" buttons

**Security Notes:**
- Add Shield icon
- Prominent security badge
- Clear explanation of encryption
- Optional completion (can skip and add later)

---

## Code Examples

### Example 1: Refactored Renter Registration (Complete)

**File:** `/src/pages/auth/RenterRegistration.tsx`

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  interests: z
    .array(z.string())
    .min(1, "Please select at least one interest"),
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
  { value: "climbing", label: "Climbing", description: "Rock and ice climbing" },
  { value: "skiing", label: "Skiing", description: "Alpine and backcountry" },
  { value: "snowboarding", label: "Snowboarding", description: "Resort and powder" },
  { value: "cycling", label: "Cycling", description: "Road and gravel" },
  { value: "camping", label: "Camping", description: "Car and backcountry" },
  { value: "kayaking", label: "Kayaking", description: "Rivers and lakes" },
  { value: "paddleboarding", label: "Paddleboarding", description: "SUP adventures" },
  { value: "surfing", label: "Surfing", description: "Ocean waves" },
  { value: "mountain-biking", label: "Mountain Biking", description: "Trails and jumps" },
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

const RenterRegistration = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUp } = useAuth();
  const navigate = useNavigate();

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
      isValid = await trigger(["fullName", "email", "password", "confirmPassword"]);
    } else if (currentStep === 2) {
      isValid = await trigger(["location", "experienceLevel"]);
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
        void navigate("/verify", { state: { email: data.email } });
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to home</span>
          </Link>
        </div>

        <Card className="border-none shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex justify-center mb-2">
              <Mountain className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Join as a Renter</CardTitle>
            <CardDescription className="text-base">
              Create your account to start renting outdoor equipment
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-10 pb-8">
            {/* Step Progress */}
            <StepProgress steps={STEPS} currentStep={currentStep} />

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-6">
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
                    </Label>
                    <Input
                      id="fullName"
                      {...register("fullName")}
                      placeholder="John Doe"
                      className={errors.fullName ? "border-destructive" : ""}
                    />
                    {errors.fullName && (
                      <p className="text-sm text-destructive">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="john@example.com"
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        placeholder="Create a strong password"
                        className={errors.password ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                      <p className="text-sm text-destructive">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...register("confirmPassword")}
                        placeholder="Confirm your password"
                        className={errors.confirmPassword ? "border-destructive" : ""}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                      <p className="text-sm text-destructive">
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
                    </Label>
                    <Input
                      id="location"
                      {...register("location")}
                      placeholder="San Francisco, CA"
                      className={errors.location ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      We'll use this to show you nearby equipment
                    </p>
                    {errors.location && (
                      <p className="text-sm text-destructive">
                        {errors.location.message}
                      </p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Experience Level</Label>
                    <RadioGroup
                      value={experienceLevel}
                      onValueChange={(value) =>
                        setValue("experienceLevel", value as any)
                      }
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
                            onClick={() =>
                              setValue("experienceLevel", level.value as any)
                            }
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
                    onChange={(value) => setValue("interests", value)}
                    error={errors.interests?.message}
                    columns={2}
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
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
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RenterRegistration;
```

### Example 2: Owner Registration Structure

**Key Differences from Renter:**
- 4 steps instead of 3
- Step 3: Equipment Categories (CheckboxGroup)
- Step 4: Payment Information (optional, can skip)
- Use Alert component for bank account security message
- Add Shield icon and Badge for trust signals

**Step 4 Implementation Snippet:**

```tsx
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
      />
      {errors.bankAccount && (
        <p className="text-sm text-destructive">
          {errors.bankAccount.message}
        </p>
      )}
    </div>

    <div className="text-center">
      <Button
        type="button"
        variant="link"
        onClick={() => {
          setValue("bankAccount", "");
          void handleSubmit(onSubmit)();
        }}
        className="text-sm text-muted-foreground"
      >
        Skip for now, I'll add this later
      </Button>
    </div>
  </div>
)}
```

---

## Accessibility Requirements

### ARIA Labels
- Add `aria-label` to all icon buttons
- Use `aria-invalid` on error fields
- Add `aria-describedby` linking fields to error messages
- Add `role="group"` to checkbox/radio groups

### Keyboard Navigation
- Ensure all interactive elements are keyboard accessible
- Add focus visible states
- Support Enter key for form submission
- Support Escape key to close modals

### Screen Reader Support
- Use semantic HTML elements
- Add proper heading hierarchy
- Include live regions for dynamic content
- Add skip navigation links

### Color Contrast
- Ensure all text meets WCAG AA standards (4.5:1 for normal text)
- Don't rely on color alone for information
- Add icons alongside color indicators

### Focus Management
- Auto-focus first field on step load
- Maintain focus on step navigation
- Trap focus in modals/dialogs

---

## Testing Checklist

### Functional Testing
- [ ] Form validation works on all fields
- [ ] Multi-step navigation (next/back) preserves data
- [ ] Password strength indicator updates in real-time
- [ ] Checkbox/radio selections persist across steps
- [ ] Error messages display correctly
- [ ] Success flow navigates to email verification
- [ ] Loading states show during submission

### Responsive Testing
- [ ] Mobile (320px - 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (1024px+)
- [ ] Touch targets are at least 44x44px
- [ ] Forms are scrollable on small screens

### Browser Testing
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly (NVDA/JAWS/VoiceOver)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast meets WCAG AA
- [ ] Form labels are associated correctly

### Performance Testing
- [ ] No layout shifts during loading
- [ ] Smooth animations (60fps)
- [ ] Form submission completes within 3 seconds
- [ ] Images/icons load efficiently

---

## Design Tokens (Airbnb-Inspired)

### Spacing Scale
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
```

### Typography
```css
/* Headings */
--text-3xl: 30px; /* Page title */
--text-2xl: 24px; /* Card title */
--text-lg: 18px;  /* Section heading */
--text-base: 16px; /* Body text */
--text-sm: 14px;  /* Helper text */
--text-xs: 12px;  /* Small labels */

/* Font weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Border Radius
```css
--radius-sm: 4px;   /* Small elements */
--radius-md: 8px;   /* Buttons, inputs */
--radius-lg: 12px;  /* Cards */
--radius-xl: 16px;  /* Large cards */
--radius-full: 9999px; /* Pills, avatars */
```

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

---

## Implementation Timeline

### Week 1: Foundation
- **Day 1-2:** Create custom components (PasswordStrength, StepProgress, CheckboxGroup)
- **Day 3-4:** Refactor RenterRegistration with multi-step flow
- **Day 5:** Testing and bug fixes for Renter registration

### Week 2: Owner & Polish
- **Day 1-3:** Refactor OwnerRegistration with multi-step flow
- **Day 4:** Responsive design polish across all breakpoints
- **Day 5:** Accessibility audit and fixes

### Week 3: Testing & Launch
- **Day 1-2:** Cross-browser testing
- **Day 3:** User testing and feedback
- **Day 4:** Bug fixes and refinements
- **Day 5:** Final QA and deployment

---

## Success Metrics

### User Experience
- Reduce registration abandonment rate by 30%
- Increase form completion time satisfaction
- Achieve 90%+ accessibility score

### Technical
- 100% keyboard navigable
- WCAG AA compliant
- Load time < 2 seconds
- Zero console errors

### Design
- Consistent component usage across all forms
- Mobile-first responsive design
- Smooth animations (60fps)
- Clear visual hierarchy

---

## Additional Enhancements (Future)

1. **Social Sign-In**
   - Google OAuth
   - Apple Sign In
   - Facebook Login

2. **Location Autocomplete**
   - Google Places API integration
   - Current location detection

3. **File Upload**
   - Profile photo upload
   - Drag and drop support

4. **Progressive Disclosure**
   - Tooltips for complex fields
   - In-line help documentation

5. **Success Animations**
   - Confetti on registration complete
   - Smooth transitions between steps

6. **Email Verification Preview**
   - Show what verification email looks like
   - Resend verification option

---

## References & Resources

### Shadcn/ui Documentation
- https://ui.shadcn.com/docs/components/form
- https://ui.shadcn.com/docs/components/radio-group
- https://ui.shadcn.com/docs/components/checkbox

### Airbnb Design Resources
- Airbnb Design System (DLS)
- Airbnb Accessibility Standards
- Airbnb Color Palette

### React Hook Form
- https://react-hook-form.com/docs
- Multi-step form patterns
- Validation strategies

### Accessibility
- WCAG 2.1 Guidelines
- ARIA Authoring Practices
- WebAIM Contrast Checker

---

## Notes for Executor

### Critical Considerations
1. **Data Persistence:** Form data must persist when navigating between steps
2. **Validation Timing:** Validate each step before allowing navigation
3. **Loading States:** Show clear loading indicators during async operations
4. **Error Handling:** Display errors at both field and form level
5. **Mobile Testing:** Test extensively on actual mobile devices, not just browser DevTools

### Common Pitfalls to Avoid
- Don't validate all fields at once (validate per step)
- Don't lose form data on step navigation
- Don't make bank account required for owners (allow skip)
- Don't use buttons for checkboxes (use proper Checkbox component)
- Don't forget ARIA labels for accessibility

### Testing Priority
1. Form validation and error states
2. Multi-step navigation and data persistence
3. Mobile responsiveness
4. Keyboard navigation
5. Screen reader compatibility

---

**End of Guide**

For questions or clarifications, please refer to the shadcn/ui documentation and Airbnb design principles. This guide should be followed step-by-step to ensure a consistent, accessible, and user-friendly registration experience.
