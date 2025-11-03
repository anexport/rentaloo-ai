import type { ConversationWithDetails } from "../../types/messaging"
import { useAuth } from "../../hooks/useAuth"
import { usePresence } from "../../hooks/usePresence"
import { Skeleton } from "../ui/skeleton"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty"
import { MessageSquare } from "lucide-react"
import { TooltipProvider } from "../ui/tooltip"
import { ConversationListItem } from "./shared/ConversationListItem"

interface ConversationListProps {
  conversations: ConversationWithDetails[]
  selectedConversationId?: string
  onSelectConversation: (conversation: ConversationWithDetails) => void
  loading?: boolean
}

const getInitials = (value?: string | null) => {
  if (!value) return "?"
  const trimmed = value.trim()
  if (!trimmed) return "?"
  return trimmed.charAt(0).toUpperCase()
}

const ConversationList = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  loading = false,
}: ConversationListProps) => {
  const { user } = useAuth()
  const { isOnline } = usePresence()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <Empty className="py-12">
        <EmptyMedia>
          <MessageSquare className="h-6 w-6" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>
            You&apos;ll see booking messages and renter chats here once they
            start.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {conversations.map((conversation) => {
          const otherParticipant = conversation.participants.find(
            (participant) => participant.id !== user?.id
          )

          const otherParticipantName =
            otherParticipant?.email || "Unknown user"
          const otherParticipantInitials = getInitials(
            otherParticipant?.email
          )
          const lastSeenAt =
            (otherParticipant as { last_seen_at?: string } | undefined)
              ?.last_seen_at || null
          // Use unread_count from conversation if available, otherwise fallback to sender check
          const unread =
            conversation.unread_count !== undefined
              ? conversation.unread_count > 0
              : conversation.last_message?.sender_id !== undefined &&
                conversation.last_message.sender_id !== user?.id

          return (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isSelected={conversation.id === selectedConversationId}
              onSelect={onSelectConversation}
              otherParticipantName={otherParticipantName}
              otherParticipantInitials={otherParticipantInitials}
              isOnline={
                otherParticipant ? isOnline(otherParticipant.id) : false
              }
              lastSeenAt={lastSeenAt}
              unread={Boolean(unread)}
            />
          )
        })}
      </div>
    </TooltipProvider>
  )
}

export default ConversationList
