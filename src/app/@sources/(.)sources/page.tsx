import { SourcesOverlay } from "@/components/sources/sources-overlay";

export { metadata } from "../../sources/page";

//
// Muestra la gestión de fuentes como superposición sobre el chat (ruta interceptada).
//
export default function InterceptedSourcesPage() {
  return <SourcesOverlay />;
}
