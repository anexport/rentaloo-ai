import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "@/hooks/useAuth";
import {
  mockSupabaseAuth,
  mockSupabaseRealtime,
  triggerAuthStateChange,
  resetSupabaseMocks,
} from "@/__tests__/mocks/supabase";
import {
  mockRenterUser,
  mockOwnerUser,
  mockRenterSession,
  mockOwnerSession,
  mockAuthError,
} from "@/__tests__/mocks/fixtures";
import type { ReactNode } from "react";

// Wrapper component for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe("Initial State", () => {
    it("should start with loading true and null user/session", () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });

    it("should fetch initial session on mount", async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toEqual(mockRenterUser);
      expect(result.current.session).toEqual(mockRenterSession);
      expect(mockSupabaseRealtime.setAuth).toHaveBeenCalledWith(
        mockRenterSession.access_token
      );
    });

    it("should handle getSession error gracefully", async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.session).toBe(null);
    });
  });

  describe("Sign Up", () => {
    it("should sign up a new renter user", async () => {
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: { user: mockRenterUser, session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signUpResult = await result.current.signUp(
        "renter@example.com",
        "password123",
        { role: "renter" }
      );

      expect(signUpResult.error).toBe(null);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "renter@example.com",
        password: "password123",
        options: {
          data: { role: "renter" },
        },
      });
    });

    it("should sign up a new owner user", async () => {
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: { user: mockOwnerUser, session: mockOwnerSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signUpResult = await result.current.signUp(
        "owner@example.com",
        "password123",
        { role: "owner" }
      );

      expect(signUpResult.error).toBe(null);
      expect(mockSupabaseAuth.signUp).toHaveBeenCalledWith({
        email: "owner@example.com",
        password: "password123",
        options: {
          data: { role: "owner" },
        },
      });
    });

    it("should return error on sign up failure", async () => {
      mockSupabaseAuth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signUpResult = await result.current.signUp(
        "invalid@example.com",
        "weak",
        { role: "renter" }
      );

      expect(signUpResult.error).toEqual(mockAuthError);
    });

    it("should handle sign up exception", async () => {
      const error = new Error("Network error");
      mockSupabaseAuth.signUp.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signUpResult = await result.current.signUp(
        "test@example.com",
        "password",
        { role: "renter" }
      );

      expect(signUpResult.error).toBe(error);
    });
  });

  describe("Sign In", () => {
    it("should sign in with email and password", async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockRenterUser, session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signInResult = await result.current.signIn(
        "renter@example.com",
        "password123"
      );

      expect(signInResult.error).toBe(null);
      expect(signInResult.user).toEqual(mockRenterUser);
      expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
        email: "renter@example.com",
        password: "password123",
      });
    });

    it("should return error on invalid credentials", async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signInResult = await result.current.signIn(
        "wrong@example.com",
        "wrongpassword"
      );

      expect(signInResult.error).toEqual(mockAuthError);
      expect(signInResult.user).toBe(null);
    });

    it("should handle sign in exception", async () => {
      const error = new Error("Connection timeout");
      mockSupabaseAuth.signInWithPassword.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signInResult = await result.current.signIn(
        "test@example.com",
        "password"
      );

      expect(signInResult.error).toBe(error);
      expect(signInResult.user).toBe(null);
    });
  });

  describe("OAuth Sign In", () => {
    it("should sign in with Google OAuth", async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: "google", url: "https://google.com/oauth" },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const oauthResult = await result.current.signInWithOAuth("google");

      expect(oauthResult.error).toBe(null);
      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: "http://localhost:5173/",
        },
      });
    });

    it("should sign in with custom redirect URL", async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: "github", url: "https://github.com/oauth" },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const customRedirect = "http://localhost:5173/dashboard";
      await result.current.signInWithOAuth("github", customRedirect);

      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: {
          redirectTo: customRedirect,
        },
      });
    });

    it("should handle OAuth providers", async () => {
      const providers = ["google", "github", "facebook", "twitter"] as const;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      for (const provider of providers) {
        mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
          data: { provider, url: `https://${provider}.com/oauth` },
          error: null,
        });

        const oauthResult = await result.current.signInWithOAuth(provider);
        expect(oauthResult.error).toBe(null);
      }

      expect(mockSupabaseAuth.signInWithOAuth).toHaveBeenCalledTimes(4);
    });

    it("should return error on OAuth failure", async () => {
      mockSupabaseAuth.signInWithOAuth.mockResolvedValueOnce({
        data: { provider: "google", url: null },
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const oauthResult = await result.current.signInWithOAuth("google");

      expect(oauthResult.error).toEqual(mockAuthError);
    });
  });

  describe("Sign Out", () => {
    it("should sign out successfully", async () => {
      // Set up initial authenticated state
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockRenterUser);
      });

      mockSupabaseAuth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const signOutResult = await result.current.signOut();

      expect(signOutResult.error).toBe(null);
      expect(mockSupabaseAuth.signOut).toHaveBeenCalled();
    });

    it("should return error on sign out failure", async () => {
      mockSupabaseAuth.signOut.mockResolvedValueOnce({
        error: mockAuthError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signOutResult = await result.current.signOut();

      expect(signOutResult.error).toEqual(mockAuthError);
    });
  });

  describe("Update Profile", () => {
    it("should update profile when user is authenticated", async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockRenterUser);
      });

      // Mock the from().update() chain
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValueOnce({ data: {}, error: null });
      vi.mocked(await import("@/lib/supabase")).supabase.from = vi
        .fn()
        .mockReturnValue({
          update: mockUpdate,
          eq: mockEq,
        });

      const updates = { email: "newemail@example.com" };
      const updateResult = await result.current.updateProfile(updates);

      expect(updateResult.error).toBe(null);
    });

    it("should return error when user is not authenticated", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = { email: "newemail@example.com" };
      const updateResult = await result.current.updateProfile(updates);

      expect(updateResult.error).toBeDefined();
      expect(updateResult.error?.message).toBe("User not authenticated");
      expect(updateResult.error?.status).toBe(401);
    });
  });

  describe("Auth State Changes", () => {
    it("should update state on auth state change", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initially no user
      expect(result.current.user).toBe(null);

      // Trigger sign in event
      triggerAuthStateChange("SIGNED_IN", mockRenterSession);

      await waitFor(() => {
        expect(result.current.user).toEqual(mockRenterUser);
        expect(result.current.session).toEqual(mockRenterSession);
      });
    });

    it("should clear state on sign out event", async () => {
      mockSupabaseAuth.getSession.mockResolvedValueOnce({
        data: { session: mockRenterSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockRenterUser);
      });

      // Trigger sign out event
      triggerAuthStateChange("SIGNED_OUT", null);

      await waitFor(() => {
        expect(result.current.user).toBe(null);
        expect(result.current.session).toBe(null);
      });
    });

    it("should set realtime auth on session change", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      triggerAuthStateChange("SIGNED_IN", mockOwnerSession);

      await waitFor(() => {
        expect(mockSupabaseRealtime.setAuth).toHaveBeenCalledWith(
          mockOwnerSession.access_token
        );
      });
    });
  });
});
