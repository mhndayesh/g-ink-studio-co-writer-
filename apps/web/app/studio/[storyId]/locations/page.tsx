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
    title: "Locations",
    subtitle: "Places that anchor your scenes.",
    name: "Name",
    description: "Description",
    addLocation: "Add location",
    what: "locations",
    deleteConfirm: 'Delete location "{name}"? This can\'t be undone.',
    deleteAria: "Delete location",
  },
  ar: {
    title: "الأماكن",
    subtitle: "الأماكن التي ترتكز عليها مشاهدك.",
    name: "الاسم",
    description: "الوصف",
    addLocation: "إضافة مكان",
    what: "الأماكن",
    deleteConfirm: "هل تريد حذف المكان «{name}»؟ لا يمكن التراجع عن ذلك.",
    deleteAria: "حذف المكان",
  },
} as const;

export default function LocationsPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data, isError, error, refetch } = useQuery({ queryKey: ["locations", storyId], queryFn: () => api.listLocations(storyId) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => api.createLocation(storyId, { name, description }),
    onSuccess: () => { setName(""); setDescription(""); qc.invalidateQueries({ queryKey: ["locations", storyId] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteLocation(storyId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations", storyId] }),
  });

  return (
    <div className="max-w-3xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-4">
        <FG label={c.name}><Inp value={name} onChange={e => setName(e.target.value)} /></FG>
        <FG label={c.description}><Ta value={description} onChange={e => setDescription(e.target.value)} /></FG>
        <div className="flex justify-end"><Btn variant="primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}><Plus size={14}/> {c.addLocation}</Btn></div>
      </Card>
      {isError && <QueryError error={error} retry={refetch} what={c.what} />}
      <ul className="space-y-2">
        {(data || []).map((l: any) => (
          <li key={l.id}>
            <Card className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg">{l.name}</h3>
                <p className="text-sm text-ink-text2">{l.description}</p>
              </div>
              <button
                aria-label={c.deleteAria}
                onClick={() => { if (confirm(c.deleteConfirm.replace("{name}", l.name))) del.mutate(l.id); }}
                className="text-ink-text3 hover:text-ink-red"
              ><X size={16}/></button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
