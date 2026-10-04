/** Pixel size and channel count read from a JPEG's frame header. */
export function jpegInfo(bytes: Uint8Array): { width: number; height: number; components: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Not a JPEG image.");
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) throw new Error("Unreadable JPEG image.");
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return {
        height: (bytes[i + 5]! << 8) | bytes[i + 6]!,
        width: (bytes[i + 7]! << 8) | bytes[i + 8]!,
        components: bytes[i + 9]!,
      };
    }
    i += 2 + ((bytes[i + 2]! << 8) | bytes[i + 3]!);
  }
  throw new Error("Unreadable JPEG image.");
}

/** A PDF text string that survives any characters, written as UTF-16BE hex. */
function pdfText(value: string): string {
  let hex = "FEFF";
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, "0");
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, "0");
    } else {
      hex += code.toString(16).padStart(4, "0");
    }
  }
  return `<${hex.toUpperCase()}>`;
}

const A4 = { short: 595.28, long: 841.89 };
const MARGIN = 28;

/**
 * Builds a PDF with one A4 page per image, each turned to suit its image and
 * scaled to fit inside the margins.
 */
export function jpegPagesToPdf(images: Uint8Array[], title: string): Blob {
  if (!images.length) throw new Error("There is nothing on the board to export.");
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string | Array<string | Uint8Array>) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    for (const part of Array.isArray(body) ? body : [body]) push(part);
    push("\nendobj\n");
  };

  // Objects: 1 catalog, 2 page tree, 3 info, then page, content and image for each page.
  const pageIds = images.map((_, index) => 4 + index * 3);
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`);
  object(3, `<< /Title ${pdfText(title)} /Producer ${pdfText("SeeThrough")} >>`);

  images.forEach((jpeg, index) => {
    const pageId = pageIds[index]!;
    const { width, height, components } = jpegInfo(jpeg);
    const landscape = width >= height;
    const pageW = landscape ? A4.long : A4.short;
    const pageH = landscape ? A4.short : A4.long;
    const scale = Math.min((pageW - MARGIN * 2) / width, (pageH - MARGIN * 2) / height);
    const drawW = width * scale;
    const drawH = height * scale;
    const x = (pageW - drawW) / 2;
    const y = (pageH - drawH) / 2;
    const content = `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
    const colorSpace = components === 1 ? "/DeviceGray" : components === 4 ? "/DeviceCMYK" : "/DeviceRGB";

    object(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`,
    );
    object(pageId + 1, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}\nendstream`);
    object(pageId + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      "\nendstream",
    ]);
  });

  const count = 4 + images.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id += 1) {
    push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}
