import { useCallback, useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { Supplier } from '@/lib/types';

type SupabaseBrowser = ReturnType<typeof createSupabaseBrowser>;
type SupplierInsert = Omit<Supplier, 'id' | 'created_at'>;

export function useSuppliers({ supabase }: { supabase: SupabaseBrowser }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setSuppliers((data || []) as Supplier[]);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const addSupplier = useCallback(async (supplier: SupplierInsert): Promise<string | null> => {
    const { error: err } = await supabase.from('suppliers').insert(supplier);
    if (err) return err.message;
    await loadSuppliers();
    return null;
  }, [loadSuppliers, supabase]);

  const updateSupplier = useCallback(async (id: string, patch: Partial<SupplierInsert>): Promise<string | null> => {
    const { error: err } = await supabase.from('suppliers').update(patch).eq('id', id);
    if (err) return err.message;
    await loadSuppliers();
    return null;
  }, [loadSuppliers, supabase]);

  return { suppliers, loading, error, loadSuppliers, addSupplier, updateSupplier };
}
