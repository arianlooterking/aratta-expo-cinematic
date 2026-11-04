import qrcode from "qrcode-generator";

/** A QR code drawn as one SVG path in the current text colour. Server-rendered. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const count = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col + 2} ${row + 2}h1v1h-1z`;
    }
  }
  const size = count + 4; // two-module quiet zone on every side
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={d} fill="#0b1112" />
    </svg>
  );
}
