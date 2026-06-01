import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import type { JobFile, UploadFileType } from '@/lib/types';

export function DocumentsPanel({
  jobId,
  refreshKey,
  readOnly,
  onFile
}: {
  jobId: string;
  refreshKey?: number;
  readOnly?: boolean;
  onFile: (type: UploadFileType, file: File) => void;
}) {
  const [files, setFiles] = useState<JobFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);

    const res = await fetch(`/api/files?jobId=${encodeURIComponent(jobId)}`);
    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      setFiles(json.files || []);
    }

    setLoading(false);
  }, [jobId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles, refreshKey]);

  async function deleteFile(fileId: string) {
    const ok = window.confirm('¿Eliminar este archivo?');

    if (!ok) return;

    const res = await fetch('/api/files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId })
    });

    if (res.ok) {
      await loadFiles();
    } else {
      alert('No se pudo eliminar el archivo.');
    }
  }

  return (
    <div className="rounded-2xl border bg-gray-50 p-3">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-black">
        <FileText className="h-4 w-4" />
        Documentos
      </h4>

      {!readOnly && (
        <div className="grid gap-2">
          <UploadBox
            label="Presupuesto"
            icon={<FileText className="h-4 w-4" />}
            onFile={(file) => onFile('presupuesto', file)}
          />

          {/* Albarán piezas oculto en MSP */}
        </div>
      )}

      <div className="mt-3 border-t pt-3">
        <p className="mb-2 text-xs font-black text-gray-600">
          Adjuntos subidos
        </p>

        {loading ? (
          <p className="text-xs font-semibold text-gray-500">
            Cargando archivos...
          </p>
        ) : files.length === 0 ? (
          <p className="text-xs font-semibold text-gray-500">
            No hay archivos adjuntos.
          </p>
        ) : (
          <div className="grid gap-2">
            {files.map((file) => (
              <div key={file.id} className="rounded-xl border bg-white p-2">
                <p className="truncate text-xs font-black text-slate-800">
                  {file.file_type === 'presupuesto' ? 'Presupuesto' : 'Albarán'} · {file.file_name}
                </p>

                <div className="mt-2 flex gap-1">
                  {file.signedUrl && (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      className="rounded-lg bg-blue-700 px-2 py-1 text-[11px] font-black text-white hover:bg-blue-800"
                    >
                      <ExternalLink className="mr-1 inline h-3 w-3" />
                      Ver
                    </a>
                  )}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => deleteFile(file.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-black text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] font-semibold text-gray-500">
        Privados. No se envían a Calendar.
      </p>
    </div>
  );
}

function UploadBox({
  label,
  icon,
  onFile
}: {
  label: string;
  icon: ReactNode;
  onFile: (file: File) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-white px-3 py-2 text-center text-xs font-black text-gray-700 hover:bg-gray-50">
      <Upload className="h-4 w-4" />
      {icon}
      {label}

      <input
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            onFile(file);
            event.target.value = '';
          }
        }}
      />
    </label>
  );
}