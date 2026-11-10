"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Layers as LayersIcon, Link as LinkIcon } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useDebouncedSave } from "@/lib/debounce";
import { useI18n } from "@/lib/i18n";
import { LAYER_META, LAYER_TITLES, VOICE_SHIFTS, localizeFields, type LayerField } from "./layers";
import { AnalyzeWriting } from "./AnalyzeWriting";
import { Interview } from "./Interview";

const STATE_KINDS = ["temporary", "recurring", "arc"];
const REL_TYPES = ["ally", "enemy", "lover", "rival", "family", "mentor", "student", "colleague"];

const COPY = {
  en: {
    selectCharacter: "Select a character on the left to build their identity.",
    percentFilled: (n: string) => `${n}% filled`,
    additionalField: "additional saved field",
    measured: "Measured (from your prose)",
    samples: (n: string) => `Samples ${n}`,
    avgWords: (n: string) => `Avg ${n} words`,
    questionRate: (n: string) => `Questions ${n}%`,
    exclaimRate: (n: string) => `Exclaims ${n}%`,
    vocabVariety: (n: string) => `Vocab variety ${n}%`,
    noSamples: "No attributed dialogue samples yet — write some chapters, then rebuild.",
    voiceShifts: "How the voice shifts",
    relationships: "Relationships",
    relationshipsHint: "Who they are bonded to — feeds the Story Map and the AI's relationship context.",
    withWho: "With",
    pickCharacter: "— pick character —",
    typeLabel: "Type",
    description: "Description",
    descriptionPlaceholder: "estranged sister, owes him a debt…",
    add: "Add",
    noRelationships: "No relationships yet.",
    masks: "Relationship Masks",
    masksHint: "How this character's voice changes per audience — so they aren't one-dimensional.",
    audienceCast: "Audience (cast)",
    orUseLabel: "— or use a label —",
    audienceLabel: "Audience (label)",
    audiencePlaceholder: "police, a client…",
    speechStyle: "Speech style",
    speechPlaceholder: "guarded, terse, deflects…",
    noMasks: "No masks yet.",
    tells: "tells",
    currentState: "Current State",
    statesHint: "Temporary, scene-scoped conditions that color voice without rewriting the core.",
    stateLabel: "State",
    statePlaceholder: "injured, grieving…",
    detail: "Detail",
    kind: "Kind",
    set: "Set",
    noStates: "No active states.",
    unknownName: "?",
    relTypes: { ally: "ally", enemy: "enemy", lover: "lover", rival: "rival", family: "family", mentor: "mentor", student: "student", colleague: "colleague" } as Record<string, string>,
    stateKinds: { temporary: "temporary", recurring: "recurring", arc: "arc" } as Record<string, string>,
  },
  ar: {
    selectCharacter: "اختر شخصية من اليمين لبناء هويتها.",
    percentFilled: (n: string) => `${n}% مكتمل`,
    additionalField: "حقل إضافي محفوظ",
    measured: "القياسات (من نصّك)",
    samples: (n: string) => `العيّنات ${n}`,
    avgWords: (n: string) => `المتوسط ${n} كلمة`,
    questionRate: (n: string) => `الأسئلة ${n}%`,
    exclaimRate: (n: string) => `التعجّبات ${n}%`,
    vocabVariety: (n: string) => `تنوّع المفردات ${n}%`,
    noSamples: "لا توجد عيّنات حوار منسوبة بعد — اكتب بعض الفصول، ثم أعد البناء.",
    voiceShifts: "كيف يتغيّر الصوت",
    relationships: "العلاقات",
    relationshipsHint: "بمن ترتبط الشخصية — يغذّي خريطة القصة وسياق العلاقات لدى الذكاء الاصطناعي.",
    withWho: "مع",
    pickCharacter: "— اختر شخصية —",
    typeLabel: "النوع",
    description: "الوصف",
    descriptionPlaceholder: "أخت بعيدة، تدين له بمبلغ…",
    add: "إضافة",
    noRelationships: "لا توجد علاقات بعد.",
    masks: "أقنعة العلاقات",
    masksHint: "كيف يتغيّر صوت هذه الشخصية بحسب الجمهور — كي لا تكون أحادية البعد.",
    audienceCast: "الجمهور (من الطاقم)",
    orUseLabel: "— أو استخدم وسمًا —",
    audienceLabel: "الجمهور (وسم)",
    audiencePlaceholder: "الشرطة، أحد العملاء…",
    speechStyle: "أسلوب الكلام",
    speechPlaceholder: "متحفّظ، مقتضب، يتنصّل…",
    noMasks: "لا توجد أقنعة بعد.",
    tells: "الإشارات",
    currentState: "الحالة الراهنة",
    statesHint: "أحوال مؤقتة مرتبطة بالمشهد تُلوّن الصوت من دون إعادة كتابة الجوهر.",
    stateLabel: "الحالة",
    statePlaceholder: "مصاب، في حداد…",
    detail: "التفصيل",
    kind: "النوع",
    set: "تعيين",
    noStates: "لا توجد حالات نشطة.",
    unknownName: "؟",
    relTypes: {
      ally: "حليف",
      enemy: "عدو",
      lover: "حبيب",
      rival: "منافس",
      family: "أسرة",
      mentor: "معلّم",
      student: "تلميذ",
      colleague: "زميل",
    } as Record<string, string>,
    stateKinds: { temporary: "مؤقت", recurring: "متكرر", arc: "قوس" } as Record<string, string>,
  },
} as const;

