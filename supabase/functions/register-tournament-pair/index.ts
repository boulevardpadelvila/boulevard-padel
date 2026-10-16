import { createClient } from "jsr:@supabase/supabase-js@2";

// Reserva pública flexible: 90/120 minutos y aviso por email solo desde la web.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function reply(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST")
    return reply({ error: "Método no permitido." }, 405);

  try {
    const {
      fullName,
      phone,
      startsAt,
      notes,
      turnstileToken,
      durationMinutes,
    } = await req.json();

    if (!fullName || !phone || !startsAt || !turnstileToken) {
      return reply({ error: "Faltan datos obligatorios." }, 400);
    }

    // Compatibilidad con clientes antiguos que aún no envían durationMinutes.
    const duration = durationMinutes === undefined ? 90 : durationMinutes;
    if (!Number.isInteger(duration) || ![90, 120].includes(duration)) {
      return reply({ error: "La duración debe ser de 90 o 120 minutos." }, 400);
    }

    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!turnstileSecret)
      throw new Error("TURNSTILE_SECRET_KEY no está configurada.");

    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      },
    );
    const verification = await verificationResponse.json();
    if (!verification.success) {
      return reply(
        {
          error: "No se pudo validar la verificación de seguridad.",
          details: verification["error-codes"] ?? [],
        },
        403,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Falta la configuración interna de Supabase.");
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc("create_booking_flexible", {
      p_full_name: fullName,
      p_phone: phone,
      p_starts_at: startsAt,
      p_duration_minutes: duration,
      p_notes: notes ?? null,
    });

    if (error) return reply({ error: error.message }, 400);

    // La reserva ya está confirmada. Un problema de correo NO la cancela.
    // Se reutilizan los mismos secretos de Resend que request-fixed-turn.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("FIXED_TURN_FROM_EMAIL");
    const to = Deno.env.get("FIXED_TURN_ADMIN_EMAIL");

    if (resendKey && from && to) {
      try {
        const start = new Date(String(startsAt));
        if (Number.isNaN(start.getTime()))
          throw new Error("Fecha de reserva no válida para el aviso");
        const end = new Date(start.getTime() + duration * 60_000);
        const timezone = "America/Argentina/Cordoba";
        const day = new Intl.DateTimeFormat("es-AR", {
          timeZone: timezone,
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(start);
        const timeFormatter = new Intl.DateTimeFormat("es-AR", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        });
        const safeName = String(fullName)
          .replace(/[\r\n]+/g, " ")
          .trim();
        const safePhone = String(phone)
          .replace(/[\r\n]+/g, " ")
          .trim();
        const body = [
          "Se confirmó una nueva reserva desde el turnero público de Boulevard Pádel.",
          "",
          `Jugador: ${safeName}`,
          `Celular: ${safePhone}`,
          `Fecha: ${day}`,
          `Horario: ${timeFormatter.format(start)} a ${timeFormatter.format(end)} hs`,
          `Duración: ${duration} minutos`,
          "",
          "Consultar reservas en el panel Admin:",
          "https://boulevard-padel.pages.dev/admin/",
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
            subject: "Boulevard Pádel — Nueva reserva confirmada",
            text: body,
          }),
        });
        if (!sent.ok) {
          console.error(
            "No se pudo enviar el aviso de nueva reserva:",
            sent.status,
            await sent.text(),
          );
        }
      } catch (emailError) {
        console.error("Error enviando aviso de nueva reserva:", emailError);
      }
    } else {
      console.warn("Aviso de reserva omitido: faltan secretos de Resend");
    }

    return reply({ success: true, reservation: data }, 200);
  } catch (error) {
    console.error("create-booking-secure failed", error);
    return reply({ error: "Ocurrió un error al procesar la reserva." }, 500);
  }
});
