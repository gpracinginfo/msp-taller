import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabaseUser = await createSupabaseServer();
  const { data: { user } } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const form = await req.formData();
  const jobId = String(form.get('jobId') || '');
  const type = String(form.get('type') || '');
  const file = form.get('file') as File | null;
  if (!jobId || !['presupuesto', 'albaran'].includes(type) || !file) {
    return NextResponse.json({ error: 'Datos de subida incompletos.' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el máximo de 20 MB.' }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: job } = await supabase.from('jobs').select('id').eq('id', jobId).eq('user_id', user.id).single();
  if (!job) return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 });

  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${user.id}/${jobId}/${type}-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from('taller-files').upload(path, buffer, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { error: dbError } = await supabase.from('job_files').insert({
    job_id: jobId,
    user_id: user.id,
    file_type: type,
    file_name: file.name,
    storage_path: path
  });
  if (dbError) {
    await supabase.storage.from('taller-files').remove([path]);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
