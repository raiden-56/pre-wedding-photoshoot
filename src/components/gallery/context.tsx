"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleFavorite } from "@/server/actions/gallery";
import { toast } from "@/components/ui/toaster";
import type { GalleryView, ViewerList } from "@/server/gallery-data";

type Ctx = {
  view: GalleryView;
  lists: ViewerList[];
  setLists: React.Dispatch<React.SetStateAction<ViewerList[]>>;
  activeListId: string | null;
  setActiveListId: (id: string | null) => void;
  activeList: ViewerList | null;
  isFavorite: (photoId: string) => boolean;
  toggle: (photoId: string) => Promise<void>;
};

const GalleryContext = createContext<Ctx | null>(null);

export function GalleryProvider({ view, children }: { view: GalleryView; children: React.ReactNode }) {
  const [lists, setLists] = useState<ViewerList[]>(view.lists);
  const [activeListId, setActiveListId] = useState<string | null>(() => view.lists.find((l) => l.kind === "PERSONAL")?.id ?? view.lists[0]?.id ?? null);
  const activeList = lists.find((l) => l.id === activeListId) ?? null;
  const favSet = useMemo(() => new Set(activeList?.photoIds ?? []), [activeList]);

  const toggle = useCallback(
    async (photoId: string) => {
      if (!view.perms.favorite) return;
      const was = favSet.has(photoId);
      // optimistic update
      const apply = (on: boolean, listId: string | null) =>
        setLists((prev) => prev.map((l) => (l.id === listId ? { ...l, photoIds: on ? [...new Set([...l.photoIds, photoId])] : l.photoIds.filter((p) => p !== photoId) } : l)));
      if (activeListId) apply(!was, activeListId);
      const r = await toggleFavorite(view.slug, photoId, activeListId ?? undefined);
      if (!r.ok) {
        if (activeListId) apply(was, activeListId);
        toast.error(r.error);
        return;
      }
      const { favorited, listId } = r.data!;
      if (!activeListId) {
        // first favourite creates the personal list on the server
        setLists((prev) => [...prev, { id: listId, name: "My Favourites", kind: "PERSONAL", limit: null, submitted: false, photoIds: favorited ? [photoId] : [] }]);
        setActiveListId(listId);
      } else apply(favorited, listId);
    },
    [view.perms.favorite, view.slug, favSet, activeListId],
  );

  const value: Ctx = { view, lists, setLists, activeListId, setActiveListId, activeList, isFavorite: (id) => favSet.has(id), toggle };
  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery must be used inside <GalleryProvider>");
  return ctx;
}
