import { Images } from "lucide-react";
import { requireClientPage } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/misc";
import { getCoupleClient, getCoupleGalleries } from "../data";
import { GalleryCard } from "../gallery-card";
import { NotLinked } from "../not-linked";

export const metadata = { title: "Galleries" };

export default async function CoupleGalleriesPage() {
  const user = await requireClientPage();
  const client = await getCoupleClient(user);
  if (!client) return <NotLinked />;
  const galleries = await getCoupleGalleries(client.id);
  return (
    <div>
      <h1 className="font-display mb-8 text-headline">Your galleries</h1>
      {galleries.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((g) => (
            <GalleryCard key={g.id} g={g} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Images />} title="Your gallery is on its way" description="We’ll send you a message the moment your photographs are ready to view." />
      )}
    </div>
  );
}
