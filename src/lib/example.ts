import type { Project, Source } from "./types";

/**
 * Sample content for the landing page and the example project.
 * Every source below is a real, published work with a real DOI.
 * Sentences marked [[?]] have no supporting source, and the app
 * flags them so the student adds one or rewrites the claim.
 */

export const EXAMPLE_SOURCES: Source[] = [
  {
    id: "jack2014",
    authors: ["Jack, W.", "Suri, T."],
    year: 2014,
    title:
      "Risk sharing and transactions costs: Evidence from Kenya's mobile money revolution",
    venue: "American Economic Review",
    volume: "104",
    issue: "1",
    pages: "183–223",
    doi: "10.1257/aer.104.1.183",
    retrievedFrom: "OpenAlex",
    verification: "verified",
  },
  {
    id: "suri2016",
    authors: ["Suri, T.", "Jack, W."],
    year: 2016,
    title: "The long-run poverty and gender impacts of mobile money",
    venue: "Science",
    volume: "354",
    issue: "6317",
    pages: "1288–1292",
    doi: "10.1126/science.aah5309",
    retrievedFrom: "Semantic Scholar",
    verification: "verified",
  },
  {
    id: "davis1989",
    authors: ["Davis, F. D."],
    year: 1989,
    title:
      "Perceived usefulness, perceived ease of use, and user acceptance of information technology",
    venue: "MIS Quarterly",
    volume: "13",
    issue: "3",
    pages: "319–340",
    doi: "10.2307/249008",
    retrievedFrom: "OpenAlex",
    verification: "verified",
  },
  {
    id: "braun2006",
    authors: ["Braun, V.", "Clarke, V."],
    year: 2006,
    title: "Using thematic analysis in psychology",
    venue: "Qualitative Research in Psychology",
    volume: "3",
    issue: "2",
    pages: "77–101",
    doi: "10.1191/1478088706qp063oa",
    retrievedFrom: "Crossref",
    verification: "verified",
  },
];

export const EXAMPLE_BACKGROUND = [
  "Mobile money has changed how households in sub-Saharan Africa store and move value. In Kenya, users of M-PESA were able to smooth consumption after negative income shocks, largely because the service lowered the cost of receiving remittances from a wider social network [[jack2014]]. Longer-run evidence from the same country links access to the service with higher per capita consumption and a reduction in poverty, with larger effects among female-headed households [[suri2016]].",
  "Whether traders adopt and keep using such services depends partly on how they perceive them. The Technology Acceptance Model holds that perceived usefulness and perceived ease of use shape a person's intention to use a technology [[davis1989]]. Market traders in Cape Coast rely on daily cash flow to meet household needs [[?]], yet little is known about how they use mobile money to absorb financial shocks.",
];

export function buildExampleProject(): Project {
  return {
    id: "example",
    isExample: true,
    title:
      "Mobile money use and household financial resilience among market traders in Cape Coast, Ghana",
    discipline: "Development Studies",
    level: "MPhil thesis",
    approach: "Mixed methods",
    referencing: "APA 7th edition",
    institution: "Example only",
    objectives:
      "1. Examine the extent of mobile money use among market traders.\n2. Assess how perceived usefulness and ease of use relate to continued use.\n3. Explore how traders use mobile money to cope with financial shocks.",
    createdAt: new Date("2026-10-01T09:00:00Z").toISOString(),
    chapters: [
      {
        number: 1,
        status: "drafted",
        sections: { "Background to the study": EXAMPLE_BACKGROUND },
        updatedAt: new Date("2026-10-02T10:30:00Z").toISOString(),
      },
      { number: 2, status: "outlined", sections: {} },
      { number: 3, status: "not_started", sections: {} },
      { number: 4, status: "locked", sections: {} },
      { number: 5, status: "locked", sections: {} },
    ],
    sources: EXAMPLE_SOURCES,
    documents: [],
  };
}
