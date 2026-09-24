export async function snapshotBoard(
  root: HTMLElement,
): Promise<HTMLCanvasElement> {
  const rect = root.getBoundingClientRect();
  const scale = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const width = Math.max(640, Math.round(rect.width * scale));
  const height = Math.max(360, Math.round(rect.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#fbfcfe";
  ctx.fillRect(0, 0, width, height);

  const nodes = [
    ...root.querySelectorAll("canvas"),
    ...root.querySelectorAll("svg"),
  ];
  for (const node of nodes) {
    const box = node.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) continue;
    const x = (box.left - rect.left) * scale;
    const y = (box.top - rect.top) * scale;
    const w = box.width * scale;
    const h = box.height * scale;
    try {
      if (node instanceof HTMLCanvasElement && node.width > 0) {
        ctx.drawImage(node, x, y, w, h);
        continue;
      }
      if (node instanceof SVGElement) {
        const image = await svgToImage(node);
        if (image) ctx.drawImage(image, x, y, w, h);
      }
    } catch {
      /* skip a layer that cannot paint */
    }
  }
  return canvas;
}

async function svgToImage(svg: SVGElement): Promise<HTMLImageElement | null> {
  const clone = svg.cloneNode(true) as SVGElement;
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function canvasToJpeg(
  canvas: HTMLCanvasElement,
  quality = 0.82,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not capture the board."));
      },
      "image/jpeg",
      quality,
    );
  });
}
