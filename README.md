# AquAI Frontend

## Descripción general

Interfaz web de AquAI, un asistente que responde preguntas sobre calidad del agua. Ofrece el chat y
la administración de las fuentes, y consume la API de AquAI-Backend. No analiza datos: muestra las
respuestas a partir de la estructura que devuelve el backend (texto, citas, tablas y gráficos).

## Tecnologías utilizadas

| Área | Tecnologías |
|---|---|
| Lenguaje | TypeScript 5 |
| Framework | Next.js 16 (App Router), React 19 |
| Estilos | Tailwind CSS 4 |
| Gráficos | Plotly |
| Animaciones | Motion, d3-shape |
| Calidad | ESLint 9 |
| Pruebas | `node:test`, jsdom |
| Gestor de paquetes | pnpm 10 |

## Arquitectura

La aplicación usa el App Router de Next.js. Todas las solicitudes al backend se hacen desde el
navegador a `NEXT_PUBLIC_BACKEND_URL`; no hay route handlers ni proxy en Next.js.

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Rutas | `src/app` | Layout raíz y páginas del chat y de las fuentes. |
| Componentes | `src/components` | Interfaz del chat y de la administración de fuentes. |
| Hooks | `src/hooks` | Estado de las conversaciones, las respuestas en curso y las fuentes. |
| Servicios | `src/services` | Acceso al backend: una función por endpoint (`backend`) sobre un cliente HTTP y SSE común (`api`). |

Los componentes y los hooks acceden al backend solo a través de `src/services`.

## Estructura del proyecto

```text
AquAI-Frontend/
├── public/images/          Logo de AquAI
├── src/
│   ├── app/                Layout raíz y páginas / y /sources
│   │   └── @sources/       Ranura que abre /sources como diálogo sobre el chat
│   ├── components/
│   │   ├── chat/           Barra lateral, mensajes, respuestas, citas, gráficos y progreso
│   │   └── sources/        Listado, carga y detalle de fuentes
│   ├── hooks/              Estado de conversaciones y fuentes, y efectos de la interfaz
│   ├── providers/          Tema claro u oscuro
│   ├── services/
│   │   ├── api/            Cliente HTTP y SSE
│   │   └── backend/        Funciones por endpoint
│   ├── styles/             Tokens de diseño y temas
│   ├── types/              Tipos de los contratos del backend
│   └── utils/              SSE, formatos, validación de archivos y lectura de mensajes
├── tests/                  Pruebas
└── .env.example            Variables de entorno de ejemplo
```

## Endpoints

El frontend no expone endpoints propios. Sus rutas son:

| Ruta | Descripción |
|---|---|
| `/` | Chat. Con `?conversation=<id>` abre esa conversación. |
| `/sources` | Administración de fuentes. Desde el chat se abre como diálogo. |

Endpoints del backend que consume:

| Método | Ruta | Uso |
|---|---|---|
| GET | `/sources` | Listado de fuentes. |
| POST | `/sources` | Carga de un archivo. |
| GET | `/sources/{id}` | Detalle y estado de una fuente. |
| PATCH | `/sources/{id}` | Activación o desactivación de una fuente. |
| GET | `/conversations` | Listado de conversaciones. |
| POST | `/conversations` | Creación de una conversación. |
| GET | `/conversations/{id}` | Datos de la conversación abierta. |
| PATCH | `/conversations/{id}` | Cambio de título. |
| DELETE | `/conversations/{id}` | Eliminación de una conversación. |
| GET | `/conversations/{id}/messages` | Historial de mensajes. |
| POST | `/conversations/{id}/messages/stream` | Envío de una pregunta y seguimiento de la respuesta por SSE. |
| GET | `/conversations/{id}/messages/{message_id}/events` | Retoma del seguimiento después de recargar la página. |
| POST | `/conversations/{id}/messages/{message_id}/cancel` | Cancelación de una respuesta en curso. |

La API completa está documentada en el README de AquAI-Backend.

## Requisitos previos

- Node.js 20.9 o superior. Las pruebas usan jsdom 30, que declara Node.js `^22.22.2`, `^24.15.0`
  o `>=26.0.0`.
- pnpm 10.
- AquAI-Backend en ejecución.

## Instalación y configuración

Los comandos se ejecutan en PowerShell desde la raíz del repositorio.

### 1. Instalar las dependencias

```powershell
pnpm install
```

### 2. Configurar las variables de entorno

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

| Variable | Valor de ejemplo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:8000` | URL base del backend. |
| `NEXT_PUBLIC_CONVERSATION_TIMEOUT_MS` | `1620000` | Espera máxima de una respuesta; debe superar `CONVERSATIONS_GENERATION_TIMEOUT_SECONDS` del backend. |
| `NEXT_PUBLIC_MAX_UPLOAD_BYTES` | `10485760` | Tamaño máximo de CSV y XLSX; igual a `TABULAR_MAX_UPLOAD_BYTES` del backend. |
| `NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_BYTES` | `67108864` | Tamaño máximo de PDF y DOCX; igual a `DOCUMENT_MAX_UPLOAD_BYTES` del backend. |
| `NEXT_PUBLIC_MINIMUM_CATALOG_LOADING_MS` | `600` | Duración mínima del indicador de carga del listado de fuentes; `0` lo desactiva. |

Estas variables se incorporan al compilar: después de cambiarlas, reiniciar `pnpm dev` o volver a
ejecutar `pnpm build`. El backend solo acepta solicitudes desde `http://localhost:3000` y
`http://127.0.0.1:3000`.

## Ejecución

Con el backend en ejecución:

```powershell
pnpm dev
```

La aplicación queda disponible en `http://localhost:3000`. Para la versión de producción:

```powershell
pnpm build
pnpm start
```

## Testing

```powershell
pnpm test
```

`pnpm test` compila las pruebas de `tests/` y las ejecuta con `node --test`. Simulan las respuestas
del backend reemplazando `fetch`, por lo que no necesitan el backend en ejecución. Cubren solo la
administración de fuentes:

| Archivo | Cubre |
|---|---|
| `tests/sources.test.ts` | Servicios y utilidades de fuentes. |
| `tests/source-interactions.test.ts` | Hooks y componentes de fuentes, renderizados con jsdom. |
