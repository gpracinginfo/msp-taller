'use client';

import { useMemo } from 'react';
import { Printer, X } from 'lucide-react';
import type { Job, JobStatus } from '@/lib/types';
import { boards, formatDate, getPriority, hasPendingParts, normalizePlate } from './board-config';

// ─── Date helpers ────────────────────────────────────────────────────────────

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function isToday(ds: string | null): boolean {
  if (!ds) return false;
  const d = new Date(ds);
  const now = new Date();
  return d >= startOfDay(now) && d <= endOfDay(now);
}

function isTomorrow(ds: string | null): boolean {
  if (!ds) return false;
  const d = new Date(ds);
  const tmrw = new Date();
  tmrw.setDate(tmrw.getDate() + 1);
  return d >= startOfDay(tmrw) && d <= endOfDay(tmrw);
}

function isPast(ds: string | null): boolean {
  if (!ds) return false;
  return new Date(ds) < startOfDay(new Date());
}

function formatTime(ds: string): string {
  return new Date(ds).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ─── Future reservation check (mirrors BoardApp logic exactly) ───────────────
// sin_revisar + appointment strictly after today → excluded from Kanban

function isKanbanExcluded(job: Job): boolean {
  return (
    job.status === 'sin_revisar' &&
    !!job.appointment_start &&
    new Date(job.appointment_start) > endOfToday()
  );
}

// ─── Report statuses (no entrega) ────────────────────────────────────────────

const REPORT_STATUSES: Array<{ id: JobStatus; label: string }> = [
  { id: 'sin_revisar', label: 'Sin revisar / Grúa' },
  { id: 'entrada',     label: 'Entrada' },
  { id: 'diagnostico', label: 'Diagnóstico / Peritación' },
  { id: 'presupuesto', label: 'Presupuesto' },
  { id: 'piezas',      label: 'Esperando piezas' },
  { id: 'reparacion',  label: 'En reparación' },
  { id: 'control',     label: 'Finalizado' },
];

// ─── Deduplication by normalized plate ───────────────────────────────────────
// Prefer: non-entrega > most recently updated

function deduplicateByPlate(jobs: Job[]): Job[] {
  const map = new Map<string, Job>();

  for (const job of jobs) {
    const key = normalizePlate(job.plate) || job.id;
    const prev = map.get(key);
    if (!prev) { map.set(key, job); continue; }

    const prevActive = prev.status !== 'entrega';
    const jobActive = job.status !== 'entrega';
    if (!prevActive && jobActive) { map.set(key, job); continue; }
    if (prevActive && !jobActive) { continue; }

    const prevUpd = new Date(prev.updated_at || prev.created_at).getTime();
    const jobUpd = new Date(job.updated_at || job.created_at).getTime();
    if (jobUpd > prevUpd) map.set(key, job);
  }

  return Array.from(map.values());
}

// ─── HTML escape (for print window) ──────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Job row HTML (for print window) ─────────────────────────────────────────

function jobHtml(job: Job, index: number): string {
  const priority = getPriority(job.priority);

  let citaText = '';
  if (job.appointment_start) {
    if (isToday(job.appointment_start))
      citaText = `CITA HOY: ${formatTime(job.appointment_start)}`;
    else if (isTomorrow(job.appointment_start))
      citaText = `Cita mañana: ${formatTime(job.appointment_start)}`;
    else if (isPast(job.appointment_start))
      citaText = `Cita pasada: ${formatDate(job.appointment_start)}`;
  }

  const marks: string[] = [];
  if (job.david) marks.push('DAVID');
  if (job.fane)  marks.push('FANE');

  const chapaLabel =
    job.board_id === 'chapa' && job.chapa_type && job.chapa_type !== 'chapa'
      ? job.chapa_type === 'particular' ? 'PARTICULAR' : 'VTC'
      : null;

  let html = `<div class="summary-row">`;
  html += `<div class="summary-main">${index}. <strong>${esc(job.plate) || 'Sin matrícula'}</strong>`;
  html += ` · ${esc(job.vehicle) || 'Sin vehículo'}`;
  html += ` (${esc(priority.name)})`;
  if (chapaLabel)       html += ` [${esc(chapaLabel)}]`;
  if (marks.length > 0) html += ` [${marks.join('/')}]`;
  html += `</div>`;

  const details: string[] = [];
  if (job.invoice_number) details.push(`Fact: ${esc(job.invoice_number)}`);
  if (job.kilometers)     details.push(`Km: ${esc(job.kilometers)}`);
  if (job.mechanic)       details.push(`Mec: ${esc(job.mechanic)}`);
  if (job.key_number)     details.push(`Llave: ${esc(job.key_number)}`);
  if (job.entry_date)     details.push(`Entrada: ${formatDate(job.entry_date)}`);
  if (details.length > 0) html += `<div class="summary-detail">${details.join(' · ')}</div>`;

  if (citaText)
    html += `<div class="summary-detail">${esc(citaText)}</div>`;
  if (job.work_description)
    html += `<div class="summary-detail">Trabajo: ${esc(job.work_description)}</div>`;
  if (hasPendingParts(job))
    html += `<div class="summary-warning">&#9888; PIEZAS: ${esc(job.pending_parts)}</div>`;
  if (job.internal_notes?.trim())
    html += `<div class="summary-detail">&#9733; Tiene notas internas</div>`;

  html += `</div>`;
  return html;
}

// ─── Job row (screen) ─────────────────────────────────────────────────────────

function JobRow({ job, index, onOpenJob }: { job: Job; index: number; onOpenJob: (job: Job) => void }) {
  const priority = getPriority(job.priority);

  let citaText: string | null = null;
  let citaClass = '';
  if (job.appointment_start) {
    if (isToday(job.appointment_start)) {
      citaText = `CITA HOY: ${formatTime(job.appointment_start)}`;
      citaClass = 'font-black text-blue-700';
    } else if (isTomorrow(job.appointment_start)) {
      citaText = `Cita mañana: ${formatTime(job.appointment_start)}`;
      citaClass = 'font-bold text-indigo-600';
    } else if (isPast(job.appointment_start)) {
      citaText = `Cita pasada: ${formatDate(job.appointment_start)}`;
      citaClass = 'font-bold text-orange-600';
    }
  }

  const marks: string[] = [];
  if (job.david) marks.push('DAVID');
  if (job.fane) marks.push('FANE');

  const chapaLabel =
    job.board_id === 'chapa' && job.chapa_type && job.chapa_type !== 'chapa'
      ? job.chapa_type === 'particular' ? 'PARTICULAR' : 'VTC'
      : null;

  const hasDetails =
    job.invoice_number || job.kilometers || job.mechanic || job.key_number || job.entry_date;

  return (
    <div
      className="summary-row cursor-pointer rounded-lg border-b border-gray-100 px-2 py-2 last:border-0 hover:bg-slate-50 print:cursor-default print:hover:bg-transparent"
      role="button"
      tabIndex={0}
      title="Abrir ficha"
      onClick={() => onOpenJob(job)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenJob(job); } }}
    >
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
        <span className="shrink-0 text-xs font-bold text-gray-400">{index}.</span>
        <span className="text-sm font-black text-slate-900">
          {job.plate || 'Sin matrícula'}
        </span>
        <span className="text-sm text-slate-700">
          · {job.vehicle || 'Sin vehículo'}
        </span>
        <span className="text-xs text-gray-400">({priority.name})</span>
        {chapaLabel && (
          <span className="text-xs font-black text-blue-700">[{chapaLabel}]</span>
        )}
        {marks.length > 0 && (
          <span className="text-xs font-black text-indigo-700">[{marks.join('/')}]</span>
        )}
      </div>

      {hasDetails && (
        <div className="ml-4 mt-0.5 flex flex-wrap gap-x-4 text-xs text-gray-500">
          {job.invoice_number && <span>Fact: {job.invoice_number}</span>}
          {job.kilometers && <span>Km: {job.kilometers}</span>}
          {job.mechanic && <span>Mec: {job.mechanic}</span>}
          {job.key_number && <span>Llave: {job.key_number}</span>}
          {job.entry_date && <span>Entrada: {formatDate(job.entry_date)}</span>}
        </div>
      )}

      {citaText && (
        <p className={`ml-4 text-xs ${citaClass}`}>{citaText}</p>
      )}

      {job.work_description && (
        <p className="ml-4 text-xs text-gray-600">
          Trabajo: {job.work_description}
        </p>
      )}

      {hasPendingParts(job) && (
        <p className="ml-4 text-xs font-black text-orange-700">
          ⚠ PIEZAS: {job.pending_parts}
        </p>
      )}

      {job.internal_notes && job.internal_notes.trim() && (
        <p className="ml-4 text-xs font-semibold text-purple-700">
          ★ Tiene notas internas
        </p>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function DailySummaryModal({
  jobs,
  onClose,
  onOpenJob
}: {
  jobs: Job[];
  onClose: () => void;
  onOpenJob: (job: Job) => void;
}) {
  const today = useMemo(
    () =>
      new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
    []
  );

  const boardData = useMemo(() =>
    boards.map((board) => {
      const bAll = jobs.filter((j) => j.board_id === board.id);

      const rawTomorrow = bAll.filter(
        (j) => j.status === 'sin_revisar' && isTomorrow(j.appointment_start)
      );

      const rawKanban = bAll.filter(
        (j) => j.status !== 'entrega' && !isKanbanExcluded(j)
      );

      const dedupedKanban = deduplicateByPlate(rawKanban);

      const kanbanPlateSet = new Set(
        dedupedKanban.map((j) => normalizePlate(j.plate) || j.id)
      );

      const tomorrowReservations = deduplicateByPlate(
        rawTomorrow.filter((j) => !kanbanPlateSet.has(normalizePlate(j.plate) || j.id))
      ).sort(
        (a, b) =>
          new Date(a.appointment_start!).getTime() - new Date(b.appointment_start!).getTime()
      );

      const byStatus = REPORT_STATUSES.map(({ id, label }) => ({
        id,
        label,
        jobs: dedupedKanban
          .filter((j) => j.status === id)
          .sort((a, b) => {
            const at = a.appointment_start
              ? new Date(a.appointment_start).getTime()
              : Infinity;
            const bt = b.appointment_start
              ? new Date(b.appointment_start).getTime()
              : Infinity;
            return at - bt;
          })
      }));

      const totalActive = dedupedKanban.length;

      return { board, tomorrowReservations, byStatus, totalActive };
    }),
    [jobs]
  );

  function handlePrint() {
    const pw = window.open('', '_blank', 'width=900,height=1200');
    if (!pw) return;

    let bodyHtml = `<div class="report-header">
      <div class="report-brand">MSP</div>
      <h1>Resumen diario</h1>
      <div class="report-date">${esc(today)}</div>
    </div>`;

    for (const { board, tomorrowReservations, byStatus, totalActive } of boardData) {
      bodyHtml += `<div class="summary-section">`;
      bodyHtml += `<h2>${esc(board.name)} <span class="section-count">— ${totalActive} veh&iacute;culo${totalActive !== 1 ? 's' : ''} activos</span></h2>`;

      if (tomorrowReservations.length > 0) {
        bodyHtml += `<h3>Pr&oacute;ximas citas de ma&ntilde;ana (${tomorrowReservations.length})</h3>`;
        tomorrowReservations.forEach((job, i) => { bodyHtml += jobHtml(job, i + 1); });
      }

      for (const { id, label, jobs: sJobs } of byStatus) {
        if (sJobs.length === 0) continue;
        bodyHtml += `<h3>${id === 'piezas' ? '&#9888; ' : ''}${esc(label)} (${sJobs.length})</h3>`;
        sJobs.forEach((job, i) => { bodyHtml += jobHtml(job, i + 1); });
      }

      if (totalActive === 0 && tomorrowReservations.length === 0) {
        bodyHtml += `<p class="empty">Sin veh&iacute;culos activos en este tablero.</p>`;
      }
      bodyHtml += `</div>`;
    }

    pw.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Resumen diario - MSP</title>
  <style>
    body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 20px; font-size: 12px; line-height: 1.4; }
    .report-header { margin-bottom: 20px; }
    .report-brand { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #666; }
    h1 { font-size: 22px; margin: 4px 0 2px; }
    .report-date { font-size: 13px; color: #444; text-transform: capitalize; margin-bottom: 4px; }
    h2 { font-size: 16px; margin: 20px 0 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
    .section-count { font-size: 12px; font-weight: normal; color: #555; }
    h3 { margin: 14px 0 6px; padding: 6px 8px; background: #eeeeee; border-left: 5px solid #000; border-bottom: 1px solid #999; font-size: 14px; font-weight: 800; text-transform: uppercase; page-break-after: avoid; }
    .summary-section { margin-bottom: 16px; }
    .summary-row { padding: 4px 0 4px 8px; border-bottom: 1px solid #eee; page-break-inside: avoid; }
    .summary-main { font-weight: 700; }
    .summary-detail { margin-top: 2px; color: #333; font-size: 11px; }
    .summary-warning { margin-top: 2px; font-weight: 900; font-size: 11px; }
    .empty { font-style: italic; color: #888; font-size: 11px; }
    @page { margin: 12mm; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`);
    pw.document.close();
    pw.focus();
    pw.print();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="daily-summary-print-area flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                MSP
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Resumen diario
              </h2>
              <p className="mt-0.5 text-sm font-semibold capitalize text-gray-500">
                {today}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-50"
              >
                <Printer className="mr-2 inline h-4 w-4" />
                Imprimir
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-50"
              >
                <X className="mr-2 inline h-4 w-4" />
                Cerrar
              </button>
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto px-6 py-4">
          {boardData.map(({ board, tomorrowReservations, byStatus, totalActive }) => (
            <section key={board.id} className="mb-8">

              <h3 className="border-b-2 border-slate-800 pb-1 text-lg font-black uppercase tracking-wide text-slate-800">
                {board.name}
                <span className="ml-2 text-sm font-semibold normal-case text-gray-400">
                  — {totalActive} vehículo{totalActive !== 1 ? 's' : ''} activos
                </span>
              </h3>

              {tomorrowReservations.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 rounded-lg border-l-4 border-indigo-600 bg-indigo-50 px-3 py-2 text-sm font-black uppercase tracking-wide text-indigo-800">
                    Próximas citas de mañana
                    <span className="ml-2 font-black">({tomorrowReservations.length})</span>
                  </h4>
                  {tomorrowReservations.map((job, i) => (
                    <JobRow key={job.id} job={job} index={i + 1} onOpenJob={onOpenJob} />
                  ))}
                </div>
              )}

              {byStatus.map(({ id, label, jobs: statusJobs }) => {
                if (statusJobs.length === 0) return null;
                const isPiezas = id === 'piezas';
                return (
                  <div key={id} className="mt-4">
                    <h4 className={`mb-2 rounded-lg border-l-4 px-3 py-2 text-sm font-black uppercase tracking-wide ${
                      isPiezas
                        ? 'border-orange-500 bg-orange-50 text-orange-800'
                        : 'border-slate-800 bg-slate-100 text-slate-800'
                    }`}>
                      {isPiezas ? '⚠ ' : ''}{label}
                      <span className="ml-2 font-black">({statusJobs.length})</span>
                    </h4>
                    {statusJobs.map((job, i) => (
                      <JobRow key={job.id} job={job} index={i + 1} onOpenJob={onOpenJob} />
                    ))}
                  </div>
                );
              })}

              {totalActive === 0 && tomorrowReservations.length === 0 && (
                <p className="mt-3 text-xs italic text-gray-400">
                  Sin vehículos activos en este tablero.
                </p>
              )}

            </section>
          ))}
        </div>

      </div>
    </div>
  );
}
