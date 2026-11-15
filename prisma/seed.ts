/*
 * Development seed. Everything here is FICTIONAL sample data:
 *  - couples, bookings and payments are invented for development
 *  - package prices are flagged `isSample` and labelled as such in the UI
 *  - testimonials and stories are flagged `isSample` and labelled "illustrative"
 *  - photographs are CC0 works (see prisma/photo-credits.json), not this studio's client work
 *
 * Dev logins (change or remove before going live):
 *   Studio admin   admin@saanjh.example    / Saanjh@2026
 *   Photographer   kabir@saanjh.example    / Saanjh@2026
 *   Couple         aarav.ananya@example.com / Couple@2026
 */
import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BUILTIN_TEMPLATES, categoriesFor } from "../src/lib/grid/templates";
import { processPhoto } from "../src/server/media/process";

const db = new PrismaClient();
const PHOTO_DIR = path.resolve("public/photos");
const STORAGE_DIR = path.resolve(".data/storage");
const day = 86400_000;
const now = new Date();
const d = (offsetDays: number, hour = 10) => {
  const x = new Date(now.getTime() + offsetDays * day);
  x.setHours(hour, 0, 0, 0);
  return x;
};
const rupees = (n: number) => n * 100;

async function reset() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const names = tables.map((t) => `"${t.tablename}"`).filter((n) => n !== '"_prisma_migrations"');
  if (names.length) await db.$executeRawUnsafe(`TRUNCATE TABLE ${names.join(", ")} CASCADE`);
  await rm(STORAGE_DIR, { recursive: true, force: true });
}

async function addPhotos(opts: { studioId: string; galleryId: string; albumId: string | null; ids: string[]; uploadedById: string; startOrder?: number }) {
  const created: string[] = [];
  let order = opts.startOrder ?? 0;
  for (const id of opts.ids) {
    const photo = await db.photo.create({
      data: {
        galleryId: opts.galleryId,
        albumId: opts.albumId,
        filename: `SAANJH_${id}_${String(order + 1).padStart(4, "0")}.jpg`,
        mimeType: "image/jpeg",
        originalKey: `pending-${opts.galleryId}-${id}-${order}`,
        order: order++,
        uploadedById: opts.uploadedById,
      },
    });
    const key = `studios/${opts.studioId}/galleries/${opts.galleryId}/originals/${photo.id}.jpg`;
    await mkdir(path.dirname(path.join(STORAGE_DIR, key)), { recursive: true });
    await copyFile(path.join(PHOTO_DIR, `${id}.jpg`), path.join(STORAGE_DIR, key));
    await db.photo.update({ where: { id: photo.id }, data: { originalKey: key, status: "UPLOADED" } });
    await processPhoto(photo.id);
    created.push(photo.id);
  }
  return created;
}

