"use client";
import { useState, type CSSProperties } from "react";
import { useMutation } from "@tanstack/react-query";
import { Users, GitCompare } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Ta } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const COPY = {
  en: {
    heading: "Pick 2+ characters",
    situation: "Situation",
    situationHint: "e.g. A stranger enters carrying a blood-covered bag. What does each say or do?",
    comparing: "Comparing…",
    compare: "Compare voices",
    unknownCharacter: "?",
  },
  ar: {
    heading: "اختر شخصيتين أو أكثر",
    situation: "الموقف",
    situationHint: "مثال: يدخل غريب حاملًا حقيبة ملطّخة بالدم. ماذا يقول كلٌّ منهم أو يفعل؟",
    comparing: "جارٍ المقارنة…",
    compare: "قارن الأصوات",
    unknownCharacter: "؟",
  },
} as const;

// Voice comparison — same situation, side-by-side responses. Reveals whether the
// characters genuinely feel distinct or whether the profiles still produce generic
// dialogue.
export function ComparePanel({ storyId, characters }: { storyId: string; characters: any[] }) {
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const [picked, setPicked] = useState<string[]>([]);
  const [situation, setSituation] = useState("");
  const [entries, setEntries] = useState<any[]>([]);

  const compare = useMutation({
    mutationKey: ["llm", "voice.compare"],
    mutationFn: () => api.compareVoices(storyId, picked, situation),
    onSuccess: (r) => setEntries(r.entries || []),
  });

  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <div className="max-w-5xl space-y-4">
      <Card>
        <h3 className="font-display text-lg mb-3 flex items-center gap-2"><Users size={16}/> {c.heading}</h3>
        <div className="flex flex-wrap gap-2">
          {characters.map(ch => (
            <button key={ch.id} onClick={() => toggle(ch.id)} className={`px-3 py-1.5 rounded text-sm border ${picked.includes(ch.id) ? "border-ink-gold/40 bg-ink-gold/10 text-ink-goldLight" : "border-ink-border text-ink-text2 hover:text-ink-text"}`}>
              {ch.name}
            </button>
          ))}
        </div>
        <FG label={c.situation} hint={c.situationHint}>
          <Ta rows={3} value={situation} onChange={e => setSituation(e.target.value)} />
        </FG>
        <Btn variant="primary" disabled={picked.length < 2 || !situation.trim() || compare.isPending} onClick={() => compare.mutate()}>
          <GitCompare size={14}/> {compare.isPending ? c.comparing : c.compare}
        </Btn>
      </Card>

      {entries.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:[grid-template-columns:var(--cmp-cols)]" style={{ "--cmp-cols": `repeat(${Math.min(entries.length, 3)}, minmax(0, 1fr))` } as CSSProperties}>
          {entries.map((e, i) => (
            <Card key={i}>
              <h4 className="font-display mb-2">{e.character || characters.find(ch => ch.id === e.character_id)?.name || c.unknownCharacter}</h4>
              <p className="text-sm whitespace-pre-wrap text-ink-text2">{e.response}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
