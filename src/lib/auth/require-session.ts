import { readSession } from "@/lib/sso/session";

export async function requireSession() {
  const session = await readSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session;
}
