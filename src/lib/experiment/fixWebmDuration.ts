/**
 * MediaRecorder WebM files often store a short Duration, so the player
 * timeline stops early even though the clusters run for the whole recording.
 * The real length is known from the wall clock; this writes it into the header.
 */

function readSize(bytes: Uint8Array, offset: number): { value: number; length: number } | null {
  const first = bytes[offset];
  if (first === undefined) return null;
  let length = 1;
  let marker = 0x80;
  while (length <= 8 && (first & marker) === 0) {
    length += 1;
    marker >>= 1;
  }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = first & (marker - 1);
  for (let index = 1; index < length; index += 1) {
    value = value * 256 + bytes[offset + index]!;
  }
  return { value, length };
}

function findElement(
  bytes: Uint8Array,
  id: number[],
  limit: number,
): { payload: number; payloadLen: number } | null {
  const end = Math.min(bytes.length - id.length - 2, limit);
  for (let index = 0; index < end; index += 1) {
    if (!id.every((byte, offset) => bytes[index + offset] === byte)) continue;
    const size = readSize(bytes, index + id.length);
    if (!size || size.value < 1 || size.value > 8) continue;
    const payload = index + id.length + size.length;
    if (payload + size.value > bytes.length) continue;
    return { payload, payloadLen: size.value };
  }
  return null;
}

function readUnsigned(bytes: Uint8Array, offset: number, length: number): number {
  let value = 0;
  for (let index = 0; index < length; index += 1) {
    value = value * 256 + bytes[offset + index]!;
  }
  return value;
}

function writeFloat(bytes: Uint8Array, offset: number, length: number, value: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (length === 8) view.setFloat64(offset, value);
  else if (length === 4) view.setFloat32(offset, value);
}

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!Number.isFinite(durationMs) || durationMs < 1) return blob;
  const type = blob.type || "video/webm";
  if (!/webm/i.test(type) && !/matroska/i.test(type)) return blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const duration = findElement(bytes, [0x44, 0x89], 8192);
  if (!duration || (duration.payloadLen !== 4 && duration.payloadLen !== 8)) return blob;
  const scale = findElement(bytes, [0x2a, 0xd7, 0xb1], 8192);
  const timecodeScale = scale
    ? readUnsigned(bytes, scale.payload, scale.payloadLen) || 1_000_000
    : 1_000_000;
  writeFloat(bytes, duration.payload, duration.payloadLen, (durationMs * 1_000_000) / timecodeScale);
  return new Blob([bytes], { type });
}
