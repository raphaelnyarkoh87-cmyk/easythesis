/**
 * Academic configuration: supported disciplines, levels,
 * referencing styles, and the five-chapter structure.
 * EasyThesis is limited to the social sciences and humanities.
 */

export const DISCIPLINES = {
  "Social sciences": [
    "Anthropology",
    "Communication and Media Studies",
    "Development Studies",
    "Economics",
    "Education",
    "Gender Studies",
    "Human Geography",
    "Management and Business Studies",
    "Political Science",
    "Psychology",
    "Public Administration",
    "Social Work",
    "Sociology",
  ],
  Humanities: [
    "African Studies",
    "Archaeology",
    "History",
    "Language and Linguistics",
    "Literature",
    "Philosophy",
    "Religious Studies",
    "Theatre and Performing Arts",
  ],
} as const;

export const LEVELS = [
  "Undergraduate project",
  "Master's thesis",
  "MPhil thesis",
  "PhD dissertation",
] as const;

export const REFERENCING_STYLES = ["APA 7th edition", "Harvard"] as const;

export const APPROACHES = ["Quantitative", "Qualitative", "Mixed methods"] as const;

export interface ChapterSpec {
  number: number;
  title: string;
  purpose: string;
  sections: string[];
  /** Chapters that report findings need the student's own data. */
  needsUserData: boolean;
}

export const CHAPTERS: ChapterSpec[] = [
  {
    number: 1,
    title: "Introduction",
    purpose: "Sets out the problem, the aims and the scope of the study.",
    sections: [
      "Background to the study",
      "Statement of the problem",
      "Purpose of the study",
      "Research objectives",
      "Research questions or hypotheses",
      "Significance of the study",
      "Delimitation",
      "Limitations",
      "Definition of terms",
      "Organisation of the study",
    ],
    needsUserData: false,
  },
  {
    number: 2,
    title: "Literature review",
    purpose: "Places the study within theory and existing evidence.",
    sections: [
      "Theoretical framework",
      "Conceptual review",
      "Empirical review",
      "Conceptual framework",
      "Gaps in the literature",
    ],
    needsUserData: false,
  },
  {
    number: 3,
    title: "Research methods",
    purpose: "Explains and justifies how the study was carried out.",
    sections: [
      "Research philosophy",
      "Research design",
      "Study area",
      "Population",
      "Sample and sampling procedure",
      "Data collection instruments",
      "Validity and reliability, or trustworthiness",
      "Data collection procedure",
      "Data analysis",
      "Ethical considerations",
    ],
    needsUserData: false,
  },
  {
    number: 4,
    title: "Results and discussion",
    purpose: "Reports your findings and discusses them against the literature.",
    sections: [
      "Demographic characteristics of respondents",
      "Findings by research objective",
      "Discussion of findings",
    ],
    needsUserData: true,
  },
  {
    number: 5,
    title: "Summary, conclusions and recommendations",
    purpose: "Summarises the findings and states what they mean.",
    sections: [
      "Summary of the study",
      "Key findings",
      "Conclusions",
      "Recommendations",
      "Suggestions for further research",
    ],
    needsUserData: true,
  },
];
