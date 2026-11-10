"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Check } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const SAVE_AS = ["temporary", "recurring", "permanent", "not_saved"];

const COPY = {
  en: {
    heading: "What changed this scene?",
    intro: "Paste a just-written scene; choose what becomes canon so one-offs don't pollute the profile.",
    placeholder: "Paste the approved scene…",
    reading: "Reading…",
    findUpdates: "Find updates",
    suggested: "Suggested updates",
    saving: "Saving…",
    applySelected: "Apply selected",
    saveAs: {
      temporary: "temporary",
      recurring: "recurring",
      permanent: "permanent",
      not_saved: "not saved",
    },
  },
  ar: {
    heading: "ما الذي تغيّر في هذا المشهد؟",
    intro: "ألصق مشهدًا كُتب للتوّ؛ واختر ما يصبح قانونًا ثابتًا كي لا تُلوّث اللحظات العابرة ملفّ الشخصية.",
    placeholder: "ألصق المشهد المعتمد…",
    reading: "جارٍ القراءة…",
    findUpdates: "ابحث عن التحديثات",
    suggested: "تحديثات مقترحة",
    saving: "جارٍ الحفظ…",
    applySelected: "تطبيق المحدد",
    saveAs: {
      temporary: "مؤقت",
      recurring: "متكرر",
      permanent: "دائم",
      not_saved: "دون حفظ",
    },
  },
} as const;

// Post-scene evolve — after a scene is written, surface what it reveals/changes
// about the cast and let the author choose how each becomes canon. The four
// save-as classes are what prevent one-off moments from polluting the profile.
export function EvolvePanel({ storyId }: { storyId: string }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});

  const scan = useMutation({
    mutationKey: ["llm", "voice.evolve"],
    mutationFn: () => api.evolveSuggestions(storyId, text),
    onSuccess: (r) => {
      setSuggestions(r.suggestions || []);
      // Default each choice to the model's suggestion.
      const def: Record<number, string> = {};
      (r.suggestions || []).forEach((s: any, i: number) => { def[i] = s.suggested_save_as || "temporary"; });
      setChoices(def);
    },
  });

  const apply = useMutation({
    mutationFn: () => {
      const decisions = suggestions.map((s, i) => ({
        type: s.type, character_id: s.character_id, summary: s.summary, save_as: choices[i] || "not_saved",
      })).filter(d => d.save_as !== "not_saved" && d.character_id);
      return api.applyEvolution(storyId, decisions);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["identity", storyId] });
      setSuggestions([]); setText("");
    },
  });

  return (
    <div className="max-w-3xl space-y-4">
      <Card>
        <h3 className="font-display text-lg mb-1 flex items-center gap-2"><Sparkles size={16}/> {c.heading}</h3>
        <p className="text-sm text-ink-text3 mb-3">{c.intro}</p>
        <Ta rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={c.placeholder} />
        <Btn variant="primary" className="mt-3" disabled={!text.trim() || scan.isPending} onClick={() => scan.mutate()}>
          <Sparkles size={14}/> {scan.isPending ? c.reading : c.findUpdates}
        </Btn>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <h3 className="font-display text-lg mb-3">{c.suggested}</h3>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="p-2 rounded border border-ink-border text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Tag color="muted">{s.type}</Tag>
                  {s.character && <Tag color="gold">{s.character}</Tag>}
                </div>
                <p>{s.summary}</p>
                {s.excerpt && <p className="text-xs text-ink-text3 italic mt-1">“{s.excerpt}”</p>}
                <div className="mt-2 w-48">
                  <Sel value={choices[i] || "not_saved"} onChange={e => setChoices(ch => ({ ...ch, [i]: e.target.value }))}>
                    {SAVE_AS.map(o => <option key={o} value={o}>{c.saveAs[o as keyof typeof c.saveAs] ?? o.replace(/_/g, " ")}</option>)}
                  </Sel>
                </div>
              </div>
            ))}
          </div>
          <Btn variant="primary" className="mt-3" disabled={apply.isPending} onClick={() => apply.mutate()}>
            <Check size={14}/> {apply.isPending ? c.saving : c.applySelected}
          </Btn>
        </Card>
      )}
    </div>
  );
}
