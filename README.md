# TallerPro - Aplicacion online real para taller mecanico

Esta es una primera version real de la app online basada en la maqueta HTML.

Incluye:

- Login por email con Supabase Auth.
- 3 tableros: Particulares, Chapa-Pintura y VTC Mecanica.
- Columnas tipo Trello.
- Fichas de vehiculo editables.
- Adjuntos privados para presupuesto y albaran de piezas.
- Google Calendar con OAuth.
- Creacion/actualizacion de eventos en Calendar.
- Color de evento por tablero:
  - Particulares: `colorId 4`
  - VTC Mecanica: `colorId 2`
  - Chapa-Pintura: `colorId 9`
- Las citas NO envian presupuesto, albaran ni notas internas a Google Calendar.

## 1. Requisitos

Instala Node.js 20 o superior.

Crea una cuenta/proyecto en:

- Supabase
- Google Cloud
- Vercel, si quieres publicarlo online facilmente

## 2. Instalar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abre:

```txt
http://localhost:3000
```

## 3. Configurar Supabase

1. Crea un proyecto en Supabase.
2. Copia `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copia tambien `SUPABASE_SERVICE_ROLE_KEY` desde Project Settings > API.
4. En Supabase SQL Editor, ejecuta el archivo:

```txt
supabase/schema.sql
```

Esto crea:

- tabla `jobs`
- tabla `job_files`
- tabla `google_connections`
- bucket privado `taller-files`
- reglas RLS basicas

## 4. Configurar Google Calendar API

1. Entra en Google Cloud Console.
2. Crea un proyecto.
3. Activa Google Calendar API.
4. Crea credenciales OAuth de tipo Web Application.
5. En Authorized redirect URIs anade:

```txt
http://localhost:3000/api/google/callback
```

Para produccion, anade tambien:

```txt
https://TU-DOMINIO.com/api/google/callback
```

6. Copia en `.env.local`:

```txt
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

## 5. Publicar online en Vercel

1. Sube este proyecto a GitHub.
2. Importalo en Vercel.
3. Anade todas las variables de entorno.
4. Cambia:

```txt
NEXT_PUBLIC_APP_URL=https://TU-DOMINIO.vercel.app
GOOGLE_REDIRECT_URI=https://TU-DOMINIO.vercel.app/api/google/callback
```

5. En Google Cloud, agrega ese redirect URI de produccion.

## 6. Notas importantes de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo debe estar en variables del servidor. Nunca la pongas en el navegador.
- Esta version guarda tokens OAuth en Supabase para poder actualizar eventos. En una version final para clientes reales conviene cifrar esos tokens.
- Usa bucket privado para presupuestos y albaranes.
- Las notas internas se guardan en Supabase, pero no se envian a Calendar.

## 7. Siguientes mejoras recomendadas

- Roles: administrador, recepcion, mecanico.
- Historial por matricula.
- Lista y descarga de adjuntos en la ficha.
- Firma digital de autorizacion.
- Facturas PDF.
- WhatsApp Business API.
- Buscador avanzado.
- Dashboard mensual.
- Auditoria de cambios.
