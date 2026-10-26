"use client";

/**
 * Data access for the signed-in area, backed by Supabase.
 * Hooks return `undefined` while loading and `null` when there is nothing
 * (signed out, or a project that does not exist).
 */

import { useEffect, useState } from "react";
import { supabaseBrowser } from "./supabase/client";
import { DOCUMENTS_BUCKET } from "./supabase/config";
import { buildExampleProject } from "./example";
import type { Account, ChapterDraft, Project, Source, UploadedDocument } from "./types";
import type { PlanId } from "./plans";

/* ------------------------------------------------------------------ */
/* Refresh plumbing: mutations call invalidate(), hooks refetch.       */
/* ------------------------------------------------------------------ */

let version = 0;
const listeners = new Set<() => void>();
const cache = new Map<string, { version: number; promise: Promise<unknown> }>();

export function invalidate() {
  version += 1;
  listeners.forEach((l) => l());
}

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.version === version) return hit.promise as Promise<T>;
  const promise = load();
  cache.set(key, { version, promise });
  return promise;
}

function useVersion() {
  const [v, setV] = useState(version);
  useEffect(() => {
    const l = () => setV(version);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return v;
}

let authWatching = false;
function watchAuth() {
  if (authWatching || typeof window === "undefined") return;
  authWatching = true;
  supabaseBrowser().auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") invalidate();
  });
}

/* ------------------------------------------------------------------ */
/* Mapping database rows to app types                                   */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

function toSource(r: Row): Source {
  return {
    id: r.id as string,
    authors: (r.authors as string[]) ?? [],
    year: (r.year as number) ?? 0,
    title: r.title as string,
    venue: (r.venue as string) ?? "",
    volume: (r.volume as string) ?? undefined,
    issue: (r.issue as string) ?? undefined,
    pages: (r.pages as string) ?? undefined,
    doi: (r.doi as string) ?? undefined,
    retrievedFrom: r.retrieved_from as Source["retrievedFrom"],
    verification: r.verification as Source["verification"],
  };
}

function toDocument(r: Row): UploadedDocument {
  return {
    id: r.id as string,
    name: r.name as string,
    sizeBytes: Number(r.size_bytes),
    kind: r.kind as UploadedDocument["kind"],
    uploadedAt: r.created_at as string,
    storagePath: r.storage_path as string,
  };
}

function toChapter(r: Row): ChapterDraft {
  return {
    number: r.number as number,
    status: r.status as ChapterDraft["status"],
    sections: (r.sections as Record<string, string[]>) ?? {},
    updatedAt: r.updated_at as string,
  };
}

