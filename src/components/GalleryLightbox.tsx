"use client";

import Image from "next/image";
import { Maximize2, X } from "lucide-react";
import { useState } from "react";
import type { SiteContent } from "@/data/aratta-content";

type GalleryLightboxProps = {
  content: SiteContent;
};

export function GalleryLightbox({ content }: GalleryLightboxProps) {
  const [active, setActive] = useState<number | null>(null);
  const item = active === null ? null : content.gallery.items[active];

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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={item.caption}
          className="fixed inset-0 z-50 grid place-items-center bg-black/86 p-4 backdrop-blur-xl"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close gallery"
            className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-xl"
            onClick={() => setActive(null)}
          >
            <X size={22} />
          </button>
          <div
            className="relative aspect-[16/10] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/16 bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <Image src={item.src} alt={item.alt} fill sizes="90vw" className="object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 to-transparent p-6 text-white">
              <p className="text-lg font-black">{item.caption}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
