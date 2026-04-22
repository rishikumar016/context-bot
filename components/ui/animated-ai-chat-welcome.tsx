"use client";

import { ChatComposer } from "@/components/chat-composer";
import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

export interface AnimatedAIChatWelcomeProps {
  onSend: (message: PromptInputMessage) => void | Promise<void>;
  busy?: boolean;
  busyLabel?: string;
}

export function AnimatedAIChatWelcome({
  onSend,
  busy,
  busyLabel,
}: AnimatedAIChatWelcomeProps) {
  const [input, setInput] = useState("");
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text && !message.files?.length) return;
    await onSend(message);
    setInput("");
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 mix-blend-normal blur-[128px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 mix-blend-normal blur-[128px] delay-700" />
        <div className="absolute top-1/4 right-1/3 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 mix-blend-normal blur-[96px] delay-1000" />
      </div>

      <div
        className="relative mx-auto w-full max-w-2xl"
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
      >
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 space-y-10"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="space-y-3 text-center">
            <motion.h1
              animate={{ opacity: 1, y: 0 }}
              className="inline-block bg-linear-to-r from-foreground to-muted-foreground bg-clip-text pb-1 font-medium text-3xl text-transparent tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              What&apos;s on your mind today?
            </motion.h1>
            <motion.div
              animate={{ width: "100%", opacity: 1 }}
              className="h-px bg-linear-to-r from-transparent via-border to-transparent"
              initial={{ width: 0, opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </div>

          <ChatComposer
            autoFocus
            busy={busy}
            busyLabel={busyLabel}
            input={input}
            onInputChange={setInput}
            onSubmit={handleSubmit}
            placeholder="Ask anything"
          />
        </motion.div>
      </div>

      {focused && (
        <motion.div
          animate={{ x: mouse.x - 400, y: mouse.y - 400 }}
          className="pointer-events-none fixed z-0 h-200 w-200 rounded-full bg-linear-to-r from-violet-500 via-fuchsia-500 to-indigo-500 opacity-[0.02] blur-[96px]"
          transition={{ type: "spring", damping: 25, stiffness: 150, mass: 0.5 }}
        />
      )}
    </div>
  );
}
