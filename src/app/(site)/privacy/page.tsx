import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Prose } from "@/components/site/prose";

export const metadata: Metadata = { title: "Privacy Policy", alternates: { canonical: "/privacy" } };

const text = `This template policy describes how the platform handles personal data. Review it with your legal adviser before publishing.

## What we collect
Contact details you send through our inquiry form (name, email, phone, partner's name and event details), account details for couples and family members who access private galleries, and the photographs and videos we create for you.

## How we use it
To reply to inquiries, deliver and manage your bookings, provide private galleries, process payments and send the notifications you have opted into.

## Private galleries
Galleries are private by default and are never indexed by search engines. Photographs are served through short-lived signed links. Original files are stored in private storage and are never exposed through public, guessable URLs. Couples control who is invited and can revoke access at any time.

## Retention
Galleries stay available for the period agreed in your collection, then are archived. We never permanently delete client photographs without an explicit, authorised request.

## Your rights
You may request a copy of your data, ask us to correct it, or ask us to delete it, subject to our legal obligations. Contact us using the details on this website.`;

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="container-x max-w-3xl pb-28">
        <Prose text={text} />
      </section>
    </>
  );
}
