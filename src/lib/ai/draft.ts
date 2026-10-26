import "server-only";
import type { ChapterSpec } from "@/lib/academic";

export interface DraftSource {
  id: string; // database id
  authors: string[];
  year: number | null;
  title: string;
  venue: string | null;
  abstract: string | null;
}

export interface DraftInput {
  project: {
    title: string;
    discipline: string;
    level: string;
    approach: string;
    referencing: string;
    institution?: string | null;
    objectives: string;
  };
  chapter: ChapterSpec;
  section: string;
  sources: DraftSource[];
  proposalTexts: { name: string; text: string }[];
  dataTexts: { name: string; text: string }[];
  /** Already-drafted sections of this chapter (and Chapter 4 when drafting 5), for continuity. */
  context: { heading: string; text: string }[];
}

const MAX_SOURCES = 25;

const LENGTH_BY_LEVEL: Record<string, string> = {
  "Undergraduate project": "250 to 400 words",
  "Master's thesis": "400 to 600 words",
  "MPhil thesis": "450 to 700 words",
  "PhD dissertation": "600 to 900 words",
};

/** Section-specific guidance, following common practice in Ghanaian and other African universities. */
const SECTION_GUIDE: Record<string, string> = {
  "Background to the study":
    "Move from the broad global context to the regional and then the local context of the study, ending with why the topic matters now.",
  "Statement of the problem":
    "State the specific problem, show evidence that it exists, identify what existing studies have not addressed, and end with the gap this study fills. Do not restate the background.",
  "Purpose of the study": "One short paragraph stating the overall aim.",
  "Research objectives":
    "Present the student's objectives exactly as given, as a numbered list inside one paragraph (1. ... 2. ...). Do not add new objectives. No citations needed.",
  "Research questions or hypotheses":
    "Turn each objective into one research question (or hypothesis for quantitative studies), numbered to match. No citations needed.",
  "Significance of the study":
    "Explain who benefits (policy, practice, theory, future researchers) and how. Cite only where a claim needs support.",
  Delimitation: "State the geographic, population, time and content boundaries the student has chosen.",
  Limitations:
    "State likely limitations of the design honestly and how they were reduced. Use [ADD: ...] for anything only the student knows.",
  "Definition of terms": "Define the key terms as used in this study, one per sentence.",
  "Organisation of the study": "Describe what each of the five chapters covers, one sentence each. No citations.",
  "Theoretical framework":
    "Explain the theory or theories underpinning the study, their origin, key propositions, critiques, and how they apply here.",
  "Conceptual review": "Define and discuss the key concepts, comparing how different authors use them.",
  "Empirical review":
    "Review prior studies organised by theme or objective: context, method, findings. Compare and contrast them; do not just list.",
  "Conceptual framework": "Describe the variables or concepts and the expected relationships between them, linked to the objectives.",
  "Gaps in the literature": "Summarise what is missing in the reviewed studies and how this study addresses it.",
  "Research philosophy": "State and justify the paradigm (e.g. positivism, interpretivism, pragmatism) consistent with the approach.",
  "Research design": "State and justify the design consistent with the approach.",
  "Study area": "Describe the study area. Use [ADD: ...] for local facts not in the student's documents.",
  Population: "Describe the target population. Use [ADD: ...] for numbers not in the student's documents.",
  "Sample and sampling procedure":
    "Describe sample size and sampling technique. Use [ADD: ...] for any figure not in the student's documents. Never invent a sample size.",
  "Data collection instruments": "Describe the instruments and their structure.",
  "Validity and reliability, or trustworthiness":
    "Quantitative: validity and reliability (e.g. pre-test, Cronbach's alpha). Qualitative: credibility, transferability, dependability, confirmability. Use [ADD: ...] for values not provided.",
  "Data collection procedure": "Describe how data were collected, step by step.",
  "Data analysis": "Describe the analysis methods and software, linked to each objective.",
  "Ethical considerations": "Describe consent, confidentiality, anonymity and approval. Use [ADD: ...] for approval numbers.",
  "Demographic characteristics of respondents":
    "Report only demographic figures that appear in the student's data. Mark every figure with [DATA].",
  "Findings by research objective":
    "Report findings objective by objective, only from the student's data, marking each reported figure or quotation with [DATA].",
  "Discussion of findings":
    "Compare each finding from the data [DATA] with the reviewed literature [S#]: agreements, disagreements and possible reasons.",
  "Summary of the study": "Briefly restate the purpose, objectives and methods.",
  "Key findings": "Summarise the main findings, one per objective, only from the data and Chapter 4 [DATA].",
  Conclusions: "State what the findings mean, without new evidence.",
  Recommendations: "Give practical recommendations that follow directly from the findings, addressed to specific stakeholders.",
  "Suggestions for further research": "Suggest specific further studies arising from the limitations and findings.",
};