// Read a possibly-list value back into the textarea/input string form.
function toInput(field: LayerField, v: any): string {
  if (field.kind === "list") return Array.isArray(v) ? v.join(", ") : (v || "");
  return v ?? "";
}
function fromInput(field: LayerField, s: string): any {
  if (field.kind === "list") return s.split(",").map(x => x.trim()).filter(Boolean);
  return s;
}

export function IdentityPanel({ storyId, characters, activeId }: { storyId: string; characters: any[]; activeId: string | null }) {
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: voiceProfiles } = useQuery({ queryKey: ["voice", storyId], queryFn: () => api.listVoiceProfiles(storyId) });
  const { data: identityData } = useQuery({
    queryKey: ["identity", storyId, activeId],
    queryFn: () => api.getIdentity(storyId, activeId!),
    enabled: !!activeId,
  });

  const activeVoice = useMemo(() => voiceProfiles?.find((p: any) => p.character_id === activeId) || null, [voiceProfiles, activeId]);
  const character = useMemo(() => characters.find(ch => ch.id === activeId) || null, [characters, activeId]);

  // Per-layer drafts (autosaved). Keyed by layer name. Re-sync from the server
  // whenever the identity row CHANGES (character switch OR a write like
  // analyze-approve / interview), detected via updated_at — not just on character
  // switch. Depending on character_id alone left approved traits saved-but-invisible
  // until you navigated away and back; depending on the whole object would clobber
  // your typing on every autosave refetch. updated_at changes only on a real write.
  const [draft, setDraft] = useState<Record<string, any>>({});
  const syncKey = `${identityData?.identity?.character_id || ""}:${identityData?.identity?.updated_at || ""}`;
  useEffect(() => {
    if (identityData?.identity) {
      setDraft({
        core: identityData.identity.core_personality || {},
        behavioral: identityData.identity.behavioral_patterns || {},
        voice: identityData.identity.voice_fingerprint || {},
      });
    }
  }, [syncKey]);  // eslint-disable-line react-hooks/exhaustive-deps

  const saveLayer = useMutation({
    mutationFn: ({ layer, payload }: { layer: string; payload: any }) => api.patchIdentityLayer(storyId, activeId!, layer, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["identity", storyId, activeId] }),
  });

  // Debounce-save each layer independently when its draft changes.
  useDebouncedSave(draft.core, 900, (v) => { if (activeId && v) saveLayer.mutate({ layer: "core", payload: v }); });
  useDebouncedSave(draft.behavioral, 900, (v) => { if (activeId && v) saveLayer.mutate({ layer: "behavioral", payload: v }); });
  useDebouncedSave(draft.voice, 900, (v) => { if (activeId && v) saveLayer.mutate({ layer: "voice", payload: v }); });

  if (!activeId) return <p className="text-ink-text2">{c.selectCharacter}</p>;
  if (!character) return null;

  const completeness = identityData?.identity?.completeness || {};

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Build methods */}
      <div className="grid gap-4 md:grid-cols-2">
        <AnalyzeWriting storyId={storyId} characterId={activeId} />
        <Interview storyId={storyId} characterId={activeId} />
      </div>

      {/* Layers 1-3 */}
      {(["core", "behavioral", "voice"] as const).map(layer => (
        <Card key={layer}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg flex items-center gap-2"><LayersIcon size={16}/> {LAYER_TITLES[locale][layer] ?? LAYER_META[layer].title}</h3>
            <Tag color={(completeness[layer] || 0) >= 60 ? "green" : "muted"}>{c.percentFilled(formatNumber(completeness[layer] || 0))}</Tag>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {localizeFields(LAYER_META[layer].fields, locale).map(f => {
              const val = toInput(f, draft[layer]?.[f.key]);
              const set = (s: string) => setDraft(d => ({ ...d, [layer]: { ...d[layer], [f.key]: fromInput(f, s) } }));
              return (
                <FG key={f.key} label={f.label} hint={f.hint}>
                  {f.kind === "area"
                    ? <Ta rows={2} value={val} onChange={e => set(e.target.value)} />
                    : <Inp value={val} onChange={e => set(e.target.value)} />}
                </FG>
              );
            })}
            {/* Safety net: render any stored key the field set doesn't know about
                (e.g. legacy data or a future question) so it's never invisible. */}
            {Object.entries(draft[layer] || {})
              .filter(([k, v]) =>
                k !== "shifts" &&
                !LAYER_META[layer].fields.some(f => f.key === k) &&
                v != null && v !== "")
              .map(([k, v]) => {
                const display = Array.isArray(v) ? v.join(", ") : String(v);
                const set = (s: string) => setDraft(d => ({ ...d, [layer]: { ...d[layer], [k]: s } }));
                return (
                  <FG key={k} label={k.replace(/_/g, " ")} hint={c.additionalField}>
                    <Ta rows={2} value={display} onChange={e => set(e.target.value)} />
                  </FG>
                );
              })}
          </div>

          {/* Voice fingerprint: deterministic stats + how-voice-shifts */}
          {layer === "voice" && (
            <>
              <div className="mt-4 pt-3 border-t border-ink-border">
                <p className="label mb-2">{c.measured}</p>
                {activeVoice && activeVoice.sample_count > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <Tag color="gold">{c.samples(formatNumber(activeVoice.sample_count))}</Tag>
                    <Tag color="muted">{c.avgWords(formatNumber(activeVoice.avg_sentence_words))}</Tag>
                    <Tag color="muted">{c.questionRate(formatNumber(Math.round(activeVoice.question_rate * 100)))}</Tag>
                    <Tag color="muted">{c.exclaimRate(formatNumber(Math.round(activeVoice.exclamation_rate * 100)))}</Tag>
                    <Tag color="muted">{c.vocabVariety(formatNumber(Math.round(activeVoice.vocabulary_variety * 100)))}</Tag>
                    {(activeVoice.repeated_phrases || []).map((p: string) => <Tag key={p} color="rose">{p}</Tag>)}
                  </div>
                ) : <p className="text-sm text-ink-text3">{c.noSamples}</p>}
              </div>
              <div className="mt-4 pt-3 border-t border-ink-border">
                <p className="label mb-2">{c.voiceShifts}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {localizeFields(VOICE_SHIFTS, locale).map(f => {
                    const shifts = draft.voice?.shifts || {};
                    const set = (s: string) => setDraft(d => ({ ...d, voice: { ...d.voice, shifts: { ...(d.voice?.shifts || {}), [f.key]: s } } }));
                    return <FG key={f.key} label={f.label}><Ta rows={2} value={shifts[f.key] || ""} onChange={e => set(e.target.value)} /></FG>;
                  })}
                </div>
              </div>
            </>
          )}
        </Card>
      ))}

      <RelationshipsCard storyId={storyId} characterId={activeId} characters={characters} />
      <MasksCard storyId={storyId} characterId={activeId} characters={characters} />
      <StatesCard storyId={storyId} characterId={activeId} />
    </div>
  );
}

