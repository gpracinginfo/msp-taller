'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Job } from '@/lib/types';
import { hasPendingParts } from './board-config';

function formatDeliveryDate(job: Job): string {
  const dateStr = job.delivered_at || job.updated_at;
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function DeliveredHistoryModal({
  jobs,
  isConsulta,
  onClose,
  onOpenJob
}: {
  jobs: Job[];
  isConsulta?: boolean;
  onClose: () => void;
  onOpenJob: (job: Job) => void;
}) {
  const [query, setQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const q = query.toLowerCase().trim();

    return jobs
      .filter((job) => {
        if (!q) return true;

        return [
          job.plate,
          job.vehicle,
          job.work_description,
          job.mechanic || '',
          job.pending_parts || '',
          job.invoice_number || '',
          job.kilometers || '',
          job.key_number || '',
          job.chapa_type || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const dateA = new Date(a.delivered_at || a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.delivered_at || b.updated_at || b.created_at).getTime();
        return dateB - dateA;
      });
  }, [jobs, query]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* ── Cabecera ─────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Historial de entregados
              </h2>
              <p className="text-sm font-semibold text-gray-500">
                Vehículos entregados y facturados.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border bg-white px-4 py-3 text-sm font-black hover:bg-gray-50"
            >
              <X className="mr-2 inline h-4 w-4" />
              Cerrar
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar matrícula, factura, kilómetros, vehículo, mecánico, trabajo..."
              className="w-full rounded-2xl border bg-white py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* ── Contenido ────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-700">
              {filteredJobs.length} resultado{filteredJobs.length === 1 ? '' : 's'}
            </p>
            <p className="text-xs font-semibold text-gray-400">
              Total entregados: {jobs.length}
            </p>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-8 text-center">
              <p className="font-bold text-gray-500">
                No hay entregados que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3">Matrícula</th>
                    <th className="px-4 py-3">Vehículo</th>
                    <th className="px-4 py-3 whitespace-nowrap">Fecha entrega</th>
                    <th className="px-4 py-3 whitespace-nowrap">Nº factura</th>
                    <th className="px-4 py-3">Kilómetros</th>
                    <th className="px-4 py-3">Actuación</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      onClick={() => onOpenJob(job)}
                      className="cursor-pointer transition hover:bg-blue-50"
                    >
                      <td className="px-4 py-3 font-black text-slate-900">
                        {job.plate || '—'}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {job.vehicle || '—'}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {formatDeliveryDate(job)}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {job.invoice_number || '—'}
                      </td>

                      <td className="px-4 py-3 text-gray-600">
                        {job.kilometers || '—'}
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-gray-700">
                          {job.work_description || '—'}
                        </p>

                        {hasPendingParts(job) && (
                          <p className="mt-0.5 text-xs font-semibold text-amber-700">
                            ⚠ Piezas: {job.pending_parts}
                          </p>
                        )}

                        {!isConsulta && job.internal_notes?.trim() && (
                          <p className="mt-0.5 text-xs font-semibold text-purple-600">
                            ★ Tiene notas internas
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
