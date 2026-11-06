"use client";

import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { isImage, type ChatAttachment } from "@/lib/portal/chat";
import { num } from "@/lib/portal/format";
import { usePortal } from "../PortalProvider";

function size(lang: "fa" | "en", bytes: number) {
  if (bytes >= 1024 * 1024) return `${num(lang, bytes / 1024 / 1024, 1)} ${lang === "fa" ? "مگابایت" : "MB"}`;
  return `${num(lang, Math.max(1, Math.round(bytes / 1024)))} ${lang === "fa" ? "کیلوبایت" : "KB"}`;
}

/** A photo shows as a picture; anything else as a file chip. Both open in a new tab. */
export function AttachmentView({ file }: { file: ChatAttachment }) {
  const { lang, store } = usePortal();
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    store.fileUrl("documents", file.path).then((u) => {
      if (!live) return;
      if (u) setUrl(u);
      else setFailed(true);
    });
    return () => {
      live = false;
    };
  }, [store, file.path]);

  if (isImage(file) && !failed) {
    return (
      <a
        href={url ?? undefined}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="block overflow-hidden rounded-xl border border-p-line bg-p-sunken"
      >
        {url ? (
          // Signed links from private storage; next/image can't optimise them.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="max-h-64 max-w-[min(18rem,70vw)] object-cover" loading="lazy" />
        ) : (
          <span className="grid h-40 w-56 place-items-center text-p-ink-3">
            <Loader2 className="size-5 animate-spin" />
          </span>
        )}
      </a>
    );
  }
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex max-w-72 items-center gap-2.5 rounded-xl border border-p-line bg-p-surface px-3 py-2 hover:border-p-line-strong"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-p-info-soft text-p-info">
        <FileText className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{file.name}</span>
        <span className="block text-xs text-p-ink-3">{failed ? (lang === "fa" ? "در دسترس نیست" : "Not available") : size(lang, file.size)}</span>
      </span>
    </a>
  );
}
