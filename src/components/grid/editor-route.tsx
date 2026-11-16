"use client";

import { useSearchParams } from "next/navigation";
import { GridEditor } from "./editor";

/** Reads ?template / ?design / ?panel in the browser so the editor also works as a static page. */
export function GridEditorRoute() {
  const sp = useSearchParams();
  const template = sp.get("template") ?? undefined;
  const design = sp.get("design") ?? undefined;
  const panel = sp.get("panel") ?? undefined;
  return <GridEditor key={design ?? template ?? "new"} initialTemplateId={template} designId={design} initialPanel={panel} />;
}
