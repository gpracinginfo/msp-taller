-- Ejecuta esto despues de crear tu primer usuario si quieres datos de ejemplo.
-- Sustituye TU_USER_ID por el id real del usuario en auth.users.
insert into public.jobs (user_id, board_id, status, plate, vehicle, client_name, phone, work_description, mechanic, appointment_start, appointment_end)
values
('TU_USER_ID', 'particulares', 'entrada', '1234 LMK', 'Seat Ibiza 1.6 TDI', 'Juan Perez', '612345678', 'Ruido motor y perdida de potencia', 'Carlos', now() + interval '1 day', now() + interval '1 day 1 hour'),
('TU_USER_ID', 'chapa', 'diagnostico', '7788 PLL', 'Audi A4', 'Sergio Martin', '699222444', 'Golpe puerta derecha y pintura lateral', 'Ana', now() + interval '2 days', now() + interval '2 days 2 hours'),
('TU_USER_ID', 'vtc', 'reparacion', '9988 TRX', 'Mercedes Clase A', 'VTC Madrid SL', '677555888', 'Mantenimiento flota y frenos', 'Luis', now() + interval '3 days', now() + interval '3 days 1 hour');