function RelationshipsCard({ storyId, characterId, characters }: { storyId: string; characterId: string; characters: any[] }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  // The actual bonds (ally/enemy/lover…) that feed the Story Map — distinct from
  // Relationship Masks (which capture HOW this character speaks to an audience).
  const { data: rels } = useQuery({
    queryKey: ["relationships", storyId, characterId],
    queryFn: () => api.listRelationships(storyId, characterId),
  });
  const [target, setTarget] = useState("");
  const [type, setType] = useState(REL_TYPES[0]);
  const [desc, setDesc] = useState("");
  const inv = () => qc.invalidateQueries({ queryKey: ["relationships", storyId, characterId] });
  const add = useMutation({
    mutationFn: () => api.addRelationship(storyId, characterId, { target_id: target, type, description: desc }),
    onSuccess: () => { setTarget(""); setDesc(""); inv(); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.deleteRelationship(storyId, id), onSuccess: inv });

  return (
    <Card>
      <h3 className="font-display text-lg mb-1 flex items-center gap-2"><LinkIcon size={16}/> {c.relationships}</h3>
      <p className="text-sm text-ink-text3 mb-3">{c.relationshipsHint}</p>
      <div className="grid gap-2 md:grid-cols-[1fr_160px_2fr_auto] items-end mb-3">
        <FG label={c.withWho}>
          <Sel value={target} onChange={e => setTarget(e.target.value)}>
            <option value="">{c.pickCharacter}</option>
            {characters.filter(ch => ch.id !== characterId).map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </Sel>
        </FG>
        <FG label={c.typeLabel}><Sel value={type} onChange={e => setType(e.target.value)}>{REL_TYPES.map(t => <option key={t} value={t}>{c.relTypes[t] ?? t}</option>)}</Sel></FG>
        <FG label={c.description}><Inp value={desc} onChange={e => setDesc(e.target.value)} placeholder={c.descriptionPlaceholder} /></FG>
        <Btn variant="primary" className="mb-3" disabled={!target} onClick={() => add.mutate()}><Plus size={14}/> {c.add}</Btn>
      </div>
      <ul className="space-y-1">
        {(rels || []).map((r: any) => {
          const t = characters.find(ch => ch.id === r.target_id);
          return (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
              <span><strong>{t?.name || c.unknownName}</strong> <Tag color="gold">{c.relTypes[r.type] ?? r.type}</Tag>{r.description && <span className="text-ink-text2 ms-1">{r.description}</span>}</span>
              <button onClick={() => del.mutate(r.id)} className="text-ink-text3 hover:text-ink-red"><X size={14}/></button>
            </li>
          );
        })}
        {(!rels || rels.length === 0) && <li className="text-sm text-ink-text3">{c.noRelationships}</li>}
      </ul>
    </Card>
  );
}

function MasksCard({ storyId, characterId, characters }: { storyId: string; characterId: string; characters: any[] }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: masks } = useQuery({ queryKey: ["masks", storyId, characterId], queryFn: () => api.listMasks(storyId, characterId) });
  const [audience, setAudience] = useState("");
  const [label, setLabel] = useState("");
  const [style, setStyle] = useState("");
  const inv = () => qc.invalidateQueries({ queryKey: ["masks", storyId, characterId] });
  const add = useMutation({
    mutationFn: () => api.addMask(storyId, characterId, { audience_character_id: audience || null, audience_label: label, speech_style: style }),
    onSuccess: () => { setAudience(""); setLabel(""); setStyle(""); inv(); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.deleteMask(storyId, id), onSuccess: inv });

  return (
    <Card>
      <h3 className="font-display text-lg mb-1">{c.masks}</h3>
      <p className="text-sm text-ink-text3 mb-3">{c.masksHint}</p>
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_2fr_auto] items-end mb-3">
        <FG label={c.audienceCast}>
          <Sel value={audience} onChange={e => setAudience(e.target.value)}>
            <option value="">{c.orUseLabel}</option>
            {characters.filter(ch => ch.id !== characterId).map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
          </Sel>
        </FG>
        <FG label={c.audienceLabel}><Inp value={label} onChange={e => setLabel(e.target.value)} placeholder={c.audiencePlaceholder} /></FG>
        <FG label={c.speechStyle}><Inp value={style} onChange={e => setStyle(e.target.value)} placeholder={c.speechPlaceholder} /></FG>
        <Btn variant="primary" className="mb-3" disabled={!style || (!audience && !label)} onClick={() => add.mutate()}><Plus size={14}/> {c.add}</Btn>
      </div>
      <ul className="space-y-1">
        {(masks || []).map((m: any) => {
          const aud = m.audience_character_id ? characters.find(ch => ch.id === m.audience_character_id)?.name : m.audience_label;
          return (
            <li key={m.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
              <span><span className="rtl-flip inline-block">→</span> <strong>{aud || c.unknownName}</strong>: {m.speech_style}{m.tells && <span className="text-ink-text2"> — {c.tells}: {m.tells}</span>}</span>
              <button onClick={() => del.mutate(m.id)} className="text-ink-text3 hover:text-ink-red"><X size={14}/></button>
            </li>
          );
        })}
        {(!masks || masks.length === 0) && <li className="text-sm text-ink-text3">{c.noMasks}</li>}
      </ul>
    </Card>
  );
}

function StatesCard({ storyId, characterId }: { storyId: string; characterId: string }) {
  const qc = useQueryClient();
  const { locale } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const { data: states } = useQuery({ queryKey: ["states", storyId, characterId], queryFn: () => api.listStates(storyId, characterId) });
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState("temporary");
  const inv = () => qc.invalidateQueries({ queryKey: ["states", storyId, characterId] });
  const add = useMutation({
    mutationFn: () => api.setState(storyId, characterId, { label, detail, kind }),
    onSuccess: () => { setLabel(""); setDetail(""); inv(); },
  });
  const clear = useMutation({ mutationFn: (id: string) => api.clearState(storyId, id), onSuccess: inv });

  return (
    <Card>
      <h3 className="font-display text-lg mb-1">{c.currentState}</h3>
      <p className="text-sm text-ink-text3 mb-3">{c.statesHint}</p>
      <div className="grid gap-2 md:grid-cols-[1fr_2fr_1fr_auto] items-end mb-3">
        <FG label={c.stateLabel}><Inp value={label} onChange={e => setLabel(e.target.value)} placeholder={c.statePlaceholder} /></FG>
        <FG label={c.detail}><Inp value={detail} onChange={e => setDetail(e.target.value)} /></FG>
        <FG label={c.kind}><Sel value={kind} onChange={e => setKind(e.target.value)}>{STATE_KINDS.map(k => <option key={k} value={k}>{c.stateKinds[k] ?? k}</option>)}</Sel></FG>
        <Btn variant="primary" className="mb-3" disabled={!label} onClick={() => add.mutate()}><Plus size={14}/> {c.set}</Btn>
      </div>
      <ul className="space-y-1">
        {(states || []).map((s: any) => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded hover:bg-ink-surface2">
            <span className={s.active ? "" : "opacity-50 line-through"}>
              <Tag color={s.kind === "arc" ? "gold" : s.kind === "recurring" ? "rose" : "muted"}>{c.stateKinds[s.kind] ?? s.kind}</Tag> <strong>{s.label}</strong>{s.detail && <span className="text-ink-text2"> — {s.detail}</span>}
            </span>
            {s.active && <button onClick={() => clear.mutate(s.id)} className="text-ink-text3 hover:text-ink-red"><X size={14}/></button>}
          </li>
        ))}
        {(!states || states.length === 0) && <li className="text-sm text-ink-text3">{c.noStates}</li>}
      </ul>
    </Card>
  );
}
