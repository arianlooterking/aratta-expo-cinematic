export const boothStageFrames = [
  {
    src: "/hero-v6/desktop/stage-01.webp",
    key: "clean-hall",
  },
  {
    src: "/hero-v6/desktop/stage-02.webp",
    key: "blueprint",
  },
  {
    src: "/hero-v6/desktop/stage-03.webp",
    key: "assembly",
  },
  {
    src: "/hero-v6/desktop/stage-04.webp",
    key: "structure",
  },
  {
    src: "/hero-v6/desktop/stage-05.webp",
    key: "identity",
  },
  {
    src: "/hero-v6/desktop/stage-06.webp",
    key: "final",
  },
] as const;

export const mobileBoothStageFrames = [
  {
    src: "/hero-v6/mobile/stage-01.webp",
    key: "mobile-clean-hall",
  },
  {
    src: "/hero-v6/mobile/stage-02.webp",
    key: "mobile-blueprint",
  },
  {
    src: "/hero-v6/mobile/stage-03.webp",
    key: "mobile-assembly",
  },
  {
    src: "/hero-v6/mobile/stage-04.webp",
    key: "mobile-structure",
  },
  {
    src: "/hero-v6/mobile/stage-05.webp",
    key: "mobile-identity",
  },
  {
    src: "/hero-v6/mobile/stage-06.webp",
    key: "mobile-final",
  },
] as const;

const pageFrameMap: Record<string, string> = {
  about: boothStageFrames[5].src,
  exhibitions: boothStageFrames[4].src,
  registration: boothStageFrames[5].src,
  forms: boothStageFrames[1].src,
  equipment: boothStageFrames[2].src,
  participants: boothStageFrames[5].src,
  news: boothStageFrames[3].src,
  gallery: boothStageFrames[4].src,
  contact: boothStageFrames[5].src,
  search: boothStageFrames[1].src,
  plans: boothStageFrames[0].src,
};

export function getBoothFrameForPage(page: string) {
  return pageFrameMap[page] ?? boothStageFrames[5].src;
}