function toProject(r: Row): Project {
  return {
    id: r.id as string,
    title: r.title as string,
    discipline: r.discipline as string,
    level: r.level as string,
    approach: r.approach as string,
    referencing: r.referencing as string,
    institution: (r.institution as string) ?? undefined,
    objectives: r.objectives as string,
    createdAt: r.created_at as string,
    chapters: ((r.chapters as Row[]) ?? []).map(toChapter).sort((a, b) => a.number - b.number),
    sources: ((r.sources as Row[]) ?? []).map(toSource),
    documents: ((r.documents as Row[]) ?? []).map(toDocument),
  };
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

async function loadAccount(): Promise<Account | null> {
  const sb = supabaseBrowser();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.rpc("my_account");
  if (error || !data) {
    return {
      id: user.id,
      name: (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "",
      email: user.email ?? "",
      plan: "free",
      usage: { projects: 0, uploads: 0, chapterDrafts: 0, literatureSearches: 0 },
    };
  }
  const a = data as Row;
  return {
    id: user.id,
    name: (a.full_name as string) || user.email?.split("@")[0] || "",
    email: user.email ?? "",
    plan: a.plan as PlanId,
    premiumUntil: (a.premium_until as string) ?? undefined,
    usage: {
      projects: Number(a.projects ?? 0),
      uploads: Number(a.uploads ?? 0),
      chapterDrafts: Number(a.chapter_drafts ?? 0),
      literatureSearches: Number(a.literature_searches ?? 0),
    },
  };
}

const PROJECT_FIELDS = "*, chapters(*), sources(*), documents(*)";

async function loadProjects(): Promise<Project[]> {
  const { data, error } = await supabaseBrowser()
    .from("projects")
    .select(PROJECT_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as Row[]).map(toProject);
}

function useLoader<T>(key: string, load: () => Promise<T>, fallback: T): T | undefined {
  const v = useVersion();
  const [state, setState] = useState<{ key: string; version: number; value: T } | null>(null);
  useEffect(() => {
    watchAuth();
    let alive = true;
    cached(key, load)
      .then((value) => alive && setState({ key, version: v, value }))
      .catch(() => alive && setState({ key, version: v, value: fallback }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, v]);
  // Keep showing the previous value while a refresh loads.
  if (!state || state.key !== key) return undefined;
  return state.value;
}

export function useAccount(): Account | null | undefined {
  return useLoader("account", loadAccount, null);
}

export function useProjects(): Project[] | undefined {
  return useLoader("projects", loadProjects, []);
}

export const exampleProject = buildExampleProject();

export function useProject(id: string): Project | null | undefined {
  const projects = useLoader(
    id === "example" ? "noop" : "projects",
    id === "example" ? async () => [] : loadProjects,
    [] as Project[],
  );
  if (id === "example") return exampleProject;
  if (projects === undefined) return undefined;
  return projects.find((p) => p.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                 */
/* ------------------------------------------------------------------ */

function friendly(message: string): string {
  if (message.includes("PLAN_LIMIT_PROJECTS"))
    return "The Free plan includes one thesis project. Get Premium to start another.";
  if (message.includes("PLAN_LIMIT_UPLOADS"))
    return "You have used all the uploads in the Free plan. Remove a file or get Premium for unlimited uploads.";
  if (/invalid login credentials/i.test(message)) return "That email and password do not match.";
  if (/email not confirmed/i.test(message))
    return "Confirm your email first. Open the link we sent you, then sign in.";
  if (/already registered|already been registered/i.test(message))
    return "An account with this email already exists. Sign in instead.";
  if (/rate limit/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/password/i.test(message) && /characters|weak|short/i.test(message))
    return "Use a stronger password of at least 8 characters.";
  if (/failed to fetch|network/i.test(message))
    return "EasyThesis could not reach the server. Check your connection and try again.";
  return message;
}

export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabaseBrowser().auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) return { error: friendly(error.message), needsConfirmation: false };
  // Supabase returns a user with no identities when the email is already taken.
  if (data.user && data.user.identities?.length === 0)
    return { error: friendly("already registered"), needsConfirmation: false };
  invalidate();
  return { error: null, needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };
  invalidate();
  return { error: null };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
  });
  return { error: error ? friendly(error.message) : null };
}

export async function setNewPassword(password: string) {
  const { error } = await supabaseBrowser().auth.updateUser({ password });
  return { error: error ? friendly(error.message) : null };
}

export async function signOut() {
  await supabaseBrowser().auth.signOut();
  cache.clear();
  invalidate();
}

/* ------------------------------------------------------------------ */
/* Projects and documents                                               */
/* ------------------------------------------------------------------ */

export type NewProject = Pick<
  Project,
  "title" | "discipline" | "level" | "approach" | "referencing" | "institution" | "objectives"
>;

export async function createProject(input: NewProject) {
  const { data, error } = await supabaseBrowser()
    .from("projects")
    .insert({
      title: input.title,
      discipline: input.discipline,
      level: input.level,
      approach: input.approach,
      referencing: input.referencing,
      institution: input.institution ?? null,
      objectives: input.objectives,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: friendly(error.message) };
  invalidate();
  return { id: data.id as string, error: null };
}

export async function deleteProject(project: Project) {
  const sb = supabaseBrowser();
  const paths = project.documents.map((d) => d.storagePath).filter(Boolean) as string[];
  if (paths.length) await sb.storage.from(DOCUMENTS_BUCKET).remove(paths);
  const { error } = await sb.from("projects").delete().eq("id", project.id);
  invalidate();
  return { error: error ? friendly(error.message) : null };
}

function safeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120);
}

/**
 * Saves a document record first (the database checks plan limits),
 * then uploads the file. If the upload fails, the record is removed.
 */
export async function uploadDocuments(
  projectId: string,
  files: File[],
  kind: UploadedDocument["kind"],
): Promise<{ errors: string[] }> {
  const sb = supabaseBrowser();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { errors: ["Your session has ended. Sign in again."] };
  const errors: string[] = [];
  for (const file of files) {
    const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const { data: row, error: rowError } = await sb
      .from("documents")
      .insert({ project_id: projectId, name: file.name, size_bytes: file.size, kind, storage_path: path })
      .select("id")
      .single();
    if (rowError) {
      errors.push(friendly(rowError.message));
      break;
    }
    const { error: upError } = await sb.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (upError) {
      await sb.from("documents").delete().eq("id", row.id);
      errors.push(`${file.name} could not be uploaded: ${friendly(upError.message)}`);
    }
  }
  invalidate();
  return { errors };
}

export async function deleteDocument(doc: UploadedDocument) {
  const sb = supabaseBrowser();
  if (doc.storagePath) await sb.storage.from(DOCUMENTS_BUCKET).remove([doc.storagePath]);
  const { error } = await sb.from("documents").delete().eq("id", doc.id);
  invalidate();
  return { error: error ? friendly(error.message) : null };
}

/* ------------------------------------------------------------------ */
/* Literature (server routes do the searching and checking)             */
/* ------------------------------------------------------------------ */

export interface SearchResult {
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi: string | null;
  abstract: string | null;
  citedBy: number | null;
  openAccessUrl: string | null;
  retrievedFrom: "OpenAlex" | "Semantic Scholar";
  alreadyAdded: boolean;
}

async function postJson<T>(url: string, body: unknown): Promise<{ data: T | null; error: string | null; upgrade?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: json.error ?? "Something went wrong. Try again.", upgrade: !!json.upgrade };
    return { data: json as T, error: null };
  } catch {
    return { data: null, error: friendly("failed to fetch") };
  }
}

export async function searchLiterature(projectId: string, query: string, fromYear?: number) {
  const res = await postJson<{
    results: SearchResult[];
    searched: string[];
    unavailable: string[];
    remaining: number | null;
  }>("/api/literature/search", { projectId, query, fromYear });
  invalidate(); // usage count changed
  return res;
}

export async function addSource(projectId: string, candidate: SearchResult) {
  const res = await postJson<{ verification: Source["verification"] }>("/api/literature/add", {
    projectId,
    candidate,
  });
  if (!res.error) invalidate();
  return res;
}

export async function removeSource(sourceId: string) {
  const { error } = await supabaseBrowser().from("sources").delete().eq("id", sourceId);
  invalidate();
  return { error: error ? friendly(error.message) : null };
}
