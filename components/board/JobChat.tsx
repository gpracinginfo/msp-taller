'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
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

export function JobChat({ jobId }: { jobId: string }) {
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

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

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

    if (!user) {
      setSending(false);
      return;
    }

    const { data, error } = await supabase
      .from('job_messages')
      .insert({ job_id: jobId, user_id: user.id, message: text })
      .select('*')
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as JobMessage]);
      setInput('');
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mt-4 rounded-2xl border bg-slate-50 p-3">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
        <MessageSquare className="h-4 w-4" />
        Chat interno
      </h4>

      <div className="mb-3 max-h-52 overflow-y-auto space-y-1.5 pr-1">
        {loading ? (
          <p className="text-xs text-gray-400 py-2">Cargando mensajes...</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">No hay mensajes internos.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm"
            >
              <p className="font-semibold leading-snug text-slate-800">
                {msg.message}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                {formatChatTime(msg.created_at)}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
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
  );
}
