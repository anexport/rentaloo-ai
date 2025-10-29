import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mountain, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const ownerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  businessName: z.string().optional(),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  location: z.string().min(2, "Please enter your location"),
  serviceArea: z.string().min(2, "Please enter your service area"),
  equipmentCategories: z
    .array(z.string())
    .min(1, "Please select at least one equipment category"),
  yearsExperience: z.string().min(1, "Please enter your years of experience"),
  bankAccount: z.string().min(10, "Please enter a valid bank account number"),
});

type OwnerFormData = z.infer<typeof ownerSchema>;

const equipmentCategoryOptions = [
  "Hiking & Backpacking",
  "Climbing",
  "Skiing & Snowboarding",
  "Cycling",
  "Camping",
  "Water Sports",
  "Mountain Biking",
  "Running",
  "Fitness",
  "Photography",
  "Other",
];

const OwnerRegistration = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: {
      equipmentCategories: [],
    },
  });

  const selectedCategories = watch("equipmentCategories");

  const handleCategoryToggle = (category: string) => {
    const currentCategories = selectedCategories || [];
    if (currentCategories.includes(category)) {
      setValue(
        "equipmentCategories",
        currentCategories.filter((c) => c !== category)
      );
    } else {
      setValue("equipmentCategories", [...currentCategories, category]);
    }
  };

  const onSubmit = async (data: OwnerFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, {
        role: "owner",
        fullName: data.fullName,
        businessName: data.businessName,
        location: data.location,
        serviceArea: data.serviceArea,
        equipmentCategories: data.equipmentCategories,
        yearsExperience: data.yearsExperience,
        bankAccount: data.bankAccount,
      } as any);

      if (error) {
        console.error("Registration error:", error.message);
        // Handle error (show toast notification)
      } else {
        navigate("/owner/dashboard");
      }
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to home</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mountain className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join as an Owner</CardTitle>
            <CardDescription>
              Create your account to start listing your equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (Optional)</Label>
                <Input
                  id="businessName"
                  {...register("businessName")}
                  placeholder="Enter your business name"
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive">
                    {errors.businessName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="Enter your email"
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
                    placeholder="Create a password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="City, State"
                />
                {errors.location && (
                  <p className="text-sm text-destructive">
                    {errors.location.message}
                  </p>
                )}
              </div>

              {/* Service Area */}
              <div className="space-y-2">
                <Label htmlFor="serviceArea">Service Area</Label>
                <Input
                  id="serviceArea"
                  {...register("serviceArea")}
                  placeholder="Area you serve (e.g., 50 miles radius)"
                />
                {errors.serviceArea && (
                  <p className="text-sm text-destructive">
                    {errors.serviceArea.message}
                  </p>
                )}
              </div>

              {/* Equipment Categories */}
              <div className="space-y-2">
                <Label>Equipment Categories (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {equipmentCategoryOptions.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={
                        selectedCategories?.includes(category)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleCategoryToggle(category)}
                      className="text-xs"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                {errors.equipmentCategories && (
                  <p className="text-sm text-destructive">
                    {errors.equipmentCategories.message}
                  </p>
                )}
              </div>

              {/* Years of Experience */}
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  min="0"
                  {...register("yearsExperience")}
                  placeholder="Years in outdoor sports"
                />
                {errors.yearsExperience && (
                  <p className="text-sm text-destructive">
                    {errors.yearsExperience.message}
                  </p>
                )}
              </div>

              {/* Bank Account */}
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Bank Account Number</Label>
                <Input
                  id="bankAccount"
                  {...register("bankAccount")}
                  placeholder="For payouts (encrypted and secure)"
                />
                {errors.bankAccount && (
                  <p className="text-sm text-destructive">
                    {errors.bankAccount.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Your bank information is encrypted and secure. We'll use this
                  for payouts.
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">
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

export default OwnerRegistration;
