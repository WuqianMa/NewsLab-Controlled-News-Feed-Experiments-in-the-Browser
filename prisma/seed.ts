import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Offline-safe thumbnails: gradient SVG data URIs, no network or files needed.
function thumb(c1: string, c2: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="600" height="400" fill="url(#g)"/><circle cx="470" cy="110" r="70" fill="rgba(255,255,255,0.18)"/><rect x="60" y="250" width="300" height="16" rx="8" fill="rgba(255,255,255,0.35)"/><rect x="60" y="280" width="220" height="16" rx="8" fill="rgba(255,255,255,0.25)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);

type Article = {
  title: string;
  body: string;
  snippet: string;
  sourceName: string;
  category: string;
  publishedAt: Date;
  isFiller?: boolean;
  thumbnailUrl?: string | null;
  fakeLikes?: number;
  fakeComments?: number;
  fakeViews?: number;
  metadata?: object;
};

const ORIGINALS: Article[] = [
  {
    title: "City Council Approves Congestion Charge for Downtown Core",
    snippet:
      "Drivers entering the downtown core on weekdays will pay a new fee starting next spring, after a narrow 6–5 council vote.",
    body: `The city council voted 6–5 on Tuesday to approve a congestion charge for the downtown core, making it one of the first mid-sized cities in the region to adopt such a scheme. Beginning next spring, drivers entering the zone between 7 a.m. and 7 p.m. on weekdays will pay a flat daily fee of $9.\n\nSupporters of the measure pointed to modelling from the city's transportation department suggesting the charge could reduce peak-hour traffic volumes by up to 15 percent and generate an estimated $48 million a year, which the council has pledged to reinvest in bus service and cycling infrastructure. "We cannot build our way out of congestion," said Councillor Rita Alvarez, who sponsored the bill.\n\nOpponents, including several downtown business associations, argued the fee will burden commuters who lack reliable transit options and could push shoppers to suburban malls. A council amendment exempts residents living inside the zone, delivery vehicles operating before 6 a.m., and drivers with disability permits. The transportation department is expected to publish enforcement details, including camera placements and a low-income discount program, within 90 days.`,
    sourceName: "The Meridian Post",
    category: "politics",
    publishedAt: hoursAgo(3),
    thumbnailUrl: thumb("#33507a", "#7aa1d2"),
    fakeLikes: 412,
    fakeComments: 89,
    fakeViews: 12400,
  },
  {
    title: "Senate Panel Advances Bill to Tighten Campaign Finance Disclosure",
    snippet:
      "The bipartisan measure would require political nonprofits to reveal donors who give more than $10,000 in an election cycle.",
    body: `A senate committee voted 12–7 on Thursday to advance legislation that would require politically active nonprofit groups to disclose the identity of donors contributing more than $10,000 in a single election cycle. The bill now moves to the full chamber, where a vote is expected before the summer recess.\n\nThe measure targets so-called "dark money" organizations, which under current rules may spend on election advertising without naming their funders. Backers say the bill closes a loophole that has channelled hundreds of millions of dollars of untraceable spending into recent campaigns. "Voters deserve to know who is paying for the messages they see," said the bill's co-sponsor, Senator Dana Whitfield.\n\nOpponents on the committee warned the disclosure threshold could expose small advocacy groups to harassment and chill charitable giving, citing a 1958 Supreme Court precedent protecting membership lists. Several amendments to raise the threshold to $50,000 failed on party-line votes. If enacted, the rules would take effect for the next federal election cycle, and the elections commission would gain new audit authority to verify compliance.`,
    sourceName: "Verity Wire",
    category: "politics",
    publishedAt: hoursAgo(7),
    thumbnailUrl: thumb("#5a3b74", "#9b7bc0"),
    fakeLikes: 231,
    fakeComments: 145,
    fakeViews: 9800,
  },
  {
    title: "Mayor Unveils Plan to Convert Vacant Offices Into Housing",
    snippet:
      "A new incentive package aims to turn a quarter of the city's empty office space into roughly 4,000 apartments within five years.",
    body: `The mayor announced a conversion initiative on Monday that would offer tax abatements and fast-tracked permits to developers who turn vacant office buildings into residential units. City data shows nearly 22 percent of downtown office space now sits empty, the highest rate in three decades.\n\nUnder the plan, projects that reserve at least a fifth of new units for below-market rents would qualify for a 15-year property tax abatement and a single consolidated review that officials say could cut approval times from two years to six months. The administration estimates the package could produce about 4,000 apartments within five years.\n\nHousing advocates gave the proposal a mixed reception, welcoming the affordability requirement but noting that conversions tend to produce smaller, pricier units unless paired with deeper subsidies. Building-trade groups raised concerns about the structural challenges of adapting deep office floor plates for daylight and plumbing. The proposal requires council approval, and hearings are scheduled to begin in three weeks. A pilot conversion of a 1970s tower on Harbor Street is already underway.`,
    sourceName: "Coastline Daily",
    category: "politics",
    publishedAt: hoursAgo(26),
    thumbnailUrl: thumb("#3a6b5c", "#7dbfa8"),
    fakeLikes: 178,
    fakeComments: 42,
    fakeViews: 6100,
  },
  {
    title: "New Poll Shows Voters Split on Regional Transit Referendum",
    snippet:
      "Support for the half-cent sales tax measure sits at 47 percent, with one in five voters still undecided six weeks before the vote.",
    body: `A poll released Wednesday finds the region's transit referendum locked in a statistical dead heat, with 47 percent of likely voters in favor, 33 percent opposed, and 20 percent undecided. The measure would raise the sales tax by half a cent to fund a light-rail extension and expanded overnight bus service.\n\nThe survey of 1,150 likely voters, conducted by the nonpartisan Civic Research Group, carries a margin of error of 3.1 percentage points. Support is strongest among voters under 35 and residents of the urban core, while opposition concentrates among suburban homeowners who say they rarely use transit.\n\nCampaigns on both sides read the numbers as encouraging. Referendum backers note that support has climbed four points since March, while opponents point out that tax measures polling below 50 percent six weeks out have historically struggled. The poll also found that 62 percent of respondents — including a third of the measure's opponents — described current transit service as "inadequate." Election officials expect turnout near 40 percent for the June vote, and both campaigns plan major advertising pushes in the final month.`,
    sourceName: "The Ledger",
    category: "politics",
    publishedAt: hoursAgo(49),
    thumbnailUrl: null,
    fakeLikes: 96,
    fakeComments: 61,
    fakeViews: 4300,
  },
  {
    title: "Researchers Report Progress on Universal Flu Vaccine Candidate",
    snippet:
      "An mRNA-based vaccine produced broad antibody responses against 20 influenza strains in an early-stage trial of 240 adults.",
    body: `Scientists at the Harwell Institute reported Tuesday that an experimental mRNA vaccine designed to protect against all major influenza lineages produced broad immune responses in a phase 1 trial. The study, published in a peer-reviewed journal, enrolled 240 healthy adults and tracked antibody levels for six months.\n\nUnlike seasonal flu shots, which are reformulated each year to match circulating strains, the candidate encodes surface proteins from 20 influenza subtypes at once. Participants developed antibodies against all 20, and responses to the four most common human strains were comparable to those from licensed vaccines. Side effects were described as mild to moderate, most commonly fatigue and soreness at the injection site.\n\nOutside experts called the results encouraging while stressing that antibody levels are an imperfect proxy for real-world protection. "The immune breadth is impressive, but phase 3 efficacy data is the bar that matters," said Dr. Amina Osei, a vaccinologist who was not involved in the work. A larger trial involving 4,500 participants across three countries is scheduled to begin recruiting this autumn, with efficacy results expected in about two years.`,
    sourceName: "Verity Wire",
    category: "science",
    publishedAt: hoursAgo(5),
    thumbnailUrl: thumb("#2f6f7a", "#6cc3d0"),
    fakeLikes: 887,
    fakeComments: 203,
    fakeViews: 31200,
  },
  {
    title: "Study Links Late-Night Screen Use to Poorer Sleep in Teenagers",
    snippet:
      "Teens who used phones within an hour of bedtime slept 39 minutes less on average, according to a year-long study of 2,800 students.",
    body: `Adolescents who regularly use their phones in the hour before bed sleep significantly less and report lower daytime alertness, according to a study of 2,800 high-school students published Monday. Researchers tracked participants for a full academic year using wrist actigraphy and sleep diaries.\n\nStudents in the highest screen-use group fell asleep on average 24 minutes later and slept 39 minutes less per night than peers who put devices away an hour before bed. The association held after controlling for caffeine intake, homework load, and extracurricular schedules. Interactive use — messaging and short-form video — showed stronger associations than passive viewing.\n\nThe authors caution that the design cannot fully establish causation; teenagers who struggle to sleep may also reach for their phones more. Still, a smaller randomized component of the study, in which 300 volunteers charged their phones outside the bedroom for four weeks, found an average gain of 21 minutes of sleep per night. School districts in two states are reportedly weighing later start times and device-curfew education campaigns in response to a growing body of similar findings.`,
    sourceName: "The Meridian Post",
    category: "science",
    publishedAt: hoursAgo(11),
    thumbnailUrl: thumb("#4a4a6a", "#8e8ec0"),
    fakeLikes: 542,
    fakeComments: 174,
    fakeViews: 18700,
  },
  {
    title:
      "Coastal Wetlands Restoration Shows Faster Carbon Uptake Than Expected",
    snippet:
      "Restored salt marshes along the estuary are sequestering carbon at nearly twice the rate projected when the project began in 2019.",
    body: `A five-year monitoring report released Thursday finds that restored salt marshes along the Belmont Estuary are capturing carbon at almost double the rate projected when the restoration began in 2019. The 340-hectare project, a partnership between the state environment agency and two universities, re-flooded former agricultural land and replanted native marsh grasses.\n\nSediment cores show the marshes are accumulating organic carbon at roughly 3.1 tonnes per hectare per year, compared with the 1.7 tonnes forecast in the original environmental assessment. Researchers attribute the difference to faster-than-expected plant colonization and high sediment supply from the river. The restored zone has also recorded returning populations of juvenile fish and three wading-bird species absent from the site for decades.\n\nThe authors note that wetland carbon storage can be partially offset by methane emissions, which the team measured at low levels consistent with the site's salinity. The findings are likely to inform the state's plan to restore a further 1,200 hectares of coastal wetland by 2032, though the report cautions that results from a single estuary may not generalize to sites with different tidal ranges.`,
    sourceName: "Coastline Daily",
    category: "science",
    publishedAt: hoursAgo(30),
    thumbnailUrl: thumb("#2d5f43", "#79b98f"),
    fakeViews: 5400,
  },
  {
    title: "Health Agency Reviews Data on Popular Weight-Loss Supplement",
    snippet:
      "Regulators opened a safety review of berberine products after a rise in adverse-event reports, though no recall has been ordered.",
    body: `The national health agency said Friday it has opened a safety review of berberine, a plant compound widely marketed online as a "natural" weight-loss aid, following a threefold increase in adverse-event reports over the past year. Most reports involve gastrointestinal complaints; a small number describe interactions with prescription diabetes and blood-thinning medications.\n\nSales of berberine supplements have surged, driven by social-media posts describing the compound as a low-cost alternative to prescription weight-loss drugs. Clinical evidence, however, remains thin: a 2023 meta-analysis of 12 small trials found average weight loss of about 1.8 kilograms over three months, with wide variation and generally low study quality.\n\nThe agency emphasized that no recall has been ordered and that the review is precautionary. It urged consumers to tell their doctors about any supplements they take, noting that berberine can amplify the effect of medications metabolized by the liver. Industry groups said they welcomed the review and pointed to voluntary quality-certification programs. Findings are expected within six months, and the agency said labelling changes are the most likely outcome if risks are confirmed.`,
    sourceName: "The Ledger",
    category: "science",
    publishedAt: hoursAgo(54),
    thumbnailUrl: null,
    fakeLikes: 310,
    fakeComments: 97,
    fakeViews: 15600,
  },
  {
    title: "Rovers Clinch Playoff Spot With Stoppage-Time Winner",
    snippet:
      "A 94th-minute header from captain Elias Munro sent the home crowd into raptures and sealed a 2–1 win over Northgate.",
    body: `The Rovers secured their first playoff berth in six seasons on Saturday, beating Northgate 2–1 on a stoppage-time header from captain Elias Munro. The winner came moments after Northgate had struck the crossbar at the other end.\n\nPlaying in front of a sold-out home crowd, the Rovers fell behind in the 18th minute but equalized before half-time through winger Tomas Vidal, whose curling effort from the edge of the box was his tenth goal of the campaign. Munro's decisive goal arrived from a corner in the fourth minute of added time, sparking a pitch-side celebration that briefly delayed the restart.\n\n"This group never stopped believing," manager Carla Jensen said afterwards. "The supporters dragged us over the line." The result lifts the Rovers to fourth place with two matches remaining. Their playoff opener is expected to be played at home in three weeks, with ticket details to be announced Monday.`,
    sourceName: "Sideline Report",
    category: "sports",
    publishedAt: hoursAgo(15),
    isFiller: true,
    thumbnailUrl: thumb("#6a3b2e", "#d29a6a"),
    fakeLikes: 1204,
    fakeComments: 356,
    fakeViews: 45200,
    metadata: { media: "video" },
  },
  {
    title: "Night Market Festival Returns With Record 200 Vendors",
    snippet:
      "The waterfront festival opens Friday with its largest-ever lineup of food stalls, makers, and live performances across three piers.",
    body: `The city's annual Night Market Festival returns to the waterfront this weekend with a record 200 vendors, up from 140 last year. Organizers have expanded the footprint across three piers and added a second performance stage for local bands and dance troupes.\n\nFirst held eight years ago as a one-night pop-up with two dozen stalls, the festival now draws an estimated 80,000 visitors over its three-night run and has become a launching pad for small food businesses. At least a dozen brick-and-mortar restaurants in the city trace their origins to a festival stall.\n\nNew this year is a dedicated makers' row featuring ceramicists, printmakers, and jewellers, along with a family hour on Sunday evening before the main crowds arrive. Organizers advise taking transit, as nearby parking sold out in advance for all three nights. The festival runs Friday through Sunday, 5 p.m. to midnight, with free entry.`,
    sourceName: "Coastline Daily",
    category: "culture",
    publishedAt: hoursAgo(9),
    isFiller: true,
    thumbnailUrl: thumb("#7a2f55", "#d06a9b"),
    fakeLikes: 640,
    fakeComments: 72,
    fakeViews: 21000,
  },
  {
    title: "Local Bakery's Sourdough Wins National Baking Prize",
    snippet:
      "Fern Street Bakery took top honors in the artisan bread category, beating 300 entries with a 48-hour cold-fermented loaf.",
    body: `Fern Street Bakery has won the national artisan bread championship, taking first place in a field of more than 300 entries with its signature 48-hour cold-fermented sourdough. Judges praised the loaf's "shattering crust and custardy, open crumb."\n\nOwner and head baker Priya Raman opened the neighborhood shop nine years ago after leaving a career in accounting. The winning loaf uses a starter she has maintained for over a decade and flour milled from a single farm two counties away. "The starter is the real champion," Raman joked at the ceremony. "I just keep it fed."\n\nThe prize includes a feature in a national food magazine and a spot judging next year's competition. Regulars, meanwhile, are bracing for longer lines: the bakery sold out of every loaf by 9 a.m. the morning after the announcement. Raman says she has no plans to expand beyond the single location, though weekend pre-orders will open next month to manage demand.`,
    sourceName: "The Meridian Post",
    category: "culture",
    publishedAt: hoursAgo(70),
    isFiller: true,
    thumbnailUrl: null,
    fakeLikes: 322,
    fakeComments: 58,
  },
  {
    title: "Museum's Immersive Light Exhibit Extends Run Through Summer",
    snippet:
      "After drawing 150,000 visitors in three months, the projection-mapped installation will now run through the end of August.",
    body: `The city museum announced Wednesday that its immersive light exhibition, "Afterglow," will extend its run through the end of August after drawing more than 150,000 visitors since opening in March — the strongest attendance for a special exhibition in the museum's history.\n\nThe installation transforms six galleries with floor-to-ceiling projection mapping set to an original score, tracing the history of artificial light from gas lamps to LED cityscapes. Weekend time slots have sold out consistently, and the museum will add late-night Friday hours starting next week.\n\nCurators credit the show's popularity partly to its design for all ages: children can trigger interactive projections in two galleries, while a quieter "slow room" offers a low-stimulation version of the experience. Members receive priority booking for the newly released dates, which go on general sale Monday. A companion outdoor projection on the museum's facade is planned for the final two weeks of the run.`,
    sourceName: "The Ledger",
    category: "culture",
    publishedAt: hoursAgo(100),
    isFiller: true,
    thumbnailUrl: thumb("#2e3a6a", "#6a7ad2"),
    fakeViews: 8900,
  },
];

// Hand-written variants for the 8 measured (non-filler) articles.
// 4 reframed + 4 with_rebuttal. Bodies reuse original paragraphs where sensible.
type VariantSpec = {
  sourceIndex: number;
  variantType: string;
  title: string;
  transform: (originalBody: string) => string;
  snippet: string;
};

const rebuttal = (originalBody: string, factCheck: string) =>
  `${originalBody}\n\n---\n\n**FACT CHECK:**\n\n${factCheck}`;

const VARIANTS: VariantSpec[] = [
  {
    sourceIndex: 0,
    variantType: "reframed_left",
    title: "Council Puts People Over Cars: Downtown Congestion Charge Passes",
    snippet:
      "After years of gridlock and dirty air, the council finally voted to make drivers pay their fair share — and fund transit for everyone.",
    transform: (body) =>
      `In a long-overdue win for clean air and working families who rely on public transit, the city council voted Tuesday to make drivers finally pay a fair share of the costs their cars impose on everyone else. The $9 weekday charge for the downtown core — a policy that has cut traffic and pollution in every city that has tried it — passed 6–5 over the objections of car-dependent suburban interests.\n\n${body.split("\n\n").slice(1).join("\n\n")}`,
  },
  {
    sourceIndex: 1,
    variantType: "reframed_right",
    title:
      "Senate Panel Pushes Donor Disclosure Mandate Over Privacy Objections",
    snippet:
      "Critics warn the bill would expose private citizens who donate to causes they believe in, chilling free speech and association.",
    transform: (body) =>
      `A senate committee voted Thursday to advance a sweeping disclosure mandate that critics say would strip privacy protections from private citizens who donate to causes they believe in. The bill would force nonprofit advocacy groups to hand the government the names of supporters giving over $10,000 — a threshold opponents note would sweep in small family foundations and local civic groups, exposing them to harassment and boycotts.\n\n${body.split("\n\n").slice(1).join("\n\n")}`,
  },
  {
    sourceIndex: 4,
    variantType: "reframed_left",
    title:
      "Public Science Delivers: Universal Flu Vaccine Clears First Human Trial",
    snippet:
      "Publicly funded researchers moved a step closer to ending the yearly flu-shot lottery — a reminder of what science can do when we invest in it.",
    transform: (body) =>
      `Publicly funded science notched another win this week, as researchers at the Harwell Institute — supported largely by government research grants — reported that their universal flu vaccine candidate produced broad immune protection in its first human trial. The result moves us a step closer to ending the yearly flu-shot lottery that leaves the most vulnerable exposed whenever the formula misses the mark.\n\n${body.split("\n\n").slice(1).join("\n\n")}`,
  },
  {
    sourceIndex: 5,
    variantType: "reframed_right",
    title:
      "Another Study Blames Phones for Teen Sleep — Parents, Not Policy, Hold the Answer",
    snippet:
      "Researchers again point the finger at screens, but the real story is personal responsibility: households that set device rules saw kids sleep more.",
    transform: (body) =>
      `Yet another taxpayer-funded study is telling parents what common sense already knew: teenagers who stay up scrolling sleep less. The year-long survey of 2,800 students found the biggest sleep gains not in any new regulation or school mandate, but in ordinary households where parents simply set device rules — families that moved phone charging out of the bedroom saw their kids gain 21 minutes of sleep a night.\n\n${body.split("\n\n").slice(1).join("\n\n")}`,
  },
  {
    sourceIndex: 2,
    variantType: "with_rebuttal",
    title: "Mayor Unveils Plan to Convert Vacant Offices Into Housing",
    snippet:
      "A new incentive package aims to turn empty office space into roughly 4,000 apartments — but independent analysts question the math.",
    transform: (body) =>
      rebuttal(
        body,
        `Independent housing economists reviewing the plan note three caveats. First, the 4,000-unit projection assumes every eligible building participates; comparable programs in other cities converted 30–50 percent of eligible stock. Second, engineering surveys suggest only about half of the city's vacant towers have floor plates suitable for residential conversion without major structural work. Third, the 15-year tax abatement's cost — estimated at $310 million in foregone revenue — is not included in the administration's headline figures. The affordability requirement (20 percent below-market units) is, however, consistent with programs that independent reviews have rated effective.`
      ),
  },
  {
    sourceIndex: 3,
    variantType: "with_rebuttal",
    title: "New Poll Shows Voters Split on Regional Transit Referendum",
    snippet:
      "Support sits at 47 percent with one in five undecided — here's what the poll can and cannot tell us.",
    transform: (body) =>
      rebuttal(
        body,
        `Polling analysts urge caution when interpreting single-poll results. The Civic Research Group survey used online panel recruitment, which tends to under-represent older rural voters — historically the demographic most opposed to tax measures. The four-point rise in support since March is within the combined margin of error of the two polls, so it may not reflect a real shift. The claim that measures polling under 50 percent "historically struggle" is broadly supported: an academic review of 120 local tax referenda found roughly two-thirds of those polling below 50 percent six weeks out ultimately failed. The 62 percent "inadequate service" figure, however, replicates across three independent surveys and is considered robust.`
      ),
  },
  {
    sourceIndex: 6,
    variantType: "with_rebuttal",
    title:
      "Coastal Wetlands Restoration Shows Faster Carbon Uptake Than Expected",
    snippet:
      "Restored marshes are sequestering carbon at nearly twice the projected rate — independent scientists largely confirm, with caveats.",
    transform: (body) =>
      rebuttal(
        body,
        `The core finding — carbon accumulation of about 3.1 tonnes per hectare per year — is consistent with rates measured in other high-sediment estuaries and was verified by an external lab re-analyzing a subset of sediment cores. Two caveats apply. The comparison baseline (1.7 tonnes) came from a conservative planning document, so "double the projection" partly reflects a cautious original estimate rather than an extraordinary outcome. And the five-year window captures the fastest phase of marsh development; accumulation typically slows as marshes mature, so long-term averages will likely be lower. The methane measurements were taken in summer only, which may modestly understate annual emissions.`
      ),
  },
  {
    sourceIndex: 7,
    variantType: "with_rebuttal",
    title: "Health Agency Reviews Data on Popular Weight-Loss Supplement",
    snippet:
      "Regulators opened a safety review of berberine products. A closer look at the claims circulating on social media.",
    transform: (body) =>
      rebuttal(
        body,
        `Claims circulating on social media that berberine is "nature's Ozempic" are not supported by the evidence. The compound acts through different biological pathways than GLP-1 medications, and the best available meta-analysis shows average weight loss of under 2 kilograms — roughly a tenth of what clinical trials report for prescription GLP-1 drugs. The interaction warnings in the article are well-documented: berberine inhibits liver enzymes (CYP3A4 and CYP2D6) that metabolize many common medications, a mechanism confirmed in multiple pharmacokinetic studies. The claim that the review is "precautionary" matches the agency's published statement; no evidence of acute toxicity at typical doses has been reported.`
      ),
  },
];

const WELCOME = `## Welcome to the study

Thank you for your interest in this research study on how people read and evaluate online news.

**What you will do.** You will browse a news feed, read anything that interests you, and answer a few short questions at the end. This takes about 10–15 minutes.

**What we collect.** We record how you interact with the feed (scrolling, taps, reading time) and your answers. We do **not** collect your name, email address, IP address, or any other directly identifying information. Your data is stored under a random identifier.

**Your rights.** Participation is voluntary. You may stop at any time by closing this page. You may request deletion of your data by contacting the research team with your completion code. Data protection questions: dpo@example-university.eu.

This study has been approved by the university research ethics committee (ref. CER-2026-041).`;

const COMPLETION = `## Thank you!

Your responses have been recorded.

**About this study (debrief).** The news feed you just browsed was created for research purposes. Some of the articles were modified versions of the originals: depending on the group you were randomly assigned to, articles may have been reworded or supplemented with fact-check notes. No real news outlet published the exact texts you saw, and the outlet names were fictional.

We study how presentation changes the way people read and evaluate news. If you have questions about the study, or wish to withdraw your data, please contact the research team.`;

async function main() {
  // Idempotent: wipe in FK-safe order, then recreate.
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.contentSetItem.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.contentSet.deleteMany();
  await prisma.contentItem.deleteMany({ where: { sourceItemId: { not: null } } });
  await prisma.contentItem.deleteMany();
  await prisma.generationLog.deleteMany();
  await prisma.experiment.deleteMany();
  await prisma.researcher.deleteMany();

  const email = process.env.ADMIN_EMAIL || "admin@newslab.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const admin = await prisma.researcher.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: "Demo Admin",
      role: "admin",
    },
  });

  const originals = [];
  for (const a of ORIGINALS) {
    originals.push(
      await prisma.contentItem.create({
        data: {
          title: a.title,
          body: a.body,
          snippet: a.snippet,
          sourceName: a.sourceName,
          category: a.category,
          publishedAt: a.publishedAt,
          isFiller: a.isFiller ?? false,
          thumbnailUrl: a.thumbnailUrl ?? null,
          fakeLikes: a.fakeLikes ?? null,
          fakeComments: a.fakeComments ?? null,
          fakeViews: a.fakeViews ?? null,
          metadata: a.metadata ?? undefined,
          approved: true,
        },
      })
    );
  }

  const variants = [];
  for (const v of VARIANTS) {
    const src = originals[v.sourceIndex];
    variants.push(
      await prisma.contentItem.create({
        data: {
          title: v.title,
          body: v.transform(src.body),
          snippet: v.snippet,
          sourceName: src.sourceName,
          category: src.category,
          publishedAt: src.publishedAt,
          thumbnailUrl: src.thumbnailUrl,
          fakeLikes: src.fakeLikes,
          fakeComments: src.fakeComments,
          fakeViews: src.fakeViews,
          sourceItemId: src.id,
          variantType: v.variantType,
          approved: true,
          approvedAt: new Date(),
          approvedById: admin.id,
        },
      })
    );
  }

  const experiment = await prisma.experiment.create({
    data: {
      researcherId: admin.id,
      name: "Demo: news framing & evaluation",
      slug: "demo-misinformation",
      description:
        "Seeded demo experiment. Control sees original articles; treatment sees reframed/fact-checked variants. Safe to modify or delete.",
      status: "active",
      assignmentMethod: "balanced",
      targetSampleSize: 100,
      welcomeContent: WELCOME,
      completionContent: COMPLETION,
      completionCode: "NUZE-2026-DEMO",
      surveyJson: [
        {
          id: "trust",
          type: "likert5",
          prompt:
            "Overall, the articles I read were accurate and trustworthy.",
          required: true,
        },
        {
          id: "topic",
          type: "choice",
          prompt: "Which topic did you find most engaging?",
          options: ["Politics", "Science & health", "Sports", "Culture"],
          required: true,
        },
        {
          id: "unusual",
          type: "text",
          prompt: "Did anything in the feed seem unusual to you?",
          required: false,
        },
      ],
    },
  });

  // Sets: measured items interleaved with the same fillers in both sets.
  const fillers = originals.filter((o) => o.isFiller);
  const measuredOriginals = originals.filter((o) => !o.isFiller);

  const interleave = (measured: { id: string }[]) => {
    const order: string[] = [];
    let f = 0;
    measured.forEach((m, i) => {
      order.push(m.id);
      if ((i + 1) % 2 === 0 && f < fillers.length) order.push(fillers[f++].id);
    });
    while (f < fillers.length) order.push(fillers[f++].id);
    return order;
  };

  const controlSet = await prisma.contentSet.create({
    data: { name: "control_set", experimentId: experiment.id },
  });
  const reframedSet = await prisma.contentSet.create({
    data: { name: "reframed_set", experimentId: experiment.id },
  });

  await prisma.contentSetItem.createMany({
    data: interleave(measuredOriginals).map((id, i) => ({
      contentSetId: controlSet.id,
      contentItemId: id,
      position: i,
    })),
  });
  await prisma.contentSetItem.createMany({
    data: interleave(variants).map((id, i) => ({
      contentSetId: reframedSet.id,
      contentItemId: id,
      position: i,
    })),
  });

  await prisma.condition.create({
    data: {
      experimentId: experiment.id,
      label: "control",
      description: "Original, unmodified articles in a fixed order.",
      contentSetId: controlSet.id,
      feedLayout: "vertical",
      feedOrder: "fixed",
    },
  });
  await prisma.condition.create({
    data: {
      experimentId: experiment.id,
      label: "reframed",
      description:
        "Reframed / fact-checked variants, shuffled per participant.",
      contentSetId: reframedSet.id,
      feedLayout: "vertical",
      feedOrder: "shuffled",
    },
  });

  console.log(
    `Seeded: 1 researcher (${email}), 1 experiment (demo-misinformation), 2 conditions, 2 sets, ${originals.length} originals + ${variants.length} variants.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
