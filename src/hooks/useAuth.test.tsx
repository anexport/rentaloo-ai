import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  mockSupabaseAuth,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import { mockRenterSession } from "@/__tests__/mocks/fixtures";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("useAuth", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("should throw error when used outside AuthProvider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = () => {};

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    console.error = originalError;
  });

  it("should return auth context when used within AuthProvider", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toHaveProperty("user");
    expect(result.current).toHaveProperty("session");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("signUp");
    expect(result.current).toHaveProperty("signIn");
    expect(result.current).toHaveProperty("signInWithOAuth");
    expect(result.current).toHaveProperty("signOut");
    expect(result.current).toHaveProperty("updateProfile");
  });

  it("should expose all auth methods", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signInWithOAuth).toBe("function");
    expect(typeof result.current.signOut).toBe("function");
    expect(typeof result.current.updateProfile).toBe("function");
  });

  it("should provide user and session from context", async () => {
    mockSupabaseAuth.getSession.mockResolvedValueOnce({
      data: { session: mockRenterSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toBeTruthy();
    });

    expect(result.current.user?.id).toBe("test-renter-id");
    expect(result.current.session?.access_token).toBe("mock-access-token");
  });

  it("should provide loading state", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Should start as loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
