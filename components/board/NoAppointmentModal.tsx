import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Job } from '@/lib/types';
import { getPriority } from './board-config';

export function NoAppointmentModal({
  jobs,
  onClose,
  onOpenJob
}: {
  jobs: Job[];
  onClose: () => void;
  onOpenJob: (job: Job) => void;
}) {
  const [query, setQuery] = useState('');

  const filteredJobs = useMemo(() => {
    const q = query.toLowerCase().trim();

    return jobs.filter((job) => {
      if (!q) return true;

      return [
        job.plate,
        job.vehicle,
        job.client_name,
        job.phone,
        job.work_description,
        job.mechanic || '',
        job.internal_notes || '',
        job.pending_parts || '',
        getPriority(job.priority).name,
        job.david ? 'david' : '',
        job.fane ? 'fane' : '',
        job.key_number || '',
        job.entry_date || '',
        job.chapa_type || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, query]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="border-b p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Vehículos sin cita
              </h2>

              <p className="text-sm font-semibold text-gray-500">
                Vehículos del tablero actual sin cita programada.
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
              placeholder="Buscar matrícula, cliente, teléfono, vehículo, mecánico..."
              className="w-full rounded-2xl border bg-white py-3 pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-black text-slate-700">
              {filteredJobs.length} resultado{filteredJobs.length === 1 ? '' : 's'}
            </p>

            <p className="text-xs font-semibold text-gray-400">
              Total sin cita: {jobs.length}
            </p>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center">
              <p className="font-bold text-gray-500">
                No hay vehículos sin cita que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onOpenJob(job)}
                  className="rounded-2xl border bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {job.plate || 'Sin matrícula'} · {job.vehicle || 'Sin vehículo'}
                      </p>

                      <p className="mt-1 truncate text-xs font-bold text-gray-600">
                        {job.client_name || 'Sin cliente'}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getPriority(job.priority).badgeClass}`}>
                        {getPriority(job.priority).name}
                      </span>

                      {job.david && (
                        <span className="rounded-full border border-fuchsia-400 bg-fuchsia-100 px-2 py-0.5 text-[10px] font-black text-fuchsia-800">
                          DAVID
                        </span>
                      )}

                      {job.fane && (
                        <span className="rounded-full border border-orange-400 bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-800">
                          FANE
                        </span>
                      )}

                      {job.board_id === 'chapa' && job.chapa_type && job.chapa_type !== 'chapa' && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                          job.chapa_type === 'particular'
                            ? 'border-rose-300 bg-rose-100 text-rose-800'
                            : 'border-green-300 bg-green-100 text-green-800'
                        }`}>
                          {job.chapa_type === 'particular' ? 'PARTICULAR' : 'VTC'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 grid gap-1 text-xs font-semibold text-gray-500">
                    <p className="truncate">
                      Teléfono: {job.phone || 'Sin teléfono'}
                    </p>

                    <p className="truncate">
                      Trabajo: {job.work_description || 'Sin trabajo indicado'}
                    </p>

                    {job.mechanic && (
                      <p className="truncate">
                        Mecánico: {job.mechanic}
                      </p>
                    )}

                    {job.key_number && (
                      <p className="truncate">
                        Llave: {job.key_number}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
