"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/data/aratta-content";

type GalleryLightboxProps = {
  content: SiteContent;
};

export function GalleryLightbox({ content }: GalleryLightboxProps) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fa = content.lang === "fa";
  const item = active === null ? null : content.gallery.items[active];
  const isOpen = active !== null;
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [isOpen]);
  function move(offset: number) {
    setActive((index) =>
      index === null
        ? null
        : (index + offset + content.gallery.items.length) %
          content.gallery.items.length,
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.gallery.items.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={() => setActive(index)}
            className="group relative aspect-[4/3] overflow-hidden rounded-[1.6rem] border border-white/12 bg-white/[0.035] text-start shadow-2xl shadow-black/20"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              unoptimized
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/76 via-black/8 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <span className="font-bold text-white">{image.caption}</span>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/12 text-white backdrop-blur-xl">
                <Maximize2 size={17} />
              </span>
            </div>
          </button>
        ))}
      </div>

      {item ? (
        <dialog
          ref={dialogRef}
          aria-label={item.caption}
          className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-black/95 p-4 text-white backdrop:bg-black/80 open:flex open:flex-col"
          onCancel={(event) => {
            event.preventDefault();
            setActive(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setActive(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(fa ? 1 : -1);
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              move(fa ? -1 : 1);
            }
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 pb-4">
            <p className="text-sm text-white/70" aria-live="polite">
              {(active ?? 0) + 1} / {content.gallery.items.length}
            </p>
            <div className="flex gap-3">
              <a
                href={item.src}
                download
                aria-label={
                  fa ? "دریافت تصویر اصلی" : "Download original image"
                }
                className="grid h-12 w-12 place-items-center rounded-full border border-white/20"
              >
                <Download size={20} />
              </a>
              <button
                type="button"
                aria-label={fa ? "بستن گالری" : "Close gallery"}
                className="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10"
                onClick={() => setActive(null)}
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image
              src={item.src}
              alt={item.alt}
              fill
              unoptimized
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={fa ? "تصویر قبلی" : "Previous image"}
              disabled={content.gallery.items.length < 2}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 disabled:invisible"
            >
              {fa ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
            </button>
            <p className="max-w-3xl text-center text-sm leading-7">
              {item.caption}
            </p>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={fa ? "تصویر بعدی" : "Next image"}
              disabled={content.gallery.items.length < 2}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/20 disabled:invisible"
            >
              {fa ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  );
}
