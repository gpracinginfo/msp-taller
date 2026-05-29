import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';
import { getGoogleAuthUrl } from '@/lib/google';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!user) return NextResponse.redirect(new URL('/login', appUrl));

  const url = getGoogleAuthUrl(user.id);
  return NextResponse.redirect(url);
}
