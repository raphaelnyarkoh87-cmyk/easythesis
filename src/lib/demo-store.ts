"use client";

/**
 * Temporary in-browser store so every screen works before the
 * database is connected. Stage 3 replaces this file with Supabase;
 * the screens call the same functions, so they will not change.
 */

import { useSyncExternalStore } from "react";
import { CHAPTERS } from "./academic";
import { buildExampleProject } from "./example";
import type { Account, Project, UploadedDocument } from "./types";

const ACCOUNT_KEY = "easythesis.account";
const PROJECTS_KEY = "easythesis.projects";

const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value: T = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: changes last for this page view only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const NO_PROJECTS: Project[] = [];

export function useAccount(): Account | null {
  return useSyncExternalStore(
    subscribe,
    () => read<Account | null>(ACCOUNT_KEY, null),
    () => null,
  );
}

export function useProjects(): Project[] {
  const stored = useSyncExternalStore(
    subscribe,
    () => read<Project[]>(PROJECTS_KEY, NO_PROJECTS),
    () => NO_PROJECTS,
  );
  return stored;
}

export function useProject(id: string): Project | undefined {
  const projects = useProjects();
  if (id === "example") return EXAMPLE;
  return projects.find((p) => p.id === id);
}

const EXAMPLE = buildExampleProject();
export const exampleProject = EXAMPLE;

export function signIn(name: string, email: string) {
  const existing = read<Account | null>(ACCOUNT_KEY, null);
  if (existing && existing.email === email) {
    write(ACCOUNT_KEY, existing);
    return;
  }
  const account: Account = {
    name,
    email,
    plan: "free",
    usage: { chapterDrafts: 0, literatureSearches: 0 },
  };
  write(ACCOUNT_KEY, account);
}

export function signOut() {
  try {
    window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function activatePremium(days: number) {
  const account = read<Account | null>(ACCOUNT_KEY, null);
  if (!account) return;
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  write(ACCOUNT_KEY, { ...account, plan: "premium", premiumUntil: until });
}

export function createProject(
  input: Omit<Project, "id" | "createdAt" | "chapters" | "sources" | "documents">,
  documents: UploadedDocument[],
): Project {
  const project: Project = {
    ...input,
    id: crypto.randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    chapters: CHAPTERS.map((c) => ({
      number: c.number,
      status: c.needsUserData ? "locked" : "not_started",
      sections: {},
    })),
    sources: [],
    documents,
  };
  const projects = read<Project[]>(PROJECTS_KEY, NO_PROJECTS);
  write(PROJECTS_KEY, [project, ...projects]);
  return project;
}

export function updateProject(id: string, patch: (p: Project) => Project) {
  const projects = read<Project[]>(PROJECTS_KEY, NO_PROJECTS);
  write(
    PROJECTS_KEY,
    projects.map((p) => (p.id === id ? patch(p) : p)),
  );
}

export function deleteProject(id: string) {
  const projects = read<Project[]>(PROJECTS_KEY, NO_PROJECTS);
  write(
    PROJECTS_KEY,
    projects.filter((p) => p.id !== id),
  );
}
