import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SmoothScroll } from "@/components/site/smooth-scroll";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      <SmoothScroll />
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
