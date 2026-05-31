import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Mail, MessageCircle, PackagePlus, X } from 'lucide-react';
import type { Job, Supplier } from '@/lib/types';
import { boards } from './board-config';
import { Toast } from './Toast';
import type { ToastMessage } from './Toast';

export function PartsOrderModal({
  job,
  suppliers,
  suppliersLoading,
  onClose
}: {
  job: Job;
  suppliers: Supplier[];
  suppliersLoading: boolean;
  onClose: () => void;
}) {
  const boardName = boards.find((b) => b.id === job.board_id)?.name ?? job.board_id;

  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active), [suppliers]);

  const [supplierId, setSupplierId] = useState<string>(() => activeSuppliers[0]?.id ?? '');
  const [partsText, setPartsText] = useState(
    (job.pending_parts || job.work_description || '') as string
  );
  const [observations, setObservations] = useState('');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    setSupplierId((current) => {
      if (activeSuppliers.length === 0) return '';
      if (current && activeSuppliers.some((s) => s.id === current)) return current;
      return activeSuppliers[0].id;
    });
  }, [activeSuppliers]);

  const supplier = activeSuppliers.find((s) => s.id === supplierId) ?? null;

  const orderText = useMemo(() => {
    const lines: string[] = [
      'Pedido de piezas MSP',
      '',
      `Matrícula: ${job.plate || '—'}`,
      `Vehículo: ${job.vehicle || '—'}`,
    ];
    if (job.kilometers) lines.push(`Kilómetros: ${job.kilometers}`);
    lines.push(`Tablero: ${boardName}`);
    if (job.mechanic) lines.push(`Mecánico: ${job.mechanic}`);
    if (job.work_description) lines.push(`Trabajo: ${job.work_description}`);
    lines.push('', 'Piezas solicitadas:', partsText.trim() || '(sin especificar)');
    if (observations.trim()) {
      lines.push('', 'Observaciones:', observations.trim());
    }
    return lines.join('\n');
  }, [job, boardName, partsText, observations]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(orderText);
      setToast({ id: Date.now(), message: 'Pedido copiado al portapapeles', tone: 'success' });
    } catch {
      setToast({ id: Date.now(), message: 'No se pudo copiar. Copia el texto manualmente.', tone: 'error' });
    }
  }

  function handleOpenWeb() {
    if (supplier?.url) {
      window.open(supplier.url, '_blank', 'noopener,noreferrer');
    }
  }

  function handleWhatsApp() {
    if (supplier?.phone) {
      const phone = supplier.phone.replace(/\D/g, '');
      const text = encodeURIComponent(orderText);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    }
  }

  function handleEmail() {
    if (supplier?.email) {
      const subject = encodeURIComponent(`Pedido piezas MSP - ${job.plate || 'Sin matrícula'}`);
      const body = encodeURIComponent(orderText);
      window.open(`mailto:${supplier.email}?subject=${subject}&body=${body}`);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black/50 p-3">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl">

          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-black">Pedir piezas</h2>
              </div>
              <p className="mt-0.5 text-sm font-semibold text-gray-500">
                {job.plate || 'Sin matrícula'} · {job.vehicle || 'Sin vehículo'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 rounded-xl border px-3 py-2 text-xs font-black hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Vehicle info */}
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1.5 text-xs font-black text-amber-800">Datos del vehículo</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold text-amber-900">
              <span><strong>Matrícula:</strong> {job.plate || '—'}</span>
              <span><strong>Vehículo:</strong> {job.vehicle || '—'}</span>
              {job.kilometers && <span><strong>Kilómetros:</strong> {job.kilometers}</span>}
              <span><strong>Tablero:</strong> {boardName}</span>
              {job.mechanic && <span><strong>Mecánico:</strong> {job.mechanic}</span>}
              {job.work_description && (
                <span className="col-span-2">
                  <strong>Trabajo:</strong> {job.work_description}
                </span>
              )}
              {job.pending_parts && (
                <span className="col-span-2">
                  <strong>Piezas pendientes:</strong> {job.pending_parts}
                </span>
              )}
            </div>
          </div>

          {/* Supplier selector */}
          <div className="mb-3">
            {suppliersLoading ? (
              <p className="text-xs font-semibold text-gray-400">Cargando proveedores...</p>
            ) : activeSuppliers.length === 0 ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                No hay proveedores activos. Añádelos desde{' '}
                <strong>Configuración → Proveedores</strong>.
              </p>
            ) : (
              <label className="block">
                <span className="text-xs font-black text-gray-600">Proveedor</span>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-amber-500"
                >
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {supplier?.notes && (
                  <p className="mt-1 text-[11px] font-semibold text-gray-400">{supplier.notes}</p>
                )}
              </label>
            )}
          </div>

          {/* Parts to order */}
          <div className="mb-3">
            <label className="block">
              <span className="text-xs font-black text-gray-600">Piezas a pedir</span>
              <textarea
                rows={4}
                value={partsText}
                onChange={(e) => setPartsText(e.target.value)}
                placeholder="Escribe las piezas que necesitas..."
                className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-xs font-semibold outline-none placeholder:text-gray-400 focus:border-amber-500"
              />
            </label>
          </div>

          {/* Observations */}
          <div className="mb-4">
            <label className="block">
              <span className="text-xs font-black text-gray-600">Observaciones para el proveedor</span>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-400">
                Opcional. Solo se incluye en el pedido si escribes algo.
              </p>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Urgente, color, referencia, medidas..."
                className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-xs font-semibold outline-none placeholder:text-gray-400 focus:border-amber-500"
              />
            </label>
          </div>

          {/* Order preview */}
          <div className="mb-4 rounded-2xl border bg-gray-50 p-3">
            <p className="mb-1.5 text-xs font-black text-gray-600">Vista previa del pedido</p>
            <pre className="whitespace-pre-wrap break-words text-xs font-semibold text-gray-700">
              {orderText}
            </pre>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-black text-white hover:bg-amber-700"
            >
              <Copy className="mr-1 inline h-4 w-4" />
              Copiar pedido
            </button>

            {supplier?.url ? (
              <button
                type="button"
                onClick={handleOpenWeb}
                className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
              >
                <ExternalLink className="mr-1 inline h-4 w-4" />
                Abrir proveedor
              </button>
            ) : null}

            {supplier?.phone ? (
              <button
                type="button"
                onClick={handleWhatsApp}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
              >
                <MessageCircle className="mr-1 inline h-4 w-4" />
                WhatsApp
              </button>
            ) : null}

            {supplier?.email ? (
              <button
                type="button"
                onClick={handleEmail}
                className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700"
              >
                <Mail className="mr-1 inline h-4 w-4" />
                Email
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-3 py-2 text-xs font-black hover:bg-gray-50"
            >
              <X className="mr-1 inline h-4 w-4" />
              Cerrar
            </button>
          </div>

        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
