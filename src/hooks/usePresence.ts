import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UserPresence {
  user_id: string;
  online_at: string;
  status: "online" | "away" | "busy";
}

interface PresenceState {
  onlineUsers: Set<string>;
  isOnline: (userId: string) => boolean;
}

// Explicit types for Supabase presence payloads
type SupabasePresenceState = Record<string, UserPresence[]>;

interface PresenceJoinPayload {
  newPresences: UserPresence[];
}

interface PresenceLeavePayload {
  leftPresences: UserPresence[];
}

const PRESENCE_HEARTBEAT_INTERVAL = 300000; // 5 minutes

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const trackPresence = useCallback(async () => {
    if (!user?.id || !channelRef.current) return;

    const presenceData: UserPresence = {
      user_id: user.id,
      online_at: new Date().toISOString(),
      status: "online",
    };

    try {
      await channelRef.current.track(presenceData);
    } catch (error) {
      console.error("Error tracking presence:", error);
    }
  }, [user?.id]);

  // Initialize presence channel
  useEffect(() => {
    if (!user?.id) {
      // Cleanup if user logs out
      if (channelRef.current) {
        const capturedChannel = channelRef.current;
        channelRef.current = null;
        void (async () => {
          try {
            await capturedChannel.untrack();
          } catch (error) {
            console.error("Error untracking presence:", error);
          } finally {
            supabase.removeChannel(capturedChannel);
          }
        })();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      setOnlineUsers(new Set());
      return;
    }

    // Create presence channel
    const channel = supabase.channel("presence:global", {
      config: {
        presence: {
          key: user.id, // Unique key per user
        },
        private: true,
      },
    });

    channelRef.current = channel;

    // Handle presence sync (initial state)
    channel.on("presence", { event: "sync" }, () => {
      const rawState = channel.presenceState();
      const state = rawState as unknown as SupabasePresenceState;
      const userIds = new Set<string>();

      // Extract user IDs from presence state
      Object.keys(state).forEach((key) => {
        const presences = state[key];
        if (presences && presences.length > 0) {
          presences.forEach((presence) => {
            if (presence.user_id) {
              userIds.add(presence.user_id);
            }
          });
        }
      });

      setOnlineUsers(userIds);
    });

    // Handle users joining
    channel.on("presence", { event: "join" }, (payload) => {
      const typedPayload = payload as unknown as PresenceJoinPayload;
      const { newPresences } = typedPayload;
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (newPresences) {
          newPresences.forEach((presence) => {
            if (presence.user_id) {
              updated.add(presence.user_id);
            }
          });
        }
        return updated;
      });
    });

    // Handle users leaving
    channel.on("presence", { event: "leave" }, (payload) => {
      const typedPayload = payload as unknown as PresenceLeavePayload;
      const { leftPresences } = typedPayload;
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (leftPresences) {
          leftPresences.forEach((presence) => {
            if (presence.user_id) {
              updated.delete(presence.user_id);
            }
          });
        }
        return updated;
      });
    });

    // Subscribe to channel
    channel.subscribe((status) => {
      void (async () => {
        if (status === "SUBSCRIBED") {
          // Track own presence after subscription succeeds
          try {
            await trackPresence();
          } catch (error) {
            console.error("Error in initial presence tracking:", error);
          } finally {
            // Set up heartbeat to update presence periodically
            // This always runs even if initial tracking fails
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
            }
            heartbeatIntervalRef.current = setInterval(() => {
              void trackPresence();
            }, PRESENCE_HEARTBEAT_INTERVAL);
          }
        }
      })();
    });

    // Handle page visibility changes
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is hidden, stop tracking
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        if (channelRef.current) {
          try {
            await channelRef.current.untrack();
          } catch (error) {
            console.error("Error untracking presence on visibility change:", error);
          }
        }
      } else {
        // Page is visible again, resume tracking
        if (channelRef.current) {
          void trackPresence();
          // Clear any existing interval before creating a new one
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
          }
          heartbeatIntervalRef.current = setInterval(() => {
            void trackPresence();
          }, PRESENCE_HEARTBEAT_INTERVAL);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      if (channelRef.current) {
        const capturedChannel = channelRef.current;
        channelRef.current = null;
        void (async () => {
          try {
            await capturedChannel.untrack();
          } catch (error) {
            console.error("Error untracking presence:", error);
          } finally {
            supabase.removeChannel(capturedChannel);
          }
        })();
      }
    };
  }, [user?.id, trackPresence]);

  const isOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  return {
    onlineUsers,
    isOnline,
  } as PresenceState;
};
