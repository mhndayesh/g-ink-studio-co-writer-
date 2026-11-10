"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import * as api from "@/lib/api";
import { Btn, Card, FG, Inp, PageHdr, QueryError, Sel, Ta, Tag } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";

const STATUSES = ["open", "paid_off", "abandoned"];

const COPY = {
  en: {
    title: "Plot Threads",
    subtitle: "Subplots and arcs you want to track end-to-end.",
    name: "Name",
    status: "Status",
    description: "Description",
    addThread: "Add thread",
    what: "plot threads",
    statuses: { open: "open", paid_off: "paid off", abandoned: "abandoned" },
    weave: "Subplot Weave",
    threadColumn: "Thread",
    dormant: "Dormant",
    chapterShort: "Ch",
    sceneLabel: "Scene {n}",
    cellStatus: { touch: "touch", setup: "setup", turn: "turn", payoff: "payoff" },
    deleteAria: "Delete plot thread",
  },
  ar: {
    title: "خيوط الحبكة",
    subtitle: "الحبكات الفرعية والأقواس التي تريد تتبّعها من البداية إلى النهاية.",
    name: "الاسم",
    status: "الحالة",
    description: "الوصف",
    addThread: "إضافة خيط",
    what: "خيوط الحبكة",
    statuses: { open: "مفتوح", paid_off: "مُغلَق", abandoned: "متروك" },
    weave: "نسيج الحبكات الفرعية",
    threadColumn: "الخيط",
    dormant: "خامل",
    chapterShort: "ف",
    sceneLabel: "مشهد {n}",
    cellStatus: { touch: "ظهور", setup: "تأسيس", turn: "تحوّل", payoff: "حصاد" },
    deleteAria: "حذف خيط الحبكة",
  },
} as const;

export default function ThreadsPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const qc = useQueryClient();
  const { locale, formatNumber } = useI18n();
  const c = locale === "ar" ? COPY.ar : COPY.en;
  const statusLabel = (status?: string) =>
    status ? (c.statuses as Record<string, string>)[status] ?? status.replace("_", " ") : "";
  const cellStatusLabel = (status?: string) =>
    status ? (c.cellStatus as Record<string, string>)[status] ?? status : "";
  const { data, isError, error, refetch } = useQuery({ queryKey: ["threads", storyId], queryFn: () => api.listThreads(storyId) });
  const { data: weave } = useQuery({ queryKey: ["weave", storyId], queryFn: () => api.listWeave(storyId) });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");

  const create = useMutation({
    mutationFn: () => api.createThread(storyId, { name, description, status, chapter_ids: [] }),
    onSuccess: () => {
      setName("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["threads", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.deleteThread(storyId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads", storyId] });
      qc.invalidateQueries({ queryKey: ["weave", storyId] });
    },
  });

  return (
    <div className="max-w-6xl">
      <PageHdr title={c.title} subtitle={c.subtitle} />
      <Card className="mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <FG label={c.name}><Inp value={name} onChange={e => setName(e.target.value)} /></FG>
          <FG label={c.status}>
            <Sel value={status} onChange={e => setStatus(e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</Sel>
          </FG>
        </div>
        <FG label={c.description}><Ta value={description} onChange={e => setDescription(e.target.value)} /></FG>
        <div className="flex justify-end"><Btn variant="primary" disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}><Plus size={14}/> {c.addThread}</Btn></div>
      </Card>
      {(weave?.threads || []).length > 0 && (
        <Card className="mb-4 overflow-x-auto">
          <h3 className="font-display text-lg mb-3">{c.weave}</h3>
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-start text-ink-text3">
                <th className="py-2 pe-3 font-normal">{c.threadColumn}</th>
                {(weave?.scenes || []).map((s: any) => (
                  <th key={s.id} className="py-2 px-2 font-normal align-bottom">
                    <span className="block text-[10px] uppercase">{c.chapterShort}{s.chapter_number == null ? "?" : formatNumber(s.chapter_number)}</span>
                    <span className="line-clamp-2">{s.title || s.beat || c.sceneLabel.replace("{n}", formatNumber(s.ordinal || 0))}</span>
                  </th>
                ))}
                <th className="py-2 ps-3 font-normal">{c.dormant}</th>
              </tr>
            </thead>
            <tbody>
              {(weave?.threads || []).map((thread: any) => {
                const byScene = Object.fromEntries((thread.cells || []).map((cell: any) => [cell.scene_id, cell]));
                return (
                  <tr key={thread.thread_id} className="border-t border-ink-border">
                    <td className="py-2 pe-3">
                      <div className="flex items-center gap-2">
                        <strong>{thread.name}</strong>
                        <Tag color={thread.status === "paid_off" ? "green" : thread.status === "abandoned" ? "muted" : "gold"}>{statusLabel(thread.status)}</Tag>
                      </div>
                    </td>
                    {(weave?.scenes || []).map((s: any) => {
                      const cell = byScene[s.id];
                      return (
                        <td key={s.id} className="py-2 px-2 text-center">
                          {cell ? <span className="inline-block h-3 w-3 rounded-full bg-ink-gold" title={cell.evidence || cellStatusLabel(cell.status)} /> : <span className="text-ink-text3">·</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 ps-3 text-ink-text2">{thread.dormant_after ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      {isError && <QueryError error={error} retry={refetch} what={c.what} />}
      <ul className="space-y-2">
        {(data || []).map((thread: any) => (
          <li key={thread.id}>
            <Card className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1"><h3 className="font-display text-lg">{thread.name}</h3><Tag color={thread.status === "paid_off" ? "green" : thread.status === "abandoned" ? "muted" : "gold"}>{statusLabel(thread.status)}</Tag></div>
                <p className="text-sm text-ink-text2">{thread.description}</p>
              </div>
              <button aria-label={c.deleteAria} onClick={() => del.mutate(thread.id)} className="text-ink-text3 hover:text-ink-red"><X size={16}/></button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
