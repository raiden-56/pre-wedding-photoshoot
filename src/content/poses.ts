// Pose guide content. Photos are the CC0 sample images in content/photos.ts,
// matched to each pose by what they actually show.

export type Pose = {
  id: string;
  name: string;
  photo: string;
  why: string;
  steps: [string, string, string];
};

export type PoseGroup = { id: "pre-wedding" | "post-wedding"; title: string; intro: string; poses: Pose[] };

export const POSE_GROUPS: PoseGroup[] = [
  {
    id: "pre-wedding",
    title: "Pre-wedding poses",
    intro: "Relaxed, everyday clothes or a first outfit change, usually at golden hour. These poses keep you moving and talking so the photographs feel like the two of you, not a catalogue.",
    poses: [
      { id: "walk-and-talk", name: "The walk and talk", photo: "12", why: "Movement hides nerves and gives natural strides and expressions.", steps: ["Hold hands loosely and walk slowly towards the camera", "Talk to each other, not to us", "Every few steps, one of you glances at the other"] },
      { id: "look-back", name: "The look back", photo: "06", why: "A simple turn of the head adds story and a candid smile.", steps: ["One partner walks a step ahead, still holding hands", "The leader turns and looks back over the shoulder", "The other keeps walking and looks up as they meet"] },
      { id: "forehead-kiss", name: "Forehead kiss", photo: "21", why: "Quiet and intimate, and flattering for every height difference.", steps: ["Stand close with hands at the waist or cheek", "The taller partner kisses the other’s forehead", "Both close your eyes and breathe out slowly"] },
      { id: "silhouette", name: "Golden-hour silhouette", photo: "41", why: "Shooting into the low sun turns two profiles into one clean shape.", steps: ["Face each other side-on to the setting sun", "Leave a small gap between your faces so both profiles read", "Lift your chins slightly and hold for a breath"] },
      { id: "beach-run", name: "The run", photo: "27", why: "Laughter you can’t fake, and lovely movement in fabric and hair.", steps: ["Hold hands and run at half speed along the shoreline", "Look at each other, not your feet", "Repeat two or three times — the third run is usually the best"] },
      { id: "sit-together", name: "Sitting close", photo: "16", why: "A calm, grounded frame that suits lakes, steps and hillsides.", steps: ["Sit side by side with knees angled towards each other", "Lean in until your shoulders touch", "One partner rests a head on the other’s shoulder"] },
      { id: "dip", name: "The dip", photo: "19", why: "A classic, playful moment that feels cinematic in wide frames.", steps: ["The leader supports the back firmly with one arm", "The other leans back slowly, one foot lifting", "Pause just before the kiss for the strongest frame"] },
      { id: "ring", name: "Ring and hands", photo: "22", why: "A detail for save-the-dates and the first page of the album.", steps: ["Rest the ring hand on your partner’s hand or chest", "Relax the fingers — no flat, stiff hands", "Keep nails and ring clean; we shoot close"] },
    ],
  },
  {
    id: "post-wedding",
    title: "Post-wedding poses",
    intro: "A relaxed session in your wedding outfits, a day or a few weeks after the ceremony. No timeline and no crowd, so these poses lean into the clothes, the jewellery and the details you didn’t have time for on the day.",
    poses: [
      { id: "embrace-from-behind", name: "Embrace from behind", photo: "50", why: "Shows the outfit from the front while keeping you close.", steps: ["One partner stands behind with arms around the waist", "The other holds the bouquet or dupatta at hip height", "Both turn your faces towards each other, cheek to cheek"] },
      { id: "mehendi-hands", name: "Mehendi and hands", photo: "28", why: "Keeps the henna, bangles and rings that fade within days.", steps: ["Hold hands at chest height in soft side light", "Turn the palm slightly so the henna pattern shows", "Let the sleeve or dupatta fall naturally around the wrist"] },
      { id: "veil-wind", name: "Veil in the wind", photo: "29", why: "Movement in the veil or dupatta makes a simple portrait feel alive.", steps: ["Stand with your back to a light breeze", "Lift the veil gently and let it go on our count", "Laugh, look down, then back up — we shoot all three"] },
      { id: "back-detail", name: "The back of the gown", photo: "47", why: "Lace, buttons and blouse backs rarely get photographed on the day.", steps: ["The bride turns her back to the camera", "The groom places his hands lightly at the waist", "Bride looks over one shoulder towards the groom"] },
      { id: "wide-landscape", name: "Small in a big landscape", photo: "46", why: "A wide frame that tells where you are, perfect for album openers.", steps: ["Walk out into the open space and hold each other", "Stand still — we step far back for this one", "Face each other or look out at the view together"] },
      { id: "under-veil", name: "Under the veil", photo: "23", why: "A soft, private frame that works beautifully in black and white.", steps: ["Lift the veil over both of your heads", "Bring your faces close, foreheads nearly touching", "Close your eyes or share a whisper"] },
      { id: "into-the-light", name: "Walking into the light", photo: "18", why: "Back-lit leaves or curtains give a dreamy glow to the outfits.", steps: ["Walk away from the camera towards the light", "Hold hands and let the outfit trail behind", "Halfway, turn to each other without stopping"] },
      { id: "shoes-hem", name: "Shoes and hem", photo: "25", why: "A detail frame for the album that pairs both outfits.", steps: ["Stand toe to toe with the hem or sherwani edge visible", "Keep the feet still and weight balanced", "We shoot from low, so stand on clean ground"] },
    ],
  },
];
