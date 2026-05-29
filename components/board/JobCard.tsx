import { AlertTriangle, ArrowLeft, ArrowRight, CalendarDays, FileText, GripVertical, KeyRound, MessageSquare, Package, Wrench } from 'lucide-react';
import type { Job } from '@/lib/types';
import type { BoardInfo } from './board-config';
import { formatDate, getPriority, hasPendingParts } from './board-config';

const CHAPA_TYPE_BADGE: Record<'chapa' | 'particular' | 'vtc', { label: string; className: string }> = {
  chapa:      { label: 'CHAPA',      className: 'border-blue-300 bg-blue-100 text-blue-800' },
  particular: { label: 'PARTICULAR', className: 'border-rose-300 bg-rose-100 text-rose-800' },
  vtc:        { label: 'VTC',        className: 'border-green-300 bg-green-100 text-green-800' }
};

const CHAPA_TYPE_STYLES: Record<'chapa' | 'particular' | 'vtc', { bg: string; bar: string }> = {
  chapa:      { bg: 'bg-blue-50',  bar: 'bg-blue-400' },
  particular: { bg: 'bg-rose-50',  bar: 'bg-rose-400' },
  vtc:        { bg: 'bg-green-50', bar: 'bg-green-400' }
};

export function JobCard({
  job,
  activeBoard,
  isDragging,
  messageCount = 0,
  onOpen,
  onDragStart,
  onDragEnd,
  onMove,
  onOpenChat,
  onToggleChapaType
}: {
  job: Job;
  activeBoard: BoardInfo;
  isDragging: boolean;
  messageCount?: number;
  onOpen: (job: Job) => void;
  onDragStart: (jobId: string) => void;
  onDragEnd: () => void;
  onMove: (job: Job, direction: number) => void;
  onSyncCalendar: (job: Job) => void;
  onOpenChat: () => void;
  onToggleChapaType: (job: Job) => void;
}) {
  const priorityInfo = getPriority(job.priority);

  const isDavid = Boolean(job.david);
  const isFane = Boolean(job.fane);
  const hasInternalNotes = Boolean(job.internal_notes && job.internal_notes.trim().length > 0);
  const isChapa = job.board_id === 'chapa';
  const chapaType = (job.chapa_type || 'chapa') as 'chapa' | 'particular' | 'vtc';
  const chapaBadge = CHAPA_TYPE_BADGE[chapaType];
  const chapaStyles = CHAPA_TYPE_STYLES[chapaType];

  return (
    <article
      draggable
      onDragStart={(e) => {
        onDragStart(job.id);
        e.dataTransfer.setData('jobId', job.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(job)}
      className={`cursor-grab overflow-hidden rounded-2xl p-0 shadow-md transition active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-lg ${
        isChapa
          ? `border-2 ${priorityInfo.borderClass} ${isDavid ? 'bg-fuchsia-50' : isFane ? 'bg-orange-50' : chapaStyles.bg}`
          : priorityInfo.cardClass
      } ${isDragging ? 'opacity-60 ring-2 ring-blue-300' : ''} ${isDavid ? 'ring-2 ring-fuchsia-500 shadow-fuchsia-200' : ''} ${isFane && !isDavid ? 'ring-2 ring-orange-400 shadow-orange-200' : ''}`}
    >
      <div className={`h-2 w-full ${isDavid ? 'bg-fuchsia-500' : isFane ? 'bg-orange-400' : isChapa ? chapaStyles.bar : priorityInfo.barClass}`} />

      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 gap-1">
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-tight text-slate-950">
                {job.plate || 'Sin matrícula'}
              </p>

              <p className="truncate text-xs font-semibold text-gray-700">
                {job.vehicle || 'Sin vehículo'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {isChapa ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleChapaType(job); }}
                title="Cambiar tipo"
                className={`rounded-full border px-2 py-0.5 text-[10px] font-black transition hover:opacity-75 ${chapaBadge.className}`}
              >
                {chapaBadge.label}
              </button>
            ) : (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${activeBoard.className}`}>
                {activeBoard.short}
              </span>
            )}

            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase shadow-sm ${priorityInfo.badgeClass}`}>
              {priorityInfo.name}
            </span>

            {isDavid && (
              <span className="rounded-full border border-fuchsia-400 bg-fuchsia-100 px-2.5 py-1 text-[10px] font-black text-fuchsia-800">
                DAVID
              </span>
            )}

            {isFane && (
              <span className="rounded-full border border-orange-400 bg-orange-100 px-2.5 py-1 text-[10px] font-black text-orange-800">
                FANE
              </span>
            )}
          </div>
        </div>

        {job.invoice_number && (
          <p className="mt-1 truncate text-[11px] font-semibold text-gray-600">
            <FileText className="mr-1 inline h-3 w-3" />
            Fact: {job.invoice_number}
          </p>
        )}

        {job.kilometers && (
          <p className="truncate text-[11px] font-semibold text-gray-500">
            {job.kilometers} km
          </p>
        )}

        {job.mechanic && (
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-600">
            <Wrench className="mr-1 inline h-3 w-3" />
            {job.mechanic}
          </p>
        )}

        {job.appointment_start && (
          <p className="mt-1 truncate rounded-lg bg-white/70 px-2 py-1 text-[11px] font-black text-blue-700">
            <CalendarDays className="mr-1 inline h-3 w-3" />
            {formatDate(job.appointment_start)}
          </p>
        )}

        {hasPendingParts(job) && (
          <p className="mt-1 truncate rounded-lg bg-white/80 px-2 py-1 text-[11px] font-black text-amber-800">
            <Package className="mr-1 inline h-3 w-3" />
            {job.pending_parts}
          </p>
        )}

        {job.key_number && (
          <p className="mt-1 truncate text-[11px] font-semibold text-gray-500">
            <KeyRound className="mr-1 inline h-3 w-3" />
            {job.key_number}
          </p>
        )}

        {(isDavid || isFane) && (
          <div className="mt-1 flex gap-1">
            {isDavid && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/david-stamp.webp" alt="DAVID" className="w-10 opacity-80" />
            )}
            {isFane && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/fane-stamp.webp" alt="FANE" className="w-10 opacity-80" />
            )}
          </div>
        )}

        <div className="mt-2 flex gap-1" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            className="rounded-lg border bg-white p-1.5 text-xs font-bold hover:bg-gray-100"
            onClick={() => onMove(job, -1)}
            title="Mover al estado anterior"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            className="rounded-lg border bg-white p-1.5 text-xs font-bold hover:bg-gray-100"
            onClick={() => onMove(job, 1)}
            title="Mover al estado siguiente"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          {hasInternalNotes && (
            <span
              title="Tiene notas internas"
              aria-label="Tiene notas internas"
              className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-100 p-1.5 text-amber-700"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}

          {messageCount > 0 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onOpenChat(); }}
              title="Tiene mensajes internos"
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-1.5 py-1.5 text-blue-700 hover:bg-blue-100"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black leading-none">{messageCount}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}