import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/config";

const MAX_CHARS_PER_FILE = 40_000;

export interface DocumentText {
  name: string;
  kind: string;
  text: string;
  note?: string;
}

function ext(name: string) {
  return name.toLowerCase().split(".").pop() ?? "";
}

function squeeze(s: string) {
  return s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Reads the text out of an uploaded file. Unsupported formats return a note instead. */
export async function extractText(name: string, bytes: ArrayBuffer): Promise<{ text: string; note?: string }> {
  const e = ext(name);
  try {
    if (["txt", "md", "csv", "tsv"].includes(e)) {
      return { text: squeeze(new TextDecoder("utf-8").decode(bytes)) };
    }
    if (e === "pdf") {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text } = await pdfText(pdf, { mergePages: true });
      const clean = squeeze(Array.isArray(text) ? text.join("\n") : text);
      return clean
        ? { text: clean }
        : { text: "", note: "This PDF has no readable text (it may be scanned). Upload a Word or text version." };
    }
    if (e === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return { text: squeeze(value) };
    }
    if (e === "xlsx") {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(bytes);
      const parts: string[] = [];
      wb.eachSheet((sheet) => {
        parts.push(`Sheet: ${sheet.name}`);
        let n = 0;
        sheet.eachRow({ includeEmpty: false }, (row) => {
          if (n++ > 400) return;
          const values = (row.values as unknown[]).slice(1).map((v) => {
            if (v === null || v === undefined) return "";
            if (typeof v === "object") {
              const o = v as { result?: unknown; text?: unknown; richText?: { text: string }[] };
              if (o.result !== undefined) return String(o.result);
              if (o.text !== undefined) return String(o.text);
              if (o.richText) return o.richText.map((r) => r.text).join("");
            }
            return String(v);
          });
          parts.push(values.join(" | "));
        });
      });
      return { text: squeeze(parts.join("\n")) };
    }
    if (["sav", "dta", "xls", "doc"].includes(e)) {
      return {
        text: "",
        note: `EasyThesis cannot read .${e} files yet. Export your output to Excel (.xlsx), CSV, Word (.docx) or PDF and upload that.`,
      };
    }
    return { text: "", note: `EasyThesis cannot read .${e} files.` };
  } catch {
    return { text: "", note: "This file could not be read. It may be damaged or password-protected." };
  }
}

/** Text of a project's uploads, read once and then cached in the database. */
export async function loadDocumentTexts(projectId: string, kinds: string[]): Promise<DocumentText[]> {
  const admin = supabaseAdmin();
  const { data: docs } = await admin
    .from("documents")
    .select("id, name, kind, storage_path, extracted_text, extract_note")
    .eq("project_id", projectId)
    .in("kind", kinds)
    .order("created_at");
  const out: DocumentText[] = [];
  for (const d of docs ?? []) {
    let text: string | null = d.extracted_text;
    let note: string | null = d.extract_note;
    if (text === null && note === null) {
      const { data: blob } = await admin.storage.from(DOCUMENTS_BUCKET).download(d.storage_path);
      if (blob) {
        const res = await extractText(d.name, await blob.arrayBuffer());
        text = res.text;
        note = res.note ?? null;
        await admin
          .from("documents")
          .update({ extracted_text: text.slice(0, 200_000), extract_note: note })
          .eq("id", d.id);
      } else {
        note = "The file could not be opened from storage.";
      }
    }
    out.push({
      name: d.name,
      kind: d.kind,
      text: (text ?? "").slice(0, MAX_CHARS_PER_FILE),
      note: note ?? undefined,
    });
  }
  return out;
}