const SYSTEM = `You are an academic writing assistant helping a student in the social sciences or humanities draft one section of their thesis.

Non-negotiable rules:
1. Use ONLY the numbered sources provided. After any sentence that draws on a source, add its marker, e.g. [S3], or [S3][S7] for several.
2. Never mention an author, study, statistic, date, organisation report or quotation that is not in the provided sources or the student's documents. Do not write author-year citations such as (Mensah, 2019) yourself; the markers are converted later.
3. If a sentence makes a factual claim that none of the sources support, still write it if it is essential, but end it with [NEEDS SOURCE].
4. Never invent data, results, participants, sample sizes, percentages or quotations. Findings may come ONLY from the student's data, and every sentence reporting data ends with [DATA].
5. If a detail only the student knows is missing (a sample size, a district name, an approval number), write a placeholder such as [ADD: sample size] instead of guessing.
6. Write formal academic prose in British English, in the third person, with clear paragraphs. No headings, bullet points or markdown.
7. Reply with JSON only, in this shape: {"paragraphs": ["...", "..."], "notes": "one or two sentences telling the student what to check or add, or an empty string"}`;

function numberSources(sources: DraftSource[]) {
  return sources.slice(0, MAX_SOURCES).map((s, i) => ({ label: `S${i + 1}`, source: s }));
}

export function buildPrompt(input: DraftInput) {
  const { project, chapter, section } = input;
  const numbered = numberSources(input.sources);
  const lines: string[] = [];
  lines.push(`THESIS
Title: ${project.title}
Discipline: ${project.discipline}
Level: ${project.level}
Approach: ${project.approach}
${project.institution ? `University: ${project.institution}\n` : ""}Objectives:
${project.objectives}`);

  lines.push(`TASK
Write section "${section}" of Chapter ${chapter.number} (${chapter.title}).
Purpose of this chapter: ${chapter.purpose}
Guidance for this section: ${SECTION_GUIDE[section] ?? "Write this section following standard thesis conventions."}
Target length: about ${LENGTH_BY_LEVEL[project.level] ?? "400 to 600 words"}, unless the guidance asks for something shorter.`);

  if (numbered.length) {
    lines.push(
      "SOURCES (the only literature you may cite)\n" +
        numbered
          .map(
            ({ label, source: s }) =>
              `[${label}] ${s.authors.slice(0, 4).join("; ") || "Unknown author"}${s.authors.length > 4 ? " et al." : ""} (${s.year ?? "n.d."}). ${s.title}.${s.venue ? ` ${s.venue}.` : ""}\nAbstract: ${(s.abstract ?? "No abstract available. Cite only for its title-level topic.").slice(0, 700)}`,
          )
          .join("\n\n"),
    );
  } else {
    lines.push("SOURCES\nNone yet. Do not cite anything; mark any claim needing support with [NEEDS SOURCE].");
  }

  for (const d of input.proposalTexts) {
    lines.push(`STUDENT'S DOCUMENT: ${d.name}\n${d.text.slice(0, 6000)}`);
  }
  for (const d of input.dataTexts) {
    lines.push(`STUDENT'S DATA: ${d.name}\n${d.text.slice(0, 12000)}`);
  }
  if (input.context.length) {
    lines.push(
      "ALREADY WRITTEN (for continuity; do not repeat it)\n" +
        input.context.map((c) => `${c.heading}: ${c.text.slice(0, 1200)}`).join("\n\n"),
    );
  }
  lines.push(`Reply with the JSON object only.`);
  return { system: SYSTEM, prompt: lines.join("\n\n---\n\n"), labels: numbered };
}

/* ------------------------------------------------------------------ */
/* Checking what the model wrote                                        */
/* ------------------------------------------------------------------ */

export interface DraftResult {
  paragraphs: string[];
  notes: string;
  stats: { citations: number; unsupported: number; removedCitations: number; placeholders: number };
}

