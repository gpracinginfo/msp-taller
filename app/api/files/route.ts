import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin, createSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabaseUser = await createSupabaseServer();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const jobId = req.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Falta jobId.' }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: 'Trabajo no encontrado.' }, { status: 404 });
  }

  const { data: files, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const filesWithUrls = await Promise.all(
    (files || []).map(async (file) => {
      const { data } = await supabase.storage
        .from('taller-files')
        .createSignedUrl(file.storage_path, 60 * 10);

      return {
        ...file,
        signedUrl: data?.signedUrl || null
      };
    })
  );

  return NextResponse.json({
    files: filesWithUrls
  });
}

export async function DELETE(req: NextRequest) {
  const supabaseUser = await createSupabaseServer();

  const {
    data: { user }
  } = await supabaseUser.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { fileId } = await req.json();

  if (!fileId || typeof fileId !== 'string') {
    return NextResponse.json({ error: 'Archivo no válido.' }, { status: 400 });
  }

  let supabase;

  try {
    supabase = createSupabaseAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falta configuración de Supabase.';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: file, error: fileError } = await supabase
    .from('job_files')
    .select('*')
    .eq('id', fileId)
    .eq('user_id', user.id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
  }

  await supabase.storage.from('taller-files').remove([file.storage_path]);

  const { error } = await supabase
    .from('job_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}