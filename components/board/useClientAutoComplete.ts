import { useCallback } from 'react';
import type { ClientRecord, Job } from '@/lib/types';
import type { createSupabaseBrowser } from '@/lib/supabase-browser';
import { normalizePlate } from './board-config';

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowser>;

function isPlaceholder(value: unknown, placeholder: string) {
  return String(value || '').trim().toLowerCase() === placeholder.toLowerCase();
}

function cleanNullable(value: unknown, placeholder?: string) {
  const clean = String(value || '').trim();

  if (!clean) return null;
  if (placeholder && isPlaceholder(clean, placeholder)) return null;

  return clean;
}

export function useClientAutoComplete({
  supabase,
  userId,
  onError
}: {
  supabase: SupabaseBrowserClient;
  userId: string | null;
  onError: (message: string) => void;
}) {
  const findClientByPlate = useCallback(async (plate: string) => {
    const plateNormalized = normalizePlate(plate);

    if (!plateNormalized) return null;

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('plate_normalized', plateNormalized)
      .maybeSingle();

    if (clientError) {
      onError(`No se pudo buscar el cliente: ${clientError.message}`);
      return null;
    }

    if (clientData) {
      return clientData as ClientRecord;
    }

    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('plate, vehicle, client_name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (jobsError) {
      onError(`No se pudo buscar en trabajos anteriores: ${jobsError.message}`);
      return null;
    }

    const previousJob = (jobsData || []).find((job) => {
      const jobPlate = normalizePlate(job.plate || '');
      const clientName = String(job.client_name || '').trim();

      return (
        jobPlate === plateNormalized &&
        clientName.length > 0 &&
        clientName !== 'Cliente nuevo'
      );
    });

    if (!previousJob) return null;

    const fallbackClient = {
      id: '',
      user_id: userId || '',
      plate: String(previousJob.plate || plate).toUpperCase().trim(),
      plate_normalized: plateNormalized,
      vehicle: cleanNullable(previousJob.vehicle, 'Vehículo nuevo'),
      client_name: String(previousJob.client_name || '').trim(),
      phone: cleanNullable(previousJob.phone, '600000000'),
      email: null,
      notes: null,
      created_at: String(previousJob.created_at || new Date().toISOString()),
      updated_at: new Date().toISOString()
    } as ClientRecord;

    if (userId) {
      await supabase.from('clients').upsert(
        {
          user_id: userId,
          plate: fallbackClient.plate,
          plate_normalized: fallbackClient.plate_normalized,
          vehicle: fallbackClient.vehicle,
          client_name: fallbackClient.client_name,
          phone: fallbackClient.phone,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'plate_normalized'
        }
      );
    }

    return fallbackClient;
  }, [onError, supabase, userId]);

  const saveClientFromJob = useCallback(async (job: Job) => {
    const plateNormalized = normalizePlate(job.plate);

    if (!plateNormalized) return false;
    if (!userId) return false;
    if (!job.client_name || job.client_name.trim().length === 0) return false;
    if (job.client_name === 'Cliente nuevo') return false;
    if (normalizePlate(job.plate) === normalizePlate('NUEVA MATRÍCULA')) return false;

    const { error } = await supabase.from('clients').upsert(
      {
        user_id: userId,
        plate: job.plate.toUpperCase().trim(),
        plate_normalized: plateNormalized,
        vehicle: cleanNullable(job.vehicle, 'Vehículo nuevo'),
        client_name: job.client_name.trim(),
        phone: cleanNullable(job.phone, '600000000'),
        updated_at: new Date().toISOString()
      },
      {
        onConflict: 'plate_normalized'
      }
    );

    if (error) {
      onError(`Trabajo guardado, pero no se pudo actualizar el cliente: ${error.message}`);
      return false;
    }

    return true;
  }, [onError, supabase, userId]);

  return {
    findClientByPlate,
    saveClientFromJob
  };
}