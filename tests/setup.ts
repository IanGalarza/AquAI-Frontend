//
// Fija la URL del backend antes de cargar los módulos que la leen al importarse.
//
process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:8000";

export {};
