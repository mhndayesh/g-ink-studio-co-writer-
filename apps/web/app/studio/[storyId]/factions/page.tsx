"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Ta } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    title: "Factions",
    subtitle: "The houses, guilds, cults, and crews that shape your world.",
    name: "Name",
    description: "Description",
    visualSignature: "Visual signature",
    visualHint: "Colors, sigils, dress code.",
    addFaction: "Add faction",
    what: "factions",
    deleteConfirm: 'Delete faction "{name}"? This can\'t be undone.',
    deleteAria: "Delete faction",
    visual: "Visual",
  },
  ar: {
    title: "الفصائل",
    subtitle: "البيوت والنقابات والطوائف والجماعات التي تُشكّل عالمك.",
    name: "الاسم",
    description: "الوصف",
    visualSignature: "السمة البصرية",
    visualHint: "الألوان والشعارات وزيّهم.",
    addFaction: "إضافة فصيل",
    what: "الفصائل",
    deleteConfirm: "هل تريد حذف الفصيل «{name}»؟ لا يمكن التراجع عن ذلك.",
    deleteAria: "حذف الفصيل",
    visual: "بصريًا",
  },
} as const;

export default function FactionsPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data, isError, error, refetch } = useQuery({ queryKey: ["factions", storyId], queryFn: () => api.listFactions(storyId) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visual, setVisual] = useState("");

  const create = useMutation({
    mutationFn: () => api.createFaction(storyId, { name, description, visual_signature: visual }),
    onSuccess: () => { setName(""); setDescription(""); setVisual(""); qc.invalidateQueries({ queryKey: ["factions", storyId] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteFaction(storyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factions", storyId] }),
  });

  return (
    <div className="max-w-3xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-4">
        <FG label={c.name}><Inp value={name} onChange={e => setName(e.target.value)} /></FG>
        <FG label={c.description}><Ta value={description} onChange={e => setDescription(e.target.value)} /></FG>
        <FG label={c.visualSignature} hint={c.visualHint}><Inp value={visual} onChange={e => setVisual(e.target.value)} /></FG>
        <div className="flex justify-end"><Btn variant="primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}><Plus size={14}/> {c.addFaction}</Btn></div>
      </Card>
      {isError && <QueryError error={error} retry={refetch} what={c.what} />}
      <ul className="space-y-2">
        {(data || []).map((f: any) => (
          <li key={f.id}>
            <Card className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg">{f.name}</h3>
                <p className="text-sm text-ink-text2">{f.description}</p>
                {f.visual_signature && <p className="text-xs text-ink-text3 mt-1">{c.visual}: {f.visual_signature}</p>}
              </div>
              <button
                aria-label={c.deleteAria}
                onClick={() => { if (confirm(c.deleteConfirm.replace("{name}", f.name))) del.mutate(f.id); }}
                className="text-ink-text3 hover:text-ink-red"
              ><X size={16}/></button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
