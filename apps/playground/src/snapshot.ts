import { domToPng } from "modern-screenshot";
import type { ImageInput } from "@neo-builder/ai";

/**
 * Render compiled HTML in a hidden same-origin iframe and screenshot it.
 * This is the browser-side "eyes" for the critique loop; the Node/CI path
 * (Playwright) comes with the MCP server later.
 */
export async function captureHtml(html: string, width = 1024): Promise<ImageInput> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:1400px;border:0;visibility:hidden;pointer-events:none`;
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("screenshot iframe failed to load"));
      iframe.srcdoc = html;
    });
    // Give fonts/images a beat to settle before capture.
    await new Promise((r) => setTimeout(r, 250));
    const body = iframe.contentDocument?.body;
    if (!body) throw new Error("screenshot iframe has no document");
    const dataUrl = await domToPng(body, { width });
    const data = dataUrl.split(",")[1] ?? "";
    if (!data) throw new Error("screenshot capture produced no image data");
    return { data, mediaType: "image/png" };
  } finally {
    iframe.remove();
  }
}
