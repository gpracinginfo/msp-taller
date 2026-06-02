import type { ReactNode } from 'react';
import { CalendarDays, CalendarX, Car, CheckCircle2, Package, Wrench } from 'lucide-react';
import type { BoardStats } from './board-config';

type Tone = 'blue' | 'orange' | 'amber' | 'green' | 'purple' | 'slate';

export function MetricsBar({
  stats,
  onOpenNoAppointment
}: {
  stats: BoardStats;
  onOpenNoAppointment?: () => void;
}) {
  return (
    <section className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <Metric title="Total" value={stats.total} subtitle="Vehículos del tablero" icon={<Car className="h-4 w-4" />} tone="blue" />
      <Metric title="Activos" value={stats.active} subtitle="Trabajos abiertos" icon={<Wrench className="h-4 w-4" />} tone="orange" />
      <Metric title="Sin cita" value={stats.noAppointment} subtitle="Sin cita programada" icon={<CalendarX className="h-4 w-4" />} tone="slate" onClick={onOpenNoAppointment} />
      <Metric title="Piezas" value={stats.piezas} subtitle="Pendientes de recambio" icon={<Package className="h-4 w-4" />} tone="amber" />
      <Metric title="Entrega" value={stats.entrega} subtitle="Listos o entregados" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
      <Metric title="Con cita" value={stats.citas} subtitle="Programados" icon={<CalendarDays className="h-4 w-4" />} tone="purple" />
    </section>
  );
}

function Metric({
  title,
  value,
  subtitle,
  icon,
  tone,
  onClick
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: ReactNode;
  tone: Tone;
  onClick?: () => void;
}) {
  const tones: Record<Tone, { card: string; icon: string; text: string }> = {
    blue: {
      card: 'border-blue-100 bg-blue-50/60',
      icon: 'bg-blue-600 text-white',
      text: 'text-blue-700'
    },
    orange: {
      card: 'border-orange-100 bg-orange-50/70',
      icon: 'bg-orange-500 text-white',
      text: 'text-orange-700'
    },
    amber: {
      card: 'border-amber-100 bg-amber-50/80',
      icon: 'bg-amber-500 text-white',
      text: 'text-amber-700'
    },
    green: {
      card: 'border-green-100 bg-green-50/70',
      icon: 'bg-green-600 text-white',
      text: 'text-green-700'
    },
    purple: {
      card: 'border-purple-100 bg-purple-50/70',
      icon: 'bg-purple-600 text-white',
      text: 'text-purple-700'
    },
    slate: {
      card: 'border-slate-200 bg-slate-50/70',
      icon: 'bg-slate-600 text-white',
      text: 'text-slate-700'
    }
  };

  const current = tones[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-wide text-gray-500">
            {title}
          </p>

          <p className="mt-1 text-3xl font-black leading-none text-slate-950">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-2 shadow-sm ${current.icon}`}>
          {icon}
        </div>
      </div>

      <p className={`mt-2 truncate text-[11px] font-bold ${current.text}`}>
        {subtitle}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-2xl border p-3 shadow-sm transition hover:opacity-80 active:scale-95 text-left w-full ring-1 ring-[#d6e1ec] ${current.card}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border p-3 shadow-sm ring-1 ring-[#d6e1ec] ${current.card}`}>
      {inner}
    </div>
  );
}
