/** The shape of src/site.ts: every word, colour and section of this site lives there. */
import type { IconName } from "../../shared/Icon";

export type Link = { label: string; href: string };

export type Visual =
  | { type: "tiles"; tones: string[]; caption?: string }
  | { type: "mock"; title: string; rows: { label: string; value: string; tone?: string }[]; footer?: string }
  | { type: "card"; tone: string; title: string; lines: string[] }
  | { type: "none" };

export type Section =
  | { kind: "hero"; variant: "split" | "center" | "editorial"; eyebrow?: string; title: string; text: string; primary: Link; secondary?: Link; visual: Visual; note?: string }
  | { kind: "features"; id?: string; eyebrow?: string; title: string; text?: string; columns?: 2 | 3 | 4; items: { title: string; text: string; icon: IconName }[] }
  | { kind: "split"; id?: string; eyebrow?: string; title: string; text: string; bullets: string[]; visual: Visual; reverse?: boolean }
  | { kind: "menu"; id?: string; eyebrow?: string; title: string; text?: string; groups: { name: string; items: { name: string; text?: string; price: string }[] }[] }
  | { kind: "pricing"; id?: string; eyebrow?: string; title: string; text?: string; plans: { name: string; price: string; period?: string; text: string; features: string[]; featured?: boolean; cta: Link }[] }
  | { kind: "gallery"; id?: string; eyebrow?: string; title: string; text?: string; items: { title: string; caption?: string; tone: string }[] }
  | { kind: "projects"; id?: string; eyebrow?: string; title: string; items: { title: string; tag: string; year: string; tone: string }[] }
  | { kind: "quotes"; id?: string; eyebrow?: string; title: string; items: { quote: string; name: string; role: string }[] }
  | { kind: "stats"; id?: string; items: { value: string; label: string }[] }
  | { kind: "steps"; id?: string; eyebrow?: string; title: string; items: { title: string; text: string }[] }
  | { kind: "team"; id?: string; eyebrow?: string; title: string; items: { name: string; role: string; tone: string }[] }
  | { kind: "timeline"; id?: string; eyebrow?: string; title: string; items: { period: string; title: string; text: string }[] }
  | { kind: "faq"; id?: string; eyebrow?: string; title: string; items: { q: string; a: string }[] }
  | { kind: "products"; id?: string; eyebrow?: string; title: string; text?: string; currency: string; items: { name: string; price: number; category: string; tone: string; text: string; badge?: string }[] }
  | { kind: "hours"; id?: string; eyebrow?: string; title: string; text?: string; rows: { day: string; time: string }[]; address: string; phone?: string; email?: string }
  | { kind: "cta"; id?: string; title: string; text: string; primary: Link; secondary?: Link }
  | { kind: "contact"; id?: string; eyebrow?: string; title: string; text: string; fields: ("name" | "email" | "phone" | "date" | "guests" | "company" | "message")[]; button: string };

export type Site = {
  brand: string;
  nav: Link[];
  navCta?: Link;
  sections: Section[];
  footer: { text: string; columns?: { title: string; links: string[] }[]; legal: string };
};