export function parseModelJson(text: string): { paragraphs: string[]; notes: string } {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1)) as { paragraphs?: unknown; notes?: unknown };
      const paragraphs = Array.isArray(obj.paragraphs)
        ? obj.paragraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
        : [];
      if (paragraphs.length) return { paragraphs, notes: typeof obj.notes === "string" ? obj.notes : "" };
    } catch {
      /* fall through to plain text */
    }
  }
  // Model ignored the format: treat blank-line-separated text as paragraphs.
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^#+\s.*$/gm, "").trim())
    .filter((p) => p.length > 40);
  return { paragraphs, notes: "" };
}

function surname(author: string) {
  return author.split(",")[0].trim().toLowerCase();
}

/**
 * Converts markers to stored citation tokens and removes anything the
 * model cited on its own:
 *   [S3]           -> [[<source id>]]  (unknown labels become [[?]])
 *   [NEEDS SOURCE] -> [[?]]
 *   [DATA]         -> [[data]]
 *   [ADD: x]       -> [[add:x]]
 *   (Mensah, 2019) or Mensah (2019) not among the sources -> flagged [[?]]
 */
export function checkDraft(
  raw: { paragraphs: string[]; notes: string },
  labels: { label: string; source: DraftSource }[],
  opts: { allowData: boolean },
): DraftResult {
  const byLabel = new Map(labels.map((l) => [l.label.toUpperCase(), l.source]));
  const stats = { citations: 0, unsupported: 0, removedCitations: 0, placeholders: 0 };

  const matchKnown = (name: string, year: string): DraftSource | undefined =>
    labels
      .map((l) => l.source)
      .find((s) => String(s.year) === year && s.authors.some((a) => surname(a) === name.toLowerCase()));

  const paragraphs = raw.paragraphs.map((p) => {
    let t = p.replace(/\s+/g, " ").trim();

    // Model-written parenthetical citations: (Mensah, 2019), (Mensah & Owusu, 2019; Boateng et al., 2020)
    t = t.replace(/\((?:[A-Z][A-Za-z'’\-]+[^()]*?,\s*\d{4}[a-z]?(?:;\s*)?)+\)/g, (m) => {
      const parts = m.slice(1, -1).split(";");
      const tokens = parts.map((part) => {
        const name = part.trim().match(/^([A-Z][A-Za-z'’\-]+)/)?.[1] ?? "";
        const year = part.match(/(\d{4})/)?.[1] ?? "";
        const known = matchKnown(name, year);
        if (known) {
          stats.citations += 1;
          return `[[${known.id}]]`;
        }
        stats.removedCitations += 1;
        return "[[?]]";
      });
      return tokens.join("");
    });

    // Narrative citations: Mensah (2019) / Mensah and Owusu (2019) / Mensah et al. (2019)
    t = t.replace(
      /\b([A-Z][A-Za-z'’\-]+)(?: et al\.| and [A-Z][A-Za-z'’\-]+| & [A-Z][A-Za-z'’\-]+)? \((\d{4})[a-z]?\)/g,
      (m, name: string, year: string) => {
        // A correct narrative citation of a listed source stays as written.
        if (matchKnown(name, year)) return m;
        stats.removedCitations += 1;
        return `${m} [[?]]`;
      },
    );

    // Our markers
    t = t.replace(/\[\s*S\s*(\d{1,3})\s*\]/gi, (_m, n: string) => {
      const src = byLabel.get(`S${n}`);
      if (src) {
        stats.citations += 1;
        return `[[${src.id}]]`;
      }
      stats.removedCitations += 1;
      return "[[?]]";
    });
    t = t.replace(/\[\s*NEEDS SOURCE\s*\]/gi, () => {
      stats.unsupported += 1;
      return "[[?]]";
    });
    t = t.replace(/\[\s*DATA\s*\]/gi, () => (opts.allowData ? "[[data]]" : "[[?]]"));
    t = t.replace(/\[\s*ADD:\s*([^\]]{1,80})\]/gi, (_m, what: string) => {
      stats.placeholders += 1;
      return `[[add:${what.trim().replace(/[[\]]/g, "")}]]`;
    });

    // Collapse repeated flags and tidy spacing before punctuation.
    t = t.replace(/(\[\[\?\]\]\s*){2,}/g, "[[?]]").replace(/\s+([.,;:])/g, "$1");
    return t;
  });

  stats.unsupported = paragraphs.reduce((n, p) => n + (p.match(/\[\[\?\]\]/g)?.length ?? 0), 0);
  return { paragraphs, notes: raw.notes.trim(), stats };
}
