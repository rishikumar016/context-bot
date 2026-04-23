"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

const features = [
  {
    icon: FileText,
    title: "Upload anything",
    desc: "PDFs, DOCX, Markdown, plain text — drop them in and they're indexed.",
  },
  {
    icon: Sparkles,
    title: "Grounded answers",
    desc: "Responses cite the source chunks they come from, so you can verify.",
  },
  {
    icon: MessageSquare,
    title: "Natural chat",
    desc: "Ask follow-ups. Your sources stay in context across the whole thread.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-[128px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[128px] delay-700" />
        <div className="absolute top-1/3 right-1/3 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 blur-[96px] delay-1000" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <Sparkles className="size-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            context-bot
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-20 pb-24 text-center sm:pt-28">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="size-1.5 rounded-full bg-emerald-500" />
          RAG powered by your own documents
        </motion.div>

        <motion.h1
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          className="mt-6 bg-linear-to-br from-foreground to-muted-foreground bg-clip-text font-semibold text-4xl text-transparent tracking-tight sm:text-6xl"
        >
          Chat with anything you upload.
        </motion.h1>

        <motion.p
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
          className="mt-5 max-w-xl text-muted-foreground text-sm sm:text-base"
        >
          Drop in your PDFs, notes, and docs. Ask questions. Get answers
          grounded in your own sources — with citations.
        </motion.p>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button asChild size="lg">
            <Link href="/dashboard">
              Open dashboard
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sign-up">Create an account</Link>
          </Button>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          transition={{ delay: 0.45, duration: 0.7, ease: "easeOut" }}
          className="mt-20 grid w-full grid-cols-1 gap-4 sm:grid-cols-3"
        >
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/40 p-5 text-left backdrop-blur"
            >
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background/60">
                <f.icon className="size-4 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-sm">{f.title}</h3>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border/60 px-6 py-6 text-center text-muted-foreground text-xs sm:px-10">
        Built with Next.js, Vercel AI SDK, and Supabase.
      </footer>
    </div>
  );
}
