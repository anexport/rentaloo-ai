import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import LandingPage from "../pages/LandingPage";
import RenterDashboard from "../pages/renter/RenterDashboard";
import OwnerDashboard from "../pages/owner/OwnerDashboard";

// Mock the useAuth hook
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Test component that mimics the App routing logic
const TestApp = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />

        {/* Protected routes */}
        {user && (
          <>
            <Route path="/renter/dashboard" element={<RenterDashboard />} />
            <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          </>
        )}
      </Routes>
    </div>
  );
};

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders landing page when user is not authenticated", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    render(
      <TestWrapper>
        <MemoryRouter initialEntries={["/"]}>
          <TestApp />
        </MemoryRouter>
      </TestWrapper>
    );

    expect(screen.getByText("Rent Outdoor Equipment")).toBeInTheDocument();
    expect(screen.getByText("From Local Owners")).toBeInTheDocument();
  });

  it("renders renter dashboard when user is authenticated as renter", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "renter@test.com",
        user_metadata: { role: "renter", fullName: "Test Renter" },
      } as any,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    render(
      <TestWrapper>
        <MemoryRouter initialEntries={["/renter/dashboard"]}>
          <TestApp />
        </MemoryRouter>
      </TestWrapper>
    );

    expect(screen.getByText("Renter Dashboard")).toBeInTheDocument();
  });

  it("renders owner dashboard when user is authenticated as owner", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "1",
        email: "owner@test.com",
        user_metadata: { role: "owner", fullName: "Test Owner" },
      } as any,
      session: null,
      loading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
    });

    render(
      <TestWrapper>
        <MemoryRouter initialEntries={["/owner/dashboard"]}>
          <TestApp />
        </MemoryRouter>
      </TestWrapper>
    );

    expect(screen.getByText("Owner Dashboard")).toBeInTheDocument();
  });
});
