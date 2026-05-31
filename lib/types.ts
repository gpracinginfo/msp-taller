export type BoardId = 'chapa' | 'mecanica';

export type JobStatus =
  | 'sin_revisar'
  | 'entrada'
  | 'diagnostico'
  | 'presupuesto'
  | 'piezas'
  | 'reparacion'
  | 'control'
  | 'entrega';

export type JobPriority =
  | 'urgente'
  | 'alta'
  | 'media'
  | 'normal'
  | 'baja'
  | 'esperando_cliente';

export type UploadFileType = 'presupuesto' | 'albaran';

export type Job = {
  id: string;
  user_id: string;
  board_id: BoardId;
  status: JobStatus;

  plate: string;
  vehicle: string;
  client_name: string;
  phone: string;

  priority: JobPriority | null;

  work_description: string;
  internal_notes: string | null;
  pending_parts: string | null;
  mechanic: string | null;

  appointment_start: string | null;
  appointment_end: string | null;

  google_event_id: string | null;

  david: boolean | null;
  fane: boolean | null;

  entry_date: string | null;
  key_number: string | null;

  chapa_type: 'chapa' | 'particular' | 'vtc' | null;

  invoice_number: string | null;
  kilometers: string | null;

  delivered_at: string | null;

  created_at: string;
  updated_at?: string | null;
};

export type ClientRecord = {
  id: string;
  user_id: string;
  plate: string;
  plate_normalized: string;
  vehicle: string | null;
  client_name: string;
  phone: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type Mechanic = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type JobMessage = {
  id: string;
  job_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

export type JobFile = {
  id: string;
  job_id: string;
  user_id: string;
  file_type: UploadFileType;
  file_name: string;
  storage_path: string;
  created_at: string;
  signedUrl?: string | null;
};

export type Supplier = {
  id: string;
  name: string;
  method: string;
  url: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};