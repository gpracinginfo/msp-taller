'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { BoardId, Job, JobStatus, UploadFileType } from '@/lib/types';
import type { SaveState } from './board/board-types';
import type { ToastMessage, ToastTone } from './board/Toast';
import { BoardHeader } from './board/BoardHeader';
import { DeliveredHistoryModal } from './board/DeliveredHistoryModal';
import { InfoPanel } from './board/InfoPanel';
import { JobModal } from './board/JobModal';
import { KanbanBoard } from './board/KanbanBoard';
import { MechanicsModal } from './board/MechanicsModal';
import { MetricsBar } from './board/MetricsBar';
import { DailySummaryModal } from './board/DailySummaryModal';
import { FutureAppointmentsModal } from './board/FutureAppointmentsModal';
import { NoAppointmentModal } from './board/NoAppointmentModal';
import { Toast } from './board/Toast';
import { boards, columns, formatDate, getPriority, hasPendingParts, normalizePlate } from './board/board-config';
import { useClientAutoComplete } from './board/useClientAutoComplete';
import { useMechanics } from './board/useMechanics';

type JobPatch = Partial<Job>;

const SAVE_STATE_RESET_MS = 1600;
const TOAST_RESET_MS = 3600;
const DEFAULT_APPOINTMENT_MINUTES = 90;

function getEndTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getStartTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isAfterToday(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date > endOfToday;
}

function addMinutesToIso(value: string, minutes: number) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function normalizePhoneForWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('34') && digits.length > 9 ? digits : `34${digits}`;
}

function isPlaceholderValue(value: unknown, placeholder: string) {
  return String(value || '').trim().toLowerCase() === placeholder.toLowerCase();
}

