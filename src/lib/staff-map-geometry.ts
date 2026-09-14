export type MapPoint = {
  x: number;
  y: number;
};

function assertFinitePoint(point: MapPoint, label: string) {
  if (![point.x, point.y].every(Number.isFinite)) {
    throw new RangeError(`${label} must contain finite coordinates.`);
  }
}

export function normalizeRotationDegrees(value: number) {
  if (!Number.isFinite(value)) throw new RangeError("Rotation must be finite.");
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function calculatePointerRotation({
  center,
  startPointer,
  currentPointer,
  initialRotation = 0,
  snapIncrement = 0,
}: {
  center: MapPoint;
  startPointer: MapPoint;
  currentPointer: MapPoint;
  initialRotation?: number;
  snapIncrement?: number;
}) {
  assertFinitePoint(center, "Rotation center");
  assertFinitePoint(startPointer, "Rotation start pointer");
  assertFinitePoint(currentPointer, "Rotation current pointer");
  if (!Number.isFinite(initialRotation)) throw new RangeError("Initial rotation must be finite.");
  if (!Number.isFinite(snapIncrement) || snapIncrement < 0 || snapIncrement > 180) {
    throw new RangeError("Rotation snap increment must be between 0 and 180 degrees.");
  }

  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x);
  const currentAngle = Math.atan2(currentPointer.y - center.y, currentPointer.x - center.x);
  const deltaDegrees = normalizeRotationDegrees(((currentAngle - startAngle) * 180) / Math.PI);
  let rotation = normalizeRotationDegrees(initialRotation + deltaDegrees);

  if (snapIncrement > 0) {
    rotation = normalizeRotationDegrees(Math.round(rotation / snapIncrement) * snapIncrement);
  }

  return rotation;
}
