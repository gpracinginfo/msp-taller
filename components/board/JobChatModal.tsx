'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import type { JobMessage } from '@/lib/types';

function formatChatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function JobChatModal({
  jobId,
  plate,
  onClose,
  onMessageSent
}: {
  jobId: string;
  plate: string;
  onClose: () => void;
  onMessageSent?: () => void;
}) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('job_messages')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });
    setMessages((data as JobMessage[]) || []);
    setLoading(false);
  }, [supabase, jobId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [loading, messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }
    const { data, error } = await supabase
      .from('job_messages')
      .insert({ job_id: jobId, user_id: user.id, message: text })
      .select('*')
      .single();
    if (!error && data) {
      setMessages((prev) => [...prev, data as JobMessage]);
      setInput('');
      onMessageSent?.();
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-3">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Chat interno · {plate || 'Sin matrícula'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border bg-white p-2 hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 p-4">
          {loading ? (
            <p className="py-8 text-center text-xs text-gray-400">Cargando mensajes...</p>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">No hay mensajes internos.</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs shadow-sm"
              >
                <p className="font-semibold leading-snug text-slate-800">{msg.message}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{formatChatTime(msg.created_at)}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 flex gap-2 border-t px-4 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Escribe un comentario interno..."
            className="flex-1 rounded-xl border bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-black text-white hover:bg-blue-800 disabled:opacity-50"
            title="Enviar"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
