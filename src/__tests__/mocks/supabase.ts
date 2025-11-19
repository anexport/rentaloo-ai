import { vi } from "vitest";
import type { Session, User, AuthError } from "@supabase/supabase-js";

// Mock auth state change callback
type AuthChangeCallback = (event: string, session: Session | null) => void;
let authStateChangeCallback: AuthChangeCallback | null = null;

// Mock Supabase auth methods
export const mockSupabaseAuth = {
  getSession: vi.fn(() =>
    Promise.resolve({
      data: { session: null },
      error: null,
    })
  ),
  signUp: vi.fn(() =>
    Promise.resolve({
      data: { user: null, session: null },
      error: null,
    })
  ),
  signInWithPassword: vi.fn(() =>
    Promise.resolve({
      data: { user: null, session: null },
      error: null,
    })
  ),
  signInWithOAuth: vi.fn(() =>
    Promise.resolve({
      data: { provider: "google", url: "https://example.com" },
      error: null,
    })
  ),
  signOut: vi.fn(() =>
    Promise.resolve({
      error: null,
    })
  ),
  onAuthStateChange: vi.fn((callback: AuthChangeCallback) => {
    authStateChangeCallback = callback;
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  }),
  getUser: vi.fn(() =>
    Promise.resolve({
      data: { user: null },
      error: null,
    })
  ),
};

// Mock Supabase realtime
export const mockSupabaseRealtime = {
  setAuth: vi.fn(),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
};

// Mock Supabase from/select methods
export const mockSupabaseFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(() =>
    Promise.resolve({
      data: null,
      error: null,
    })
  ),
}));

// Complete Supabase client mock
export const mockSupabase = {
  auth: mockSupabaseAuth,
  realtime: mockSupabaseRealtime,
  from: mockSupabaseFrom,
};

// Helper to trigger auth state change
export const triggerAuthStateChange = (
  event: string,
  session: Session | null
) => {
  if (authStateChangeCallback) {
    authStateChangeCallback(event, session);
  }
};

// Helper to reset all mocks
export const resetSupabaseMocks = () => {
  vi.clearAllMocks();
  authStateChangeCallback = null;
};

// Mock the supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: mockSupabase,
}));
