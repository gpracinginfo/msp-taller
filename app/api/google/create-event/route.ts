import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { boardCalendarColor, getOAuthClient } from '@/lib/google';
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function buildCalendarSummary(job: {
  plate?: string | null;
  vehicle?: string | null;
  work_description?: string | null;
}) {
  const parts = [
    cleanText(job.plate),
    cleanText(job.vehicle),
    cleanText(job.work_description)
  ].filter(Boolean);

  return parts.join(' - ');
}

function buildCalendarDescription(job: {
  invoice_number?: string | null;
  kilometers?: string | null;
  work_description?: string | null;
}) {
  return [
    job.invoice_number ? `Factura: ${cleanText(job.invoice_number)}` : null,
    job.kilometers ? `Km: ${cleanText(job.kilometers)}` : null,
    `Trabajo: ${cleanText(job.work_description) || 'Sin trabajo indicado'}`
  ].filter(Boolean).join('\n');
}

function getGoogleErrorCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error
  ) {
    return Number((error as { code?: number }).code);
  }

  return null;
}

export async function POST(req: NextRequest) {
  const supabaseUser = await createSupabaseServer();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { jobId } = await req.json();

  if (!jobId || typeof jobId !== 'string') {
    return NextResponse.json({ error: 'Trabajo no válido.' }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 });
  }

  if (!job.appointment_start || !job.appointment_end) {
    return NextResponse.json(
      { error: 'Falta fecha de inicio o fin de la cita.' },
      { status: 400 }
    );
  }

  const { data: connection } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!connection?.refresh_token && !connection?.access_token) {
    return NextResponse.json(
      { error: 'Primero conecta Google Calendar.' },
      { status: 400 }
    );
  }

  const oauth2Client = getOAuthClient();

  oauth2Client.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: connection.expiry_date || undefined,
    scope: connection.scope,
    token_type: connection.token_type
  });

  oauth2Client.on('tokens', async (tokens) => {
    const patch: Record<string, string | number> = {
      updated_at: new Date().toISOString()
    };

    if (tokens.access_token) patch.access_token = tokens.access_token;
    if (tokens.refresh_token) patch.refresh_token = tokens.refresh_token;
    if (tokens.expiry_date) patch.expiry_date = tokens.expiry_date;

    await supabase
      .from('google_connections')
      .update(patch)
      .eq('user_id', user.id);
  });

  const calendar = google.calendar({
    version: 'v3',
    auth: oauth2Client
  });

  const event = {
    summary: buildCalendarSummary(job),
    description: buildCalendarDescription(job),
    start: {
      dateTime: job.appointment_start,
      timeZone: 'Europe/Madrid'
    },
    end: {
      dateTime: job.appointment_end,
      timeZone: 'Europe/Madrid'
    },
    colorId: boardCalendarColor[job.board_id as string] || '4',
    reminders: {
      useDefault: false,
      overrides: []
    }
  };

  try {
    let response;

    if (job.google_event_id) {
      try {
        response = await calendar.events.update({
          calendarId: 'primary',
          eventId: job.google_event_id,
          sendUpdates: 'none',
          requestBody: event
        });
      } catch (error: unknown) {
        const status = getGoogleErrorCode(error);

        if (status !== 404) {
          throw error;
        }

        response = await calendar.events.insert({
          calendarId: 'primary',
          sendUpdates: 'none',
          requestBody: event
        });

        if (response.data.id) {
          await supabase
            .from('jobs')
            .update({ google_event_id: response.data.id })
            .eq('id', job.id)
            .eq('user_id', user.id);
        }
      }
    } else {
      response = await calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'none',
        requestBody: event
      });

      if (response.data.id) {
        await supabase
          .from('jobs')
          .update({ google_event_id: response.data.id })
          .eq('id', job.id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({
      ok: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'No se pudo sincronizar con Google Calendar.';

    return NextResponse.json({ error: message }, { status: 502 });
  }
}