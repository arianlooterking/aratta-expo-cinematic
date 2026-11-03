"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useState } from "react";
import { newId } from "@/lib/portal/store";
import type { Hall } from "@/lib/portal/types";
import { useExhibition } from "../ExhibitionProvider";
import { usePortal } from "../PortalProvider";
import { Button, Field, Input, Select, Sheet } from "../ui";

/** Create a hall, or change its size, grid and tracing image. */
export function HallSetupSheet({
  open,
  hall,
  onClose,
  onCreated,
}: {
  open: boolean;
  hall: Hall | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { lang } = usePortal();
  const fa = lang === "fa";
  return (
    <Sheet open={open} onClose={onClose} title={hall ? (fa ? "تنظیمات سالن" : "Hall settings") : fa ? "سالن جدید" : "New hall"} closeLabel={fa ? "بستن" : "Close"}>
      {open ? <HallForm key={hall?.id ?? "new"} hall={hall} onClose={onClose} onCreated={onCreated} /> : null}
    </Sheet>
  );
}

function HallForm({ hall, onClose, onCreated }: { hall: Hall | null; onClose: () => void; onCreated: (id: string) => void }) {
  const { lang, store, can, toast } = usePortal();
  const x = useExhibition();
  const fa = lang === "fa";
  const [width, setWidth] = useState(String(hall?.width_m ?? 60));
  const [depth, setDepth] = useState(String(hall?.depth_m ?? 36));
  const [file, setFile] = useState<File | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(Number(hall?.background_opacity ?? 0.35));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onPickFile(f: File | null) {
    setFile(f);
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const r = img.naturalHeight / img.naturalWidth;
      setRatio(r);
      const w = Number(width) || 60;
      setDepth(String(Math.round(w * r * 10) / 10));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!x.exhibition) return;
        const f = new FormData(e.currentTarget);
        const w = Number(width);
        const d = Number(depth);
        if (!(w > 0 && d > 0)) return;
        setBusy(true);
        const id = hall?.id ?? newId();
        let backgroundPath = hall?.background_path ?? null;
        if (file) {
          const safe = file.name.replace(/[^\w.-]+/g, "-").slice(-60);
          const upload = await store.uploadFile("hall-plans", `${x.exhibition.id}/${id}/${Date.now()}-${safe}`, file);
          if (!upload.ok) {
            toast(fa ? "بارگذاری تصویر انجام نشد" : "The image didn't upload", "error");
            setBusy(false);
            return;
          }
          backgroundPath = upload.path;
        }
        const fields = {
          name_fa: String(f.get("name_fa") ?? "").trim() || (fa ? "سالن" : "Hall"),
          name_en: String(f.get("name_en") ?? "").trim() || null,
          width_m: w,
          depth_m: d,
          grid_m: Number(f.get("grid_m") ?? 1),
          background_path: backgroundPath,
          background_opacity: opacity,
        };
        const res = hall
          ? await store.update("halls", hall.id, fields)
          : await store.insert("halls", { id, exhibition_id: x.exhibition.id, sort_order: x.halls.length, ...fields });
        setBusy(false);
        if (res.ok) {
          if (!hall) onCreated(id);
          onClose();
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "نام سالن" : "Hall name (Persian)"}>
          <Input name="name_fa" defaultValue={hall?.name_fa ?? ""} required dir="rtl" autoFocus />
        </Field>
        <Field label={fa ? "نام انگلیسی" : "Hall name (English)"}>
          <Input name="name_en" defaultValue={hall?.name_en ?? ""} dir="ltr" />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label={fa ? "طول (متر)" : "Width (m)"}>
          <Input
            type="number"
            min={4}
            step="0.5"
            value={width}
            dir="ltr"
            onChange={(e) => {
              setWidth(e.target.value);
              if (ratio && Number(e.target.value) > 0) setDepth(String(Math.round(Number(e.target.value) * ratio * 10) / 10));
            }}
          />
        </Field>
        <Field label={fa ? "عرض (متر)" : "Depth (m)"}>
          <Input type="number" min={4} step="0.5" value={depth} dir="ltr" onChange={(e) => setDepth(e.target.value)} />
        </Field>
        <Field label={fa ? "شبکه" : "Grid"}>
          <Select name="grid_m" defaultValue={String(hall?.grid_m ?? 1)}>
            <option value="0.5">0.5 m</option>
            <option value="1">1 m</option>
            <option value="2">2 m</option>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 rounded-2xl border border-dashed border-p-line-strong p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-p-sunken text-p-ink-2">
            <ImageUp className="size-5" />
          </span>
          <div className="min-w-0 text-sm">
            <p className="font-semibold">{fa ? "تصویر نقشه برای کشیدن روی آن" : "Plan image to trace over"}</p>
            <p className="text-[13px] text-p-ink-3">
              {fa
                ? "عکس یا اسکن نقشه سالن را بگذارید. زیر نقشه کم رنگ دیده می شود تا غرفه ها را دقیق رویش بکشید. نسبت طول و عرض از تصویر گرفته می شود."
                : "Add a photo or scan of the hall drawing. It shows faintly under the plan so you can draw booths right on top. The hall's proportions follow the image."}
            </p>
          </div>
        </div>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          className="text-sm file:me-3 file:rounded-lg file:border-0 file:bg-p-sunken file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        {file || hall?.background_path ? (
          <Field label={fa ? "میزان پررنگی" : "Opacity"}>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="accent-[var(--p-brand)]" />
          </Field>
        ) : null}
        {hall?.background_path && !file ? (
          <Button
            tone="ghost"
            size="sm"
            className="justify-self-start"
            onClick={async () => {
              await store.update("halls", hall.id, { background_path: null });
              onClose();
            }}
          >
            {fa ? "برداشتن تصویر" : "Remove image"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {hall && can.manage ? (
          confirmDelete ? (
            <Button
              tone="danger"
              icon={<Trash2 className="size-4" />}
              onClick={async () => {
                const res = await store.remove("halls", hall.id);
                if (res.ok) {
                  toast(fa ? "سالن حذف شد" : "Hall deleted");
                  onClose();
                }
              }}
            >
              {fa ? "مطمئنم، سالن و غرفه هایش حذف شود" : "Yes, delete the hall and its booths"}
            </Button>
          ) : (
            <Button tone="ghost" className="text-p-danger" icon={<Trash2 className="size-4" />} onClick={() => setConfirmDelete(true)}>
              {fa ? "حذف سالن" : "Delete hall"}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button tone="ghost" onClick={onClose}>
            {fa ? "انصراف" : "Cancel"}
          </Button>
          <Button tone="primary" type="submit" disabled={busy}>
            {hall ? (fa ? "ذخیره" : "Save") : fa ? "ساخت و شروع کشیدن" : "Create and start drawing"}
          </Button>
        </div>
      </div>
    </form>
  );
}
