import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
};

export function Toast({
  toast,
  onDismiss
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  if (!toast) return null;

  const toneClass = {
    success: 'border-green-200 bg-green-50 text-green-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  }[toast.tone];

  const icon = {
    success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    error: <AlertCircle className="h-4 w-4 shrink-0" />,
    info: <Info className="h-4 w-4 shrink-0" />
  }[toast.tone];

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm px-3 sm:px-0">
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl ${toneClass}`}>
        {icon}

        <p className="min-w-0 flex-1">
          {toast.message}
        </p>

        <button
          type="button"
          onClick={onDismiss}
          className="rounded-lg p-1 hover:bg-black/5"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
