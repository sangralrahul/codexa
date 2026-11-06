import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NotesList } from "./src/screens/NotesList";
import { NoteEditor } from "./src/screens/NoteEditor";
import { newNote, sampleNotes, type Note } from "./src/notes";
import { useStoredState } from "./src/useStoredState";

/** Two screens, list and editor, switched with state. Notes persist with AsyncStorage. */
export default function App() {
  const [notes, setNotes] = useStoredState<Note[]>("notes-v1", sampleNotes);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = openId ? notes.find((n) => n.id === openId) : undefined;

  const create = () => {
    const n = newNote();
    setNotes((list) => [n, ...list]);
    setOpenId(n.id);
  };
  const update = (id: string, patch: Partial<Note>) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  const remove = (id: string) => {
    setNotes((list) => list.filter((n) => n.id !== id));
    setOpenId(null);
  };
  const back = () => {
    // Drop a note that was opened but never written in.
    if (open && !open.title.trim() && !open.body.trim()) setNotes((list) => list.filter((n) => n.id !== open.id));
    setOpenId(null);
  };

  return (
    <SafeAreaProvider>
      {open ? <NoteEditor note={open} onChange={(p) => update(open.id, p)} onBack={back} onDelete={() => remove(open.id)} /> : <NotesList notes={notes} onOpen={setOpenId} onCreate={create} />}
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
