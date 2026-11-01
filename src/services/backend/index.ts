import { apiRequest } from "../api";
import type { SourceAccepted, SourceActivation, SourceDetail, SourceList, SourceListFilters } from "../../types/sources";

//
// Lista fuentes paginadas con filtros de nombre y orden (GET /sources).
//
export function listSources(page = 1, signal?: AbortSignal, filters: SourceListFilters = {}): Promise<SourceList> {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  if (filters.name?.trim()) params.set("name", filters.name.trim());
  if (filters.sort) params.set("sort", filters.sort);
  return apiRequest(`/sources?${params}`, { signal });
}

//
// Obtiene el detalle de una fuente (GET /sources/{id}).
//
export function getSource(id: string, signal?: AbortSignal): Promise<SourceDetail> {
  return apiRequest(`/sources/${encodeURIComponent(id)}`, { signal });
}

//
// Sube un archivo como nueva fuente (POST /sources).
//
export function uploadSource(file: File, signal?: AbortSignal): Promise<SourceAccepted> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest("/sources", { method: "POST", body, signal });
}

//
// Activa o desactiva una fuente (PATCH /sources/{id}).
//
export function setSourceActive(id: string, isActive: boolean, signal?: AbortSignal): Promise<SourceActivation> {
  return apiRequest(`/sources/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }), signal,
  });
}
