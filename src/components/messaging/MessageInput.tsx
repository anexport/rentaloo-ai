import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Paperclip, Send, Smile, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MessageFormData } from "../../types/messaging";
import { Button } from "../ui/button";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAdornment,
} from "../ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription } from "../ui/alert";
import { Card } from "../ui/card";

// Schema will be created inside component to access t()
const createMessageSchema = (t: (key: string) => string) =>
  z.object({
    content: z
      .string()
      .refine((val) => val.trim().length > 0, {
        message: t("input.errors.empty_message"),
      })
      .refine((val) => val.trim().length <= 1000, {
        message: t("input.errors.message_too_long"),
      }),
  });

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  onTyping?: (content: string) => void;
  disabled?: boolean;
}

const MessageInput = ({
  onSendMessage,
  onTyping,
  disabled = false,
}: MessageInputProps) => {
  const { t } = useTranslation("messaging");
  const messageSchema = useMemo(() => createMessageSchema(t), [t]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MessageFormData>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
    },
  });

  const adjustTextareaSize = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const insertTemplate = (template: string) => {
    setValue("content", template, { shouldDirty: true });
    adjustTextareaSize();
    onTyping?.(template);
    setIsTemplatesOpen(false);
  };

  const onSubmit = async (data: MessageFormData) => {
    if (disabled || isSubmitting) return;

    setSendError(null);

    try {
      await onSendMessage(data.content.trim());
      reset();
      adjustTextareaSize();
      onTyping?.("");
    } catch (error) {
      console.error("Error sending message:", error);
      setSendError(t("input.send_error"));
    }
  };

  const syncValueAndSubmit = () => {
    const value = textareaRef.current?.value || "";
    setValue("content", value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
    setTimeout(() => {
      void handleSubmit(onSubmit)();
    }, 0);
  };

  const {
    ref: formTextareaRef,
    onChange,
    onBlur,
    name,
    ...field
  } = register("content");

  return (
    <Card className="border border-border bg-card/95 p-0 shadow-sm">
      <form
        onSubmit={(e) => {
          void handleSubmit(onSubmit)(e);
        }}
        className="space-y-3 p-3"
        aria-label={t("input.placeholder")}
      >
        {sendError && (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{sendError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleSubmit(onSubmit)();
                }}
                disabled={isSubmitting || disabled}
              >
                {t("actions.retry")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <TooltipProvider delayDuration={150}>
          <InputGroup className="items-end gap-3">
            <InputGroupAdornment className="pb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t("input.attach_file")}
                    disabled={disabled}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("input.attach_file")}</TooltipContent>
              </Tooltip>

              <Popover open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={t("input.quick_replies")}
                        disabled={disabled}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("input.quick_replies")}</TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-2 p-3" align="start">
                  <p className="text-sm font-medium text-foreground">
                    {t("input.quick_replies")}
                  </p>
                  <div className="space-y-2">
                    {["availability", "help", "pickup"].map((key) => {
                      const templateText = t(
                        `input.templates.${key as "availability" | "help" | "pickup"}`
                      );
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => insertTemplate(templateText)}
                          className="w-full rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        >
                          {templateText}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={t("input.insert_emoji")}
                        disabled={disabled}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("input.insert_emoji")}</TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start">
                  <div className="grid grid-cols-6 gap-2 p-3">
                    {["😀", "🤩", "🎉", "👍", "📅", "🤝"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          const currentFormValue = getValues("content") ?? "";
                          const nextValue = `${currentFormValue}${emoji}`;
                          setValue("content", nextValue, { shouldDirty: true });
                          adjustTextareaSize();
                          onTyping?.(nextValue);
                          setIsEmojiOpen(false);
                        }}
                        className="text-lg transition hover:scale-110"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </InputGroupAdornment>

            <div className="flex-1">
              <InputGroupTextarea
                id={name}
                {...field}
                ref={(node) => {
                  formTextareaRef(node);
                  textareaRef.current = node;
                }}
                placeholder={t("input.placeholder")}
                disabled={disabled || isSubmitting}
                className="max-h-[200px] min-h-[44px] text-sm leading-6"
                onBlur={(e) => {
                  void onBlur(e);
                }}
                onChange={(event) => {
                  void onChange(event);
                  adjustTextareaSize();
                  onTyping?.(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    event.preventDefault();
                    syncValueAndSubmit();
                    return;
                  }

                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    syncValueAndSubmit();
                  }
                }}
                aria-invalid={Boolean(errors.content)}
                aria-describedby={
                  errors.content ? "message-error-text" : undefined
                }
              />
              {errors.content && (
                <p
                  id="message-error-text"
                  className="mt-1 text-xs text-destructive"
                  role="alert"
                >
                  {errors.content.message}
                </p>
              )}
            </div>

            <InputGroupAdornment className="pb-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 px-4"
                    disabled={disabled || isSubmitting}
                    aria-label={t("input.send")}
                    onClick={(e) => {
                      e.preventDefault();
                      syncValueAndSubmit();
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="h-4 w-4 text-primary-foreground" />
                        {t("input.send")}
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        {t("input.send")}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Press Enter to send • Shift+Enter for newline
                </TooltipContent>
              </Tooltip>
            </InputGroupAdornment>
          </InputGroup>
        </TooltipProvider>
      </form>
    </Card>
  );
};

export default MessageInput;
