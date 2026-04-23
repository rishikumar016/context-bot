"use client";

import { Loader2, Lock, Sparkles, Upload } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { ingestRawFiles } from "@/lib/ingest-client";
import { createClient } from "@/lib/supabase/client";

export default function UploadPage() {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user);
    });
  }, []);

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (!files.length || isUploading) return;

      if (isAuthed === false) {
        toast.info("Sign in to upload documents");
        router.push("/login");
        return;
      }

      setIsUploading(true);
      try {
        await ingestRawFiles(files);
        toast.success(`Ingested ${files.length} file(s)`);
        router.push("/dashboard");
        router.refresh();
      } catch (e) {
        const msg = (e as Error).message;
        if (msg.includes("401")) {
          toast.info("Sign in to upload documents");
          router.push("/login");
          return;
        }
        toast.error("Failed to ingest: " + msg);
      } finally {
        setIsUploading(false);
      }
    },
    [isAuthed, isUploading, router],
  );

  const handleReject = useCallback((file: File, message: string) => {
    toast.error(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    });
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute top-0 left-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-[128px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 animate-pulse rounded-full bg-indigo-500/10 blur-[128px] delay-700" />
        <div className="absolute top-1/4 right-1/3 h-64 w-64 animate-pulse rounded-full bg-fuchsia-500/10 blur-[96px] delay-1000" />
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
        {isAuthed === false && (
          <nav className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </nav>
        )}
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center p-6">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto w-full max-w-2xl space-y-10"
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
              Start with a source
            </motion.h1>
            <motion.p
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              Drop a PDF, doc, or note. We&rsquo;ll index it so you can chat
              with it.
            </motion.p>
            <motion.div
              animate={{ width: "100%", opacity: 1 }}
              className="h-px bg-linear-to-r from-transparent via-border to-transparent"
              initial={{ width: 0, opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            />
          </div>

          <FileUpload
            accept="application/pdf,.txt,.md,.docx,text/plain,text/markdown"
            disabled={isUploading || isAuthed === false}
            maxFiles={10}
            maxSize={50 * 1024 * 1024}
            multiple
            onAccept={handleUpload}
            onFileReject={handleReject}
          >
            <FileUploadDropzone className="rounded-3xl border border-border bg-card/50 p-10 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center justify-center rounded-full border p-3">
                  {isUploading ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="size-6 text-muted-foreground" />
                  )}
                </div>
                <p className="font-medium text-sm">
                  {isUploading
                    ? "Ingesting documents…"
                    : "Drag & drop your sources"}
                </p>
                <p className="text-muted-foreground text-xs">
                  PDF, DOCX, TXT, MD — up to 50MB each
                </p>
                {isAuthed === false && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Lock className="size-3" />
                    Sign in required to upload
                  </p>
                )}
              </div>
              {isAuthed === false ? (
                <Button asChild className="mt-4 w-fit" size="sm">
                  <Link href="/sign-up">Create an account</Link>
                </Button>
              ) : (
                <FileUploadTrigger asChild disabled={isUploading}>
                  <Button
                    className="mt-4 w-fit"
                    disabled={isUploading}
                    size="sm"
                    variant="outline"
                  >
                    {isUploading ? "Uploading…" : "Browse files"}
                  </Button>
                </FileUploadTrigger>
              )}
            </FileUploadDropzone>
          </FileUpload>

          {isAuthed && (
            <div className="text-center text-muted-foreground text-xs">
              Already have sources?{" "}
              <Link
                href="/dashboard"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Open dashboard
              </Link>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
