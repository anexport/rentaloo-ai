import type { Database } from "@/lib/database.types";
import type {
  EquipmentRow,
  CategoryRow,
  EquipmentPhotoRow,
  ProfileRow,
  ReviewRow,
  Listing,
} from "@/components/equipment/services/listings";

// Mock Categories
export const mockCameraCategory: CategoryRow = {
  id: "cat-cameras",
  name: "Cameras",
  parent_id: null,
  sport_type: null,
  attributes: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const mockSkiCategory: CategoryRow = {
  id: "cat-skis",
  name: "Skis",
  parent_id: null,
  sport_type: "winter",
  attributes: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Mock Photos
export const mockPhotos: EquipmentPhotoRow[] = [
  {
    id: "photo-1",
    equipment_id: "eq-1",
    photo_url: "https://example.com/photo1.jpg",
    is_primary: true,
    order_index: 0,
    created_at: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "photo-2",
    equipment_id: "eq-1",
    photo_url: "https://example.com/photo2.jpg",
    is_primary: false,
    order_index: 1,
    created_at: "2024-01-01T00:00:00.000Z",
  },
];

// Mock Owner Profiles
export const mockOwner1: Pick<ProfileRow, "id" | "email"> = {
  id: "owner-1",
  email: "owner1@example.com",
};

export const mockOwner2: Pick<ProfileRow, "id" | "email"> = {
  id: "owner-2",
  email: "owner2@example.com",
};

// Mock Reviews
export const mockReviews: Array<Pick<ReviewRow, "rating" | "reviewee_id">> = [
  { rating: 5, reviewee_id: "owner-1" },
  { rating: 4, reviewee_id: "owner-1" },
  { rating: 5, reviewee_id: "owner-1" },
  { rating: 3, reviewee_id: "owner-2" },
  { rating: 4, reviewee_id: "owner-2" },
];

// Mock Equipment
export const mockCamera: EquipmentRow = {
  id: "eq-camera-1",
  owner_id: "owner-1",
  category_id: "cat-cameras",
  title: "Professional DSLR Camera",
  description: "High-quality Canon 5D Mark IV with lens kit",
  daily_rate: 150,
  condition: "excellent",
  location: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
  is_available: true,
  created_at: "2024-01-15T00:00:00.000Z",
  updated_at: "2024-01-15T00:00:00.000Z",
};

export const mockSkis: EquipmentRow = {
  id: "eq-skis-1",
  owner_id: "owner-2",
  category_id: "cat-skis",
  title: "K2 Powder Skis",
  description: "Perfect for deep snow conditions, 185cm",
  daily_rate: 75,
  condition: "good",
  location: "Denver, CO",
  latitude: 39.7392,
  longitude: -104.9903,
  is_available: true,
  created_at: "2024-01-10T00:00:00.000Z",
  updated_at: "2024-01-10T00:00:00.000Z",
};

export const mockDrone: EquipmentRow = {
  id: "eq-drone-1",
  owner_id: "owner-1",
  category_id: "cat-cameras",
  title: "DJI Mavic 3 Drone",
  description: "4K camera drone with obstacle avoidance",
  daily_rate: 200,
  condition: "new",
  location: "San Francisco, CA",
  latitude: 37.7749,
  longitude: -122.4194,
  is_available: true,
  created_at: "2024-02-01T00:00:00.000Z",
  updated_at: "2024-02-01T00:00:00.000Z",
};

export const mockUnavailableEquipment: EquipmentRow = {
  id: "eq-unavailable-1",
  owner_id: "owner-2",
  category_id: "cat-skis",
  title: "Burton Snowboard",
  description: "Premium all-mountain snowboard",
  daily_rate: 50,
  condition: "excellent",
  location: "Aspen, CO",
  latitude: 39.1911,
  longitude: -106.8175,
  is_available: false,
  created_at: "2024-01-05T00:00:00.000Z",
  updated_at: "2024-01-05T00:00:00.000Z",
};

// Complete Listings with Relations
export const mockCameraListing: Listing = {
  ...mockCamera,
  category: mockCameraCategory,
  photos: mockPhotos,
  owner: mockOwner1,
  reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
};

export const mockSkisListing: Listing = {
  ...mockSkis,
  category: mockSkiCategory,
  photos: [],
  owner: mockOwner2,
  reviews: [{ rating: 3 }, { rating: 4 }],
};

export const mockDroneListing: Listing = {
  ...mockDrone,
  category: mockCameraCategory,
  photos: mockPhotos,
  owner: mockOwner1,
  reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
};

// Query result format (as returned by Supabase before transformation)
export const mockQueryResult = {
  ...mockCamera,
  category: mockCameraCategory,
  photos: mockPhotos,
  owner: mockOwner1,
};

// Invalid query results for validation testing
export const mockInvalidQueryResults = {
  missingTitle: {
    ...mockCamera,
    title: undefined,
    category: mockCameraCategory,
    photos: mockPhotos,
    owner: mockOwner1,
  },
  invalidDailyRate: {
    ...mockCamera,
    daily_rate: "150", // should be number
    category: mockCameraCategory,
    photos: mockPhotos,
    owner: mockOwner1,
  },
  invalidPhotos: {
    ...mockCamera,
    photos: "not-an-array", // should be array
    category: mockCameraCategory,
    owner: mockOwner1,
  },
  invalidLatitude: {
    ...mockCamera,
    latitude: "not-a-number", // should be number or null
    category: mockCameraCategory,
    photos: mockPhotos,
    owner: mockOwner1,
  },
  invalidOwner: {
    ...mockCamera,
    owner: { id: "owner-1" }, // missing email
    category: mockCameraCategory,
    photos: mockPhotos,
  },
};

// Helper to create mock listings
export const createMockListing = (overrides: Partial<EquipmentRow> = {}): Listing => ({
  ...mockCamera,
  ...overrides,
  category: mockCameraCategory,
  photos: mockPhotos,
  owner: mockOwner1,
  reviews: [],
});

// Batch of listings for testing filters
export const mockListingsBatch: Listing[] = [
  mockCameraListing,
  mockSkisListing,
  mockDroneListing,
];
