# AquAI Frontend

Frontend de AquAI desarrollado con Next.js, React, TypeScript y Tailwind CSS.

## Desarrollo local

Desde esta carpeta, instalar las dependencias con `pnpm install` si hace falta.
Copiar `.env.example` a `.env.local` y ajustar:

- `NEXT_PUBLIC_BACKEND_URL`: URL de FastAPI, sin prefijo `/api` ni `/v1` (por defecto `http://localhost:8000`).
- `NEXT_PUBLIC_MAX_UPLOAD_BYTES`: mismo límite que `TABULAR_MAX_UPLOAD_BYTES` en el backend (por defecto 10485760 bytes, 10 MiB).

Iniciar el backend con PostgreSQL, Qdrant y Ollama siguiendo su README y ejecutar
`pnpm dev`. Abrir `http://localhost:3000` y entrar a **Administrar fuentes** desde
la barra lateral o el menú móvil. FastAPI permite los orígenes locales
`http://localhost:3000` y `http://127.0.0.1:3000`. Si se usa otro origen, hay que
agregarlo a la configuración CORS del backend.

## Administración de fuentes

La ruta `/sources` reutiliza el marco de navegación, marca, fondo, iconos y temas
de la pantalla existente. `src/services/api` centraliza HTTP y errores;
`src/services/backend` conecta exclusivamente `POST /sources`, `GET /sources`,
`GET /sources/{id}` y `PATCH /sources/{id}`. El formulario envía un único campo
`file` mediante multipart y valida extensión, archivo vacío y tamaño.

El listado respeta la paginación de FastAPI. El detalle muestra datasets,
advertencias, conteos y metadatos reales de columnas, incluyendo proyecciones
auxiliares. Preparación e indexación se consultan por separado cada 2,5 segundos
mientras hay trabajo pendiente. Los errores transitorios se reintentan con una
espera de hasta 15 segundos. Cada recurso tiene una sola consulta en vuelo;
al cambiar de fuente o salir se cancelan las solicitudes y los temporizadores.

Desactivar conserva los datos y reactivar no reprocesa una fuente fallida.
La vista informa duplicados sin presentarlos como nuevas cargas. No incluye
descarga de originales, consulta de filas, eliminación ni activación individual
de datasets porque la API no ofrece esas operaciones.

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
