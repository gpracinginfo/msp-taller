import { useState } from 'react';
import { Eye, EyeOff, Package, Pencil, Plus, Save, X } from 'lucide-react';
import type { Supplier } from '@/lib/types';

type SupplierInsert = Omit<Supplier, 'id' | 'created_at'>;

type SupplierDraft = {
  name: string;
  method: string;
  url: string;
  phone: string;
  email: string;
  notes: string;
  active: boolean;
};

const EMPTY_DRAFT: SupplierDraft = {
  name: '',
  method: 'web',
  url: '',
  phone: '',
  email: '',
  notes: '',
  active: true
};

const METHOD_LABELS: Record<string, string> = {
  web: 'Web',
  whatsapp: 'WhatsApp',
  email: 'Email',
  manual: 'Manual'
};

export function SuppliersModal({
  suppliers,
  loading,
  error,
  onAdd,
  onUpdate,
  onClose
}: {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  onAdd: (s: SupplierInsert) => Promise<string | null>;
  onUpdate: (id: string, patch: Partial<SupplierInsert>) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<SupplierDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateForm<K extends keyof SupplierDraft>(key: K, value: SupplierDraft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      method: s.method || 'web',
      url: s.url || '',
      phone: s.phone || '',
      email: s.email || '',
      notes: s.notes || '',
      active: s.active
    });
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_DRAFT);
    setActionError(null);
  }

  async function handleSubmit() {
    const trimmed = form.name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setActionError(null);

    const payload: SupplierInsert = {
      name: trimmed,
      method: form.method,
      url: form.url.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      notes: form.notes.trim() || null,
      active: form.active
    };

    const err = editingId
      ? await onUpdate(editingId, payload)
      : await onAdd(payload);

    if (err) {
      setActionError(err);
    } else {
      cancelEdit();
    }
    setSubmitting(false);
  }

  async function handleToggleActive(s: Supplier) {
    setActionError(null);
    const err = await onUpdate(s.id, { active: !s.active });
    if (err) setActionError(err);
  }

  const displayError = actionError || error;

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-black">Proveedores</h2>
          </div>
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

        {/* Add / Edit form */}
        <div className="mb-5 rounded-2xl border bg-gray-50 p-4">
          <p className="mb-3 text-sm font-black text-gray-700">
            {editingId ? 'Editar proveedor' : 'Añadir proveedor'}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black text-gray-600">Nombre *</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSubmit(); }}
                placeholder="Ej. Recambios García"
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black text-gray-600">Método de contacto</span>
              <select
                value={form.method}
                onChange={(e) => updateForm('method', e.target.value)}
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              >
                <option value="web">Web</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="manual">Manual</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-black text-gray-600">URL web</span>
              <input
                type="text"
                value={form.url}
                onChange={(e) => updateForm('url', e.target.value)}
                placeholder="https://proveedor.es"
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black text-gray-600">Teléfono / WhatsApp</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="34600000000"
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black text-gray-600">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="pedidos@proveedor.es"
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-black text-gray-600">Notas</span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Ej. Solo neumáticos, pedir con antelación"
                className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </label>
          </div>

          {editingId && (
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => updateForm('active', e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <span className="text-xs font-black text-gray-600">Activo</span>
            </label>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || !form.name.trim()}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {editingId
                ? <><Save className="mr-1 inline h-3.5 w-3.5" />Guardar cambios</>
                : <><Plus className="mr-1 inline h-3.5 w-3.5" />Añadir</>
              }
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border px-4 py-2 text-xs font-black hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Supplier list */}
        {loading ? (
          <p className="py-4 text-center text-sm text-gray-500">Cargando...</p>
        ) : suppliers.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No hay proveedores. Añade uno arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {sortedSuppliers.map((s) => (
              <li
                key={s.id}
                className={`rounded-xl border px-3 py-2.5 transition ${!s.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900">{s.name}</span>
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                        {METHOD_LABELS[s.method] ?? s.method}
                      </span>
                      {!s.active && (
                        <span className="rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500">
                          inactivo
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-gray-500">
                      {s.url && <span>Web: {s.url}</span>}
                      {s.phone && <span>Tel: {s.phone}</span>}
                      {s.email && <span>Email: {s.email}</span>}
                      {s.notes && <span>Notas: {s.notes}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      title="Editar"
                      className="rounded-lg border border-blue-200 bg-blue-50 p-1.5 text-blue-700 hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleActive(s)}
                      title={s.active ? 'Desactivar' : 'Activar'}
                      className={`rounded-lg border p-1.5 transition ${
                        s.active
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {s.active
                        ? <EyeOff className="h-3.5 w-3.5" />
                        : <Eye className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
}
