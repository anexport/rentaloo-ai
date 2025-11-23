import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMessaging } from "./useMessaging";
import {
  mockSupabaseFrom,
  mockSupabaseRpc,
  mockSupabaseChannel,
  mockSupabaseRemoveChannel,
  resetSupabaseMocks,
  createMockQueryBuilder,
  mockSupabaseAuth,
} from "@/__tests__/mocks/supabase";
import { useAuth } from "./useAuth";
import type { ConversationWithDetails, MessageWithSender } from "@/types/messaging";

// Mock useAuth hook
vi.mock("./useAuth");
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;

describe("useMessaging", () => {
  const mockUser = {
    id: "user-1",
    email: "user@test.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2024-01-01",
    app_metadata: {},
    user_metadata: {},
  };

  const mockConversationParticipants = [
    { conversation_id: "conv-1" },
    { conversation_id: "conv-2" },
  ];

  const mockConversationSummaries = [
    {
      id: "conv-1",
      booking_request_id: "booking-1",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      participant_id: "user-1",
      participant_email: "user@test.com",
      last_seen_at: null,
      last_message_id: "msg-1",
      last_message_sender_id: "user-2",
      last_message_content: "Hello",
      last_message_type: "text",
      last_message_created_at: "2024-01-02",
      booking_status: "pending",
      start_date: "2024-02-01",
      end_date: "2024-02-05",
      total_amount: 500,
      equipment_title: "Camera",
      unread_count: 1,
    },
    {
      id: "conv-1",
      booking_request_id: "booking-1",
      created_at: "2024-01-01",
      updated_at: "2024-01-02",
      participant_id: "user-2",
      participant_email: "other@test.com",
      last_seen_at: null,
      last_message_id: "msg-1",
      last_message_sender_id: "user-2",
      last_message_content: "Hello",
      last_message_type: "text",
      last_message_created_at: "2024-01-02",
      booking_status: "pending",
      start_date: "2024-02-01",
      end_date: "2024-02-05",
      total_amount: 500,
      equipment_title: "Camera",
      unread_count: 0,
    },
  ];

  const mockProfile = {
    id: "user-2",
    email: "other@test.com",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  const mockMessage: MessageWithSender = {
    id: "msg-1",
    conversation_id: "conv-1",
    sender_id: "user-2",
    content: "Hello",
    message_type: "text",
    created_at: "2024-01-02",
    sender: mockProfile,
  };

  const mockBookingRequest = {
    id: "booking-1",
    equipment_id: "eq-1",
    renter_id: "user-1",
    owner_id: "user-2",
    start_date: "2024-02-01",
    end_date: "2024-02-05",
    total_amount: 500,
    status: "pending",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    equipment: {
      id: "eq-1",
      title: "Camera",
      owner_id: "user-2",
      category_id: "cat-1",
      daily_rate: 100,
      description: "A great camera",
      condition: "excellent" as const,
      location: "San Francisco",
      latitude: null,
      longitude: null,
      is_available: true,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
  };

  const mockConversationParticipant = {
    conversation_id: "conv-1",
    last_read_at: "2024-01-01",
  };

  beforeEach(() => {
    resetSupabaseMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    });
  });

  describe("Initialization", () => {
    it("should start with empty conversations and loading true", () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const { result } = renderHook(() => useMessaging());

      expect(result.current.conversations).toEqual([]);
      expect(result.current.messages).toEqual([]);
      expect(result.current.loading).toBe(true);
    });

    it("should not fetch when user is not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      expect(mockSupabaseFrom).not.toHaveBeenCalled();
    });
  });

  describe("Fetch Conversations", () => {
    it("should fetch conversations for authenticated user", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      // Mock conversation_participants fetch
      mockSupabaseFrom
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: mockConversationParticipants,
            error: null,
          })
        )
        // Mock conversation summaries fetch
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: mockConversationSummaries,
            error: null,
          })
        )
        // Mock profiles fetch
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockProfile],
            error: null,
          })
        )
        // Mock messages fetch
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockMessage],
            error: null,
          })
        )
        // Mock booking_requests fetch
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockBookingRequest],
            error: null,
          })
        )
        // Mock conversation_participants fetch for last_read_at
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockConversationParticipant],
            error: null,
          })
        );

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.conversations[0].id).toBe("conv-1");
      expect(result.current.conversations[0].participants).toContain("user-1");
      expect(result.current.conversations[0].participants).toContain("user-2");
    });

    it("should handle empty conversations", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({
          data: [],
          error: null,
        })
      );

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.conversations).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const mockError = new Error("Database error");
      mockSupabaseFrom.mockReturnValueOnce(
        createMockQueryBuilder({
          data: null,
          error: mockError,
        })
      );

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toBe("Database error");
    });
  });

  describe("Fetch Messages", () => {
    it("should fetch messages for a conversation", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      // Mock initial conversations fetch (6 calls from previous pattern)
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        // Mock fetchMessages
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockMessage],
            error: null,
          })
        );

      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.fetchMessages("conv-1");

      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });

      expect(result.current.messages[0].id).toBe("msg-1");
      expect(result.current.messages[0].content).toBe("Hello");
    });

    it("should mark conversation as read when viewing", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockMessage],
            error: null,
          })
        )
        // For the fetchConversations refresh after marking as read
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }));

      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.fetchMessages("conv-1");

      await waitFor(() => {
        expect(mockSupabaseRpc).toHaveBeenCalledWith("mark_conversation_read", {
          p_conversation: "conv-1",
        });
      });
    });
  });

  describe("Send Message", () => {
    it("should send message successfully", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const newMessage = {
        conversation_id: "conv-1",
        content: "Test message",
        message_type: "text" as const,
      };

      const insertedMessage = {
        id: "msg-2",
        ...newMessage,
        sender_id: mockUser.id,
        created_at: "2024-01-03",
        sender: {
          id: mockUser.id,
          email: mockUser.email,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      };

      // Mock initial fetch
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        // Mock message insert
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: insertedMessage,
            error: null,
          })
        )
        // Mock conversation update
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: null,
            error: null,
          })
        )
        // Mock fetchConversations refresh
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }));

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const response = await result.current.sendMessage(newMessage);

      expect(response).toBeDefined();
      expect(response?.id).toBe("msg-2");
      expect(response?.content).toBe("Test message");
    });

    it("should throw error when user not authenticated", async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const { result } = renderHook(() => useMessaging());

      const newMessage = {
        conversation_id: "conv-1",
        content: "Test",
        message_type: "text" as const,
      };

      const response = await result.current.sendMessage(newMessage);

      expect(response).toBeUndefined();
    });

    it("should handle send error", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const newMessage = {
        conversation_id: "conv-1",
        content: "Test",
        message_type: "text" as const,
      };

      const mockError = new Error("Insert failed");

      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: null,
            error: mockError,
          })
        );

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(result.current.sendMessage(newMessage)).rejects.toThrow();
    });
  });

  describe("Create Conversation", () => {
    it("should create new conversation successfully", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const newConversation = {
        id: "conv-new",
        booking_request_id: "booking-1",
        participants: ["user-1", "user-2"],
        created_at: "2024-01-03",
        updated_at: "2024-01-03",
      };

      // Mock initial fetch
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        // Mock check for existing conversation with booking_request_id
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: null,
            error: null,
          })
        )
        // Mock conversation insert
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: newConversation,
            error: null,
          })
        )
        // Mock participant inserts
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: null,
            error: null,
          })
        )
        // Mock fetchConversations refresh
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }));

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const conversation = await result.current.getOrCreateConversation(
        ["user-2"],
        "booking-1"
      );

      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe("conv-new");
    });

    it("should return existing conversation if it exists", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      const existingConversation = {
        id: "conv-existing",
        booking_request_id: "booking-1",
        participants: ["user-1", "user-2"],
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };

      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        // Mock check for existing conversation - found
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: existingConversation,
            error: null,
          })
        );

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const conversation = await result.current.getOrCreateConversation(
        ["user-2"],
        "booking-1"
      );

      expect(conversation).toBeDefined();
      expect(conversation?.id).toBe("conv-existing");
    });
  });

  describe("Realtime Subscriptions", () => {
    it("should create channel for active conversation", async () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      // Mock initial fetch and fetchMessages
      mockSupabaseFrom
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }))
        .mockReturnValueOnce(
          createMockQueryBuilder({
            data: [mockMessage],
            error: null,
          })
        )
        .mockReturnValueOnce(createMockQueryBuilder({ data: [], error: null }));

      mockSupabaseRpc.mockResolvedValueOnce({ data: null, error: null });

      const { result } = renderHook(() => useMessaging());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await result.current.fetchMessages("conv-1");

      await waitFor(() => {
        // Should create channel for room:conv-1:messages and user:user-1:conversations
        expect(mockSupabaseChannel).toHaveBeenCalled();
      });
    });

    it("should cleanup channels when user logs out", async () => {
      const { rerender } = renderHook(() => useMessaging());

      // Start with authenticated user
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: { user: mockUser },
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      mockSupabaseFrom.mockReturnValue(
        createMockQueryBuilder({ data: [], error: null })
      );

      rerender();

      await waitFor(() => {
        expect(mockSupabaseChannel).toHaveBeenCalled();
      });

      // User logs out
      mockUseAuth.mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      });

      rerender();

      await waitFor(() => {
        expect(mockSupabaseRemoveChannel).toHaveBeenCalled();
      });
    });
  });
});
