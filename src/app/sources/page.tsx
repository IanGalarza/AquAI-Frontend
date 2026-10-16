import type { Metadata } from "next";
import { SourceManager } from "@/components/sources/source-manager";

export const metadata: Metadata = { title: "Administrar fuentes | AquAI" };

export default function SourcesPage() {
  return <SourceManager />;
}
