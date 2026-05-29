import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Mechanic } from '@/lib/types';

type SupabaseBrowser = ReturnType<typeof createSupabaseBrowser>;

export function useMechanics({ supabase }: { supabase: SupabaseBrowser }) {
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMechanics = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('mechanics')
      .select('id, name, active, created_at')
      .eq('active', true)
      .order('name', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setMechanics((data || []) as Mechanic[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadMechanics();
  }, [loadMechanics]);

  const addMechanic = useCallback(async (name: string): Promise<string | null> => {
    const { error: err } = await supabase
      .from('mechanics')
      .insert({ name: name.trim(), active: true });

    if (err) return err.message;

    await loadMechanics();
    return null;
  }, [loadMechanics, supabase]);

  const deactivateMechanic = useCallback(async (id: string): Promise<string | null> => {
    const { error: err } = await supabase
      .from('mechanics')
      .update({ active: false })
      .eq('id', id);

    if (err) return err.message;

    await loadMechanics();
    return null;
  }, [loadMechanics, supabase]);

  return { mechanics, loading, error, loadMechanics, addMechanic, deactivateMechanic };
}
