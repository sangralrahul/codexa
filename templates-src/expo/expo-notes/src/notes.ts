/** Notes data and helpers. Notes are saved on the device with AsyncStorage (see App.tsx). */
export type Note = { id: string; title: string; body: string; pinned: boolean; updatedAt: number };

export function newNote(): Note {
  return { id: `n${Date.now()}`, title: "", body: "", pinned: false, updatedAt: Date.now() };
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
}

export function noteTitle(n: Note): string {
  return n.title.trim() || n.body.trim().split("\n")[0] || "Untitled";
}

export function formatWhen(ts: number, now = Date.now()): string {
  const d = new Date(ts);
  const sameDay = new Date(now).toDateString() === d.toDateString();
  if (sameDay) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const days = Math.floor((now - ts) / 86_400_000);
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function sampleNotes(): Note[] {
  const now = Date.now();
  const h = 3_600_000;
  return [
    { id: "n1", title: "Weekend market list", body: "Sourdough\nTomatoes (the striped ones)\nGoat cheese\nFlowers for the table", pinned: true, updatedAt: now - 2 * h },
    { id: "n2", title: "Book club: next picks", body: "Tomorrow, and Tomorrow, and Tomorrow — vote by Friday.\nAlso suggested: Piranesi, The Overstory.", pinned: false, updatedAt: now - 26 * h },
    { id: "n3", title: "Trip to Lisbon", body: "Tram 28 early, before the queues. Pastéis in Belém. Sunset at Miradouro da Senhora do Monte.", pinned: false, updatedAt: now - 3 * 24 * h },
    { id: "n4", title: "Ideas for the garden", body: "Move the rosemary to the sunny corner. Try a raised bed for herbs.", pinned: false, updatedAt: now - 9 * 24 * h },
  ];
}
