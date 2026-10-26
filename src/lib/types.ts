import type { PlanId } from "./plans";

export type VerificationStatus = "verified" | "unverified" | "not_found";

export interface Source {
  id: string;
  authors: string[];
  year: number;
  title: string;
  venue: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  retrievedFrom: "OpenAlex" | "Semantic Scholar" | "Crossref" | "Consensus" | "Uploaded";
  verification: VerificationStatus;
}

export type ChapterStatus = "not_started" | "outlined" | "drafted" | "locked";

export interface ChapterDraft {
  number: number;
  status: ChapterStatus;
  /** Section title -> paragraphs. Citation markers look like [[source-id]]. */
  sections: Record<string, string[]>;
  updatedAt?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  sizeBytes: number;
  kind: "proposal" | "data" | "literature" | "other";
  uploadedAt: string;
  storagePath?: string;
}

export interface Project {
  id: string;
  title: string;
  discipline: string;
  level: string;
  approach: string;
  referencing: string;
  institution?: string;
  objectives: string;
  /** The read-only sample project shown to new users. */
  isExample?: boolean;
  createdAt: string;
  chapters: ChapterDraft[];
  sources: Source[];
  documents: UploadedDocument[];
}

export interface Account {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  premiumUntil?: string;
  usage: {
    projects: number;
    uploads: number;
    chapterDrafts: number;
    literatureSearches: number;
  };
}
