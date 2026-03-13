export async function parsePDFText(bytes: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  const annotationUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));

    const annotations = await page.getAnnotations();
    for (const ann of annotations) {
      if (ann.url) annotationUrls.push(ann.url);
      if (ann.unsafeUrl) annotationUrls.push(ann.unsafeUrl);
    }
  }

  const urlBlock = annotationUrls.length > 0
    ? "\n\nLinks:\n" + annotationUrls.join("\n")
    : "";

  return pages.join("\n") + urlBlock;
}
