"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { ArrowRight, Clock, KeyRound, Lock } from "lucide-react";
import { unlockGallery, acceptInvitation } from "@/server/actions/gallery";
import { Logo } from "@/components/ui/misc";
import { TextEffect } from "@/components/motion/text-effect";

type Reason = "not-found" | "unpublished" | "expired" | "archived" | "password" | "login";

const COPY: Record<Exclude<Reason, "password">, { title: string; body: string }> = {
  "not-found": { title: "We couldn’t find this gallery", body: "Check the link you were sent — it may have been mistyped or shortened." },
  unpublished: { title: "This gallery isn’t open yet", body: "Your photographer is still preparing it. You’ll receive a message the moment it’s ready." },
  expired: { title: "This gallery has expired", body: "The viewing period has ended. Write to the studio and we can reopen it for you." },
  archived: { title: "This gallery has been archived", body: "Your photographs are safe with the studio. Get in touch if you need access again." },
  login: { title: "This gallery is private", body: "Sign in with the account the studio created for you, or open the personal invitation link you were sent." },
};

/** Full-screen, softly animated shell used by every gallery gate. */
export function GateShell({ cover, children }: { cover?: string | null; children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden bg-charcoal px-4 py-16 text-ivory">
      {cover && (
        <motion.img
          src={cover}
          alt=""
          aria-hidden
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1.02, opacity: 0.32 }}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 size-full object-cover blur-[2px]"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(36,35,33,0.35),rgba(36,35,33,0.92))]" />
      <div className="grain absolute inset-0" />
      <Link href="/" className="absolute left-1/2 top-8 -translate-x-1/2" aria-label="Saanjh Studio home">
        <Logo light />
      </Link>
      <div className="relative w-full max-w-md text-center">{children}</div>
    </main>
  );
}

export function GalleryGate({ reason, slug, title, cover }: { reason: Reason; slug: string; title?: string; cover?: string | null }) {
  if (reason === "password") return <PasswordGate slug={slug} title={title} cover={cover} />;
  const c = COPY[reason];
  const Icon = reason === "expired" ? Clock : Lock;
  return (
    <GateShell cover={cover}>
      <span className="mx-auto mb-8 grid size-14 place-items-center rounded-full border border-ivory/25">
        <Icon className="size-5 text-champagne" />
      </span>
      <TextEffect as="h1" per="word" preset="fade-in-blur" className="font-display text-4xl leading-tight sm:text-5xl">
        {c.title}
      </TextEffect>
      <p className="mt-4 text-sm leading-relaxed text-ivory/70">{c.body}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {reason === "login" && (
          <Link href={`/login?next=/gallery/${slug}`} className="inline-flex h-11 items-center gap-2 bg-ivory px-6 text-[12px] font-medium uppercase tracking-[0.18em] text-charcoal transition hover:bg-champagne">
            Sign in <ArrowRight className="size-4" />
          </Link>
        )}
        <Link href="/contact" className="inline-flex h-11 items-center border border-ivory/40 px-6 text-[12px] uppercase tracking-[0.18em] transition hover:bg-ivory hover:text-charcoal">
          Contact the studio
        </Link>
      </div>
    </GateShell>
  );
}

function PasswordGate({ slug, title, cover }: { slug: string; title?: string; cover?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <GateShell cover={cover}>
      <p className="eyebrow mb-5 text-champagne">Private gallery</p>
      <TextEffect as="h1" per="char" preset="blur" className="font-display text-5xl leading-none sm:text-6xl">
        {title ?? "Welcome"}
      </TextEffect>
      <p className="mt-5 text-sm text-ivory/70">Enter the password your photographer shared with you.</p>
      <PasswordForm
        pending={pending}
        error={error}
        onSubmit={(pw) =>
          start(async () => {
            const r = await unlockGallery(slug, pw);
            if (!r.ok) return setError(r.error);
            router.refresh();
          })
        }
      />
    </GateShell>
  );
}

export function PasswordForm({ onSubmit, pending, error, label = "Open gallery", needsPassword = true }: { onSubmit: (pw: string) => void; pending: boolean; error: string | null; label?: string; needsPassword?: boolean }) {
  const [pw, setPw] = useState("");
  return (
    <form
      className="mx-auto mt-9 max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(pw);
      }}
    >
      {needsPassword && (
        <label className="flex items-center gap-3 border-b border-ivory/30 pb-2 focus-within:border-champagne">
          <KeyRound className="size-4 text-ivory/50" />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus required className="w-full bg-transparent py-2 text-center text-lg tracking-[0.3em] placeholder:tracking-normal placeholder:text-ivory/40 focus:outline-none" aria-label="Gallery password" />
        </label>
      )}
      {error && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm text-[#f0b9a8]" role="alert">
          {error}
        </motion.p>
      )}
      <button disabled={pending} className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 bg-ivory text-[12px] font-medium uppercase tracking-[0.2em] text-charcoal transition hover:bg-champagne disabled:opacity-60">
        {pending ? "Opening…" : label} <ArrowRight className="size-4" />
      </button>
    </form>
  );
}

export function InvitationAccept({ token, name, coupleNames, needsPassword, cover }: { token: string; name: string; coupleNames: string; needsPassword: boolean; cover?: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <GateShell cover={cover}>
      <p className="eyebrow mb-5 text-champagne">A personal invitation</p>
      <p className="font-display text-2xl italic text-ivory/80">Dear {name},</p>
      <TextEffect as="h1" per="word" preset="fade-in-blur" delay={0.2} className="font-display mt-3 text-5xl leading-[1.02] sm:text-6xl">
        {`${coupleNames} would love to share their photographs with you.`}
      </TextEffect>
      <PasswordForm
        needsPassword={needsPassword}
        label="Open the gallery"
        pending={pending}
        error={error}
        onSubmit={(pw) =>
          start(async () => {
            const r = await acceptInvitation(token, pw || undefined);
            if (!r.ok) return setError(r.error);
            router.replace(`/gallery/${r.data!.slug}`);
          })
        }
      />
    </GateShell>
  );
}
