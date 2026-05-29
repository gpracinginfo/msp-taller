import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Mechanic } from '@/lib/types';

export function MechanicsModal({
  mechanics,
  loading,
  error,
  onAdd,
  onDeactivate,
  onClose
}: {
  mechanics: Mechanic[];
  loading: boolean;
  error: string | null;
  onAdd: (name: string) => Promise<string | null>;
  onDeactivate: (id: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setActionError(null);
    const err = await onAdd(trimmed);
    if (err) {
      setActionError(err);
    } else {
      setNewName('');
    }
    setSubmitting(false);
  }

  async function handleDeactivate(id: string) {
    setActionError(null);
    const err = await onDeactivate(id);
    if (err) setActionError(err);
  }

  const displayError = actionError || error;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Mecánicos</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border bg-white p-2 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {displayError && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {displayError}
          </p>
        )}

        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
            placeholder="Nombre del mecánico"
            className="flex-1 rounded-xl border px-3 py-2 text-sm font-semibold outline-none focus:border-blue-600"
          />

          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={submitting || !newName.trim()}
            className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Cargando...</p>
        ) : mechanics.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No hay mecánicos activos. Añade uno arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {mechanics.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5">
                <span className="text-sm font-semibold text-slate-900">{m.name}</span>

                <button
                  type="button"
                  onClick={() => void handleDeactivate(m.id)}
                  title="Desactivar mecánico"
                  className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
