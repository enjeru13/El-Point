// Deletes the calling user's account and every row that cascades from
// profiles.id (reviews, favorites, notifications, reports, etc — see the
// "on delete cascade" FKs across the migrations). A restaurant the caller
// owned survives with owner_id set to null rather than being deleted.
//
// Runs as a Supabase Edge Function specifically because deleting an
// auth.users row requires the service_role key, which must never ship
// inside the app or be seen by anyone outside Supabase's own secret store.
// Supabase injects SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
// into every Edge Function's environment automatically — nothing to
// configure here.
//
// Called from: the app (Authorization: Bearer <user's access token>) and
// the public account-deletion web page, identically.

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "No autenticado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller using THEIR OWN token — never trust a uid passed
  // in the request body, only what their token actually proves.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerData.user) {
    return json({ error: "Sesión inválida o vencida" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { error: deleteErr } = await admin.auth.admin.deleteUser(callerData.user.id);
  if (deleteErr) {
    return json({ error: deleteErr.message }, 500);
  }

  return json({ ok: true }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
