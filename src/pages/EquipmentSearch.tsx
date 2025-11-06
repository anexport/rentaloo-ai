import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mountain,
  Search,
  Filter,
  MapPin,
  Calendar,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "../lib/database.types";
import BookingRequestForm from "@/components/booking/BookingRequestForm";
import ReviewList from "@/components/reviews/ReviewList";
import StarRating from "@/components/reviews/StarRating";
import ThemeToggle from "@/components/ThemeToggle";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";

type EquipmentWithCategory =
  Database["public"]["Tables"]["equipment"]["Row"] & {
    category: Database["public"]["Tables"]["categories"]["Row"];
    photos?: Database["public"]["Tables"]["equipment_photos"]["Row"][];
    owner?: {
      id: string;
      email: string;
    };
    reviews?: Array<{ rating: number }>;
  };

// Module-scoped fetch functions
const fetchEquipment = async (): Promise<EquipmentWithCategory[]> => {
  const { data, error } = await supabase
    .from("equipment")
    .select(
      `
      *,
      category:categories(*),
      photos:equipment_photos(*),
      owner:profiles!equipment_owner_id_fkey(id, email)
    `
    )
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Collect unique owner IDs from equipment data
  const ownerIds = Array.from(
    new Set((data || []).map((item) => item.owner_id).filter(Boolean))
  );

  // Batch fetch all reviews for all owners in a single query
  let reviewsByOwnerId: Map<string, Array<{ rating: number }>> = new Map();
  
  if (ownerIds.length > 0) {
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select("reviewee_id, rating")
      .in("reviewee_id", ownerIds);

    if (reviewsError) throw reviewsError;

    // Group reviews by owner_id (reviewee_id)
    reviewsData?.forEach((review) => {
      const ownerId = review.reviewee_id;
      if (!reviewsByOwnerId.has(ownerId)) {
        reviewsByOwnerId.set(ownerId, []);
      }
      reviewsByOwnerId.get(ownerId)?.push({ rating: review.rating });
    });
  }

  // Merge reviews back into equipment items
  const equipmentWithReviews = (data || []).map((item) => ({
    ...item,
    reviews: reviewsByOwnerId.get(item.owner_id) || [],
  }));

  return equipmentWithReviews;
};

const fetchCategories = async (): Promise<
  Database["public"]["Tables"]["categories"]["Row"][]
> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .is("parent_id", null)
    .order("name");

  if (error) throw error;
  return data || [];
};

