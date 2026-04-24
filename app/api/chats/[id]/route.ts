import { deleteChat } from "@/lib/chat-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  await deleteChat(id, user.id);
  return Response.json({ ok: true });
}
