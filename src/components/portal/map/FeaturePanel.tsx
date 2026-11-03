"use client";

import { Trash2, X } from "lucide-react";
import { featureLabel } from "@/lib/portal/i18n";
import type { FeatureKind, HallFeature, Patch } from "@/lib/portal/types";
import { usePortal } from "../PortalProvider";
import { Button, Field, IconButton, Input, Select } from "../ui";

const KINDS: FeatureKind[] = ["aisle", "column", "wall", "entrance", "door", "loading", "zone", "stage", "service", "utility", "label"];

export function FeaturePanel({
  feature,
  onClose,
  onUpdate,
  onDelete,
}: {
  feature: HallFeature;
  onClose: () => void;
  onUpdate: (patch: Patch<"hall_features">) => void;
  onDelete: () => void;
}) {
  const { lang, can } = usePortal();
  const fa = lang === "fa";
  const num = (field: "width" | "depth" | "x" | "y") => (e: React.FocusEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= 0 && v !== feature[field]) onUpdate({ [field]: v });
  };
  return (
    <div className="flex h-full min-h-0 flex-col" key={feature.id + feature.updated_at}>
      <div className="flex items-center gap-3 border-b border-p-line px-4 py-4">
        <h2 className="flex-1 text-lg font-bold">{featureLabel[feature.kind][lang]}</h2>
        <IconButton label={fa ? "بستن" : "Close"} size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="thin-scroll grid min-h-0 flex-1 content-start gap-4 overflow-y-auto p-4">
        <Field label={fa ? "نوع" : "Type"}>
          <Select value={feature.kind} disabled={!can.edit} onChange={(e) => onUpdate({ kind: e.target.value as FeatureKind })}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {featureLabel[k][lang]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={fa ? "برچسب فارسی" : "Label (Persian)"}>
          <Input
            defaultValue={feature.label_fa ?? ""}
            dir="rtl"
            disabled={!can.edit}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== feature.label_fa) onUpdate({ label_fa: v });
            }}
          />
        </Field>
        <Field label={fa ? "برچسب انگلیسی" : "Label (English)"}>
          <Input
            defaultValue={feature.label_en ?? ""}
            dir="ltr"
            disabled={!can.edit}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== feature.label_en) onUpdate({ label_en: v });
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={fa ? "عرض (متر)" : "Width (m)"}>
            <Input type="number" step="0.1" min="0.1" defaultValue={feature.width} dir="ltr" disabled={!can.edit} onBlur={num("width")} />
          </Field>
          <Field label={fa ? "عمق (متر)" : "Depth (m)"}>
            <Input type="number" step="0.1" min="0.1" defaultValue={feature.depth} dir="ltr" disabled={!can.edit} onBlur={num("depth")} />
          </Field>
        </div>
        {can.edit ? (
          <Button tone="danger" className="justify-self-start" icon={<Trash2 className="size-4" />} onClick={onDelete}>
            {fa ? "حذف" : "Delete"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