const EquipmentSearch = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [equipment, setEquipment] = useState<EquipmentWithCategory[]>([]);
  const [categories, setCategories] = useState<
    Database["public"]["Tables"]["categories"]["Row"][]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEquipment, setSelectedEquipment] =
    useState<EquipmentWithCategory | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showEquipmentDetail, setShowEquipmentDetail] = useState(false);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");
  const [locationSearch, setLocationSearch] = useState("");

  // Track current invocation ID to prevent stale responses from overwriting state
  const currentInvocationIdRef = useRef(0);

  const loadData = useCallback(async () => {
    // Increment and capture the current invocation ID
    currentInvocationIdRef.current += 1;
    const invocationId = currentInvocationIdRef.current;

    setLoading(true);
    setError(null);
    try {
      const [equipmentData, categoriesData] = await Promise.all([
        fetchEquipment(),
        fetchCategories(),
      ]);

      // Only update state if this is still the latest invocation
      if (invocationId === currentInvocationIdRef.current) {
        setEquipment(equipmentData);
        setCategories(categoriesData);
      }
    } catch (err) {
      // Only update state if this is still the latest invocation
      if (invocationId === currentInvocationIdRef.current) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load equipment";
        setError(errorMessage);
        console.error("Error loading data:", err);
      }
    } finally {
      // Only update loading state if this is still the latest invocation
      if (invocationId === currentInvocationIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadData();

    // Cleanup: invalidate the current invocation ID on unmount
    // This prevents late responses from mutating state after unmount
    return () => {
      currentInvocationIdRef.current += 1;
    };
  }, [loadData]);

  const filteredEquipment = equipment.filter((item) => {
    // Search filter
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory =
      selectedCategory === "all" || item.category_id === selectedCategory;

    // Price filter
    const minPrice = priceMin ? parseFloat(priceMin) : 0;
    const maxPrice = priceMax ? parseFloat(priceMax) : Infinity;
    const matchesPrice =
      item.daily_rate >= minPrice && item.daily_rate <= maxPrice;

    // Condition filter
    const matchesCondition =
      selectedCondition === "all" || item.condition === selectedCondition;

    // Location filter (simple text match for now)
    const matchesLocation =
      !locationSearch ||
      item.location.toLowerCase().includes(locationSearch.toLowerCase());

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPrice &&
      matchesCondition &&
      matchesLocation
    );
  });

  const resetFilters = () => {
    setPriceMin("");
    setPriceMax("");
    setSelectedCondition("all");
    setLocationSearch("");
    setSelectedCategory("all");
    setSearchQuery("");
  };

  const hasActiveFilters = () => {
    return (
      priceMin !== "" ||
      priceMax !== "" ||
      selectedCondition !== "all" ||
      locationSearch !== "" ||
      selectedCategory !== "all" ||
      searchQuery !== ""
    );
  };

  const handleViewDetails = (equipment: EquipmentWithCategory) => {
    setSelectedEquipment(equipment);
    setShowEquipmentDetail(true);
  };

  const handleBookEquipment = (equipment: EquipmentWithCategory) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
      return;
    }
    setSelectedEquipment(equipment);
    setShowBookingForm(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingForm(false);
    setSelectedEquipment(null);
    // Show success message or redirect
    alert("Booking request submitted successfully!");
  };

  const calculateAverageRating = (reviews?: Array<{ rating: number }>) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return sum / reviews.length;
  };

  // For non-authenticated users, show the standalone version
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <Mountain className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground">RentAloo</h1>
              </Link>
              <div className="flex items-center space-x-4">
                <ThemeToggle variant="icon" />
                <Button
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById("categories-section");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  aria-label="Browse categories"
                >
                  Browse Categories
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" aria-label="How it works">
                      How it works
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>How RentAloo works</DialogTitle>
                      <DialogDescription>
                        Renting and listing outdoor gear is simple and secure.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 text-foreground">
                      <div>
                        <h3 className="font-semibold mb-2">For renters</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Browse or search for equipment near you.</li>
                          <li>Check details, photos, and reviews.</li>
                          <li>Send a booking request and pick dates.</li>
                          <li>Pay securely and coordinate pickup/return.</li>
                        </ol>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">For owners</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Register as an owner and list your gear.</li>
                          <li>Set price, availability, and conditions.</li>
                          <li>Approve booking requests from renters.</li>
                          <li>Get paid securely after a successful rental.</li>
                        </ol>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="secondary"
                  asChild
                  aria-label="List your equipment"
                >
                  <Link to="/register/owner">List your equipment</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/register/renter">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Find Equipment
            </h2>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg"
              />
            </div>

            {/* Category Filters */}
            <div id="categories-section" className="flex flex-wrap gap-2 mb-6">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                className="text-sm"
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  onClick={() => setSelectedCategory(category.id)}
                  className="text-sm"
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Filter Toggle and Reset */}
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>{showFilters ? "Hide" : "Show"} Advanced Filters</span>
              </Button>

              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  onClick={resetFilters}
                  className="flex items-center space-x-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span>Clear All Filters</span>
                </Button>
              )}
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Price Range */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Price Range ($/day)
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          className="w-full"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Condition</label>
                      <select
                        value={selectedCondition}
                        onChange={(e) => setSelectedCondition(e.target.value)}
                        className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="all">All Conditions</option>
                        <option value="new">New</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                      </select>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="City or ZIP"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Results Count */}
                    <div className="flex items-end">
                      <div className="w-full p-3 bg-muted rounded-md">
                        <div className="text-sm text-muted-foreground">
                          Results
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {filteredEquipment.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Location: San Francisco Bay Area</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Available dates</span>
              </div>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="mb-4">
            <p className="text-muted-foreground">
              {filteredEquipment.length} equipment found
              {searchQuery && ` for "${searchQuery}"`}
              {selectedCategory !== "all" && ` in ${selectedCategory}`}
            </p>
          </div>

          {/* Equipment Grid */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Loading equipment...</div>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="text-muted-foreground mb-4">
                Failed to load equipment. Please try again.
              </div>
              <Button
                onClick={() => {
                  void loadData();
                }}
                aria-label="Retry"
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEquipment.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {item.photos && item.photos.length > 0 ? (
                      <img
                        src={item.photos[0].photo_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <Mountain className="h-12 w-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="bg-card px-2 py-1 rounded text-xs font-medium shadow-sm">
                        {item.category.name}
                      </span>
                    </div>
                    {item.photos && item.photos.length > 1 && (
                      <div className="absolute bottom-2 right-2">
                        <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          +{item.photos.length - 1} more
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">
                        {item.title}
                      </h3>
                      <div className="text-right">
                        <div className="text-xl font-bold text-primary">
                          ${item.daily_rate}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          per day
                        </div>
                      </div>
                    </div>

                    <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="capitalize text-xs bg-muted px-2 py-1 rounded">
                          {item.condition}
                        </span>
                      </div>
                    </div>

                    {/* Rating Display */}
                    <div className="flex items-center space-x-2 mb-4">
                      {item.reviews && item.reviews.length > 0 ? (
                        <>
                          <StarRating
                            rating={calculateAverageRating(item.reviews)}
                            size="sm"
                          />
                          <span className="text-sm text-muted-foreground">
                            {calculateAverageRating(item.reviews).toFixed(1)} (
                            {item.reviews.length})
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No reviews yet
                        </span>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => handleBookEquipment(item)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {filteredEquipment.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Mountain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No equipment found
                </h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Equipment Detail Modal */}
          {showEquipmentDetail && selectedEquipment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-card rounded-lg max-w-4xl w-full my-8 border border-border">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        {selectedEquipment.title}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedEquipment.location}</span>
                        </div>
                        <span className="capitalize">
                          Condition: {selectedEquipment.condition}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowEquipmentDetail(false);
                        setSelectedEquipment(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Photos */}
                  {selectedEquipment.photos &&
                    selectedEquipment.photos.length > 0 && (
                      <div className="mb-6">
                        <img
                          src={selectedEquipment.photos[0].photo_url}
                          alt={selectedEquipment.title}
                          className="w-full h-64 object-cover rounded-lg"
                        />
                      </div>
                    )}

                  {/* Description */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="text-foreground">
                      {selectedEquipment.description}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6 p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground">Daily Rate:</span>
                      <span className="text-2xl font-bold text-primary">
                        ${selectedEquipment.daily_rate}
                      </span>
                    </div>
                  </div>

                  {/* Reviews Section */}
                  {selectedEquipment.owner && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Owner Reviews
                      </h3>
                      <ReviewList
                        revieweeId={selectedEquipment.owner_id}
                        showSummary={true}
                        showEquipment={false}
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowEquipmentDetail(false);
                        setSelectedEquipment(null);
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setShowEquipmentDetail(false);
                        handleBookEquipment(selectedEquipment);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Form Modal */}
          {showBookingForm && selectedEquipment && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
              <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
                <BookingRequestForm
                  equipment={selectedEquipment}
                  onSuccess={handleBookingSuccess}
                  onCancel={() => {
                    setShowBookingForm(false);
                    setSelectedEquipment(null);
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // For authenticated users, wrap in DashboardLayout
  return (
    <DashboardLayout>
      <PageHeader
        title="Browse Equipment"
        description="Discover outdoor gear available for rent near you"
      />

      {/* Search Section */}
      <div className="mb-8">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search for equipment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg"
          />
        </div>

        {/* Category Filters */}
        <div id="categories-section" className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            className="text-sm"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="text-sm"
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Filter Toggle and Reset */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>{showFilters ? "Hide" : "Show"} Advanced Filters</span>
          </Button>

          {hasActiveFilters() && (
            <Button
              variant="ghost"
              onClick={resetFilters}
              className="flex items-center space-x-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span>Clear All Filters</span>
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Price Range */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Price Range ($/day)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="w-full"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="w-full h-10 px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Conditions</option>
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="City or ZIP"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Results Count */}
                <div className="flex items-end">
                  <div className="w-full p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground">Results</div>
                    <div className="text-2xl font-bold text-foreground">
                      {filteredEquipment.length}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <div className="flex flex-wrap gap-4 items-center text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Location: San Francisco Bay Area</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Available dates</span>
          </div>
          <Button variant="ghost" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="mb-4">
        <p className="text-muted-foreground">
          {filteredEquipment.length} equipment found
          {searchQuery && ` for "${searchQuery}"`}
          {selectedCategory !== "all" && ` in ${selectedCategory}`}
        </p>
      </div>

      {/* Equipment Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading equipment...</div>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <div className="text-muted-foreground mb-4">
            Failed to load equipment. Please try again.
          </div>
          <Button
            onClick={() => {
              void loadData();
            }}
            aria-label="Retry"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-video bg-muted relative overflow-hidden">
                {item.photos && item.photos.length > 0 ? (
                  <img
                    src={item.photos[0].photo_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <Mountain className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="bg-card px-2 py-1 rounded text-xs font-medium shadow-sm">
                    {item.category.name}
                  </span>
                </div>
                {item.photos && item.photos.length > 1 && (
                  <div className="absolute bottom-2 right-2">
                    <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      +{item.photos.length - 1} more
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {item.title}
                  </h3>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">
                      ${item.daily_rate}
                    </div>
                    <div className="text-sm text-muted-foreground">per day</div>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="capitalize text-xs bg-muted px-2 py-1 rounded">
                      {item.condition}
                    </span>
                  </div>
                </div>

                {/* Rating Display */}
                <div className="flex items-center space-x-2 mb-4">
                  {item.reviews && item.reviews.length > 0 ? (
                    <>
                      <StarRating
                        rating={calculateAverageRating(item.reviews)}
                        size="sm"
                      />
                      <span className="text-sm text-muted-foreground">
                        {calculateAverageRating(item.reviews).toFixed(1)} (
                        {item.reviews.length})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No reviews yet
                    </span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleViewDetails(item)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleBookEquipment(item)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results */}
      {filteredEquipment.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Mountain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No equipment found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Equipment Detail Modal */}
      {showEquipmentDetail && selectedEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-card rounded-lg max-w-4xl w-full my-8 border border-border">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    {selectedEquipment.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedEquipment.location}</span>
                    </div>
                    <span className="capitalize">
                      Condition: {selectedEquipment.condition}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowEquipmentDetail(false);
                    setSelectedEquipment(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Photos */}
              {selectedEquipment.photos &&
                selectedEquipment.photos.length > 0 && (
                  <div className="mb-6">
                    <img
                      src={selectedEquipment.photos[0].photo_url}
                      alt={selectedEquipment.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

              {/* Description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-foreground">
                  {selectedEquipment.description}
                </p>
              </div>

              {/* Pricing */}
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-foreground">Daily Rate:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${selectedEquipment.daily_rate}
                  </span>
                </div>
              </div>

              {/* Reviews Section */}
              {selectedEquipment.owner && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Owner Reviews</h3>
                  <ReviewList
                    revieweeId={selectedEquipment.owner_id}
                    showSummary={true}
                    showEquipment={false}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowEquipmentDetail(false);
                    setSelectedEquipment(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowEquipmentDetail(false);
                    handleBookEquipment(selectedEquipment);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {showBookingForm && selectedEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
            <BookingRequestForm
              equipment={selectedEquipment}
              onSuccess={handleBookingSuccess}
              onCancel={() => {
                setShowBookingForm(false);
                setSelectedEquipment(null);
              }}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default EquipmentSearch;
