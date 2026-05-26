export const boothStageFrames = [
  {
    src: "/hero/hq-stage-01-clean-hall.png",
    key: "clean-hall",
  },
  {
    src: "/hero/hq-stage-02-blueprint.png",
    key: "blueprint",
  },
  {
    src: "/hero/hq-stage-03-assembly.png",
    key: "assembly",
  },
  {
    src: "/hero/hq-stage-04-structure.png",
    key: "structure",
  },
  {
    src: "/hero/hq-stage-05-branding.png",
    key: "identity",
  },
  {
    src: "/hero/hq-stage-06-live-booth.png",
    key: "final",
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
};

export function getBoothFrameForPage(page: string) {
  return pageFrameMap[page] ?? boothStageFrames[5].src;
}
