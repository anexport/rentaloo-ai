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

// Type guards for runtime validation of presence data
function isUserPresence(obj: unknown): obj is UserPresence {
  if (!obj || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.user_id === "string" &&
    typeof candidate.online_at === "string" &&
    (candidate.status === "online" ||
      candidate.status === "away" ||
      candidate.status === "busy")
  );
}

function isPresenceArray(arr: unknown): arr is UserPresence[] {
  return Array.isArray(arr) && arr.every(isUserPresence);
}

function isSupabasePresenceState(obj: unknown): obj is SupabasePresenceState {
  if (!obj || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  return Object.values(candidate).every(isPresenceArray);
}

function isPresenceJoinPayload(obj: unknown): obj is PresenceJoinPayload {
  if (!obj || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  return (
    "newPresences" in candidate && isPresenceArray(candidate.newPresences)
  );
}

function isPresenceLeavePayload(obj: unknown): obj is PresenceLeavePayload {
  if (!obj || typeof obj !== "object") return false;
  const candidate = obj as Record<string, unknown>;
  return (
    "leftPresences" in candidate && isPresenceArray(candidate.leftPresences)
  );
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

      // Validate presence state before using
      if (!isSupabasePresenceState(rawState)) {
        console.error("Invalid presence state received:", rawState);
        return;
      }

      const userIds = new Set<string>();

      // Extract user IDs from presence state
      Object.keys(rawState).forEach((key) => {
        const presences = rawState[key];
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
      // Validate payload before using
      if (!isPresenceJoinPayload(payload)) {
        console.error("Invalid presence join payload received:", payload);
        return;
      }

      const { newPresences } = payload;
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
      // Validate payload before using
      if (!isPresenceLeavePayload(payload)) {
        console.error("Invalid presence leave payload received:", payload);
        return;
      }

      const { leftPresences } = payload;
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
