import { z } from "zod";

const phone = z
  .string()
  .trim()
  .min(7, "Please enter a valid phone number")
  .max(20)
  .regex(/^[+\d][\d\s\-()]{6,}$/, "Please enter a valid phone number");

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? new Date(v) : undefined))
  .refine((d) => !d || !Number.isNaN(d.getTime()), "Invalid date");

export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(80),
  email: z.string().trim().email("Please enter a valid email").max(120),
  phone,
  partnerName: z.string().trim().max(80).optional().or(z.literal("")),
  shootType: z.string().min(1, "Choose a photoshoot type").max(40),
  preferredDate: z.string().optional(),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  packageId: z.string().max(40).optional().or(z.literal("")),
  budget: z.string().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  /** honeypot — must stay empty */
  website: z.string().max(0).optional().or(z.literal("")),
});
export type InquiryInput = z.infer<typeof inquirySchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export const passwordRule = z.string().min(8, "Use at least 8 characters").max(100).regex(/[A-Za-z]/, "Include a letter").regex(/\d/, "Include a number");

export const registerSchema = z.object({
  studioName: z.string().trim().min(2, "Studio name is required").max(80),
  name: z.string().trim().min(2, "Your name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: passwordRule,
});

export const clientSchema = z.object({
  partner1Name: z.string().trim().min(2, "Required").max(80),
  partner1Email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  partner1Phone: z.string().trim().max(20).optional().or(z.literal("")),
  partner2Name: z.string().trim().min(2, "Required").max(80),
  partner2Email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  partner2Phone: z.string().trim().max(20).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  weddingDate: z.string().optional().or(z.literal("")),
  source: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const SHOOT_STATUSES = ["INQUIRY", "CONFIRMED", "UPCOMING", "IN_PROGRESS", "EDITING", "READY_FOR_REVIEW", "DELIVERED", "COMPLETED"] as const;

export const photoshootSchema = z.object({
  title: z.string().trim().min(2).max(120),
  clientId: z.string().min(1, "Choose a client"),
  type: z.string().min(1).max(40),
  date: z.string().min(1, "Choose a date"),
  time: z.string().optional(),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  photographerId: z.string().optional().or(z.literal("")),
  packageId: z.string().optional().or(z.literal("")),
  status: z.enum(SHOOT_STATUSES),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const packageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(140).optional().or(z.literal("")),
  description: z.string().trim().min(10, "Add a short description").max(2000),
  hours: z.coerce.number().int().min(1).max(200),
  photographers: z.coerce.number().int().min(1).max(20),
  editedPhotos: z.coerce.number().int().min(1).max(5000),
  videoOption: z.string().trim().max(140).optional().or(z.literal("")),
  albumOption: z.string().trim().max(140).optional().or(z.literal("")),
  locationOption: z.string().trim().max(140).optional().or(z.literal("")),
  price: z.string().optional().or(z.literal("")),
  addOns: z.string().optional(),
  featured: z.string().optional(),
  active: z.string().optional(),
  isSample: z.string().optional(),
});

export const gallerySchema = z.object({
  title: z.string().trim().min(2).max(140),
  coupleNames: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
    .min(3)
    .max(80)
    .optional()
    .or(z.literal("")),
  clientId: z.string().optional().or(z.literal("")),
  photoshootId: z.string().optional().or(z.literal("")),
  category: z.string().max(40),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  welcomeNote: z.string().trim().max(2000).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  shootDate: z.string().optional().or(z.literal("")),
});

export const commentSchema = z.object({
  photoId: z.string().min(1),
  body: z.string().trim().min(1, "Write a comment").max(1500),
  parentId: z.string().optional(),
  isEditRequest: z.boolean().optional(),
  authorName: z.string().trim().max(60).optional(),
});

export const RESERVED_ALBUM_SLUGS = ["all", "slideshow", "upload", "story", "favorites", "album-designer", "selections"];

export { optionalDate };
