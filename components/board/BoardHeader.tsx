'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  History,
  Loader2,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Users
} from 'lucide-react';
import type { BoardId } from '@/lib/types';
import type { SaveState } from './board-types';
import { BoardTabs } from './BoardTabs';

export function BoardHeader({
  userEmail,
  activeBoard,
  query,
  saveState,
  isReadOnly,
  onBoardChange,
  onQueryChange,
  onAddJob,
  onSyncGoogleCalendar,
  onOpenDeliveredHistory,
  onOpenMechanics,
  onOpenSuppliers,
  onOpenDailySummary,
  onLogout
}: {
  userEmail?: string;
  activeBoard: BoardId;
  query: string;
  saveState: SaveState;
  isReadOnly?: boolean;
  onBoardChange: (board: BoardId) => void;
  onQueryChange: (query: string) => void;
  onAddJob: () => void;
  onSyncGoogleCalendar: () => void;
  onOpenDeliveredHistory: () => void;
  onOpenMechanics: () => void;
  onOpenSuppliers: () => void;
  onOpenDailySummary: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="mb-3 rounded-3xl bg-gradient-to-r from-[#0b2545] to-[#123b66] p-4 shadow-lg">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#38bdf8]">
            PANEL MSP
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-3xl font-black tracking-tight text-white">
              CONTROL MSP
            </h1>

            <SaveIndicator state={saveState} />
          </div>

          <p className="text-sm text-blue-200">
            Usuario: {userEmail}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenDailySummary}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
          >
            <ClipboardList className="mr-2 inline h-4 w-4" />
            Resumen diario
          </button>

          <button
            type="button"
            onClick={onOpenDeliveredHistory}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
          >
            <History className="mr-2 inline h-4 w-4" />
            Historial
          </button>

          {!isReadOnly && (
            <>
              <a
                href="https://calendar.google.com/calendar/u/0/r"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                <ExternalLink className="mr-2 inline h-4 w-4" />
                Ver Calendar
              </a>

              <SettingsMenu onOpenMechanics={onOpenMechanics} onOpenSuppliers={onOpenSuppliers} onSyncGoogleCalendar={onSyncGoogleCalendar} />

              <button
                type="button"
                onClick={onAddJob}
                className="rounded-2xl bg-[#2563eb] px-4 py-3 text-sm font-bold text-white hover:bg-[#1d4ed8]"
              >
                <Plus className="mr-2 inline h-4 w-4" />
                Nuevo coche
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
          >
            <LogOut className="mr-2 inline h-4 w-4" />
            Salir
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <BoardTabs activeBoard={activeBoard} onChange={onBoardChange} />

        <div className="relative w-full lg:w-[420px]">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-blue-200" />

          <input
            className="w-full rounded-2xl border border-white/20 bg-white/10 py-3 pl-10 pr-3 text-sm text-white placeholder:text-blue-200 outline-none focus:border-[#38bdf8] focus:bg-white/15"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar matrícula, cliente, prioridad, pieza..."
          />
        </div>
      </div>
    </header>
  );
}

function SettingsMenu({ onOpenMechanics, onOpenSuppliers, onSyncGoogleCalendar }: { onOpenMechanics: () => void; onOpenSuppliers: () => void; onSyncGoogleCalendar: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/20"
      >
        <Settings className="mr-2 inline h-4 w-4" />
        Configuración
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-2xl border bg-white shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b px-4 py-3 text-sm font-bold hover:bg-gray-50"
            onClick={() => { onOpenMechanics(); setOpen(false); }}
          >
            <Users className="h-4 w-4" />
            Mecánicos
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 border-b px-4 py-3 text-sm font-bold hover:bg-gray-50"
            onClick={() => { onOpenSuppliers(); setOpen(false); }}
          >
            <Package className="h-4 w-4" />
            Proveedores
          </button>
          <a
            href="/api/google/auth"
            className="flex items-center gap-2 border-b px-4 py-3 text-sm font-bold hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            <CalendarDays className="h-4 w-4" />
            Conectar Google Calendar
          </a>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold hover:bg-gray-50"
            onClick={() => { onSyncGoogleCalendar(); setOpen(false); }}
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar Calendar
          </button>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;

  const config = {
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      text: 'Guardando',
      className: 'border-blue-200 bg-blue-50 text-blue-700'
    },
    saved: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      text: 'Guardado',
      className: 'border-green-200 bg-green-50 text-green-700'
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: 'Error al guardar',
      className: 'border-red-200 bg-red-50 text-red-700'
    }
  }[state];

  return (
    <span className={`mb-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${config.className}`}>
      {config.icon}
      {config.text}
    </span>
  );
}