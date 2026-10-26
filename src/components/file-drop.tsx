"use client";

import { FileText, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { UploadedDocument } from "@/lib/types";

const MAX_BYTES = 20 * 1024 * 1024;

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDrop({
  kind,
  accept,
  acceptLabel,
  files,
  onChange,
  maxFiles,
  label = "Choose files",
}: {
  kind: UploadedDocument["kind"];
  accept: string;
  acceptLabel: string;
  files: UploadedDocument[];
  onChange: (files: UploadedDocument[]) => void;
  maxFiles: number | null;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} is larger than 20 MB. Compress it or split it into parts.`);
      return;
    }
    if (maxFiles !== null && files.length + incoming.length > maxFiles) {
      setError(`Your plan allows ${maxFiles} uploads. Remove a file or get Premium for unlimited uploads.`);
      return;
    }
    setError(null);
    // Stage 3: upload to Supabase Storage. For now only file details are kept.
    onChange([
      ...files,
      ...incoming.map((f) => ({
        id: crypto.randomUUID().slice(0, 8),
        name: f.name,
        sizeBytes: f.size,
        kind,
        uploadedAt: new Date().toISOString(),
      })),
    ]);
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-leaf bg-mint" : "border-line hover:border-leaf hover:bg-mint/60"
        }`}
      >
        <Upload className="h-6 w-6 text-leaf" aria-hidden="true" />
        <span className="font-medium text-forest">{label}</span>
        <span className="text-sm text-muted">or drag them here. {acceptLabel}, up to 20 MB each.</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {files.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <FileText className="h-4 w-4 shrink-0 text-leaf" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-muted">{formatSize(f.sizeBytes)}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x.id !== f.id))}
                className="rounded p-1 text-muted hover:bg-mint hover:text-forest"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
