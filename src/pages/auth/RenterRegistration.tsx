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

const renterSchema = z
  .object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    location: z.string().min(2, "Please enter your location"),
    interests: z
      .array(z.string())
      .min(1, "Please select at least one interest"),
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RenterFormData = z.infer<typeof renterSchema>;

const interestOptions = [
  "Hiking",
  "Climbing",
  "Skiing",
  "Snowboarding",
  "Cycling",
  "Camping",
  "Kayaking",
  "Paddleboarding",
  "Surfing",
  "Mountain Biking",
  "Running",
];

const RenterRegistration = () => {
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
  } = useForm<RenterFormData>({
    resolver: zodResolver(renterSchema),
    defaultValues: {
      interests: [],
    },
  });

  const selectedInterests = watch("interests");

  const handleInterestToggle = (interest: string) => {
    const currentInterests = selectedInterests || [];
    if (currentInterests.includes(interest)) {
      setValue(
        "interests",
        currentInterests.filter((i) => i !== interest)
      );
    } else {
      setValue("interests", [...currentInterests, interest]);
    }
  };

  const onSubmit = async (data: RenterFormData) => {
    setIsLoading(true);
    try {
      const { error } = await signUp(data.email, data.password, {
        role: "renter",
        fullName: data.fullName,
        location: data.location,
        interests: data.interests,
        experienceLevel: data.experienceLevel,
      } as any);

      if (error) {
        console.error("Registration error:", error.message);
        // Handle error (show toast notification)
      } else {
        navigate("/renter/dashboard");
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
            <CardTitle className="text-2xl">Join as a Renter</CardTitle>
            <CardDescription>
              Create your account to start renting outdoor equipment
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

              {/* Experience Level */}
              <div className="space-y-2">
                <Label>Experience Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["beginner", "intermediate", "advanced"].map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={
                        watch("experienceLevel") === level
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setValue("experienceLevel", level as any)}
                      className="capitalize"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
                {errors.experienceLevel && (
                  <p className="text-sm text-destructive">
                    {errors.experienceLevel.message}
                  </p>
                )}
              </div>

              {/* Interests */}
              <div className="space-y-2">
                <Label>Interests (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {interestOptions.map((interest) => (
                    <Button
                      key={interest}
                      type="button"
                      variant={
                        selectedInterests?.includes(interest)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleInterestToggle(interest)}
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
                {errors.interests && (
                  <p className="text-sm text-destructive">
                    {errors.interests.message}
                  </p>
                )}
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

export default RenterRegistration;
