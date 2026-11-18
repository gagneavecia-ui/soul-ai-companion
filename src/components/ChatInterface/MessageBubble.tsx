"use client";

import { Bot, User } from "lucide-react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  provider?: string;
}

export function MessageBubble({ role, content, provider }: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-white/8 border border-white/10"
            : "bg-gradient-to-br from-soul-blue/25 to-soul-violet/25 border border-soul-violet/30"
        }`}
      >
        {isUser ? <User className="h-4 w-4 text-foreground/70" /> : <Bot className="h-4 w-4 text-soul-blue" />}
      </div>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "bg-white/8 border border-white/10 rounded-tr-sm"
            : "glass rounded-tl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {!isUser && provider ? (
          <p className="mt-1.5 text-[10px] text-muted-foreground/60">via {provider}</p>
        ) : null}
      </div>
    </div>
  );
}