async function main() {
  console.log("› Resetting database and storage");
  await reset();

  const staffHash = await bcrypt.hash("Saanjh@2026", 12);
  const coupleHash = await bcrypt.hash("Couple@2026", 12);

  const studio = await db.studio.create({
    data: {
      name: "Saanjh Studio",
      slug: "saanjh",
      tagline: "Pre-wedding & wedding photography",
      email: "studio@saanjh.example",
      phone: "+91 98765 43210",
      whatsapp: "+919876543210",
      address: "2nd floor, 14 Hill Road, Bandra West",
      city: "Mumbai",
      instagram: "https://instagram.com/",
      youtube: "https://youtube.com/",
      watermarkText: "SAANJH STUDIO",
      invoicePrefix: "SAA",
    },
  });

  const admin = await db.user.create({ data: { email: "admin@saanjh.example", name: "Rhea Malhotra", role: "ADMIN", studioId: studio.id, passwordHash: staffHash, phone: "+91 98765 43210" } });
  const kabir = await db.user.create({ data: { email: "kabir@saanjh.example", name: "Kabir Sethi", role: "PHOTOGRAPHER", studioId: studio.id, passwordHash: staffHash } });

  console.log("› Packages, testimonials, stories, portfolio, blog");
  const pkgData = [
    { name: "Essential Couple Session", tagline: "A relaxed few hours in one beautiful place", description: "Perfect for engagement announcements and save-the-dates. One location, one outfit change and a gentle, guided session at golden hour.", hours: 3, photographers: 1, editedPhotos: 60, videoOption: null, albumOption: null, locationOption: "One location in your city", price: rupees(45000), order: 1 },
    { name: "Signature Pre-Wedding", tagline: "Our most loved pre-wedding experience", description: "A full day of storytelling across two locations with styling guidance, three outfit changes and a 60-second highlight reel for your socials.", hours: 8, photographers: 2, editedPhotos: 150, videoOption: "60-second highlight reel", albumOption: "20-page lay-flat album", locationOption: "Two locations within 50 km", price: rupees(125000), featured: true, order: 2 },
    { name: "Cinematic Love Story", tagline: "Photographs and a short film, told together", description: "A two-day shoot with a dedicated cinematographer. Includes a 4–5 minute love-story film with licensed music, drone coverage where permitted and a premium album.", hours: 16, photographers: 3, editedPhotos: 250, videoOption: "4–5 minute film + reel", albumOption: "30-page lay-flat album", locationOption: "Up to three locations", price: rupees(235000), order: 3 },
    { name: "Destination Experience", tagline: "Goa, Udaipur, Kerala, the mountains — anywhere", description: "We travel with you for three days, scouting at sunrise and shooting at the best hours. Travel and stay for the team are quoted separately.", hours: 24, photographers: 2, editedPhotos: 350, videoOption: "Film and reel", albumOption: "Heirloom album + parents’ copies", locationOption: "Destination of your choice", price: null, order: 4 },
    { name: "Wedding Photography Collection", tagline: "Every ritual, every glance, every dance", description: "Full coverage of your wedding functions — haldi, mehendi, sangeet, ceremony and reception — with candid and traditional teams and a same-week sneak peek.", hours: 30, photographers: 4, editedPhotos: 800, videoOption: "Wedding film + teaser", albumOption: "Two heirloom albums", locationOption: "All wedding venues", price: rupees(450000), order: 5 },
  ];
  const packages = [];
  for (const p of pkgData) {
    packages.push(
      await db.package.create({
        data: {
          ...p,
          slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          studioId: studio.id,
          isSample: true,
          addOns: [
            { name: "Additional hour", price: rupees(8000) },
            { name: "Same-day edits (10 photographs)", price: rupees(15000) },
            { name: "Drone coverage (where permitted)", price: rupees(18000) },
          ],
        },
      }),
    );
  }

  const testimonials = [
    { coupleNames: "Meera & Vikram", review: "We are camera-shy, and somehow they made us forget the camera was there. The gallery felt like reliving the whole evening by the lake.", category: "Pre-Wedding", location: "Udaipur", photoUrl: "/photos/16.jpg" },
    { coupleNames: "Ishaan & Tara", review: "The planning call alone calmed us down. They knew where the fog would sit at 7 am and where the light would land at 5. Pure magic.", category: "Pre-Wedding", location: "Coorg", photoUrl: "/photos/21.jpg" },
    { coupleNames: "Rohan & Sana", review: "Our families across three countries saw the photographs the same week. Grandma still opens the slideshow every Sunday.", category: "Wedding", location: "Kerala", photoUrl: "/photos/28.jpg" },
    { coupleNames: "Dev & Nisha", review: "Choosing our album photos together in the gallery was so much fun — we each had our own favourites list and then compared.", category: "Wedding", location: "Jaipur", photoUrl: "/photos/14.jpg" },
  ];
  for (const [i, t] of testimonials.entries()) await db.testimonial.create({ data: { ...t, studioId: studio.id, rating: 5, isSample: true, order: i } });

  const stories = [
    { slug: "aarav-ananya-goa", coupleNames: "Aarav & Ananya", title: "Salt, sun and a slow walk home", location: "Goa", category: "Pre-Wedding", coverImage: "/photos/32.jpg", images: ["/photos/27.jpg", "/photos/34.jpg", "/photos/36.jpg", "/photos/24.jpg", "/photos/33.jpg", "/photos/41.jpg"], excerpt: "Two Mumbai architects, one empty beach in South Goa and the kind of sunset that makes everyone stop talking.", body: "Aarav and Ananya met over an argument about arches in their first year of architecture school. Years later they wanted their pre-wedding to feel like their weekends together: unhurried, sun-soaked and a little bit silly.\n\nWe started at Agonda just after five, when the beach belonged to fishermen and dogs. By the time the sun touched the water we had moved to the rocks at Cabo de Rama — where Ananya finally stopped laughing long enough for one still, perfect frame.\n\nTheir gallery has 34 photographs across four albums, and their favourites list has, at last count, 31." },
    { slug: "meera-vikram-udaipur", coupleNames: "Meera & Vikram", title: "Lake light in the City of Lakes", location: "Udaipur", category: "Pre-Wedding", coverImage: "/photos/30.jpg", images: ["/photos/16.jpg", "/photos/38.jpg", "/photos/05.jpg", "/photos/13.jpg"], excerpt: "A quiet boat ride on Lake Pichola and an evening in an old haveli courtyard.", body: "Meera wanted water and Vikram wanted architecture, so Udaipur chose itself.\n\nWe planned around the light rather than the itinerary: the ghats at dawn, a haveli courtyard through the harsh afternoon, and the lake for the last hour of the day." },
    { slug: "ishaan-tara-coorg", coupleNames: "Ishaan & Tara", title: "Fog, coffee and forest paths", location: "Coorg", category: "Engagement", coverImage: "/photos/48.jpg", images: ["/photos/21.jpg", "/photos/18.jpg", "/photos/12.jpg", "/photos/20.jpg"], excerpt: "An estate walk at sunrise, with fog rolling between the coffee plants.", body: "Ishaan proposed in Coorg, so it was only right to come back. We walked the estate at sunrise while the fog lifted between the coffee plants, and ended the day on a quiet road through the forest." },
    { slug: "rohan-sana-kerala", coupleNames: "Rohan & Sana", title: "A backwater wedding", location: "Kerala", category: "Wedding", coverImage: "/photos/28.jpg", images: ["/photos/09.jpg", "/photos/50.jpg", "/photos/51.jpg", "/photos/52.jpg"], excerpt: "Three days of rituals, music and family between Alleppey and Kumarakom.", body: "Rohan and Sana's families flew in from three countries. Between the haldi on the houseboat and the reception under the coconut palms, the days were full of colour and loud, joyful chaos." },
  ];
  for (const s of stories) await db.story.create({ data: { ...s, studioId: studio.id, isSample: true, shootDate: d(-120) } });

  const portfolio: [string, string, string][] = [
    ["32", "Pre-Wedding", "Goa"], ["06", "Pre-Wedding", "Coorg"], ["09", "Wedding", "Jaipur"], ["27", "Destination", "Goa"], ["14", "Couple Portraits", "Mumbai"], ["30", "Pre-Wedding", "Udaipur"],
    ["28", "Wedding", "Kerala"], ["39", "Engagement", "Himachal"], ["21", "Engagement", "Coorg"], ["41", "Pre-Wedding", "Goa"], ["19", "Wedding", "Udaipur"], ["05", "Destination", "Kashmir"],
    ["24", "Destination", "Goa"], ["23", "Couple Portraits", "Mumbai"], ["50", "Wedding", "Jaipur"], ["12", "Pre-Wedding", "Kerala"], ["46", "Destination", "Jaisalmer"], ["29", "Couple Portraits", "Pune"],
    ["34", "Pre-Wedding", "Goa"], ["51", "Wedding", "Udaipur"], ["18", "Engagement", "Coorg"], ["45", "Destination", "Gokarna"], ["16", "Pre-Wedding", "Udaipur"], ["49", "Couple Portraits", "Goa"],
  ];
  const { PHOTOS } = await import("../src/content/photos");
  for (const [i, [id, category, location]] of portfolio.entries()) {
    const p = PHOTOS.find((x) => x.id === id)!;
    await db.portfolioItem.create({ data: { studioId: studio.id, title: p.alt, category, imageUrl: p.src, width: p.width, height: p.height, alt: p.alt, location, featured: i < 9, order: i } });
  }

  const posts = [
    { slug: "best-time-for-a-goa-pre-wedding-shoot", title: "The best time of year for a Goa pre-wedding shoot", excerpt: "Monsoon greens or winter gold? How the seasons change the light, the crowds and your outfits.", coverImage: "/photos/36.jpg", tags: ["Goa", "Planning"], body: "Goa changes completely across the year.\n\n## Winter (November – February)\nClear skies, soft evening light and sunsets around 6 pm. Beaches in the south stay quiet early in the morning. This is our most booked season, so plan three to four months ahead.\n\n## Monsoon (June – September)\nDeep greens, dramatic clouds and empty beaches. Expect to adapt on the day; waterproof cases and a flexible schedule help.\n\n## Our tip\nWhatever the season, plan the last 90 minutes before sunset for your most important looks." },
    { slug: "what-to-wear-for-your-pre-wedding-shoot", title: "What to wear for your pre-wedding shoot", excerpt: "Colour palettes that photograph beautifully, and the fabrics that move with the wind.", coverImage: "/photos/26.jpg", tags: ["Styling"], body: "Choose two or three looks that tell a story — one relaxed, one dressed up, one that feels like home.\n\n## Colours\nEarthy neutrals, dusty pastels and deep jewel tones all photograph beautifully. Avoid large logos and very fine stripes.\n\n## Movement\nFlowing fabrics like chiffon and organza catch the wind and add life to a frame.\n\n## Coordinate, don't match\nComplementary tones look more natural than identical colours." },
    { slug: "how-our-private-galleries-work", title: "How our private galleries work", excerpt: "Favourites, comments, album selections, family sharing and secure downloads — a tour.", coverImage: "/photos/08.jpg", tags: ["Galleries"], body: "Every couple receives a private gallery at their own address.\n\n## Favourites and selections\nCreate lists for your album, for social media and your own personal picks. Each of you can keep a separate list and compare.\n\n## Family sharing\nInvite parents and friends by email or WhatsApp. You decide what they can do — view, favourite, comment or download — and you can revoke access at any time.\n\n## Downloads\nDepending on your collection, you can download single photographs, albums or the entire gallery as a ZIP." },
  ];
  for (const [i, p] of posts.entries()) await db.blogPost.create({ data: { ...p, publishedAt: d(-30 * (i + 1)) } });

  console.log("› Clients, bookings, payments, photoshoots");
  const coupleUser = await db.user.create({ data: { email: "aarav.ananya@example.com", name: "Aarav & Ananya", role: "CLIENT", passwordHash: coupleHash, phone: "+91 90000 11111" } });

  const c1 = await db.client.create({ data: { studioId: studio.id, userId: coupleUser.id, partner1Name: "Aarav Mehta", partner1Email: "aarav.ananya@example.com", partner1Phone: "+91 90000 11111", partner2Name: "Ananya Rao", partner2Email: "ananya.rao@example.com", partner2Phone: "+91 90000 22222", city: "Mumbai", weddingDate: d(42, 18), source: "Instagram", notes: "Both architects. Love clean lines and candid laughter. Ananya prefers warm tones." } });
  const c2 = await db.client.create({ data: { studioId: studio.id, partner1Name: "Meera Iyer", partner1Email: "meera.iyer@example.com", partner1Phone: "+91 90000 33333", partner2Name: "Vikram Shah", partner2Email: "vikram.shah@example.com", city: "Bengaluru", weddingDate: d(95), source: "Referral" } });
  const c3 = await db.client.create({ data: { studioId: studio.id, partner1Name: "Ishaan Kapoor", partner1Email: "ishaan.k@example.com", partner1Phone: "+91 90000 44444", partner2Name: "Tara D’Souza", partner2Email: "tara.dsouza@example.com", city: "Pune", weddingDate: d(160), source: "Website" } });
  const c4 = await db.client.create({ data: { studioId: studio.id, partner1Name: "Rohan Nair", partner1Email: "rohan.nair@example.com", partner2Name: "Sana Qureshi", partner2Email: "sana.q@example.com", city: "Kochi", weddingDate: d(-60), source: "Wedding fair" } });
  const c5 = await db.client.create({ data: { studioId: studio.id, partner1Name: "Dev Agarwal", partner1Email: "dev.agarwal@example.com", partner2Name: "Nisha Bhatt", partner2Email: "nisha.bhatt@example.com", city: "Jaipur", weddingDate: d(24), source: "Instagram" } });
  for (const c of [c1, c2, c3, c4, c5]) await db.coupleProfile.create({ data: { clientId: c.id, countdownEnabled: c.id === c1.id, countdownLabel: c.id === c1.id ? "until forever" : null, tagline: c.id === c1.id ? "Two hearts. One beautiful story." : null } });

  const [pEssential, pSignature, pCinematic, pDestination, pWedding] = packages;

  const inq1 = await db.inquiry.create({ data: { studioId: studio.id, name: "Kavya Menon", email: "kavya.menon@example.com", phone: "+91 90000 55555", partnerName: "Arjun Pillai", shootType: "Pre-Wedding", preferredDate: d(70), location: "Kerala backwaters", packageId: pSignature.id, budget: "₹75,000 – ₹1,50,000", message: "We'd love a sunrise shoot on a houseboat and something in a tea estate if possible!", status: "NEW", createdAt: d(-1, 9) } });
  await db.inquiry.create({ data: { studioId: studio.id, name: "Zoya Khan", email: "zoya.khan@example.com", phone: "+91 90000 66666", partnerName: "Neil Fernandes", shootType: "Destination Shoot", preferredDate: d(120), location: "Gulmarg", packageId: pDestination.id, budget: "₹1,50,000 – ₹3,00,000", message: "Snow, please! Flexible on dates in February.", status: "CONTACTED", createdAt: d(-4, 13) } });
  await db.inquiry.create({ data: { studioId: studio.id, name: "Aditi Joshi", email: "aditi.j@example.com", phone: "+91 90000 77777", partnerName: "Siddharth Rane", shootType: "Wedding", preferredDate: d(200), location: "Pune", packageId: pWedding.id, budget: "Above ₹6,00,000", message: "Three-day wedding, approximately 400 guests.", status: "QUOTED", createdAt: d(-9, 16) } });
  await db.quotation.create({ data: { studioId: studio.id, inquiryId: inq1.id, items: [{ label: "Signature Pre-Wedding (sample price)", amount: rupees(125000) }, { label: "Drone coverage", amount: rupees(18000) }], total: rupees(143000), status: "DRAFT", validUntil: d(14) } });

  const b1 = await db.booking.create({ data: { studioId: studio.id, clientId: c1.id, packageId: pCinematic.id, title: "Aarav & Ananya — Goa pre-wedding", shootType: "Pre-Wedding", eventDate: d(-21, 16), location: "Agonda & Cabo de Rama, Goa", status: "COMPLETED", totalAmount: rupees(235000), advanceAmount: rupees(80000) } });
  const b1w = await db.booking.create({ data: { studioId: studio.id, clientId: c1.id, packageId: pWedding.id, title: "Aarav & Ananya — Wedding", shootType: "Wedding", eventDate: d(42, 17), location: "Taj Exotica, Benaulim, Goa", status: "CONFIRMED", totalAmount: rupees(450000), advanceAmount: rupees(150000) } });
  const b2 = await db.booking.create({ data: { studioId: studio.id, clientId: c2.id, packageId: pSignature.id, title: "Meera & Vikram — Udaipur", shootType: "Pre-Wedding", eventDate: d(-40, 16), location: "Lake Pichola, Udaipur", status: "COMPLETED", totalAmount: rupees(125000), advanceAmount: rupees(50000) } });
  const b3 = await db.booking.create({ data: { studioId: studio.id, clientId: c3.id, packageId: pEssential.id, title: "Ishaan & Tara — Coorg engagement", shootType: "Engagement", eventDate: d(-6, 7), location: "Private estate, Madikeri", status: "CONFIRMED", totalAmount: rupees(45000), advanceAmount: rupees(15000) } });
  const b5 = await db.booking.create({ data: { studioId: studio.id, clientId: c5.id, packageId: pWedding.id, title: "Dev & Nisha — Jaipur wedding", shootType: "Wedding", eventDate: d(24, 15), location: "Samode Palace, Jaipur", status: "CONFIRMED", totalAmount: rupees(480000), advanceAmount: rupees(150000) } });
  const b6 = await db.booking.create({ data: { studioId: studio.id, clientId: c3.id, packageId: pSignature.id, title: "Ishaan & Tara — Signature pre-wedding", shootType: "Pre-Wedding", eventDate: d(9, 6), location: "Chikmagalur", status: "PENDING", totalAmount: rupees(125000), advanceAmount: rupees(40000) } });
  await db.booking.create({ data: { studioId: studio.id, clientId: c4.id, packageId: pWedding.id, title: "Rohan & Sana — Kerala wedding", shootType: "Wedding", eventDate: d(-60, 11), location: "Kumarakom", status: "COMPLETED", totalAmount: rupees(420000), advanceAmount: rupees(150000) } });

  const pay = (bookingId: string, clientId: string, amount: number, kind: "ADVANCE" | "BALANCE" | "FULL", method: "UPI" | "BANK_TRANSFER" | "CASH", paidDaysAgo: number | null, reference?: string) =>
    db.payment.create({ data: { studioId: studio.id, bookingId, clientId, amount, kind, method, status: paidDaysAgo == null ? "PENDING" : "PAID", paidAt: paidDaysAgo == null ? null : d(-paidDaysAgo), verifiedVia: paidDaysAgo == null ? null : `manual:${admin.id}`, reference, createdAt: d(-(paidDaysAgo ?? 2)) } });
  await pay(b1.id, c1.id, rupees(80000), "ADVANCE", "UPI", 75, "UPI/341298771");
  await pay(b1.id, c1.id, rupees(155000), "BALANCE", "BANK_TRANSFER", 10, "NEFT/HDFC0000123");
  await pay(b1w.id, c1.id, rupees(150000), "ADVANCE", "BANK_TRANSFER", 38, "NEFT/ICIC0000456");
  await pay(b2.id, c2.id, rupees(50000), "ADVANCE", "UPI", 110, "UPI/998812001");
  await pay(b2.id, c2.id, rupees(75000), "BALANCE", "UPI", 35, "UPI/998812777");
  await pay(b3.id, c3.id, rupees(15000), "ADVANCE", "CASH", 20);
  await pay(b5.id, c5.id, rupees(150000), "ADVANCE", "BANK_TRANSFER", 52, "NEFT/SBIN0000789");
  await pay(b5.id, c5.id, rupees(330000), "BALANCE", "BANK_TRANSFER", null);
  await pay(b6.id, c3.id, rupees(40000), "ADVANCE", "UPI", null);
  // extra monthly revenue history for charts
  for (let m = 2; m <= 6; m++) {
    const bk = await db.booking.create({ data: { studioId: studio.id, clientId: c4.id, title: `Archive booking ${m}`, shootType: m % 2 ? "Wedding" : "Pre-Wedding", eventDate: d(-m * 30 - 5), status: "COMPLETED", totalAmount: rupees(60000 + m * 25000), advanceAmount: 0, packageId: m % 2 ? pWedding.id : pSignature.id, createdAt: d(-m * 30 - 40) } });
    await pay(bk.id, c4.id, rupees(60000 + m * 25000), "FULL", "BANK_TRANSFER", m * 30);
  }

  let invNo = 1;
  for (const b of [b1, b2, b5]) {
    const total = b.totalAmount;
    await db.invoice.create({ data: { studioId: studio.id, bookingId: b.id, number: `SAA-2026-${String(invNo++).padStart(4, "0")}`, items: [{ label: b.title, amount: total }], subtotal: total, total, status: b.id === b5.id ? "ISSUED" : "PAID", dueAt: d(7) } });
  }

  const s1 = await db.photoshoot.create({ data: { studioId: studio.id, clientId: c1.id, bookingId: b1.id, packageId: pCinematic.id, photographerId: admin.id, title: "Aarav & Ananya — Goa", type: "Pre-Wedding", date: d(-21, 16), location: "Agonda Beach, South Goa", status: "DELIVERED", notes: "Sunrise at Agonda, sunset at Cabo de Rama. Traditional outfits at the Fontainhas lanes." } });
  const s2 = await db.photoshoot.create({ data: { studioId: studio.id, clientId: c2.id, bookingId: b2.id, packageId: pSignature.id, photographerId: kabir.id, title: "Meera & Vikram — Udaipur", type: "Pre-Wedding", date: d(-40, 16), location: "Lake Pichola, Udaipur", status: "COMPLETED" } });
  const s3 = await db.photoshoot.create({ data: { studioId: studio.id, clientId: c3.id, bookingId: b3.id, packageId: pEssential.id, photographerId: kabir.id, title: "Ishaan & Tara — Coorg", type: "Engagement", date: d(-6, 7), location: "Madikeri, Coorg", status: "EDITING" } });
  await db.photoshoot.create({ data: { studioId: studio.id, clientId: c5.id, bookingId: b5.id, packageId: pWedding.id, photographerId: admin.id, title: "Dev & Nisha — Wedding", type: "Wedding", date: d(24, 15), location: "Samode Palace, Jaipur", status: "UPCOMING" } });
  await db.photoshoot.create({ data: { studioId: studio.id, clientId: c3.id, bookingId: b6.id, packageId: pSignature.id, photographerId: admin.id, title: "Ishaan & Tara — Chikmagalur", type: "Pre-Wedding", date: d(9, 6), location: "Mullayanagiri, Chikmagalur", status: "CONFIRMED" } });
  await db.photoshoot.create({ data: { studioId: studio.id, clientId: c1.id, bookingId: b1w.id, packageId: pWedding.id, photographerId: admin.id, title: "Aarav & Ananya — Wedding", type: "Wedding", date: d(42, 17), location: "Benaulim, Goa", status: "UPCOMING" } });
  await db.photoshoot.create({ data: { studioId: studio.id, clientId: c4.id, photographerId: kabir.id, title: "Rohan & Sana — Kerala", type: "Wedding", date: d(-60, 11), location: "Kumarakom", status: "COMPLETED" } });

  console.log("› Galleries (processing photographs through the real pipeline — this takes a moment)");
  const g1 = await db.gallery.create({
    data: {
      studioId: studio.id,
      clientId: c1.id,
      photoshootId: s1.id,
      slug: "aarav-ananya-love-story",
      title: "Aarav & Ananya — A Goa Love Story",
      coupleNames: "Aarav & Ananya",
      tagline: "Two hearts. One beautiful story.",
      welcomeNote: "Captured in the golden light of Goa. Take your time — favourite the frames you love, leave us a note on anything you'd like adjusted, and choose your album photographs together.",
      location: "South Goa",
      shootDate: d(-21),
      category: "Pre-Wedding",
      status: "PUBLISHED",
      visibility: "PRIVATE",
      publishedAt: d(-3),
      expiresAt: d(180),
      settings: { create: { downloadScope: "FULL", downloadResolution: "HIGH", allowFavorites: true, allowComments: true, guestUploadsEnabled: true, guestUploadModerated: true, albumSelectionLimit: 30, socialSelectionLimit: 10, showCountdown: true, countdownDate: d(42, 18), slideshowSeconds: 5 } },
    },
  });
  const albumsSpec: [string, string, string[]][] = [
    ["Pre-Wedding Highlights", "pre-wedding-highlights", ["32", "34", "27", "41", "06", "39", "05", "14"]],
    ["Sunset Session", "sunset-session", ["31", "37", "38", "42", "43", "40", "16", "13"]],
    ["Traditional Outfits", "traditional-outfits", ["09", "28", "19", "50", "46"]],
    ["Candid Moments", "candid-moments", ["07", "29", "53", "54", "35", "22", "08", "03"]],
    ["Final Edited Photographs", "final-edited", ["24", "33", "36", "45", "30"]],
  ];
  const g1Photos: string[] = [];
  let ord = 0;
  for (const [i, [title, slug, ids]] of albumsSpec.entries()) {
    const album = await db.album.create({ data: { galleryId: g1.id, title, slug, order: i } });
    const created = await addPhotos({ studioId: studio.id, galleryId: g1.id, albumId: album.id, ids, uploadedById: admin.id, startOrder: ord });
    ord += ids.length;
    g1Photos.push(...created);
  }
  await db.album.create({ data: { galleryId: g1.id, title: "Guest Moments", slug: "guest-moments", order: 9, description: "Photographs shared by family and friends" } });
  const guestAlbum = await db.album.findFirst({ where: { galleryId: g1.id, slug: "guest-moments" } });
  await db.gallerySettings.update({ where: { galleryId: g1.id }, data: { guestUploadAlbumId: guestAlbum!.id } });
  await db.gallery.update({ where: { id: g1.id }, data: { coverPhotoId: g1Photos[0] } });

  const g2 = await db.gallery.create({
    data: {
      studioId: studio.id,
      clientId: c2.id,
      photoshootId: s2.id,
      slug: "meera-vikram-udaipur",
      title: "Meera & Vikram — Udaipur",
      coupleNames: "Meera & Vikram",
      tagline: "Lake light in the City of Lakes",
      welcomeNote: "An evening on Lake Pichola, kept forever.",
      location: "Udaipur, Rajasthan",
      shootDate: d(-40),
      status: "PUBLISHED",
      visibility: "PASSWORD",
      passwordHash: await bcrypt.hash("udaipur2026", 10),
      publishedAt: d(-20),
      settings: { create: { downloadScope: "SINGLE", downloadResolution: "WEB", watermarkPreviews: true, linkCanDownload: false } },
    },
  });
  const a2 = await db.album.create({ data: { galleryId: g2.id, title: "Lakeside", slug: "lakeside", order: 0 } });
  const g2Photos = await addPhotos({ studioId: studio.id, galleryId: g2.id, albumId: a2.id, ids: ["30", "16", "38", "05", "13", "26", "20", "18", "52", "51"], uploadedById: kabir.id });
  await db.gallery.update({ where: { id: g2.id }, data: { coverPhotoId: g2Photos[0] } });

  const g3 = await db.gallery.create({
    data: { studioId: studio.id, clientId: c3.id, photoshootId: s3.id, slug: "ishaan-tara-coorg", title: "Ishaan & Tara — Coorg", coupleNames: "Ishaan & Tara", tagline: "Fog, coffee and forest paths", location: "Coorg, Karnataka", shootDate: d(-6), status: "DRAFT", settings: { create: {} } },
  });
  const a3 = await db.album.create({ data: { galleryId: g3.id, title: "Estate at Sunrise", slug: "estate-sunrise", order: 0 } });
  const g3Photos = await addPhotos({ studioId: studio.id, galleryId: g3.id, albumId: a3.id, ids: ["48", "21", "18", "12", "20", "02"], uploadedById: kabir.id });
  await db.gallery.update({ where: { id: g3.id }, data: { coverPhotoId: g3Photos[0] } });

  console.log("› Favourites, comments, invitations, guest uploads, activity");
  const lists = await Promise.all([
    db.favoriteList.create({ data: { galleryId: g1.id, ownerUserId: coupleUser.id, name: "Album Selection", kind: "ALBUM", limit: 30 } }),
    db.favoriteList.create({ data: { galleryId: g1.id, ownerUserId: coupleUser.id, name: "Social Media", kind: "SOCIAL", limit: 10 } }),
    db.favoriteList.create({ data: { galleryId: g1.id, ownerUserId: coupleUser.id, name: "Ananya’s Picks", kind: "PARTNER_TWO" } }),
    db.favoriteList.create({ data: { galleryId: g1.id, ownerUserId: coupleUser.id, name: "Aarav’s Picks", kind: "PARTNER_ONE" } }),
  ]);
  const fav = (listId: string, idx: number[], note?: string) => Promise.all(idx.map((i) => db.favorite.create({ data: { listId, photoId: g1Photos[i], note: i === idx[0] ? note : undefined } })));
  await fav(lists[0].id, [0, 1, 2, 3, 5, 8, 9, 12, 16, 18, 21, 24], "Opening spread please!");
  await fav(lists[1].id, [0, 3, 9, 30]);
  await fav(lists[2].id, [0, 2, 5, 16, 17, 22, 24, 27]);
  await fav(lists[3].id, [0, 1, 3, 6, 16, 19, 22, 30]);

  const cm = await db.comment.create({ data: { galleryId: g1.id, photoId: g1Photos[2], authorUserId: coupleUser.id, authorName: "Ananya", body: "Can we get this one in a slightly warmer tone? It's our favourite!", isEditRequest: true, createdAt: d(-2, 11) } });
  await db.comment.create({ data: { galleryId: g1.id, photoId: g1Photos[2], authorUserId: admin.id, authorName: "Rhea (Saanjh Studio)", fromStudio: true, parentId: cm.id, body: "Absolutely — we'll warm it up and add it to the Final Edited album this week.", createdAt: d(-2, 15) } });
  await db.comment.create({ data: { galleryId: g1.id, photoId: g1Photos[0], authorUserId: coupleUser.id, authorName: "Aarav", body: "We love this one! This has to be the album cover.", createdAt: d(-1, 20) } });
  await db.comment.create({ data: { galleryId: g1.id, photoId: g1Photos[9], authorUserId: coupleUser.id, authorName: "Ananya", body: "Please remove the boat in the background if possible.", isEditRequest: true, createdAt: d(-1, 21) } });

  const familyInvite = await db.invitation.create({ data: { galleryId: g1.id, token: "demo-family-" + Math.random().toString(36).slice(2, 14), kind: "INVITE", name: "Ananya’s parents", email: "rao.family@example.com", canView: true, canFavorite: true, canComment: true, canDownload: true, createdById: coupleUser.id, lastUsedAt: d(-1), useCount: 4 } });
  await db.invitation.create({ data: { galleryId: g1.id, token: "demo-share-" + Math.random().toString(36).slice(2, 14), kind: "SHARE_LINK", name: "Friends (view only)", canView: true, createdById: coupleUser.id } });
  const portal = await db.invitation.create({ data: { galleryId: g1.id, token: "demo-upload-" + Math.random().toString(36).slice(2, 14), kind: "UPLOAD_PORTAL", name: "Wedding guest uploads (QR)", canView: false, canUpload: true, createdById: admin.id } });

  for (const [i, id] of ["53", "35", "22"].entries()) {
    const gu = await db.guestUpload.create({ data: { galleryId: g1.id, invitationId: portal.id, guestName: ["Priya (cousin)", "Uncle Suresh", "Neha"][i], message: i === 0 ? "From the sangeet rehearsal ❤️" : null, filename: `IMG_20${i}${id}.jpg`, mimeType: "image/jpeg", size: 0n, key: `studios/${studio.id}/galleries/${g1.id}/guest/${id}-${i}.jpg`, createdAt: d(-1, 10 + i) } });
    await mkdir(path.dirname(path.join(STORAGE_DIR, gu.key)), { recursive: true });
    await copyFile(path.join(PHOTO_DIR, `${id}.jpg`), path.join(STORAGE_DIR, gu.key));
    const { makePreview } = await import("../src/server/media/process");
    const { previewKey } = await makePreview(gu.key, 700);
    const { size } = await import("node:fs/promises").then((m) => m.stat(path.join(STORAGE_DIR, gu.key)));
    await db.guestUpload.update({ where: { id: gu.id }, data: { thumbKey: previewKey, size: BigInt(size) } });
  }

  await db.albumDesign.create({ data: { galleryId: g1.id, title: "Our Goa Album", status: "SUBMITTED", submittedAt: d(-1), coupleNote: "We kept the sunset spread in the middle — open to your suggestions!", pages: [{ layout: "single", photoIds: [g1Photos[0]], caption: "Agonda, just after five" }, { layout: "duo", photoIds: [g1Photos[1], g1Photos[2]] }, { layout: "trio", photoIds: [g1Photos[8], g1Photos[9], g1Photos[10]], caption: "The last light" }, { layout: "quad", photoIds: [g1Photos[16], g1Photos[17], g1Photos[18], g1Photos[19]] }] } });

  const moments = [
    ["First Meeting", -365 * 8, "An argument about arches in first-year studio. Ananya won.", 21],
    ["First Date", -365 * 7, "Vada pav and the sea face at Bandra. It rained, of course.", 23],
    ["The Proposal", -300, "On the rooftop of the first building they designed together.", 22],
    ["Engagement", -180, "Two families, one very loud dinner in Mumbai.", 25],
    ["Pre-Wedding Shoot", -21, "Agonda at dawn, Cabo de Rama at dusk.", 0],
    ["Wedding Day", 42, "Benaulim, Goa — see you there.", null],
  ] as const;
  for (const [i, [title, off, desc, ph]] of moments.entries()) await db.loveStoryMoment.create({ data: { clientId: c1.id, title, date: d(off), description: desc, order: i, photoId: ph == null ? null : g1Photos[ph % g1Photos.length] } });

  const acts: [string, string, number, string | null][] = [
    ["Aarav & Ananya", "GALLERY_OPENED", -3, null],
    ["Aarav & Ananya", "PHOTO_FAVORITED", -3, g1Photos[0]],
    ["Ananya’s parents", "GALLERY_OPENED", -2, null],
    ["Ananya", "COMMENT_ADDED", -2, g1Photos[2]],
    ["Priya (cousin)", "GUEST_UPLOAD", -1, null],
    ["Aarav & Ananya", "ALBUM_DESIGN_SUBMITTED", -1, null],
    ["Aarav", "COMMENT_ADDED", -1, g1Photos[0]],
    ["Ananya’s parents", "DOWNLOAD_COMPLETED", -1, g1Photos[1]],
  ];
  for (const [label, action, off, photoId] of acts) await db.activityLog.create({ data: { studioId: studio.id, galleryId: g1.id, actorLabel: label, action, photoId, createdAt: d(off, 12), userId: label.startsWith("Aarav") ? coupleUser.id : null } });
  await db.activityLog.create({ data: { studioId: studio.id, galleryId: g2.id, actorLabel: "Meera & Vikram", action: "GALLERY_OPENED", createdAt: d(-5, 19) } });
  void familyInvite;

  const notes: [string, string, string, string][] = [
    ["BOOKING_RECEIVED", "New inquiry from Kavya Menon", "Pre-Wedding · Kerala backwaters", "/admin/bookings"],
    ["NEW_COMMENT", "Ananya commented on a photograph", "“Please remove the boat in the background if possible.”", `/admin/galleries/${g1.id}?tab=comments`],
    ["GUEST_UPLOAD", "3 guest uploads awaiting review", "Aarav & Ananya — A Goa Love Story", `/admin/galleries/${g1.id}?tab=guests`],
    ["ALBUM_DESIGN", "Album design submitted", "“Our Goa Album” by Aarav & Ananya", `/admin/galleries/${g1.id}?tab=albums`],
  ];
  for (const [type, title, body, link] of notes) await db.notification.create({ data: { userId: admin.id, type, title, body, link } });
  await db.notification.create({ data: { userId: coupleUser.id, type: "GALLERY_PUBLISHED", title: "Your gallery is ready", body: "34 photographs from Goa are waiting for you.", link: "/gallery/aarav-ananya-love-story" } });

  console.log("› Grid templates");
  for (const tpl of BUILTIN_TEMPLATES) {
    await db.gridTemplate.create({ data: { id: tpl.id, name: tpl.name, categories: categoriesFor(tpl), style: tpl.style, cellCount: tpl.cells.length, width: tpl.width, height: tpl.height, config: tpl as unknown as Prisma.InputJsonValue, popularity: tpl.popular ? 100 : 10 } });
  }

  console.log(`✓ Seed complete — ${g1Photos.length + g2Photos.length + g3Photos.length} photographs processed, ${BUILTIN_TEMPLATES.length} grid templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
