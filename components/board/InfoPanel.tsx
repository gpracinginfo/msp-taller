import { CalendarDays, CalendarX, Clock, Package } from 'lucide-react';

type InfoPanelVariant = 'default' | 'appointments' | 'parts' | 'delivered' | 'noAppointment' | 'futureReservations';

export function InfoPanel({
  title,
  empty,
  items,
  variant = 'default',
  actionLabel,
  onAction
}: {
  title: string;
  empty: string;
  variant?: InfoPanelVariant;
  items: { id: string; title: string; subtitle: string; onClick: () => void }[];
  actionLabel?: string;
  onAction?: () => void;
}) {
  const styles = {
    default: {
      panel: 'border bg-white',
      headerIcon: 'bg-slate-100 text-gray-500',
      empty: 'border-dashed bg-gray-50 text-gray-500',
      item: 'border bg-gray-50 hover:border-blue-300 hover:bg-blue-50',
      icon: <Clock className="h-4 w-4" />
    },
    appointments: {
      panel: 'border-blue-100 bg-blue-50',
      headerIcon: 'bg-blue-600 text-white',
      empty: 'border-dashed border-blue-200 bg-white/70 text-blue-700',
      item: 'border-blue-100 bg-white hover:border-blue-400 hover:bg-blue-100',
      icon: <Clock className="h-4 w-4" />
    },
    parts: {
      panel: 'border-amber-100 bg-amber-50',
      headerIcon: 'bg-amber-500 text-white',
      empty: 'border-dashed border-amber-200 bg-white/70 text-amber-700',
      item: 'border-amber-100 bg-white hover:border-amber-400 hover:bg-amber-100',
      icon: <Package className="h-4 w-4" />
    },
    delivered: {
      panel: 'border-slate-200 bg-white',
      headerIcon: 'bg-slate-700 text-white',
      empty: 'border-dashed border-slate-200 bg-slate-50 text-slate-500',
      item: 'border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white',
      icon: <Clock className="h-4 w-4" />
    },
    noAppointment: {
      panel: 'border-slate-200 bg-slate-50',
      headerIcon: 'bg-slate-500 text-white',
      empty: 'border-dashed border-slate-200 bg-white/70 text-slate-500',
      item: 'border-slate-100 bg-white hover:border-slate-400 hover:bg-slate-100',
      icon: <CalendarX className="h-4 w-4" />
    },
    futureReservations: {
      panel: 'border-indigo-100 bg-indigo-50',
      headerIcon: 'bg-indigo-600 text-white',
      empty: 'border-dashed border-indigo-200 bg-white/70 text-indigo-700',
      item: 'border-indigo-100 bg-white hover:border-indigo-400 hover:bg-indigo-100',
      icon: <CalendarDays className="h-4 w-4" />
    }
  };

  const current = styles[variant];

  return (
    <div className={`rounded-3xl p-4 shadow-sm ${current.panel}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-950">
            {title}
          </h3>

          <p className="text-xs font-semibold text-gray-500">
            Resumen rápido del tablero actual
          </p>
        </div>

        <div className="flex items-center gap-2">
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="rounded-xl border border-indigo-200 bg-white px-2 py-1 text-xs font-black text-indigo-700 transition hover:bg-indigo-50"
            >
              {actionLabel}
            </button>
          )}

          <div className={`rounded-2xl p-2 ${current.headerIcon}`}>
            {current.icon}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={`rounded-2xl border p-4 ${current.empty}`}>
          <p className="text-sm font-semibold">
            {empty}
          </p>
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`rounded-2xl p-3 text-left transition ${current.item}`}
            >
              <p className="truncate text-sm font-black text-slate-950">
                {item.title}
              </p>

              <p className="mt-1 line-clamp-2 text-xs font-semibold text-gray-500">
                {item.subtitle}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}