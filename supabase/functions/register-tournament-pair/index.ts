// Boulevard Pádel — registro público de parejas. Desplegar con verify_jwt = false.
// Secrets obligatorios: TURNSTILE_SECRET_KEY y SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const allowedOrigins = new Set([
  "https://boulevard-padel.pages.dev",
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);
const json = (
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      Vary: "Origin",
      ...(origin && allowedOrigins.has(origin)
        ? { "Access-Control-Allow-Origin": origin }
        : {}),
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
const tidy = (v: unknown) =>
  typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS")
    return allowedOrigins.has(origin ?? "")
      ? json(200, {}, origin)
      : json(403, { error: "Origen no permitido." }, origin);
  if (req.method !== "POST")
    return json(405, { error: "Método no permitido." }, origin);
  if (!allowedOrigins.has(origin ?? ""))
    return json(403, { error: "Origen no permitido." }, origin);
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!turnstileSecret || !serviceKey || !supabaseUrl)
    return json(
      503,
      { error: "Inscripciones temporalmente no disponibles." },
      origin,
    );
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Solicitud inválida." }, origin);
  }
  const tournamentId = tidy(payload.tournamentId);
  const player1_name = tidy(payload.player1_name);
  const player2_name = tidy(payload.player2_name);
  const contact_phone = tidy(payload.contact_phone);
  const token = tidy(payload.turnstileToken);
  if (
    !/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(tournamentId) ||
    ![player1_name, player2_name].every(
      (n) => n.length >= 3 && n.length <= 100 && n.includes(" "),
    ) ||
    player1_name.toLocaleLowerCase() === player2_name.toLocaleLowerCase() ||
    !/^[+\d\s()\-]{6,30}$/.test(contact_phone) ||
    !token ||
    token.length > 2500
  )
    return json(
      400,
      { error: "Revisá los nombres, apellidos y teléfono ingresados." },
      origin,
    );
  try {
    const ip = req.headers.get("cf-connecting-ip") ?? "";
    const form = new URLSearchParams({
      secret: turnstileSecret,
      response: token,
    });
    if (ip) form.set("remoteip", ip);
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: form,
      },
    );
    if (!response.ok)
      return json(
        503,
        { error: "No se pudo comprobar la seguridad. Intentá nuevamente." },
        origin,
      );
    const verify = await response.json();
    const host = new URL(origin!).hostname;
    if (!verify.success || verify.hostname !== host)
      return json(
        400,
        {
          error:
            "Verificación de seguridad vencida o incorrecta. Volvé a intentarlo.",
        },
        origin,
      );

    const db = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: competition, error: competitionError } = await db
      .from("bp_tournaments")
      .select("id,status,is_published,max_pairs,ends_on,registration_closes_at")
      .eq("id", tournamentId)
      .maybeSingle();
    if (competitionError) throw competitionError;
    // Cierre efectivo sin tareas programadas. Validar siempre en el servidor.
    const argDateParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(new Date()).map((part) => [part.type, part.value]),
    );
    const argentinaToday = `${argDateParts.year}-${argDateParts.month}-${argDateParts.day}`;
    const closingTimestamp = competition?.registration_closes_at
      ? Date.parse(competition.registration_closes_at)
      : null;
    if (
      !competition ||
      !competition.is_published ||
      competition.status !== "registration_open" ||
      competition.ends_on < argentinaToday ||
      (closingTimestamp !== null &&
        (!Number.isFinite(closingTimestamp) || Date.now() >= closingTimestamp))
    )
      return json(
        409,
        { error: "Las inscripciones de este torneo están cerradas." },
        origin,
      );
    // Se considera el cupo de solicitudes pendientes y aprobadas.
    if (competition.max_pairs != null) {
      const { count, error } = await db
        .from("bp_tournament_pairs")
        .select("id", { count: "exact", head: true })
        .eq("tournament_id", tournamentId)
        .in("status", ["pending", "approved"]);
      if (error) throw error;
      if ((count ?? 0) >= competition.max_pairs)
        return json(
          409,
          { error: "Se alcanzó el cupo de inscripciones." },
          origin,
        );
    }
    const { error: insertError } = await db.from("bp_tournament_pairs").insert({
      tournament_id: tournamentId,
      player1_name,
      player2_name,
      contact_phone,
      status: "pending",
      source: "web",
    });
    if (insertError?.code === "23505")
      return json(
        409,
        { error: "Esta pareja ya tiene una inscripción registrada." },
        origin,
      );
    if (insertError) throw insertError;
    return json(
      201,
      {
        ok: true,
        message: "Solicitud recibida. Está pendiente de aprobación.",
      },
      origin,
    );
  } catch (error) {
    console.error("register-tournament-pair failed", error);
    return json(
      500,
      { error: "No pudimos registrar la inscripción. Intentá nuevamente." },
      origin,
    );
  }
});
