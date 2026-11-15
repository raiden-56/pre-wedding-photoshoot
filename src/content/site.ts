export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Our Work" },
  { href: "/pre-wedding", label: "Pre-Wedding" },
  { href: "/wedding", label: "Wedding" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const SHOOT_TYPES = ["Pre-Wedding", "Wedding", "Engagement", "Couple Portraits", "Destination Shoot", "Reception", "Cinematic Film"] as const;

export const BUDGET_RANGES = ["Under ₹75,000", "₹75,000 – ₹1,50,000", "₹1,50,000 – ₹3,00,000", "₹3,00,000 – ₹6,00,000", "Above ₹6,00,000", "Not sure yet"] as const;

export const GALLERY_CATEGORIES = ["Pre-Wedding", "Wedding", "Engagement", "Reception", "Couple Portraits", "Behind the Scenes", "Family Moments", "Destination Shoot"] as const;

export const PORTFOLIO_CATEGORIES = ["Pre-Wedding", "Wedding", "Engagement", "Couple Portraits", "Destination"] as const;

export const PROCESS_STEPS = [
  { n: "01", title: "Discover", body: "Wander through our stories and find the light, the mood and the pace that feels like the two of you.", photo: "06" },
  { n: "02", title: "Connect", body: "A long, unhurried call. We listen to how you met, what you love, and what you never want to forget.", photo: "53" },
  { n: "03", title: "Plan", body: "Together we choose the location, the hour of light, outfits and the collection that fits your celebration.", photo: "30" },
  { n: "04", title: "Capture", body: "No stiff poses. We guide gently and let real moments unfold — the laughter in between is where the magic lives.", photo: "27" },
  { n: "05", title: "Curate", body: "Your private gallery arrives within weeks. Favourite, comment and choose the frames for your album together.", photo: "08" },
  { n: "06", title: "Relive", body: "Share with family through a link or QR code, play the cinematic slideshow, and keep it all for years to come.", photo: "34" },
] as const;

export type LocationContent = {
  slug: string;
  name: string;
  region: string;
  headline: string;
  intro: string;
  bestSeason: string;
  goldenHour: string;
  highlights: string[];
  photos: string[];
};

export const LOCATIONS: LocationContent[] = [
  {
    slug: "goa",
    name: "Goa",
    region: "Konkan Coast",
    headline: "Salt air, slow sunsets and long walks where the waves end.",
    intro: "Goa is our most requested pre-wedding destination for a reason — wide quiet beaches in the south, Portuguese lanes in Fontainhas and cliffs at Cabo de Rama that glow at dusk.",
    bestSeason: "November – February",
    goldenHour: "5:40 pm – 6:30 pm in winter",
    highlights: ["Palolem & Agonda at sunrise", "Fontainhas colour-washed lanes", "Cabo de Rama cliffs", "Chapora riverside"],
    photos: ["32", "27", "36", "34"],
  },
  {
    slug: "udaipur",
    name: "Udaipur",
    region: "Rajasthan",
    headline: "Lakeside palaces, carved jharokhas and boats on still water.",
    intro: "The City of Lakes was made for romance. We plan around permissions and crowds so you get the ghats, havelis and lake views at their most serene.",
    bestSeason: "October – March",
    goldenHour: "Golden light on Lake Pichola from 5:15 pm",
    highlights: ["Lake Pichola boat ride", "Ambrai Ghat at dusk", "Heritage haveli courtyards", "Aravalli hill viewpoints"],
    photos: ["30", "16", "38", "05"],
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    region: "Rajasthan",
    headline: "Pink sandstone, step-wells and a thousand arches of light.",
    intro: "Heritage architecture gives every frame a sense of grandeur. Early mornings at the forts and stepwells mean empty corridors and soft, even light.",
    bestSeason: "October – February",
    goldenHour: "Best starts: 6:45 am at the forts",
    highlights: ["Panna Meena ka Kund", "Nahargarh at sunset", "Patrika Gate", "Amber Fort corridors"],
    photos: ["09", "28", "46", "19"],
  },
  {
    slug: "kerala",
    name: "Kerala",
    region: "Alleppey & Kumarakom",
    headline: "Backwaters, coconut groves and the green hush of the monsoon.",
    intro: "A houseboat, a canoe at dawn, a village path between paddy fields — Kerala is for couples who love calm, colour and water.",
    bestSeason: "September – March",
    goldenHour: "Mist on the water until 7:30 am",
    highlights: ["Houseboat at sunrise", "Kumarakom canals", "Paddy-field walkways", "Marari beach"],
    photos: ["12", "18", "43", "37"],
  },
  {
    slug: "coorg",
    name: "Coorg",
    region: "Karnataka",
    headline: "Coffee estates, rolling mist and forest light.",
    intro: "Coorg's estates feel cinematic in every season — soft fog through the trees in the morning and warm haze over the hills by evening.",
    bestSeason: "October – April",
    goldenHour: "Fog lifts by 8 am; warm haze after 5 pm",
    highlights: ["Private coffee estates", "Abbey Falls trail", "Mandalpatti viewpoint", "Dubare river bank"],
    photos: ["48", "21", "39", "20"],
  },
  {
    slug: "himachal",
    name: "The Mountains",
    region: "Himachal & Kashmir",
    headline: "Pine forests, snow light and the quiet of high places.",
    intro: "For couples who want drama and stillness at once: alpine meadows, wooden villages and mountain passes with endless horizons.",
    bestSeason: "March – June, October – December",
    goldenHour: "Alpenglow 15 minutes after sunset",
    highlights: ["Manali pine forests", "Gulmarg meadows", "Spiti horizons", "Old Manali cafés"],
    photos: ["05", "40", "53", "39"],
  },
];
