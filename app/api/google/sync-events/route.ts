import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { boardCalendarColor, getOAuthClient } from '@/lib/google';
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

type BoardId = 'particulares' | 'chapa' | 'vtc';

const GOOGLE_EVENT_LOOKAHEAD_DAYS = 120;
const GOOGLE_EVENT_LOOKBACK_DAYS = 0;

const eventColorToBoard: Record<string, BoardId> = {
  [boardCalendarColor.particulares]: 'particulares',
  [boardCalendarColor.chapa]: 'chapa',
  [boardCalendarColor.vtc]: 'vtc'
};

const calendarHexColorToBoard: Record<string, BoardId> = {
  // Rosas / fucsias habituales de Google Calendar
  '#d81b60': 'particulares',
  '#e67c73': 'particulares',
  '#f4511e': 'particulares',

  // Azules habituales
  '#039be5': 'chapa',
  '#3f51b5': 'chapa',
  '#4285f4': 'chapa',

  // Verdes habituales
  '#0b8043': 'vtc',
  '#33b679': 'vtc',
  '#7cb342': 'vtc'
};

function getGoogleErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    if ('code' in error) {
      return Number((error as { code?: number }).code);
    }

    if ('response' in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status) return Number(response.status);
    }
  }

  return null;
}

function googleDateToIso(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function sameDateTime(a?: string | null, b?: string | null) {
  if (!a || !b) return false;

  const da = new Date(a).getTime();
  const db = new Date(b).getTime();

  if (Number.isNaN(da) || Number.isNaN(db)) return false;

  return da === db;
}

function normalizePlate(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

function cleanText(value: unknown) {
  return String(value || '').trim();
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function detectBoardFromCalendarName(name: string): BoardId | null {
  const clean = name.toLowerCase();

  if (clean.includes('particular')) return 'particulares';
  if (clean.includes('chapa')) return 'chapa';
  if (clean.includes('pintura')) return 'chapa';
  if (clean.includes('vtc')) return 'vtc';
  if (clean.includes('mecanica')) return 'vtc';
  if (clean.includes('mecánica')) return 'vtc';

  return null;
}

function detectBoardFromEvent({
  eventColorId,
  calendarBackgroundColor,
  calendarSummary
}: {
  eventColorId?: string | null;
  calendarBackgroundColor?: string | null;
  calendarSummary?: string | null;
}): BoardId | null {
  if (eventColorId && eventColorToBoard[eventColorId]) {
    return eventColorToBoard[eventColorId];
  }

  const cleanHex = cleanText(calendarBackgroundColor).toLowerCase();

  if (cleanHex && calendarHexColorToBoard[cleanHex]) {
    return calendarHexColorToBoard[cleanHex];
  }

  return detectBoardFromCalendarName(calendarSummary || '');
}

function parseCalendarSummary(summary: string) {
  const cleanSummary = cleanText(summary);

  if (!cleanSummary) return null;

  const parts = cleanSummary
    .split(/\s+-\s+|\s+–\s+|\s+\|\s+|\s*;\s*/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const firstPart = parts[0] || cleanSummary;

  const plateMatch = cleanSummary
    .toUpperCase()
    .match(/\b\d{4}[A-Z]{3}\b|\b[A-Z]{1,2}\d{3,4}[A-Z]{2,3}\b/);

  const plate = normalizePlate(plateMatch?.[0] || firstPart);

  if (!plate || plate.length < 5) {
    return null;
  }

  return {
    plate,
    vehicle: parts[1] || '',
    client_name: parts[2] || '',
    work_description: parts.slice(3).join(' - ') || cleanSummary
  };
}

async function getClientByPlate(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  plateNormalized: string
) {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('plate_normalized', plateNormalized)
    .maybeSingle();

  return data || null;
}

async function upsertClientFromEvent({
  supabase,
  userId,
  plate,
  vehicle,
  clientName,
  phone
}: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  userId: string;
  plate: string;
  vehicle: string;
  clientName: string;
  phone?: string | null;
}) {
  const plateNormalized = normalizePlate(plate);

  if (!plateNormalized || !clientName) return;

  await supabase.from('clients').upsert(
    {
      user_id: userId,
      plate,
      plate_normalized: plateNormalized,
      vehicle: vehicle || null,
      client_name: clientName,
      phone: phone || null,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: 'plate_normalized'
    }
  );
}

export async function POST() {
  const supabaseUser = await createSupabaseServer();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from('google_connections')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (connectionError || !connection) {
    return NextResponse.json(
      { error: 'Primero conecta Google Calendar.' },
      { status: 400 }
    );
  }

  if (!connection.refresh_token && !connection.access_token) {
    return NextResponse.json(
      { error: 'La conexión con Google Calendar no tiene tokens válidos.' },
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

  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, user_id, board_id, plate, vehicle, google_event_id, appointment_start, appointment_end, status')
    .not('google_event_id', 'is', null);

  if (jobsError) {
    return NextResponse.json(
      { error: `No se pudieron leer las citas: ${jobsError.message}` },
      { status: 500 }
    );
  }

  const existingEventIds = new Set(
    (jobs || [])
      .map((job) => job.google_event_id)
      .filter(Boolean)
  );

  let updated = 0;
  let disconnected = 0;
  let unchanged = 0;
  let skipped = 0;
  let created = 0;
  let calendarsChecked = 0;
  let eventsSeen = 0;
  let skippedNoBoard = 0;
  let skippedNoPlate = 0;
  let skippedNoDate = 0;

  const errors: string[] = [];

  for (const job of jobs || []) {
    if (!job.google_event_id) {
      skipped += 1;
      continue;
    }

    try {
      const response = await calendar.events.get({
        calendarId: 'primary',
        eventId: job.google_event_id
      });

      const event = response.data;

      if (event.status === 'cancelled') {
        await supabase
          .from('jobs')
          .update({
            google_event_id: null
          })
          .eq('id', job.id);

        disconnected += 1;
        continue;
      }

      const googleStart = googleDateToIso(event.start?.dateTime || null);
      const googleEnd = googleDateToIso(event.end?.dateTime || null);

      if (!googleStart || !googleEnd) {
        skipped += 1;
        skippedNoDate += 1;
        continue;
      }

      const patch: Record<string, string> = {};

      const startChanged = !sameDateTime(job.appointment_start, googleStart);
      const endChanged = !sameDateTime(job.appointment_end, googleEnd);

      if (startChanged) patch.appointment_start = googleStart;
      if (endChanged) patch.appointment_end = googleEnd;

      const boardFromColor = event.colorId ? eventColorToBoard[event.colorId] : null;

      if (boardFromColor && boardFromColor !== job.board_id) {
        patch.board_id = boardFromColor;
      }

      if (Object.keys(patch).length === 0) {
        unchanged += 1;
        continue;
      }

      const { error: updateError } = await supabase
        .from('jobs')
        .update(patch)
        .eq('id', job.id);

      if (updateError) {
        errors.push(`${job.plate || job.id}: ${updateError.message}`);
        continue;
      }

      updated += 1;
    } catch (error) {
      const status = getGoogleErrorCode(error);

      if (status === 404 || status === 410) {
        await supabase
          .from('jobs')
          .update({
            google_event_id: null
          })
          .eq('id', job.id);

        disconnected += 1;
        continue;
      }

      const message = error instanceof Error ? error.message : 'Error desconocido';
      errors.push(`${job.plate || job.id}: ${message}`);
    }
  }

  try {
    const calendarListResponse = await calendar.calendarList.list({
      minAccessRole: 'writer',
      showHidden: true
    });

    const calendars = calendarListResponse.data.items || [];
    calendarsChecked = calendars.length;

    const now = new Date();

    for (const calendarItem of calendars) {
      if (!calendarItem.id) continue;

      const boardFromCalendar = detectBoardFromEvent({
        calendarBackgroundColor: calendarItem.backgroundColor,
        calendarSummary: calendarItem.summary
      });

      const eventsResponse = await calendar.events.list({
        calendarId: calendarItem.id,
        timeMin: addDays(now, -GOOGLE_EVENT_LOOKBACK_DAYS).toISOString(),
        timeMax: addDays(now, GOOGLE_EVENT_LOOKAHEAD_DAYS).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500
      });

      for (const event of eventsResponse.data.items || []) {
        eventsSeen += 1;

        if (!event.id) {
          skipped += 1;
          continue;
        }

        if (existingEventIds.has(event.id)) {
          continue;
        }

        if (event.status === 'cancelled') {
          skipped += 1;
          continue;
        }

        const boardFromEvent = detectBoardFromEvent({
          eventColorId: event.colorId,
          calendarBackgroundColor: calendarItem.backgroundColor,
          calendarSummary: calendarItem.summary
        });

        const boardId = boardFromEvent || boardFromCalendar;

        if (!boardId) {
          skipped += 1;
          skippedNoBoard += 1;
          continue;
        }

        const googleStart = googleDateToIso(event.start?.dateTime || null);
        const googleEnd = googleDateToIso(event.end?.dateTime || null);

        if (!googleStart || !googleEnd) {
          skipped += 1;
          skippedNoDate += 1;
          continue;
        }

        const parsed = parseCalendarSummary(event.summary || '');

        if (!parsed) {
          skipped += 1;
          skippedNoPlate += 1;
          continue;
        }

        const plateNormalized = normalizePlate(parsed.plate);
        const client = await getClientByPlate(supabase, plateNormalized);

        const vehicle = cleanText(client?.vehicle) || parsed.vehicle || '';
        const clientName = cleanText(client?.client_name) || parsed.client_name || '';
        const phone = cleanText(client?.phone) || '';
        const workDescription = parsed.work_description || cleanText(event.description) || '';

        const { data: existingByEvent } = await supabase
          .from('jobs')
          .select('id')
          .eq('google_event_id', event.id)
          .maybeSingle();

        if (existingByEvent) {
          existingEventIds.add(event.id);
          continue;
        }

        const { data: existingByPlate } = await supabase
          .from('jobs')
          .select('id, google_event_id, status')
          .eq('plate', parsed.plate)
          .neq('status', 'entrega')
          .maybeSingle();

        if (existingByPlate) {
          await supabase
            .from('jobs')
            .update({
              google_event_id: event.id,
              appointment_start: googleStart,
              appointment_end: googleEnd,
              board_id: boardId
            })
            .eq('id', existingByPlate.id);

          updated += 1;
          existingEventIds.add(event.id);
          continue;
        }

        const { error: insertError } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            board_id: boardId,
            status: 'sin_revisar',
            plate: parsed.plate,
            vehicle,
            client_name: clientName,
            phone,
            priority: 'normal',
            work_description: workDescription,
            internal_notes: '',
            pending_parts: '',
            mechanic: '',
            appointment_start: googleStart,
            appointment_end: googleEnd,
            google_event_id: event.id
          });

        if (insertError) {
          errors.push(`${parsed.plate}: ${insertError.message}`);
          continue;
        }

        await upsertClientFromEvent({
          supabase,
          userId: user.id,
          plate: parsed.plate,
          vehicle,
          clientName,
          phone
        });

        existingEventIds.add(event.id);
        created += 1;
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido leyendo eventos de Google';
    errors.push(message);
  }

  return NextResponse.json({
    ok: true,
    updated,
    created,
    disconnected,
    unchanged,
    skipped,
    calendarsChecked,
    eventsSeen,
    skippedNoBoard,
    skippedNoPlate,
    skippedNoDate,
    errors
  });
}