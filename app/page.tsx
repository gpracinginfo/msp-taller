import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import { BoardApp } from '@/components/BoardApp';

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <BoardApp userEmail={user.email || ''} />;
}
