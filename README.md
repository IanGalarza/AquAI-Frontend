# AquAI Frontend

Frontend de AquAI desarrollado con Next.js, React, TypeScript y Tailwind CSS.

## Desarrollo local

Desde esta carpeta, instalar las dependencias con `pnpm install` si hace falta.
Copiar `.env.example` a `.env.local` y ajustar:

- `NEXT_PUBLIC_BACKEND_URL`: URL de FastAPI, sin prefijo `/api` ni `/v1` (por defecto `http://localhost:8000`).
- `NEXT_PUBLIC_MAX_UPLOAD_BYTES`: mismo límite que `TABULAR_MAX_UPLOAD_BYTES` en el backend (por defecto 10485760 bytes, 10 MiB).

El chat envía las preguntas por `POST /conversations/{id}/messages/stream` (SSE):
muestra las etapas reales que informa el backend y, al llegar la respuesta validada,
la escribe progresivamente sin cambiar su contenido. Si se recarga la página durante
una respuesta, vuelve a seguirla con `GET .../messages/{message_id}/events`.

Iniciar el backend con PostgreSQL, Qdrant y Ollama siguiendo su README y ejecutar
`pnpm dev`. Abrir `http://localhost:3000` y entrar a **Administrar fuentes** desde
la barra lateral o el menú móvil. FastAPI permite los orígenes locales
`http://localhost:3000` y `http://127.0.0.1:3000`. Si se usa otro origen, hay que
agregarlo a la configuración CORS del backend.

## Verificación

```powershell
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Los seis tests usan el runner integrado de Node y TypeScript ya instalado;
no agregan dependencias. Cubren multipart y duplicados, paginación y detalle,
activación, errores y cancelación, validación de archivos y estados de sondeo.
Sus respuestas HTTP son simuladas: no reemplazan las pruebas de navegador con
FastAPI, PostgreSQL y Qdrant reales.
