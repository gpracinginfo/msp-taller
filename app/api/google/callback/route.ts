import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server';
import { getOAuthClient } from '@/lib/google';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const stateUserId = req.nextUrl.searchParams.get('state');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!code || !stateUserId) {
    return NextResponse.json({ error: 'Callback de Google incompleto.' }, { status: 400 });
  }

  const supabaseUser = await createSupabaseServer();
  const { data: { user } } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', appUrl));
  }

  if (stateUserId !== user.id) {
    return NextResponse.json({ error: 'La sesión no coincide con la conexión de Google.' }, { status: 403 });
  }

  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('google_connections')
    .select('refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase.from('google_connections').upsert({
    user_id: user.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || existing?.refresh_token || null,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
    token_type: tokens.token_type,
    updated_at: new Date().toISOString()
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.redirect(new URL('/?google=connected', appUrl));
}
