import type {
  BookingRequest,
  BookingRequestWithDetails,
  AvailabilitySlot,
  BookingCalculation,
} from "@/types/booking";
import type { Database } from "@/lib/database.types";

type EquipmentRow = Database["public"]["Tables"]["equipment"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

// Mock Equipment
export const mockEquipment: EquipmentRow = {
  id: "equipment-1",
  owner_id: "test-owner-id",
  category_id: "category-1",
  title: "Professional Camera",
  description: "High-quality DSLR camera",
  daily_rate: 100,
  condition: "excellent",
  location: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
  is_available: true,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Mock Category
export const mockCategory: CategoryRow = {
  id: "category-1",
  name: "Cameras",
  parent_id: null,
  sport_type: null,
  attributes: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Mock Profiles
export const mockRenterProfile: ProfileRow = {
  id: "test-renter-id",
  email: "renter@example.com",
  role: "renter",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const mockOwnerProfile: ProfileRow = {
  id: "test-owner-id",
  email: "owner@example.com",
  role: "owner",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Mock Booking Requests
export const mockPendingBookingRequest: BookingRequest = {
  id: "booking-1",
  equipment_id: "equipment-1",
  renter_id: "test-renter-id",
  start_date: "2024-06-15",
  end_date: "2024-06-20",
  total_amount: 525, // 5 days * $100 + 5% fees
  status: "pending",
  message: "I need this for a wedding shoot",
  created_at: "2024-06-01T00:00:00.000Z",
  updated_at: "2024-06-01T00:00:00.000Z",
};

export const mockApprovedBookingRequest: BookingRequest = {
  id: "booking-2",
  equipment_id: "equipment-1",
  renter_id: "test-renter-id",
  start_date: "2024-07-01",
  end_date: "2024-07-05",
  total_amount: 420,
  status: "approved",
  message: null,
  created_at: "2024-06-15T00:00:00.000Z",
  updated_at: "2024-06-16T00:00:00.000Z",
};

export const mockCompletedBookingRequest: BookingRequest = {
  id: "booking-3",
  equipment_id: "equipment-1",
  renter_id: "test-renter-id",
  start_date: "2024-05-01",
  end_date: "2024-05-03",
  total_amount: 210,
  status: "completed",
  message: null,
  created_at: "2024-04-20T00:00:00.000Z",
  updated_at: "2024-05-05T00:00:00.000Z",
};

// Mock Booking Request With Details
export const mockBookingRequestWithDetails: BookingRequestWithDetails = {
  ...mockPendingBookingRequest,
  equipment: {
    ...mockEquipment,
    category: mockCategory,
  },
  renter: mockRenterProfile,
  owner: mockOwnerProfile,
};

// Mock Availability Slots
export const mockAvailabilitySlots: AvailabilitySlot[] = [
  {
    date: "2024-06-15",
    is_available: true,
    custom_rate: undefined,
  },
  {
    date: "2024-06-16",
    is_available: true,
    custom_rate: 150, // Premium rate for weekend
  },
  {
    date: "2024-06-17",
    is_available: true,
    custom_rate: 150,
  },
  {
    date: "2024-06-18",
    is_available: false, // Not available
  },
  {
    date: "2024-06-19",
    is_available: true,
    custom_rate: undefined,
  },
];

// Mock Booking Calculation
export const mockBookingCalculation: BookingCalculation = {
  daily_rate: 100,
  days: 5,
  subtotal: 500,
  fees: 25,
  total: 525,
  currency: "USD",
};

// Mock existing bookings for conflict checking
export const mockExistingBookings = [
  {
    start_date: "2024-06-01",
    end_date: "2024-06-05",
    status: "approved",
  },
  {
    start_date: "2024-06-10",
    end_date: "2024-06-15",
    status: "pending",
  },
  {
    start_date: "2024-06-20",
    end_date: "2024-06-25",
    status: "approved",
  },
];

// Helper to create a booking request with custom dates
export const createMockBookingRequest = (
  overrides: Partial<BookingRequest> = {}
): BookingRequest => ({
  ...mockPendingBookingRequest,
  ...overrides,
});

// Helper to create booking with details
export const createMockBookingWithDetails = (
  overrides: Partial<BookingRequestWithDetails> = {}
): BookingRequestWithDetails => ({
  ...mockBookingRequestWithDetails,
  ...overrides,
});
