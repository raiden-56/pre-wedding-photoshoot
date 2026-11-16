"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { getArchive, getPhotoDownload, requestZip, verifyDownloadPin } from "@/server/actions/gallery";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { formatBytes } from "@/lib/utils";

type Ctx = {
  downloadPhoto: (photoId: string) => Promise<void>;
  downloadZip: (scope: "ALBUM" | "FULL" | "SELECTION", ref?: string, label?: string) => Promise<void>;
  zipBusy: boolean;
};
const DownloadContext = createContext<Ctx | null>(null);
export const useDownloads = () => {
  const c = useContext(DownloadContext);
  if (!c) throw new Error("useDownloads outside provider");
  return c;
};

function startDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Single-photo and ZIP downloads, including the optional download PIN. */
export function DownloadProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const retry = useRef<(() => Promise<void>) | null>(null);

  const askPin = (again: () => Promise<void>) => {
    retry.current = again;
    setPin("");
    setPinError(null);
    setPinOpen(true);
  };

  const downloadPhoto: Ctx["downloadPhoto"] = useCallback(
    async (photoId: string): Promise<void> => {
      const r = await getPhotoDownload(slug, photoId);
      if (r.ok) return startDownload(r.data!.url);
      if ("needPin" in r && r.needPin) return askPin(() => downloadPhoto(photoId));
      toast.error(r.error);
    },
    [slug],
  );

  const downloadZip: Ctx["downloadZip"] = useCallback(
    async (scope: "ALBUM" | "FULL" | "SELECTION", ref?: string, label = "Your photographs"): Promise<void> => {
      setZipBusy(true);
      try {
        const r = await requestZip(slug, scope, ref);
        if (!r.ok) {
          if ("needPin" in r && r.needPin) return askPin(() => downloadZip(scope, ref, label));
          return toast.error(r.error);
        }
        toast.info("Preparing your ZIP", `${label} — this can take a minute for large galleries. Keep this tab open.`);
        const id = r.data!.archiveId;
        for (let i = 0; i < 240; i++) {
          await new Promise((res) => setTimeout(res, i < 5 ? 1500 : 3000));
          const s = await getArchive(slug, id);
          if (!s.ok) return toast.error(s.error);
          if (s.data!.status === "READY" && s.data!.url) {
            toast("Your download is ready", { description: `${s.data!.count} photographs · ${formatBytes(s.data!.size ?? 0)}` });
            return startDownload(s.data!.url);
          }
          if (s.data!.status === "FAILED") return toast.error("The ZIP couldn’t be created", s.data!.error ?? "Please try again or contact the studio.");
        }
        toast.error("Still preparing", "This is taking longer than usual — try again in a few minutes.");
      } finally {
        setZipBusy(false);
      }
    },
    [slug],
  );

  return (
    <DownloadContext.Provider value={{ downloadPhoto, downloadZip, zipBusy }}>
      {children}
      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent title="Download PIN" description="Your photographer protected downloads with a PIN. You only need to enter it once.">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await verifyDownloadPin(slug, pin);
              if (!r.ok) return setPinError(r.error);
              setPinOpen(false);
              await retry.current?.();
            }}
            className="space-y-4"
          >
            <label className="flex items-center gap-3">
              <KeyRound className="size-4 text-muted" />
              <Input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoFocus placeholder="PIN" aria-label="Download PIN" className="tracking-[0.4em]" />
            </label>
            {pinError && <p className="text-sm text-danger">{pinError}</p>}
            <Button type="submit" className="w-full">
              Unlock downloads
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </DownloadContext.Provider>
  );
}
