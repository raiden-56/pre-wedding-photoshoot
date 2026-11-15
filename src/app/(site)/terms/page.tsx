import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Prose } from "@/components/site/prose";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

const text = `These template terms are a starting point. Have them reviewed by a qualified professional before relying on them.

## Bookings
A date is reserved once the booking is confirmed and the agreed advance has been received. The balance is due before final gallery delivery unless otherwise agreed in writing.

## Changes and cancellations
Date changes are subject to availability. Advances are non-refundable but may be transferred to a new date within twelve months where possible.

## Deliverables
Edited photographs are delivered through a private online gallery within the timeline stated in your collection. Raw, unedited files are not included unless agreed in writing.

## Usage
You receive a personal licence to print and share your photographs. The studio may use selected images for its portfolio only with your consent.

## Gallery access
Gallery links are personal. Please share them only with people you trust; you can revoke invitations from your dashboard at any time.`;

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Terms & Conditions" />
      <section className="container-x max-w-3xl pb-28">
        <Prose text={text} />
      </section>
    </>
  );
}
