export const boothStageFrames = [
  {
    src: "/hero/booth-stage-01-clean-hall.jpg",
    key: "clean-hall",
  },
  {
    src: "/hero/booth-stage-02-blueprint.jpg",
    key: "blueprint",
  },
  {
    src: "/hero/booth-stage-03-assembly.jpg",
    key: "assembly",
  },
  {
    src: "/hero/booth-stage-04-structure.jpg",
    key: "structure",
  },
  {
    src: "/hero/booth-stage-05-identity.jpg",
    key: "identity",
  },
  {
    src: "/hero/booth-stage-06-final.jpg",
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
