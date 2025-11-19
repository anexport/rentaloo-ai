import type { User, Session } from "@supabase/supabase-js";

// Mock user data
export const mockRenterUser: User = {
  id: "test-renter-id",
  aud: "authenticated",
  role: "authenticated",
  email: "renter@example.com",
  email_confirmed_at: "2024-01-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00.000Z",
  last_sign_in_at: "2024-01-01T00:00:00.000Z",
  app_metadata: {},
  user_metadata: {
    role: "renter",
  },
  identities: [],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const mockOwnerUser: User = {
  id: "test-owner-id",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.com",
  email_confirmed_at: "2024-01-01T00:00:00.000Z",
  phone: "",
  confirmed_at: "2024-01-01T00:00:00.000Z",
  last_sign_in_at: "2024-01-01T00:00:00.000Z",
  app_metadata: {},
  user_metadata: {
    role: "owner",
  },
  identities: [],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

// Mock session data
export const mockRenterSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: mockRenterUser,
};

export const mockOwnerSession: Session = {
  access_token: "mock-access-token-owner",
  refresh_token: "mock-refresh-token-owner",
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: "bearer",
  user: mockOwnerUser,
};

// Mock auth errors
export const mockAuthError = {
  name: "AuthError",
  message: "Invalid credentials",
  status: 400,
};

export const mockNetworkError = {
  name: "AuthError",
  message: "Network error",
  status: 500,
};

// Profile data
export const mockRenterProfile = {
  id: "test-renter-id",
  email: "renter@example.com",
  role: "renter" as const,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

export const mockOwnerProfile = {
  id: "test-owner-id",
  email: "owner@example.com",
  role: "owner" as const,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};