export function BoardApp({ userEmail }: { userEmail?: string }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [activeBoard, setActiveBoard] = useState<BoardId>('chapa');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<JobStatus | null>(null);
  const [showDeliveredHistory, setShowDeliveredHistory] = useState(false);
  const [showMechanicsModal, setShowMechanicsModal] = useState(false);
  const [showNoAppointmentModal, setShowNoAppointmentModal] = useState(false);
  const [showFutureAppointmentsModal, setShowFutureAppointmentsModal] = useState(false);
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);

  const jobsRef = useRef<Job[]>([]);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragWasUsedRef = useRef(false);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    return () => {
      if (saveStateTimerRef.current) {
        clearTimeout(saveStateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), TOAST_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  const setTransientSaveState = useCallback((state: SaveState) => {
    if (saveStateTimerRef.current) {
      clearTimeout(saveStateTimerRef.current);
    }

    setSaveState(state);

    if (state === 'saved' || state === 'error') {
      saveStateTimerRef.current = setTimeout(() => setSaveState('idle'), SAVE_STATE_RESET_MS);
    }
  }, []);

  const mergeJob = useCallback((id: string, patch: JobPatch) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));

    setSelected((current) => {
      if (!current || current.id !== id) return current;
      return { ...current, ...patch };
    });
  }, []);

  const loadJobs = useCallback(async (withSpinner = true) => {
    if (withSpinner) {
      setLoading(true);
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      showToast('No se pudo comprobar la sesión del usuario.', 'error');
      setLoading(false);
      return;
    }

    setUserId(authData.user.id);

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(`No se pudieron cargar los trabajos: ${error.message}`, 'error');
    } else {
      setJobs((data || []) as Job[]);
    }

    setLoading(false);
  }, [showToast, supabase]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const { findClientByPlate, saveClientFromJob } = useClientAutoComplete({
    supabase,
    userId,
    onError: showError
  });

  const { mechanics, loading: mechanicsLoading, error: mechanicsError, addMechanic, deactivateMechanic } = useMechanics({ supabase });

  const activeBoardInfo = boards.find((board) => board.id === activeBoard) || boards[0];

  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return jobs.filter((job) => {
      const belongsToBoard = job.board_id === activeBoard;

      const isFutureReservation =
        job.status === 'sin_revisar' &&
        !!job.appointment_start &&
        isAfterToday(job.appointment_start);

      const matchesSearch = [
        job.plate,
        job.vehicle,
        job.client_name,
        job.phone,
        job.priority || '',
        getPriority(job.priority).name,
        job.work_description,
        job.mechanic || '',
        job.internal_notes || '',
        job.pending_parts || '',
        job.david ? 'david' : '',
        job.fane ? 'fane' : '',
        job.key_number || '',
        job.entry_date || '',
        job.chapa_type || ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);

      return belongsToBoard && job.status !== 'entrega' && !isFutureReservation && matchesSearch;
    });
  }, [activeBoard, jobs, query]);

  const deliveredJobs = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    return jobs
      .filter((job) => {
        const belongsToBoard = job.board_id === activeBoard;
        const isDelivered = job.status === 'entrega';

        const matchesSearch = [
          job.plate,
          job.vehicle,
          job.client_name,
          job.phone,
          job.priority || '',
          getPriority(job.priority).name,
          job.work_description,
          job.mechanic || '',
          job.internal_notes || '',
          job.pending_parts || '',
          job.david ? 'david' : '',
          job.fane ? 'fane' : '',
          job.key_number || '',
          job.entry_date || '',
          job.chapa_type || ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

        return belongsToBoard && isDelivered && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at).getTime();
        const dateB = new Date(b.updated_at || b.created_at).getTime();

        return dateB - dateA;
      });
  }, [activeBoard, jobs, query]);

  const boardStats = useMemo(() => {
    const boardJobs = jobs.filter((job) => job.board_id === activeBoard);

    return {
      total: boardJobs.length,
      active: boardJobs.filter((job) => job.status !== 'entrega').length,
      piezas: boardJobs.filter((job) => job.status === 'piezas' || hasPendingParts(job)).length,
      entrega: boardJobs.filter((job) => job.status === 'entrega').length,
      citas: boardJobs.filter((job) => job.appointment_start).length,
      noAppointment: boardJobs.filter((job) => !job.appointment_start && job.status !== 'entrega').length
    };
  }, [activeBoard, jobs]);

  const tomorrowAppointments = useMemo(() => {
    const startTomorrow = getStartTomorrow();
    const endTomorrow = getEndTomorrow();

    return jobs
      .filter((job) => {
        if (job.board_id !== activeBoard) return false;
        if (job.status === 'entrega') return false;
        if (!job.appointment_start) return false;
        const d = new Date(job.appointment_start);
        return d >= startTomorrow && d <= endTomorrow;
      })
      .sort((a, b) => new Date(a.appointment_start!).getTime() - new Date(b.appointment_start!).getTime());
  }, [activeBoard, jobs]);

  const futureReservationJobsAll = useMemo(() => {
    const endTomorrow = getEndTomorrow();

    return jobs
      .filter((job) => {
        if (job.board_id !== activeBoard) return false;
        if (job.status !== 'sin_revisar') return false;
        if (!job.appointment_start) return false;
        return new Date(job.appointment_start) > endTomorrow;
      })
      .sort((a, b) => new Date(a.appointment_start!).getTime() - new Date(b.appointment_start!).getTime());
  }, [activeBoard, jobs]);

  const partsJobs = useMemo(() => {
    return visibleJobs
      .filter((job) => job.status === 'piezas' || hasPendingParts(job))
      .slice(0, 12);
  }, [visibleJobs]);

  const noAppointmentModalJobs = useMemo(() => {
    return jobs.filter((job) =>
      job.board_id === activeBoard &&
      !job.appointment_start &&
      job.status !== 'entrega'
    );
  }, [activeBoard, jobs]);

  const buildAppointmentPatch = useCallback((id: string, patch: JobPatch) => {
    const previous = jobsRef.current.find((job) => job.id === id);
    const nextPatch: JobPatch = { ...patch };

    const nextStart = nextPatch.appointment_start;
    const nextEnd = nextPatch.appointment_end;
    const previousEnd = previous?.appointment_end;

    if (nextStart && !nextEnd && !previousEnd) {
      nextPatch.appointment_end = addMinutesToIso(nextStart, DEFAULT_APPOINTMENT_MINUTES);
    }

    return nextPatch;
  }, []);

  const updateJob = useCallback(async (id: string, patch: JobPatch) => {
    const previous = jobsRef.current.find((job) => job.id === id);
    const finalPatch = buildAppointmentPatch(id, patch);

    if (previous) {
      mergeJob(id, finalPatch);
    }

    setTransientSaveState('saving');

    const { data, error } = await supabase
      .from('jobs')
      .update(finalPatch)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      if (previous) {
        mergeJob(id, previous);
      }

      setTransientSaveState('error');
      showToast(`No se pudieron guardar los cambios: ${error?.message || 'respuesta vacía'}`, 'error');
      return null;
    }

    const updated = data as Job;
    mergeJob(id, updated);
    setTransientSaveState('saved');
    return updated;
  }, [buildAppointmentPatch, mergeJob, setTransientSaveState, showToast, supabase]);

  const updateJobAndClient = useCallback(async (id: string, patch: JobPatch) => {
    const updated = await updateJob(id, patch);

    if (updated) {
      await saveClientFromJob(updated);
    }

    return updated;
  }, [saveClientFromJob, updateJob]);

  const applyPlateAndFindClient = useCallback(async (job: Job, plate: string) => {
    const cleanPlate = plate.toUpperCase().trim();
    const plateNormalized = normalizePlate(cleanPlate);

    if (!plateNormalized) {
      showToast('La matrícula no puede quedar vacía.', 'error');
      return null;
    }

    const client = await findClientByPlate(cleanPlate);

    if (client) {
      const updated = await updateJob(job.id, {
        plate: cleanPlate,
        vehicle: client.vehicle || job.vehicle,
        client_name: client.client_name || job.client_name,
        phone: client.phone || job.phone
      });

      if (updated) {
        showToast('Cliente encontrado y datos aplicados.', 'success');
      }

      return updated;
    }

    const updated = await updateJob(job.id, { plate: cleanPlate });

    if (updated) {
      await saveClientFromJob(updated);
    }

    return updated;
  }, [findClientByPlate, saveClientFromJob, showToast, updateJob]);

  const getPendingPartsPatch = useCallback((job: Job, value: string): JobPatch => {
    const cleanValue = value.trim();
    const patch: JobPatch = { pending_parts: value };

    if (cleanValue.length > 0 && job.status !== 'piezas') {
      patch.status = 'piezas';
    }

    return patch;
  }, []);

  const draftPendingParts = useCallback((job: Job, value: string) => {
    mergeJob(job.id, getPendingPartsPatch(job, value));
  }, [getPendingPartsPatch, mergeJob]);

  const saveJobDraft = useCallback(async (job: Job, draft: JobPatch) => {
    const cleanPlate = String(draft.plate || job.plate || '').toUpperCase().trim();
    const plateNormalized = normalizePlate(cleanPlate);

    if (!plateNormalized) {
      showToast('La matrícula no puede quedar vacía.', 'error');
      return null;
    }

    let finalPatch: JobPatch = {
      ...draft,
      plate: cleanPlate
    };

    if (finalPatch.pending_parts && String(finalPatch.pending_parts).trim().length > 0 && job.status !== 'piezas') {
      finalPatch.status = 'piezas';
    }

    const client = await findClientByPlate(cleanPlate);

    if (client) {
      const draftVehicle = String(finalPatch.vehicle || '').trim();
      const draftClient = String(finalPatch.client_name || '').trim();
      const draftPhone = String(finalPatch.phone || '').trim();

      if (!draftVehicle || isPlaceholderValue(draftVehicle, 'Vehículo nuevo')) {
        finalPatch.vehicle = client.vehicle || finalPatch.vehicle || job.vehicle;
      }

      if (!draftClient || isPlaceholderValue(draftClient, 'Cliente nuevo')) {
        finalPatch.client_name = client.client_name || finalPatch.client_name || job.client_name;
      }

      if (!draftPhone || isPlaceholderValue(draftPhone, '600000000')) {
        finalPatch.phone = client.phone || finalPatch.phone || job.phone;
      }
    }

    const updated = await updateJobAndClient(job.id, finalPatch);

    if (updated) {
      showToast('Ficha guardada correctamente.', 'success');
    }

    return updated;
  }, [findClientByPlate, showToast, updateJobAndClient]);

  const addJob = useCallback(async () => {
    let currentUserId = userId;

    if (!currentUserId) {
      const { data } = await supabase.auth.getUser();
      currentUserId = data.user?.id || null;
      setUserId(currentUserId);
    }

    if (!currentUserId) {
      showToast('No hay sesión activa para crear el vehículo.', 'error');
      return;
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        user_id: currentUserId,
        board_id: activeBoard,
        status: 'sin_revisar',
        plate: '',
        vehicle: '',
        client_name: '',
        phone: '',
        priority: 'normal',
        work_description: '',
        internal_notes: '',
        pending_parts: '',
        mechanic: '',
        david: false,
        fane: false,
        entry_date: new Date().toISOString().slice(0, 10),
        key_number: '',
        chapa_type: activeBoard === 'chapa' ? 'chapa' : null
      })
      .select('*')
      .single();

    if (error || !data) {
      showToast(`No se pudo crear el vehículo: ${error?.message || 'respuesta vacía'}`, 'error');
      return;
    }

    const newJob = data as Job;
    setJobs((current) => [newJob, ...current]);
    setSelected(newJob);
    showToast('Vehículo creado.', 'success');
  }, [activeBoard, showToast, supabase, userId]);

  const deleteJob = useCallback(async (job: Job) => {
    const ok = window.confirm(`¿Eliminar ${job.plate || 'Sin matrícula'} - ${job.vehicle || 'Sin vehículo'}?`);

    if (!ok) return;

    const { error } = await supabase.from('jobs').delete().eq('id', job.id);

    if (error) {
      showToast(`No se pudo eliminar el vehículo: ${error.message}`, 'error');
      return;
    }

    setJobs((current) => current.filter((item) => item.id !== job.id));
    setSelected(null);
    showToast('Vehículo eliminado.', 'success');
  }, [showToast, supabase]);

  const moveJobToStatus = useCallback(async (jobId: string, status: JobStatus) => {
    const job = jobsRef.current.find((item) => item.id === jobId);

    if (!job || job.status === status) return;

    await updateJob(job.id, { status });
  }, [updateJob]);

  const moveJob = useCallback(async (job: Job, direction: number) => {
    const visibleColumns = columns.filter((column) => column.id !== 'entrega');
    const index = visibleColumns.findIndex((column) => column.id === job.status);

    if (index === -1) return;

    const next = visibleColumns[Math.max(0, Math.min(visibleColumns.length - 1, index + direction))].id;

    await updateJob(job.id, { status: next });
  }, [updateJob]);

  const toggleChapaType = useCallback(async (job: Job) => {
    const current = job.chapa_type;
    const next = (!current || current === 'chapa')
      ? 'particular'
      : current === 'particular'
        ? 'vtc'
        : 'chapa';
    await updateJob(job.id, { chapa_type: next });
  }, [updateJob]);

  const syncCalendar = useCallback(async (job: Job) => {
    if (!job.appointment_start || !job.appointment_end) {
      showToast('Antes de crear la cita, rellena inicio y fin de cita.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/google/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id })
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(json.error || 'No se pudo crear la cita.', 'error');
        return;
      }

      showToast('Cita creada o actualizada en Google Calendar.', 'success');
      await loadJobs(false);
    } catch {
      showToast('No se pudo contactar con la API de Google Calendar.', 'error');
    }
  }, [loadJobs, showToast]);

  const syncGoogleCalendar = useCallback(async () => {
    setTransientSaveState('saving');

    try {
      const res = await fetch('/api/google/sync-events', {
        method: 'POST'
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setTransientSaveState('error');
        showToast(json.error || 'No se pudo sincronizar desde Google Calendar.', 'error');
        return;
      }

      await loadJobs(false);
      setTransientSaveState('saved');

      const parts = [
        `${json.updated || 0} actualizadas`,
        `${json.unchanged || 0} sin cambios`
      ];

      if (json.disconnected) {
        parts.push(`${json.disconnected} desconectadas`);
      }

      if (json.skipped) {
        parts.push(`${json.skipped} omitidas`);
      }

      showToast(`Sincronización completada: ${parts.join(', ')}.`, 'success');

      if (Array.isArray(json.errors) && json.errors.length > 0) {
        showToast(`Algunas citas no se pudieron sincronizar: ${json.errors[0]}`, 'error');
      }
    } catch {
      setTransientSaveState('error');
      showToast('No se pudo contactar con la API de sincronización.', 'error');
    }
  }, [loadJobs, setTransientSaveState, showToast]);

  const sendAppointmentWhatsapp = useCallback((job: Job) => {
    if (!job.appointment_start) {
      showToast('Primero rellena la cita.', 'error');
      return;
    }

    const phone = normalizePhoneForWhatsapp(job.phone || '');

    if (!phone) {
      showToast('El vehículo no tiene teléfono de cliente.', 'error');
      return;
    }

    const date = new Date(job.appointment_start);
    const day = date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    const time = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = [
      `Hola, ${job.client_name || 'cliente'}.`,
      `Le confirmamos la cita para su vehículo ${job.vehicle || ''} matrícula ${job.plate || ''} el día ${day} a las ${time}.`,
      `Trabajo previsto: ${job.work_description || 'pendiente de confirmar'}.`,
      'Gracias.'
    ].join(' ');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }, [showToast]);

  const uploadFile = useCallback(async (job: Job, type: UploadFileType, file: File) => {
    const form = new FormData();

    form.append('jobId', job.id);
    form.append('type', type);
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(json.error || 'Error subiendo archivo.', 'error');
        return;
      }

      showToast('Archivo subido correctamente.', 'success');
      await loadJobs(false);
    } catch {
      showToast('No se pudo subir el archivo.', 'error');
    }
  }, [loadJobs, showToast]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, [supabase]);

  const openJob = useCallback((job: Job) => {
    if (dragWasUsedRef.current || draggingJobId) return;
    setSelected(job);
  }, [draggingJobId]);

  const finishDragSoon = useCallback(() => {
    window.setTimeout(() => {
      dragWasUsedRef.current = false;
      setDraggingJobId(null);
      setDragOverStatus(null);
    }, 180);
  }, []);

  const handleDragStart = useCallback((jobId: string) => {
    dragWasUsedRef.current = true;
    setDraggingJobId(jobId);
  }, []);

  const handleDrop = useCallback((status: JobStatus, jobId: string | null) => {
    if (jobId) {
      void moveJobToStatus(jobId, status);
    }

    finishDragSoon();
  }, [finishDragSoon, moveJobToStatus]);

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-3 text-slate-900 lg:px-5 lg:py-4">
      <BoardHeader
        userEmail={userEmail}
        activeBoard={activeBoard}
        query={query}
        saveState={saveState}
        onBoardChange={setActiveBoard}
        onQueryChange={setQuery}
        onAddJob={addJob}
        onSyncGoogleCalendar={syncGoogleCalendar}
        onOpenDeliveredHistory={() => setShowDeliveredHistory(true)}
        onOpenMechanics={() => setShowMechanicsModal(true)}
        onOpenDailySummary={() => setShowDailySummaryModal(true)}
        onLogout={logout}
      />

      <MetricsBar stats={boardStats} onOpenNoAppointment={() => setShowNoAppointmentModal(true)} />

      {loading ? (
        <p className="rounded-3xl bg-white p-6 font-semibold shadow-sm">
          Cargando...
        </p>
      ) : (
        <KanbanBoard
          jobs={visibleJobs}
          activeBoard={activeBoardInfo}
          draggingJobId={draggingJobId}
          dragOverStatus={dragOverStatus}
          onDragOver={setDragOverStatus}
          onDragLeave={(status) => {
            setDragOverStatus((current) => (current === status ? null : current));
          }}
          onDrop={handleDrop}
          onOpenJob={openJob}
          onDragStart={handleDragStart}
          onDragEnd={finishDragSoon}
          onMoveJob={moveJob}
          onSyncCalendar={syncCalendar}
          onToggleChapaType={toggleChapaType}
        />
      )}

      <section className="mt-4 grid gap-3 xl:grid-cols-3">
        <InfoPanel
          title="Próximas citas"
          variant="appointments"
          empty="No hay citas para mañana en este tablero."
          items={tomorrowAppointments.map((job) => ({
            id: job.id,
            title: `${job.plate || 'Sin matrícula'} · ${job.vehicle || 'Sin vehículo'}`,
            subtitle: `${formatDate(job.appointment_start)} · ${job.client_name || 'Sin cliente'} · ${getPriority(job.priority).name}`,
            onClick: () => setSelected(job)
          }))}
        />

        <InfoPanel
          title="Citas futuras"
          variant="futureReservations"
          empty="No hay reservas futuras en este tablero."
          actionLabel="Ver todas"
          onAction={() => setShowFutureAppointmentsModal(true)}
          items={futureReservationJobsAll.slice(0, 12).map((job) => {
            const chapaLabel =
              job.board_id === 'chapa' && job.chapa_type && job.chapa_type !== 'chapa'
                ? ` · ${job.chapa_type === 'particular' ? 'PARTICULAR' : 'VTC'}`
                : '';
            return {
              id: job.id,
              title: `${job.plate || 'Sin matrícula'} · ${job.vehicle || 'Sin vehículo'}`,
              subtitle: `${formatDate(job.appointment_start)} · ${job.client_name || 'Sin cliente'} · ${getPriority(job.priority).name}${chapaLabel}`,
              onClick: () => setSelected(job)
            };
          })}
        />

        <InfoPanel
          title="Piezas pendientes"
          variant="parts"
          empty="No hay vehículos con piezas pendientes."
          items={partsJobs.map((job) => ({
            id: job.id,
            title: `${job.plate || 'Sin matrícula'} · ${job.vehicle || 'Sin vehículo'}`,
            subtitle: hasPendingParts(job)
              ? `${job.client_name || 'Sin cliente'} · ${job.pending_parts}`
              : `${job.client_name || 'Sin cliente'} · Vehículo en estado Esperando piezas`,
            onClick: () => setSelected(job)
          }))}
        />
      </section>

      {selected && (
        <JobModal
          job={selected}
          activeBoard={boards.find((board) => board.id === selected.board_id) || activeBoardInfo}
          saveState={saveState}
          mechanics={mechanics}
          onClose={() => setSelected(null)}
          onSaveJob={saveJobDraft}
          onApplyPlateAndFindClient={applyPlateAndFindClient}
          onSyncCalendar={syncCalendar}
          onSendAppointmentWhatsapp={sendAppointmentWhatsapp}
          onUploadFile={uploadFile}
          onDeleteJob={deleteJob}
          onDraftPendingParts={draftPendingParts}
        />
      )}

      {showDeliveredHistory && (
        <DeliveredHistoryModal
          jobs={deliveredJobs}
          onClose={() => setShowDeliveredHistory(false)}
          onOpenJob={(job) => {
            setSelected(job);
            setShowDeliveredHistory(false);
          }}
        />
      )}

      {showMechanicsModal && (
        <MechanicsModal
          mechanics={mechanics}
          loading={mechanicsLoading}
          error={mechanicsError}
          onAdd={addMechanic}
          onDeactivate={deactivateMechanic}
          onClose={() => setShowMechanicsModal(false)}
        />
      )}

      {showNoAppointmentModal && (
        <NoAppointmentModal
          jobs={noAppointmentModalJobs}
          onClose={() => setShowNoAppointmentModal(false)}
          onOpenJob={(job) => {
            setSelected(job);
            setShowNoAppointmentModal(false);
          }}
        />
      )}

      {showFutureAppointmentsModal && (
        <FutureAppointmentsModal
          jobs={futureReservationJobsAll}
          onClose={() => setShowFutureAppointmentsModal(false)}
          onOpenJob={(job) => {
            setSelected(job);
            setShowFutureAppointmentsModal(false);
          }}
        />
      )}

      {showDailySummaryModal && (
        <DailySummaryModal
          jobs={jobs}
          onClose={() => setShowDailySummaryModal(false)}
          onOpenJob={(job) => {
            setSelected(job);
            setShowDailySummaryModal(false);
          }}
        />
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}