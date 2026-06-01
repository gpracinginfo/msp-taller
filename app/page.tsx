import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase-server';
import { BoardApp } from '@/components/BoardApp';
import type { UserRole } from '@/lib/types';

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const userRole = ((user.app_metadata?.role as string) || 'admin') as UserRole;
  return <BoardApp userEmail={user.email || ''} userRole={userRole} />;
}
