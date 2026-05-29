import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  MessageCircle,
  Save,
  Trash2,
  X
} from 'lucide-react';
import type { BoardId, Job, JobPriority, JobStatus, Mechanic, UploadFileType } from '@/lib/types';
import type { SaveState } from './board-types';
import type { BoardInfo } from './board-config';
import { boards, columns, formatDate, getPriority, priorities, toLocalInput } from './board-config';
import { DocumentsPanel } from './DocumentsPanel';

type JobPatch = Partial<Job>;

type JobDraft = {
  board_id: BoardId;
  plate: string;
  vehicle: string;
  client_name: string;
  phone: string;
  mechanic: string;
  status: JobStatus;
  priority: JobPriority;
  appointment_start: string;
  appointment_end: string;
  work_description: string;
  pending_parts: string;
  internal_notes: string;
  david: boolean;
  fane: boolean;
  entry_date: string;
  key_number: string;
  chapa_type: 'chapa' | 'particular' | 'vtc';
  invoice_number: string;
  kilometers: string;
};

const DEFAULT_APPOINTMENT_MINUTES = 90;

const WORK_PRESETS = [
  'Trabajo pendiente de completar',
  'Presupuesto',
  'Diagnóstico'
];

function addMinutesToLocalInput(value: string, minutes: number) {
  if (!value) return '';

  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);

  const pad = (number: number) => `${number}`.padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function createDraft(job: Job): JobDraft {
  return {
    board_id: job.board_id,
    plate: job.plate || '',
    vehicle: job.vehicle || '',
    client_name: job.client_name || '',
    phone: job.phone || '',
    mechanic: job.mechanic || '',
    status: job.status,
    priority: job.priority || 'normal',
    appointment_start: toLocalInput(job.appointment_start),
    appointment_end: toLocalInput(job.appointment_end),
    work_description: job.work_description || '',
    pending_parts: job.pending_parts || '',
    internal_notes: job.internal_notes || '',
    david: Boolean(job.david),
    fane: Boolean(job.fane),
    entry_date: job.entry_date || '',
    key_number: job.key_number || '',
    chapa_type: job.chapa_type || 'chapa',
    invoice_number: job.invoice_number || '',
    kilometers: job.kilometers || ''
  };
}

function localInputToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function draftSafePriority(priority: JobPriority | null) {
  return priority || 'normal';
}

function normalizeWorkLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function JobModal({
  job,
  activeBoard,
  saveState,
  mechanics,
  onClose,
  onSaveJob,
  onApplyPlateAndFindClient,
  onSyncCalendar,
  onSendAppointmentWhatsapp,
  onUploadFile,
  onDeleteJob,
  onDraftPendingParts
}: {
  job: Job;
  activeBoard: BoardInfo;
  saveState: SaveState;
  mechanics: Mechanic[];
  onClose: () => void;
  onSaveJob: (job: Job, patch: JobPatch) => Promise<Job | null>;
  onApplyPlateAndFindClient: (job: Job, plate: string) => Promise<Job | null>;
  onSyncCalendar: (job: Job) => void;
  onSendAppointmentWhatsapp: (job: Job) => void;
  onUploadFile: (job: Job, type: UploadFileType, file: File) => void;
  onDeleteJob: (job: Job) => void;
  onDraftPendingParts: (job: Job, value: string) => void;
}) {
  const priority = getPriority(draftSafePriority(job.priority));
  const [draft, setDraft] = useState<JobDraft>(() => createDraft(job));

  const currentBoard = boards.find((board) => board.id === draft.board_id) || activeBoard;

  useEffect(() => {
    setDraft(createDraft(job));
  }, [
    job.id,
    job.board_id,
    job.plate,
    job.vehicle,
    job.client_name,
    job.phone,
    job.mechanic,
    job.status,
    job.priority,
    job.appointment_start,
    job.appointment_end,
    job.work_description,
    job.pending_parts,
    job.internal_notes,
    job.david,
    job.fane,
    job.entry_date,
    job.key_number,
    job.chapa_type,
    job.invoice_number,
    job.kilometers
  ]);

  const previewJob = useMemo<Job>(
    () => ({
      ...job,
      board_id: draft.board_id,
      plate: draft.plate,
      vehicle: draft.vehicle,
      client_name: draft.client_name,
      phone: draft.phone,
      mechanic: draft.mechanic,
      status: draft.status,
      priority: draft.priority,
      appointment_start: localInputToIso(draft.appointment_start),
      appointment_end: localInputToIso(draft.appointment_end),
      work_description: draft.work_description,
      pending_parts: draft.pending_parts,
      internal_notes: draft.internal_notes,
      david: draft.david,
      fane: draft.fane,
      entry_date: draft.entry_date || null,
      key_number: draft.key_number,
      chapa_type: draft.chapa_type,
      invoice_number: draft.invoice_number || null,
      kilometers: draft.kilometers || null
    }),
    [draft, job]
  );

  function updateDraft<K extends keyof JobDraft>(key: K, value: JobDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleStartChange(value: string) {
    setDraft((current) => ({
      ...current,
      appointment_start: value,
      appointment_end: current.appointment_end || addMinutesToLocalInput(value, DEFAULT_APPOINTMENT_MINUTES)
    }));
  }

  async function handleSave() {
    let appointmentEnd = draft.appointment_end;

    if (draft.appointment_start && !appointmentEnd) {
      appointmentEnd = addMinutesToLocalInput(draft.appointment_start, DEFAULT_APPOINTMENT_MINUTES);

      setDraft((current) => ({
        ...current,
        appointment_end: appointmentEnd
      }));
    }

    const patch: JobPatch = {
      board_id: draft.board_id,
      plate: draft.plate,
      vehicle: draft.vehicle,
      client_name: draft.client_name,
      phone: draft.phone,
      mechanic: draft.mechanic,
      status: draft.status,
      priority: draft.priority,
      appointment_start: localInputToIso(draft.appointment_start),
      appointment_end: localInputToIso(appointmentEnd),
      work_description: draft.work_description,
      pending_parts: draft.pending_parts,
      internal_notes: draft.internal_notes,
      david: draft.david,
      fane: draft.fane,
      entry_date: draft.entry_date || null,
      key_number: draft.key_number,
      chapa_type: draft.chapa_type,
      invoice_number: draft.invoice_number || null,
      kilometers: draft.kilometers || null
    };

    const updated = await onSaveJob(job, patch);

    if (updated) {
      setDraft(createDraft(updated));
    }
  }

  async function handlePlateBlur() {
    const cleanPlate = draft.plate.toUpperCase().trim();

    if (!cleanPlate) return;
    if (cleanPlate === job.plate) return;

    const updated = await onApplyPlateAndFindClient(job, cleanPlate);

    if (updated) {
      setDraft((current) => ({
        ...createDraft(updated),
        board_id: current.board_id,
        status: current.status,
        priority: current.priority,
        appointment_start: current.appointment_start,
        appointment_end: current.appointment_end,
        work_description: current.work_description,
        pending_parts: current.pending_parts,
        internal_notes: current.internal_notes
      }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-2">
      <div className="max-h-[96vh] w-full max-w-7xl overflow-y-auto rounded-3xl bg-white p-3 shadow-2xl lg:overflow-visible">
        <div className="mb-3 flex flex-col gap-2 border-b pb-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap gap-1.5">
              <p className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${currentBoard.className}`}>
                {currentBoard.name}
              </p>

              <p className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${priority.badgeClass}`}>
                Prioridad: {priority.name}
              </p>

              {draft.david && (
                <p className="inline-flex rounded-full border border-fuchsia-400 bg-fuchsia-100 px-2.5 py-1 text-[11px] font-black text-fuchsia-800">
                  DAVID
                </p>
              )}

              {draft.fane && (
                <p className="inline-flex rounded-full border border-orange-400 bg-orange-100 px-2.5 py-1 text-[11px] font-black text-orange-800">
                  FANE
                </p>
              )}

              {saveState !== 'idle' && (
                <p className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600">
                  {saveState === 'saving' ? 'Guardando...' : saveState === 'saved' ? 'Guardado' : 'Error'}
                </p>
              )}
            </div>

            <h3 className="truncate text-xl font-black">
              {draft.plate || 'Sin matrícula'} · {draft.vehicle || 'Sin vehículo'}
            </h3>

            <p className="text-xs font-semibold text-gray-500">
              Ficha del vehículo
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800"
            >
              <Save className="mr-1 inline h-4 w-4" />
              Guardar
            </button>

            <button
              type="button"
              onClick={() => onSyncCalendar(previewJob)}
              className="rounded-xl bg-green-700 px-3 py-2 text-xs font-black text-white hover:bg-green-800"
            >
              <CalendarDays className="mr-1 inline h-4 w-4" />
              Calendar
            </button>

            <button
              type="button"
              onClick={() => onSendAppointmentWhatsapp(previewJob)}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
            >
              <MessageCircle className="mr-1 inline h-4 w-4" />
              WhatsApp cita
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
            >
              <X className="mr-1 inline h-4 w-4" />
              Cerrar
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_300px]">
          <div>
            <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-4">
              <SelectField
                label="Tablero"
                value={draft.board_id}
                options={boards.map((board) => ({
                  value: board.id,
                  label: board.name
                }))}
                onChange={(value) => updateDraft('board_id', value as BoardId)}
              />

              <Field
                label="Matrícula"
                value={draft.plate}
                placeholder="Matrícula"
                onBlur={handlePlateBlur}
                onChange={(value) => updateDraft('plate', value.toUpperCase())}
              />

              <Field
                label="Vehículo"
                value={draft.vehicle}
                placeholder="Vehículo"
                onChange={(value) => updateDraft('vehicle', value)}
              />

              <Field
                label="Nº factura"
                value={draft.invoice_number}
                placeholder="Nº factura"
                onChange={(value) => updateDraft('invoice_number', value)}
              />

              <Field
                label="Kilómetros"
                value={draft.kilometers}
                placeholder="Ej. 123.456"
                onChange={(value) => updateDraft('kilometers', value)}
              />

              <MechanicField
                value={draft.mechanic}
                mechanics={mechanics}
                onChange={(value) => updateDraft('mechanic', value)}
              />

              <SelectField
                label="Estado"
                value={draft.status}
                options={columns.map((column) => ({
                  value: column.id,
                  label: column.title
                }))}
                onChange={(value) => updateDraft('status', value as JobStatus)}
              />

              <SelectField
                label="Prioridad"
                value={draft.priority}
                options={priorities.map((item) => ({
                  value: item.id,
                  label: item.name
                }))}
                onChange={(value) => updateDraft('priority', value as JobPriority)}
              />

              <Field
                label="Inicio cita"
                type="datetime-local"
                value={draft.appointment_start}
                onChange={handleStartChange}
              />

              <Field
                label="Fin cita"
                type="datetime-local"
                value={draft.appointment_end}
                onChange={(value) => updateDraft('appointment_end', value)}
              />

              <Field
                label="Fecha de entrada"
                type="date"
                value={draft.entry_date}
                onChange={(value) => updateDraft('entry_date', value)}
              />

              <Field
                label="Nº de llave"
                value={draft.key_number}
                placeholder="Nº de llave"
                onChange={(value) => updateDraft('key_number', value)}
              />

              {draft.board_id === 'chapa' && (
                <div>
                  <span className="text-xs font-black text-gray-600">Tipo Chapa</span>

                  <div className="mt-1 flex gap-1">
                    {(['chapa', 'particular', 'vtc'] as const).map((type) => {
                      const active = draft.chapa_type === type;
                      const colorClass = active
                        ? type === 'chapa'      ? 'border-blue-400 bg-blue-100 text-blue-800'
                          : type === 'particular' ? 'border-rose-400 bg-rose-100 text-rose-800'
                          :                        'border-green-400 bg-green-100 text-green-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50';
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateDraft('chapa_type', type)}
                          className={`rounded-lg border px-2 py-1 text-xs font-black transition ${colorClass}`}
                        >
                          {type === 'chapa' ? 'CHAPA' : type === 'particular' ? 'PARTICULAR' : 'VTC'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              <WorkDescriptionField
                value={draft.work_description}
                onChange={(value) => updateDraft('work_description', value)}
              />

              <TextField
                label="Piezas pendientes"
                helper="Al guardar, se moverá a Esperando piezas."
                value={draft.pending_parts}
                rows={4}
                onChange={(value) => {
                  updateDraft('pending_parts', value);
                  onDraftPendingParts(job, value);
                }}
              />

              <TextField
                label="Notas internas privadas"
                helper="Esto NO se envía a Google Calendar."
                value={draft.internal_notes}
                rows={4}
                onChange={(value) => updateDraft('internal_notes', value)}
              />
            </div>

            <div className="mt-3 flex flex-col items-end gap-2">
              <div className="flex items-center gap-3">
                {draft.fane && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/fane-stamp.webp" alt="FANE" className="w-24 opacity-90" />
                )}

                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${draft.fane ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={draft.fane}
                    onChange={(event) => updateDraft('fane', event.target.checked)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className={`text-xs font-black ${draft.fane ? 'text-orange-800' : 'text-gray-600'}`}>
                    FANE
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                {draft.david && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/david-stamp.webp" alt="DAVID" className="w-24 opacity-90" />
                )}

                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 transition ${draft.david ? 'border-fuchsia-400 bg-fuchsia-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                  <input
                    type="checkbox"
                    checked={draft.david}
                    onChange={(event) => updateDraft('david', event.target.checked)}
                    className="h-4 w-4 accent-fuchsia-600"
                  />
                  <span className={`text-xs font-black ${draft.david ? 'text-fuchsia-800' : 'text-gray-600'}`}>
                    DAVID
                  </span>
                </label>
              </div>
            </div>
          </div>

          <aside className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
            <DocumentsPanel
  	      jobId={job.id}
              refreshKey={job.updated_at ? new Date(job.updated_at).getTime() : undefined}
              onFile={(type, file) => onUploadFile(job, type, file)}
            />

            <div className="rounded-2xl border bg-amber-50 p-3">
              <h4 className="mb-1.5 flex items-center gap-2 text-sm font-black text-amber-800">
                <ClipboardList className="h-4 w-4" />
                Piezas pendientes
              </h4>

              <p className="max-h-24 overflow-y-auto whitespace-pre-line text-xs font-semibold text-amber-800">
                {draft.pending_parts || 'No hay piezas pendientes apuntadas.'}
              </p>
            </div>

            <div className="rounded-2xl border bg-gray-50 p-3">
              <h4 className="mb-1.5 text-sm font-black">Resumen</h4>

              <p className="text-xs text-gray-600">
                <strong>Tablero:</strong> {currentBoard.name}
              </p>

              <p className="mt-1 text-xs text-gray-600">
                <strong>Estado:</strong> {columns.find((column) => column.id === draft.status)?.title}
              </p>

              <p className="mt-1 text-xs text-gray-600">
                <strong>Prioridad:</strong>{' '}
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${getPriority(draft.priority).badgeClass}`}>
                  {getPriority(draft.priority).name}
                </span>
              </p>

              <p className="mt-1 text-xs text-gray-600">
                <strong>Cita:</strong>{' '}
                {draft.appointment_start ? formatDate(localInputToIso(draft.appointment_start)) : 'Sin cita'}
              </p>

              {draft.invoice_number && (
                <p className="mt-1 truncate text-xs text-gray-600">
                  <strong>Factura:</strong> {draft.invoice_number}
                </p>
              )}

              {draft.kilometers && (
                <p className="mt-1 truncate text-xs text-gray-600">
                  <strong>Km:</strong> {draft.kilometers}
                </p>
              )}

              <button
                type="button"
                onClick={() => onDeleteJob(job)}
                className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100"
              >
                <Trash2 className="mr-1 inline h-4 w-4" />
                Eliminar vehículo
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MechanicField({
  value,
  mechanics,
  onChange
}: {
  value: string;
  mechanics: Mechanic[];
  onChange: (value: string) => void;
}) {
  const nameInList = mechanics.some((m) => m.name === value);
  const showStale = value !== '' && !nameInList;

  return (
    <div>
      <span className="text-xs font-black text-gray-600">Mecánico</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
      >
        <option value="">Sin asignar</option>
        {showStale && (
          <option value={value}>{value} (inactivo)</option>
        )}
        {mechanics.map((m) => (
          <option key={m.id} value={m.name}>{m.name}</option>
        ))}
      </select>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-gray-600">{label}</span>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-xs font-semibold outline-none placeholder:text-gray-400 focus:border-blue-600"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-gray-600">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  helper,
  value,
  rows = 4,
  onChange
}: {
  label: string;
  helper?: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-gray-600">{label}</span>

      {helper && <p className="mt-0.5 text-[11px] font-semibold text-gray-400">{helper}</p>}

      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
      />
    </label>
  );
}

function WorkDescriptionField({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const lines = normalizeWorkLines(value);

  function togglePreset(preset: string, checked: boolean) {
    const currentLines = normalizeWorkLines(value);
    const withoutPreset = currentLines.filter((line) => line !== preset);

    const nextLines = checked
      ? [...withoutPreset, preset]
      : withoutPreset;

    onChange(nextLines.join('\n'));
  }

  return (
    <div className="block">
      <span className="text-xs font-black text-gray-600">
        Trabajo visible para Google Calendar
      </span>

      <p className="mt-0.5 text-[11px] font-semibold text-gray-400">
        Esto sí se enviará a Calendar.
      </p>

      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Escribe el trabajo o marca una opción rápida..."
        className="mt-1 w-full resize-none rounded-xl border px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        {WORK_PRESETS.map((preset) => {
          const checked = lines.includes(preset);

          return (
            <label
              key={preset}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black ${
                checked
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => togglePreset(preset, event.target.checked)}
                className="h-4 w-4"
              />

              {preset}
            </label>
          );
        })}
      </div>
    </div>
  );
}