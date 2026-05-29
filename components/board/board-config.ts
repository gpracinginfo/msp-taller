import type { BoardId, Job, JobPriority, JobStatus } from '@/lib/types';

export type BoardInfo = {
  id: BoardId;
  name: string;
  short: string;
  className: string;
  activeClass: string;
};

export type ColumnInfo = {
  id: JobStatus;
  title: string;
  shortTitle: string;
  specialClass?: string;
};

export type PriorityInfo = {
  id: JobPriority;
  name: string;
  badgeClass: string;
  cardClass: string;
  barClass: string;
  borderClass: string;
};

export type BoardStats = {
  total: number;
  active: number;
  piezas: number;
  entrega: number;
  citas: number;
  noAppointment: number;
};

export const boards: BoardInfo[] = [
  {
    id: 'chapa',
    name: 'Chapa-Pintura',
    short: 'CHAPA',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    activeClass: 'bg-blue-600 text-white border-blue-600'
  },
  {
    id: 'mecanica',
    name: 'Mecánica',
    short: 'MEC',
    className: 'bg-green-50 text-green-800 border-green-200',
    activeClass: 'bg-green-600 text-white border-green-600'
  }
];

export const columns: ColumnInfo[] = [
  {
    id: 'sin_revisar',
    title: '0. Sin revisar / Grúa',
    shortTitle: 'Sin revisar',
    specialClass: 'border-red-200 bg-red-50 ring-1 ring-red-100'
  },
  { id: 'entrada', title: '1. Entrada', shortTitle: 'Entrada' },
  { id: 'diagnostico', title: '2. Diagnóstico/Peritación', shortTitle: 'Diagnóstico/Peritación' },
  { id: 'presupuesto', title: '3. Presupuesto', shortTitle: 'Presupuesto' },
  { id: 'piezas', title: '4. Esperando piezas', shortTitle: 'Piezas' },
  { id: 'reparacion', title: '5. En reparación', shortTitle: 'Reparación' },
  { id: 'control', title: '6. Finalizado', shortTitle: 'Finalizado' },
  { id: 'entrega', title: '7. Entrega', shortTitle: 'Entrega' }
];

export const priorities: PriorityInfo[] = [
  {
    id: 'urgente',
    name: 'Urgente',
    badgeClass: 'bg-red-600 text-white border-red-700',
    cardClass: 'border-2 border-red-400 bg-red-100 shadow-red-200',
    barClass: 'bg-red-600',
    borderClass: 'border-red-400'
  },
  {
    id: 'alta',
    name: 'Alta',
    badgeClass: 'bg-orange-500 text-white border-orange-600',
    cardClass: 'border-2 border-orange-400 bg-orange-100 shadow-orange-200',
    barClass: 'bg-orange-500',
    borderClass: 'border-orange-400'
  },
  {
    id: 'media',
    name: 'Media',
    badgeClass: 'bg-yellow-400 text-yellow-950 border-yellow-500',
    cardClass: 'border-2 border-yellow-400 bg-yellow-100 shadow-yellow-200',
    barClass: 'bg-yellow-400',
    borderClass: 'border-yellow-400'
  },
  {
    id: 'normal',
    name: 'Normal',
    badgeClass: 'bg-slate-600 text-white border-slate-700',
    cardClass: 'border-2 border-slate-300 bg-slate-50 shadow-slate-200',
    barClass: 'bg-slate-500',
    borderClass: 'border-slate-300'
  },
  {
    id: 'baja',
    name: 'Baja',
    badgeClass: 'bg-green-600 text-white border-green-700',
    cardClass: 'border-2 border-green-400 bg-green-100 shadow-green-200',
    barClass: 'bg-green-600',
    borderClass: 'border-green-400'
  },
  {
    id: 'esperando_cliente',
    name: 'Esperando cliente',
    badgeClass: 'bg-purple-600 text-white border-purple-700',
    cardClass: 'border-2 border-purple-400 bg-purple-100 shadow-purple-200',
    barClass: 'bg-purple-600',
    borderClass: 'border-purple-400'
  }
];

export function getPriority(priority?: JobPriority | null) {
  return priorities.find((p) => p.id === priority) || priorities.find((p) => p.id === 'normal')!;
}

export function hasPendingParts(job: Job) {
  return Boolean(job.pending_parts && job.pending_parts.trim().length > 0);
}

export function normalizePlate(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

export function toLocalInput(value: string | null) {
  if (!value) return '';

  const d = new Date(value);
  const pad = (n: number) => `${n}`.padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatDate(value: string | null) {
  if (!value) return 'Sin fecha';

  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}