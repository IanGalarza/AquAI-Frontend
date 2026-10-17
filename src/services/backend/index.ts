import { apiRequest } from "../api";
import type { SourceAccepted, SourceActivation, SourceDetail, SourceList, SourceListFilters } from "../../types/sources";

export function listSources(page = 1, signal?: AbortSignal, filters: SourceListFilters = {}): Promise<SourceList> {
  const params = new URLSearchParams({ page: String(page), page_size: "20" });
  if (filters.name?.trim()) params.set("name", filters.name.trim());
  if (filters.sort) params.set("sort", filters.sort);
  return apiRequest(`/sources?${params}`, { signal });
}

export function getSource(id: string, signal?: AbortSignal): Promise<SourceDetail> {
  return apiRequest(`/sources/${encodeURIComponent(id)}`, { signal });
}

export function uploadSource(file: File, signal?: AbortSignal): Promise<SourceAccepted> {
  const body = new FormData();
  body.append("file", file);
  return apiRequest("/sources", { method: "POST", body, signal });
}

export function setSourceActive(id: string, isActive: boolean, signal?: AbortSignal): Promise<SourceActivation> {
  return apiRequest(`/sources/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }), signal,
  });
}
