// Boulevard Pádel — registro público de parejas. Desplegar con verify_jwt = false.
// Turnstile + service_role obligatorios; Resend es opcional y usa secretos ya vigentes de reservas.
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
      .select("id,name,format,status,is_published,max_pairs,ends_on,registration_closes_at")
      .eq("id", tournamentId)
      .maybeSingle();
    if (competitionError) throw competitionError;
    // Cierre efectivo sin tareas programadas. Validar siempre en el servidor.
    const argDateParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Cordoba",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    const argentinaToday = `${argDateParts.year}-${argDateParts.month}-${argDateParts.day}`;
    const closingTimestamp = competition?.registration_closes_at
      ? Date.parse(competition.registration_closes_at)
      : null;
    if (
      !competition ||
      !competition.is_published ||
      competition.status !== "registration_open" ||
      (competition.format !== "league" && competition.ends_on < argentinaToday) ||
      (closingTimestamp !== null &&
        (!Number.isFinite(closingTimestamp) || Date.now() >= closingTimestamp))
    )
      return json(
        409,
        { error: "Las inscripciones de este torneo están cerradas." },
        origin,
      );
    // Se consideran pendientes históricos y aprobadas para proteger el cupo.
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
      status: "approved",
      source: "web",
    });
    if (insertError?.code === "23505")
      return json(
        409,
        { error: "Esta pareja ya tiene una inscripción registrada." },
        origin,
      );
    if (insertError?.code === "23514") {
      // Los triggers de PostgreSQL protegen cupo y horario incluso en
      // altas simultáneas; no confundir esos rechazos con un error 500.
      return json(
        409,
        { error: "Inscripciones cerradas o cupo completo. Actualizá el torneo." },
        origin,
      );
    }
    if (insertError) throw insertError;

    // La inscripción ya quedó APROBADA en PostgreSQL. Un fallo en el aviso
    // nunca revierte la inscripción ni invita al jugador a inscribirse otra vez.
    // Reutiliza exactamente la configuración Resend de las reservas de BP,
    // pero envía DIRECTAMENTE al buzón elegido por Martín para torneos.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("FIXED_TURN_FROM_EMAIL");
    const to = "boulevardpadelvila@gmail.com";
    if (resendKey && from) {
      try {
        const safeTournament = tidy(competition.name).slice(0, 160);
        const safeName1 = player1_name.slice(0, 100);
        const safeName2 = player2_name.slice(0, 100);
        const safePhone = contact_phone.slice(0, 30);
        const registeredAt = new Intl.DateTimeFormat("es-AR", {
          timeZone: "America/Argentina/Cordoba",
          dateStyle: "full",
          timeStyle: "short",
        }).format(new Date());
        const message = [
          "Se registró y aprobó automáticamente una nueva pareja en Boulevard Pádel.",
          "",
          `Torneo: ${safeTournament}`,
          `Jugador 1: ${safeName1}`,
          `Jugador 2: ${safeName2}`,
          `Teléfono de contacto: ${safePhone}`,
          `Inscripción: ${registeredAt}`,
          "",
          "La pareja ya quedó inscripta. Si no cumple tus requisitos,",
          "podés eliminar su inscripción manualmente desde el Admin.",
          "",
          "Administración: https://boulevard-padel.pages.dev/admin/",
        ].join("\n");
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [to],
            subject: "Boulevard Pádel — Nueva pareja inscripta y aprobada",
            text: message,
          }),
        });
        if (!sent.ok) {
          console.error("Aviso de torneo rechazado por correo:", sent.status);
        }
      } catch (emailError) {
        console.error("No se pudo enviar el aviso de torneo:", emailError);
      }
    } else {
      console.warn("Aviso de torneo omitido: falta configuración Resend");
    }

    return json(
      201,
      {
        ok: true,
        message: "Inscripción confirmada. ¡La pareja ya está inscripta en el torneo!",
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
