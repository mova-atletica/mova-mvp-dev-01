export interface Creator {
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  /** CSS gradient or image URL */
  heroImage: string;
  specialty: string[];
  isFeatured?: boolean;
  /** Normalized aliases matching exercise.authorName in the DB */
  authorMatchKeys?: string[];
  socialLinks?: { label: string; url: string }[];
}

export const CREATORS: Creator[] = [
  {
    slug: "oliviaostrom_",
    name: "Olivia Ostrom",
    tagline: "Strength & functional training",
    bio: "Full-body strength sessions with clear form cues — dumbbells, bodyweight, and controlled reps built for beginners building confidence in the gym.",
    heroImage: "linear-gradient(135deg, #3f1d38 0%, #9d174d 45%, #fbcfe8 100%)",
    specialty: ["strength", "functional", "beginner"],
    isFeatured: true,
    authorMatchKeys: ["oliviaostrom_", "Olivia Ostrom", "olivia ostrom"],
  },
  {
    slug: "nicofitness",
    name: "Nicofitness",
    tagline: "Calisthenics strength & control",
    bio: "Progressive bodyweight programming focused on pull, push, and core patterns. Programs blend skill work with strength blocks for athletes who train without a gym.",
    heroImage: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 40%, #7c3aed 100%)",
    specialty: ["calisthenics", "strength", "skill work"],
    isFeatured: true,
    authorMatchKeys: ["Nicofitness", "Nico Fitness", "nicofitness"],
  },
  {
    slug: "mova",
    name: "Mova Team",
    tagline: "Movement library & fundamentals",
    bio: "Official Mova Atletica programs — mobility flows, core circuits, and reference training built around our motion analysis tools.",
    heroImage: "linear-gradient(135deg, #134e4a 0%, #0d9488 50%, #5eead4 100%)",
    specialty: ["mobility", "core", "recovery"],
    isFeatured: true,
    authorMatchKeys: ["Mova Team", "Mova", "Mova Atletica", "mova"],
  },
  {
    slug: "matheus",
    name: "Matheus",
    tagline: "Endurance cycling & adventure",
    bio: "Long-distance cycling journeys with structured off-bike strength and mobility to keep you pedaling strong mile after mile.",
    heroImage: "linear-gradient(135deg, #1e293b 0%, #334155 45%, #64748b 100%)",
    specialty: ["cycling", "endurance", "adventure"],
    isFeatured: false,
    authorMatchKeys: ["Matheus", "matheus"],
  },
];

export function getCreatorBySlug(slug: string): Creator | undefined {
  return CREATORS.find((c) => c.slug === slug);
}

export function getFeaturedCreators(): Creator[] {
  return CREATORS.filter((c) => c.isFeatured);
}
