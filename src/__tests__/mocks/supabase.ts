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

// Create a chainable query builder mock that is also awaitable (thenable)
const createQueryBuilder = (finalResult?: { data: any; error: any }): any => {
  const defaultResult = finalResult || { data: null, error: null };

  const builder: any = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    in: vi.fn(),
    ilike: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
    // Make the builder awaitable by adding then() method
    then: vi.fn((resolve) => {
      return Promise.resolve(defaultResult).then(resolve);
    }),
  };

  // Make all methods return the builder for chaining
  Object.keys(builder).forEach((key) => {
    if (key !== 'then' && typeof builder[key] === 'function') {
      builder[key].mockReturnValue(builder);
    }
  });

  return builder;
};

// Helper to create a query builder with custom final result
export const createMockQueryBuilder = (finalResult: { data: any; error: any }) => {
  return createQueryBuilder(finalResult);
};

// Mock Supabase from/select methods
export const mockSupabaseFrom = vi.fn(() => createQueryBuilder());

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
