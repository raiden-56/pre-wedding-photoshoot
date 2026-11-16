import type { Metadata } from "next";
import { GridEditor } from "@/components/grid/editor";

export const metadata: Metadata = {
  title: "Grid Studio editor",
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ template?: string; design?: string; panel?: string }> };

export default async function GridEditorPage({ searchParams }: Props) {
  const { template, design, panel } = await searchParams;
  return <GridEditor key={design ?? template ?? "new"} initialTemplateId={template} designId={design} initialPanel={panel} />;
}
