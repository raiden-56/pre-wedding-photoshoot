import type { Metadata } from "next";
import { Suspense } from "react";
import { GridEditorRoute } from "@/components/grid/editor-route";

export const metadata: Metadata = {
  title: "Grid Studio editor",
  robots: { index: false, follow: true },
};

export default function GridEditorPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#EFEAE2]" />}>
      <GridEditorRoute />
    </Suspense>
  );
}
