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

const PRESENCE_HEARTBEAT_INTERVAL = 30000; // 30 seconds

export const usePresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const updateLastSeen = useCallback(async () => {
    if (!user?.id) return;

    try {
      await supabase.rpc("update_last_seen");
    } catch (error) {
      console.error("Error updating last_seen_at:", error);
    }
  }, [user?.id]);

  const trackPresence = useCallback(async () => {
    if (!user?.id || !channelRef.current) return;

    const presenceData: UserPresence = {
      user_id: user.id,
      online_at: new Date().toISOString(),
      status: "online",
    };

    try {
      await channelRef.current.track(presenceData);
      // Update last_seen_at when tracking presence
      await updateLastSeen();
    } catch (error) {
      console.error("Error tracking presence:", error);
    }
  }, [user?.id, updateLastSeen]);

  // Initialize presence channel
  useEffect(() => {
    if (!user?.id) {
      // Cleanup if user logs out
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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
      },
    });

    channelRef.current = channel;

    // Handle presence sync (initial state)
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const userIds = new Set<string>();

      // Extract user IDs from presence state
      Object.keys(state).forEach((key) => {
        const presences = state[key] as unknown as Array<UserPresence>;
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
    channel.on("presence", { event: "join" }, ({ newPresences }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (newPresences) {
          (newPresences as unknown as Array<UserPresence>).forEach(
            (presence) => {
              if (presence.user_id) {
                updated.add(presence.user_id);
              }
            }
          );
        }
        return updated;
      });
    });

    // Handle users leaving
    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        if (leftPresences) {
          (leftPresences as unknown as Array<UserPresence>).forEach(
            (presence) => {
              if (presence.user_id) {
                updated.delete(presence.user_id);
              }
            }
          );
        }
        return updated;
      });
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        // Track own presence after subscription succeeds
        await trackPresence();

        // Set up heartbeat to update presence periodically
        heartbeatIntervalRef.current = setInterval(() => {
          void trackPresence();
        }, PRESENCE_HEARTBEAT_INTERVAL);
      }
    });

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, stop tracking
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
        if (channelRef.current) {
          channelRef.current.untrack();
        }
      } else {
        // Page is visible again, resume tracking
        if (channelRef.current) {
          void trackPresence();
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
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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
