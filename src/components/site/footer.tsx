import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/ui/misc";
import { InstagramIcon, PinterestIcon, WhatsAppIcon, YoutubeIcon } from "@/components/ui/brand-icons";
import { LOCATIONS } from "@/content/site";
import { getStudio } from "@/server/site";
import { whatsappLink } from "@/lib/utils";

export async function SiteFooter() {
  const studio = await getStudio();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-charcoal text-ivory">
      <div className="container-x grid gap-14 py-20 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="font-display mt-8 max-w-sm text-3xl leading-tight text-ivory/90">Every love story deserves its own frame.</p>
          <div className="mt-8 flex gap-3">
            {[
              { href: studio?.instagram ?? "#", label: "Instagram", Icon: InstagramIcon },
              { href: studio?.youtube ?? "#", label: "YouTube", Icon: YoutubeIcon },
              { href: "https://pinterest.com/", label: "Pinterest", Icon: PinterestIcon },
              { href: whatsappLink("Hi Saanjh Studio! I'd love to know more about your photography.", studio?.whatsapp), label: "WhatsApp", Icon: WhatsAppIcon },
            ].map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid size-10 place-items-center rounded-full border border-ivory/20 transition hover:border-champagne hover:text-champagne">
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-8">
          <div>
            <p className="eyebrow mb-5 text-taupe">Studio</p>
            <ul className="space-y-2.5 text-sm text-ivory/75">
              {[
                ["/portfolio", "Our Work"],
                ["/stories", "Stories"],
                ["/packages", "Packages"],
                ["/about", "About Us"],
                ["/blog", "Journal"],
                ["/grid-studio", "Photo Grid Studio"],
                ["/client-gallery", "Client Gallery"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="link-underline hover:text-ivory">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5 text-taupe">Photography</p>
            <ul className="space-y-2.5 text-sm text-ivory/75">
              <li><Link href="/pre-wedding" className="link-underline hover:text-ivory">Pre-Wedding</Link></li>
              <li><Link href="/wedding" className="link-underline hover:text-ivory">Wedding</Link></li>
              {LOCATIONS.slice(0, 5).map((l) => (
                <li key={l.slug}>
                  <Link href={`/locations/${l.slug}`} className="link-underline hover:text-ivory">
                    {l.name} shoots
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="eyebrow mb-5 text-taupe">Contact</p>
            <ul className="space-y-3 text-sm text-ivory/75">
              {studio?.email && (
                <li className="flex gap-2.5"><Mail className="mt-0.5 size-4 shrink-0 text-taupe" /><a href={`mailto:${studio.email}`} className="hover:text-ivory">{studio.email}</a></li>
              )}
              {studio?.phone && (
                <li className="flex gap-2.5"><Phone className="mt-0.5 size-4 shrink-0 text-taupe" /><a href={`tel:${studio.phone.replace(/\s/g, "")}`} className="hover:text-ivory">{studio.phone}</a></li>
              )}
              {studio?.address && (
                <li className="flex gap-2.5"><MapPin className="mt-0.5 size-4 shrink-0 text-taupe" /><span>{studio.address}, {studio.city}</span></li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-ivory/10">
        <div className="container-x flex flex-col gap-3 py-6 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {studio?.name ?? "Saanjh Studio"}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-ivory">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-ivory">Terms &amp; Conditions</Link>
            <Link href="/credits" className="hover:text-ivory">Photo credits</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
