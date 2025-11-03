import { useMemo } from "react"
import { formatDistanceToNow } from "date-fns"
import { Search } from "lucide-react"

import type { ConversationWithDetails } from "../../types/messaging"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "../ui/command"
import { Avatar, AvatarFallback } from "../ui/avatar"
import { Badge } from "../ui/badge"
import { cn } from "@/lib/utils"

interface ConversationSearchProps {
  conversations: ConversationWithDetails[]
  currentUserId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (conversation: ConversationWithDetails) => void
}

const ConversationSearch = ({
  conversations,
  currentUserId,
  open,
  onOpenChange,
  onSelect,
}: ConversationSearchProps) => {
  const preparedConversations = useMemo(() => {
    return conversations.map((conversation) => {
      const otherParticipant = conversation.participants.find(
        (participant) => participant.id !== currentUserId
      )

      const title = otherParticipant?.email || "Unknown user"
      const initials = title.trim().charAt(0).toUpperCase()
      const lastMessage = conversation.last_message?.content || "No messages yet"
      const lastActivity =
        conversation.last_message?.created_at ||
        conversation.updated_at ||
        conversation.created_at

      let relativeTime = ""
      if (lastActivity) {
        try {
          relativeTime = formatDistanceToNow(new Date(lastActivity), {
            addSuffix: true,
          })
        } catch (error) {
          console.error("Error formatting conversation activity:", error)
          relativeTime = ""
        }
      }

      return {
        id: conversation.id,
        conversation,
        title,
        initials,
        lastMessage,
        relativeTime,
        booking: conversation.booking_request,
      }
    })
  }, [conversations, currentUserId])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search conversations"
      description="Jump to any conversation or booking thread."
    >
      <CommandInput placeholder="Search by name, email, or booking…" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
            <Search className="h-5 w-5" />
            <span>No conversations match your search.</span>
          </div>
        </CommandEmpty>
        <CommandGroup heading="Conversations">
          {preparedConversations.map((item) => (
            <CommandItem
              key={item.id}
              value={[
                item.title,
                item.lastMessage,
                item.booking?.equipment?.title ?? "",
                item.booking?.status ?? "",
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()}
              onSelect={() => {
                onSelect(item.conversation)
                onOpenChange(false)
              }}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{item.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.relativeTime && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {item.relativeTime}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.lastMessage}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {item.booking && (
                      <Badge variant="outline" className="text-xs font-medium">
                        {[item.booking.status, item.booking.equipment?.title]
                          .filter(Boolean)
                          .join(" · ")}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <CommandShortcut className={cn("ml-auto text-[11px] uppercase")}>
                ↵
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export default ConversationSearch
