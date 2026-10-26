"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useId, useState } from "react";

const MAX_BYTES = 20 * 1024 * 1024;

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ListedFile {
  id: string;
  name: string;
  sizeBytes: number;
}

/**
 * File picker with drag and drop. It checks size and the plan's
 * remaining uploads, then hands the files to `onAdd`.
 */
export function FileDrop({
  accept,
  acceptLabel,
  files,
  onAdd,
  onRemove,
  remaining,
  busy = false,
  error,
  label = "Choose files",
}: {
  accept: string;
  acceptLabel: string;
  files: ListedFile[];
  onAdd: (files: File[]) => void;
  onRemove?: (id: string) => void;
  /** Uploads left on the user's plan; null means unlimited. */
  remaining: number | null;
  busy?: boolean;
  error?: string | null;
  label?: string;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function add(list: FileList | null) {
    if (!list || busy) return;
    const incoming = Array.from(list);
    if (incoming.length === 0) return;
    const tooBig = incoming.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setLocalError(`${tooBig.name} is larger than 20 MB. Compress it or split it into parts.`);
      return;
    }
    if (remaining !== null && incoming.length > remaining) {
      setLocalError(
        remaining === 0
          ? "You have used all the uploads in the Free plan. Remove a file or get Premium for unlimited uploads."
          : `You can upload ${remaining} more ${remaining === 1 ? "file" : "files"} on the Free plan.`,
      );
      return;
    }
    setLocalError(null);
    onAdd(incoming);
  }

  const shownError = localError ?? error;

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
        aria-busy={busy}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
          dragging ? "border-leaf bg-mint" : "border-line hover:border-leaf hover:bg-mint/60"
        } ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-leaf" aria-hidden="true" />
        ) : (
          <Upload className="h-6 w-6 text-leaf" aria-hidden="true" />
        )}
        <span className="font-medium text-forest">{busy ? "Uploading…" : label}</span>
        <span className="text-sm text-muted">
          or drag them here. {acceptLabel}, up to 20 MB each.
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {shownError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {shownError}
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
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(f.id)}
                  className="rounded p-1 text-muted hover:bg-mint hover:text-forest"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
