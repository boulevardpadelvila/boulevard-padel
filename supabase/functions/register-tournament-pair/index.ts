import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Boulevard Pádel — Solicitudes públicas de turnos fijos.
// Las solicitudes quedan pendientes de aprobación.
// Nunca se crea una reserva confirmada desde esta función.
// Paso 34B: duración individual de 90 o 120 minutos.

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: HEADERS
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: HEADERS });
  }

  if (req.method !== 'POST') {
    return reply(405, { error: 'Método no permitido' });
  }

  try {
    const {
      fullName,
      phone,
      startsAt,
      durationMinutes,
      durationType,
      endDate,
      notes,
      turnstileToken
    } = await req.json();

    const name = String(fullName || '').trim();
    const tel = String(phone || '').trim();
    const note = String(notes || '').trim();

    // Compatibilidad con el turnero previo: los envíos sin duración siguen siendo de 90 min.
    const duration = durationMinutes === undefined ? 90 : durationMinutes;
    if (!Number.isInteger(duration) || ![90, 120].includes(duration)) {
      return reply(400, { error: 'La duración debe ser de 90 o 120 minutos' });
    }

    // 1. Validaciones iniciales
    if (
      name.length < 3 ||
      name.length > 120 ||
      !/^[0-9]{10,14}$/.test(tel) ||
      note.length > 500
    ) {
      return reply(400, {
        error: 'Revisá los datos personales.'
      });
    }

    if (!['defined', 'indefinite'].includes(durationType)) {
      return reply(400, {
        error: 'Duración inválida'
      });
    }

    if (
      durationType === 'defined' &&
      !/^\d{4}-\d{2}-\d{2}$/.test(String(endDate || ''))
    ) {
      return reply(400, {
        error: 'Indicá una fecha final válida'
      });
    }

    if (durationType === 'indefinite' && endDate != null) {
      return reply(400, {
        error: 'La duración indeterminada no lleva fecha final'
      });
    }

    // 2. Verificación de Cloudflare Turnstile
    if (!turnstileToken) {
      return reply(400, {
        error: 'Completá la verificación de seguridad'
      });
    }

    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');

    if (!turnstileSecret) {
      console.error('Falta TURNSTILE_SECRET_KEY');

      return reply(503, {
        error: 'La verificación de seguridad no está configurada'
      });
    }

    const verification = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: String(turnstileToken)
        })
      }
    );

    const verificationResult = await verification.json();

    if (!verificationResult.success) {
      console.warn('Turnstile rechazó la verificación');

      return reply(403, {
        error: 'Verificación de seguridad incorrecta'
      });
    }

    // 3. Conexión con Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Faltan credenciales internas de Supabase');

      return reply(503, {
        error: 'No se pudo conectar con el sistema de reservas'
      });
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    // 4. Comprobar fecha de inicio
    const start = new Date(String(startsAt || ''));

    if (
      Number.isNaN(start.getTime()) ||
      start <= new Date()
    ) {
      return reply(400, {
        error: 'El turno debe comenzar en el futuro'
      });
    }

    // 5. Consultar configuración real
    const {
      data: settings,
      error: settingsError
    } = await db
      .from('booking_settings')
      .select(
        'timezone, fixed_turn_requests_enabled'
      )
      .eq('id', 1)
      .single();

    // IMPORTANTE: distinguir error de consulta de función deshabilitada
    if (settingsError) {
      console.error(
        'Error consultando booking_settings:',
        settingsError
      );

      return reply(503, {
        error: 'No se pudo consultar la configuración del turnero'
      });
    }

    if (!settings) {
      console.error('No se encontró booking_settings id=1');

      return reply(503, {
        error: 'No se encontró la configuración del turnero'
      });
    }

    if (!settings.fixed_turn_requests_enabled) {
      return reply(400, {
        error: 'Solicitudes de turnos fijos no habilitadas'
      });
    }

    // 6. Obtener fecha y horario local de Argentina
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: settings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(start);

    const part = (type: string) =>
      localParts.find((item) => item.type === type)?.value || '';

    const dateLocal =
      `${part('year')}-${part('month')}-${part('day')}`;

    const weekday =
      ((new Date(dateLocal + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1;

    const hour =
      `${part('hour')}:${part('minute')}:00`;

    // 7. Validar duración determinada
    if (durationType === 'defined') {
      const finalDate = new Date(String(endDate) + 'T12:00:00Z');
      const initialDate = new Date(dateLocal + 'T12:00:00Z');

      const span = finalDate.getTime() - initialDate.getTime();

      if (
        !Number.isFinite(span) ||
        span < 0 ||
        span > 366 * 86400000
      ) {
        return reply(400, {
          error: 'Elegí una fecha final válida, dentro de los próximos 12 meses'
        });
      }
    }

    // 8. Obtener cancha activa
    const {
      data: court,
      error: courtError
    } = await db
      .from('courts')
      .select('id')
      .eq('active', true)
      .order('created_at')
      .limit(1)
      .single();

    if (courtError || !court) {
      console.error('Error consultando courts:', courtError);

      return reply(503, {
        error: 'Cancha no disponible'
      });
    }

    // 9. Registrar cliente
    const {
      data: customer,
      error: customerError
    } = await db
      .from('customers')
      .upsert(
        {
          full_name: name,
          phone: tel
        },
        { onConflict: 'phone' }
      )
      .select('id')
      .single();

    if (customerError || !customer) {
      console.error('Error registrando cliente:', customerError);

      return reply(500, {
        error: 'No pudimos registrar al cliente'
      });
    }

    // 10. Registrar solicitud pendiente con duración individual de 90/120 min
    const {
      data: request,
      error: requestError
    } = await db
      .from('fixed_turn_requests')
      .insert({
        customer_id: customer.id,
        court_id: court.id,
        weekday,
        start_time: hour,
        duration_minutes: duration,
        duration_type: durationType,
        start_date: dateLocal,
        end_date: durationType === 'defined' ? endDate : null,
        status: 'pending',
        customer_notes: note || null
      })
      .select('id')
      .single();

    if (requestError || !request) {
      console.error(
        'Error registrando fixed_turn_requests:',
        requestError
      );

      return reply(500, {
        error: 'No pudimos registrar la solicitud'
      });
    }

    // 11. Avisar por correo al administrador
    // El correo es un aviso simple, sin información personal.
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('FIXED_TURN_FROM_EMAIL');
    const to = Deno.env.get('FIXED_TURN_ADMIN_EMAIL');

    if (resendKey && from && to) {
      try {
        const sent = await fetch(
          'https://api.resend.com/emails',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from,
              to: [to],
              subject: 'Boulevard Pádel — Acciones pendientes',
              text:
                'Hay una nueva solicitud de turno fijo pendiente de aprobación.\n\n' +
                'Ingresá al panel de administración para revisarla:\n' +
                'https://boulevard-padel.pages.dev/admin/'
            })
          }
        );

        if (!sent.ok) {
          console.error(
            'Aviso por correo falló:',
            sent.status,
            await sent.text()
          );
        }
      } catch (emailError) {
        console.error(
          'No se pudo enviar el correo:',
          emailError
        );
      }
    } else {
      console.warn(
        'Notificación pendiente: faltan secretos de correo'
      );
    }

    // 12. Respuesta correcta
    // La solicitud existe, pero todavía NO está aprobada.
    return reply(200, {
      success: true,
      requestId: request.id,
      message: 'Solicitud enviada. Queda pendiente de aprobación.'
    });

  } catch (error) {
    console.error('Error general en request-fixed-turn:', error);

    return reply(500, {
      error: 'No pudimos procesar la solicitud. Intentá nuevamente.'
    });
  }
});
