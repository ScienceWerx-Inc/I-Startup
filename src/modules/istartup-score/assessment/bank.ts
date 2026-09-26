/**
 * The iSTARTUP instrument: five scored sections of five questions each, plus an unscored
 * profile that frames the report.
 *
 * ── Why written anchors instead of "rate 1–5" ──
 * The chat version asked founders to rate themselves 1–5 on phrases like "How strong is
 * your advisory board?". That asks each founder to invent what a 3 means, and nobody
 * applies that invention consistently across 25 questions. Every position here is a
 * concrete, checkable claim — the founder either recognises their startup in it or does
 * not. The stored value is still the 1–5 the scorer reads; only the question changed.
 *
 * `weight` is the question's point value within its section (carried over from the
 * original `questionPoints`), so a question worth 30 moves its section twice as far as
 * one worth 15.
 */

export type CategoryKey = 'management' | 'momentum' | 'business_model' | 'motivation' | 'market';

export interface AnswerOption {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
}

export interface Question {
  id: string;
  category: CategoryKey;
  title: string;
  prompt: string;
  weight: number;
  options: AnswerOption[];
  /** Report copy when the answer is 4–5. */
  strength: string;
  /** Report copy when the answer is 1–2. */
  gap: string;
  /** The recommended next step when this question is a gap. */
  action: string;
}

export interface Section {
  key: CategoryKey;
  ordinal: number;
  title: string;
  /** Share of the final score, summing to 1 across sections. */
  weight: number;
  summary: string;
  intro: string;
}

export const SECTIONS: Section[] = [
  {
    key: 'management',
    ordinal: 1,
    title: 'Management',
    weight: 0.2,
    summary: 'Team capability, advisors and stewardship of capital.',
    intro:
      'Investors back teams before they back ideas. This section looks at the experience your founders bring, how you use outside guidance, and how prepared you are to deploy capital responsibly.',
  },
  {
    key: 'momentum',
    ordinal: 2,
    title: 'Momentum',
    weight: 0.25,
    summary: 'Traction, adoption, validation and measurable growth.',
    intro:
      'Momentum is the evidence that the market is already responding. It carries the most weight in the score, so answer based on what you can show today rather than what you expect next quarter.',
  },
  {
    key: 'business_model',
    ordinal: 3,
    title: 'Business Model',
    weight: 0.2,
    summary: 'Revenue model, scalability and path to profitability.',
    intro:
      'A fundable business turns demand into durable revenue. These questions cover how you make money, how costs behave as you grow, and how clearly you can state your value to each audience.',
  },
  {
    key: 'motivation',
    ordinal: 4,
    title: 'Motivation',
    weight: 0.15,
    summary: 'Timing, urgency, team–product fit and defensibility.',
    intro:
      'Why this team, and why now? This section examines the forces driving demand, the fit between your team and the product, and how well your innovation is protected and validated.',
  },
  {
    key: 'market',
    ordinal: 5,
    title: 'Market',
    weight: 0.2,
    summary: 'Market size, growth, customer pain and differentiation.',
    intro:
      'The final section sizes the opportunity: how big and fast-growing the market is, how acute the problem is for customers, and how clearly you stand apart from the alternatives.',
  },
];

const q = (
  id: string,
  category: CategoryKey,
  title: string,
  prompt: string,
  weight: number,
  labels: [string, string, string, string, string],
  copy: { strength: string; gap: string; action: string },
): Question => ({
  id,
  category,
  title,
  prompt,
  weight,
  options: labels.map((label, i) => ({ value: (i + 1) as AnswerOption['value'], label })),
  ...copy,
});

export const QUESTIONS: Question[] = [
  // ── Management ──────────────────────────────────────────────────────────
  q('M1', 'management', 'Team track record', 'How much relevant industry experience does the founding team bring?', 20, [
    'No one on the team has worked in this industry.',
    'Some adjacent experience, but none directly in this industry.',
    'At least one founder has several years of direct industry experience.',
    'Founders have deep industry experience and a record of delivered results.',
    'Founders have previously led or exited a comparable company in this industry.',
  ], {
    strength: 'The founding team brings direct, proven industry experience — the first signal most seed investors weigh.',
    gap: 'Limited direct industry experience on the founding team reads as execution risk to investors.',
    action: 'Recruit an operator or co-founder with direct industry experience, or formalise advisors who have built in this space.',
  }),
  q('M2', 'management', 'Coachability', 'When a mentor or investor challenges your plan, what typically happens?', 20, [
    'We rarely seek outside input on major decisions.',
    'We listen, but seldom change course based on feedback.',
    'We take feedback seriously and occasionally adjust.',
    'We actively seek critique and can point to decisions it changed.',
    'We run a regular feedback cadence with mentors and track the changes it produces.',
  ], {
    strength: 'The team seeks out critique and can show decisions it changed — a strong predictor of how capital will be used.',
    gap: 'Outside feedback rarely changes the plan, which investors read as a risk to how their guidance will land.',
    action: 'Set a monthly mentor review and keep a short log of the decisions it changes; share it in investor conversations.',
  }),
  q('M3', 'management', 'Advisory board', 'Which best describes your advisory board?', 20, [
    'We have no advisors.',
    'Informal advisors, not engaged on a regular basis.',
    'A few advisors with relevant expertise, engaged occasionally.',
    'A committed board covering our key gaps (technical, commercial, regulatory).',
    'Recognised industry experts, formally engaged, who actively open doors for us.',
  ], {
    strength: 'A committed, credible advisory board covers the team’s gaps and extends its reach.',
    gap: 'The advisory bench is thin or informal, leaving key gaps in the team uncovered.',
    action: 'Map your team’s top three gaps and recruit one formally engaged advisor for each, with defined time and equity.',
  }),
  q('M4', 'management', 'Capital stewardship', 'How prepared are you to show an investor exactly how their capital will be used?', 20, [
    'We have not yet planned how funds would be spent.',
    'A rough idea of spending, without a budget.',
    'A budget tied to our main priorities.',
    'A milestone-based budget with runway projections.',
    'A milestone budget, a record of hitting prior budgets, and clear financial controls.',
  ], {
    strength: 'A milestone-based use of funds with runway projections gives investors confidence in capital discipline.',
    gap: 'There is no clear plan for how new capital would be deployed, which stalls diligence early.',
    action: 'Build a milestone-based use-of-funds plan: what each tranche buys, by when, and the runway it leaves.',
  }),
  q('M5', 'management', 'Growth vision', 'How clear is your plan for growing the company over the next 24 months?', 20, [
    'We are focused on the present; there is no growth plan yet.',
    'A general direction, but no defined milestones.',
    'A written plan with key milestones.',
    'A milestone plan with owners, dates and the resources each requires.',
    'A plan the whole team executes against, reviewed and updated regularly.',
  ], {
    strength: 'A concrete 24-month plan with owners and dates shows a team that can convert vision into execution.',
    gap: 'Without defined milestones, the growth story is hard for investors to underwrite.',
    action: 'Write a one-page 24-month plan: four to six milestones, each with an owner, a date and the resources it needs.',
  }),

  // ── Momentum ────────────────────────────────────────────────────────────
  q('T1', 'momentum', 'Customer traction', 'What is your current customer traction?', 30, [
    'No users or customers yet.',
    'Pilot or free users only.',
    'A handful of paying customers.',
    'Recurring revenue from a growing customer base.',
    'Strong recurring revenue with low churn and expanding accounts.',
  ], {
    strength: 'Paying, recurring customers are the strongest evidence of demand an early-stage company can show.',
    gap: 'Without paying customers, demand is still a hypothesis — the single largest drag on this score.',
    action: 'Convert pilots into paid engagements, even at a discount; one paying customer outweighs many free users.',
  }),
  q('T2', 'momentum', 'Adoption pace', 'How quickly are target customers adopting the product?', 20, [
    'It is too early to measure adoption.',
    'Adoption is slow and requires heavy effort per customer.',
    'Steady adoption through our direct efforts.',
    'Consistent month-over-month growth, some through referral.',
    'Rapid growth, much of it inbound or word-of-mouth.',
  ], {
    strength: 'Consistent, partly organic adoption suggests product–market pull rather than push.',
    gap: 'Adoption depends heavily on founder effort per customer, which limits how fast the company can grow.',
    action: 'Instrument your funnel and find the single step where most prospects stall; fix that before adding channels.',
  }),
  q('T3', 'momentum', 'Ecosystem support', 'How much support do you have from partners, accelerators or mentors?', 15, [
    'We are working without outside support.',
    'Occasional, informal support.',
    'Active membership in a program, network or partnership.',
    'Several active partnerships that contribute resources or access.',
    'Strategic partners that materially accelerate our distribution or development.',
  ], {
    strength: 'Active partners and programs are contributing real resources and access.',
    gap: 'The company is building largely without ecosystem support, missing leverage that peers use.',
    action: 'Apply to one sector-relevant accelerator or program and identify two partners who reach your buyers.',
  }),
  q('T4', 'momentum', 'External validation', 'What external recognition has the startup received?', 15, [
    'None yet.',
    'Pitched at events, but no awards or press.',
    'Won a competition or grant, or received notable press.',
    'Multiple awards, grants or coverage in industry media.',
    'Recognised by top-tier programs, investors or national media.',
  ], {
    strength: 'Third-party recognition gives investors independent validation of the opportunity.',
    gap: 'There is little independent validation yet for investors to anchor on.',
    action: 'Target two competitions or non-dilutive grants in your sector this quarter; both create validation and capital.',
  }),
  q('T5', 'momentum', 'Measurable growth', 'How well can you evidence growth with numbers?', 20, [
    'We don’t yet track growth metrics.',
    'We track some metrics, but not consistently.',
    'We track core metrics (revenue, users, pipeline) monthly.',
    'We can show consistent growth on core metrics over six months or more.',
    'We have investor-grade metrics showing sustained growth.',
  ], {
    strength: 'Consistent, tracked growth metrics let investors verify the story rather than take it on trust.',
    gap: 'Growth is not yet evidenced in numbers, so the traction story is hard to verify.',
    action: 'Pick three core metrics, track them monthly from today, and report them in a simple investor update.',
  }),

  // ── Business Model ──────────────────────────────────────────────────────
  q('B1', 'business_model', 'Revenue model', 'How defined is your revenue model?', 25, [
    'We have not decided how we will make money.',
    'A few candidate models are under consideration.',
    'A chosen model consistent with industry norms, not yet proven.',
    'A model validated by paying customers at our target price.',
    'A proven model with healthy unit economics (lifetime value well above acquisition cost).',
  ], {
    strength: 'The revenue model is validated by customers paying the target price.',
    gap: 'The revenue model is undecided or unproven, so investors cannot yet model returns.',
    action: 'Commit to one pricing model and test it with five prospects; record who pays, at what price, and why.',
  }),
  q('B2', 'business_model', 'Scalability', 'If demand grew tenfold, what would happen to your costs?', 25, [
    'Costs would grow roughly tenfold — each sale needs proportional effort.',
    'Costs would grow significantly, with limited leverage.',
    'Some economies of scale, with the key bottlenecks identified.',
    'Costs would grow much more slowly than revenue, with a clear plan to scale.',
    'Near-zero marginal cost per customer, with the infrastructure already in place.',
  ], {
    strength: 'Costs grow far more slowly than revenue — the operating leverage venture investors look for.',
    gap: 'Costs scale roughly with revenue, which caps margins and the size of return investors can expect.',
    action: 'Identify the most labour-intensive step in delivery and scope how to productise or automate it.',
  }),
  q('B3', 'business_model', 'Industry insight', 'How deep is the team’s understanding of the industry landscape?', 20, [
    'We are still learning how the industry works.',
    'A general understanding of the key players.',
    'A good understanding of competitors, buyers and the value chain.',
    'Detailed insight, informed by direct customer and expert conversations.',
    'Recognised insight — we see shifts the incumbents are missing.',
  ], {
    strength: 'Deep, first-hand industry insight lets the team spot opportunities incumbents miss.',
    gap: 'Industry understanding is still general, which makes positioning and pricing decisions harder.',
    action: 'Run ten structured conversations with buyers and industry experts and map the value chain from what you learn.',
  }),
  q('B4', 'business_model', 'Value proposition', 'How clearly can you state your value to customers, investors and partners?', 15, [
    'We haven’t articulated our value proposition.',
    'It is clear for one audience only.',
    'Clear for customers; less developed for investors and partners.',
    'Distinct, tested value propositions for each audience.',
    'Each audience can repeat our value back to us, and it drives their decisions.',
  ], {
    strength: 'The value proposition is distinct and tested for customers, investors and partners alike.',
    gap: 'The value proposition is not yet clear across audiences, which weakens both sales and fundraising.',
    action: 'Write a one-sentence value proposition for each audience and test each with three people from that group.',
  }),
  q('B5', 'business_model', 'Path to profitability', 'What is your path to profitability?', 15, [
    'Not yet considered.',
    'Profitability depends on assumptions we have not tested.',
    'A modelled path to profitability.',
    'A modelled path with validated assumptions on margins and costs.',
    'Profitable, or break-even on current operations.',
  ], {
    strength: 'A validated path to profitability reduces the risk and the capital the business will need.',
    gap: 'The route to profitability is untested, leaving investors to guess how much capital it will take.',
    action: 'Build a simple unit-economics model and validate its two most sensitive assumptions with real data.',
  }),

  // ── Motivation ──────────────────────────────────────────────────────────
  q('V1', 'motivation', 'Market timing', 'What is driving demand for your solution right now?', 25, [
    'We can’t point to a specific driver.',
    'General industry interest, without a clear catalyst.',
    'An identifiable trend supports demand.',
    'Several converging drivers (regulatory, technological, economic).',
    'A clear, time-bound catalyst that customers are already acting on.',
  ], {
    strength: 'Clear, converging market drivers make a compelling “why now”.',
    gap: 'There is no clear “why now”, which makes it hard for investors to see urgency.',
    action: 'Name the specific regulatory, technical or economic shift that makes this possible or necessary now, and cite evidence.',
  }),
  q('V2', 'motivation', 'Team–product fit', 'Does the team have the skills to build and deliver this product?', 25, [
    'Critical skills are missing and not yet sourced.',
    'Key skills are partly covered, with major gaps.',
    'Core skills are in place; some gaps are covered by contractors.',
    'The team covers all core skills in-house.',
    'The team has built and shipped similar products before.',
  ], {
    strength: 'The team has the in-house skills — and ideally the history — to build and ship this product.',
    gap: 'Critical build skills are missing from the team, putting delivery at risk.',
    action: 'List the skills critical to your next milestone and close the largest gap with a hire or technical co-founder.',
  }),
  q('V3', 'motivation', 'Urgency', 'What would happen if you delayed launch by twelve months?', 20, [
    'Little would change.',
    'A minor loss of position.',
    'Competitors would likely gain ground.',
    'We would likely miss a key market window.',
    'The window would likely close — acting now is essential.',
  ], {
    strength: 'A time-bound market window gives the opportunity real urgency.',
    gap: 'There is little cost to delay, which weakens the case for investing now rather than later.',
    action: 'Identify what a competitor or incumbent could lock up in the next year, and frame your timeline against it.',
  }),
  q('V4', 'motivation', 'IP protection', 'How protected is your core innovation?', 15, [
    'No IP protection, and none planned.',
    'Trade secrets or know-how only.',
    'A patent application has been filed (provisional or pending).',
    'Granted patent(s) or strongly defensible proprietary assets.',
    'A patent portfolio, with freedom to operate reviewed.',
  ], {
    strength: 'Filed or granted IP gives the innovation a defensible position.',
    gap: 'The core innovation is not formally protected, leaving it open to fast followers.',
    action: 'Book an IP counsel review to decide what to file, and consider a provisional application to secure a priority date.',
  }),
  q('V5', 'motivation', 'Concept validation', 'How has your core concept been validated?', 15, [
    'It has not been validated yet.',
    'Positive informal feedback.',
    'Structured customer interviews or a prototype test.',
    'A pilot with measurable results.',
    'Multiple pilots or deployments with documented outcomes.',
  ], {
    strength: 'Pilots with measurable results show the concept works outside the lab.',
    gap: 'The concept rests on informal feedback rather than measured results.',
    action: 'Design one pilot with a pre-agreed success metric, and document the result whatever it shows.',
  }),

  // ── Market ──────────────────────────────────────────────────────────────
  q('K1', 'market', 'Market size', 'How large is your total addressable market?', 25, [
    'Unknown, or not yet estimated.',
    'Under $50M.',
    '$50M – $500M.',
    '$500M – $5B.',
    'Over $5B, with a credible bottom-up estimate.',
  ], {
    strength: 'The addressable market is large enough to support a venture-scale outcome.',
    gap: 'The market is small or unsized, which limits the return investors can underwrite.',
    action: 'Build a bottom-up market estimate (number of buyers × price) and show the adjacent markets you can expand into.',
  }),
  q('K2', 'market', 'Market growth', 'How fast is your target market growing?', 20, [
    'Unknown, or shrinking.',
    'Flat (0–3% a year).',
    'Moderate (3–10% a year).',
    'Fast (10–25% a year).',
    'Very fast (over 25% a year).',
  ], {
    strength: 'A fast-growing market lifts every company in it and forgives early mistakes.',
    gap: 'The market is flat or its growth unknown, so the company must win share rather than ride growth.',
    action: 'Source two independent growth estimates for your segment, and identify its fastest-growing sub-segment.',
  }),
  q('K3', 'market', 'Customer pain', 'How well defined and severe is the problem you solve?', 20, [
    'We have not confirmed the problem with customers.',
    'Customers acknowledge the problem, but it is a low priority.',
    'A clear problem that customers want solved.',
    'A costly problem that customers actively budget to solve.',
    'An urgent, costly problem — customers seek us out.',
  ], {
    strength: 'Customers already budget for this problem — the clearest signal that they will pay to solve it.',
    gap: 'The problem is unconfirmed or low-priority for customers, putting willingness to pay in doubt.',
    action: 'Quantify what the problem costs a typical customer today, and confirm it with five of them.',
  }),
  q('K4', 'market', 'Differentiation', 'How differentiated is your solution from the alternatives?', 20, [
    'Similar to existing solutions.',
    'Minor improvements over the alternatives.',
    'Clear advantages on one key dimension.',
    'Significant advantages that are hard to replicate.',
    'A new category, or a step-change advantage protected by IP or data.',
  ], {
    strength: 'Hard-to-replicate advantages give the company a durable competitive position.',
    gap: 'The solution is not yet clearly differentiated, inviting price competition.',
    action: 'Build a competitor matrix on the three criteria buyers care most about, and sharpen where you win outright.',
  }),
  q('K5', 'market', 'Trend alignment', 'How aligned is your startup with the current direction of the market?', 20, [
    'Counter to current trends.',
    'Neutral to current trends.',
    'Aligned with one major trend.',
    'Well aligned with several major trends.',
    'Positioned at the centre of where the market is heading.',
  ], {
    strength: 'The company is positioned where the market is heading, not where it has been.',
    gap: 'The company is working against, or apart from, current market direction.',
    action: 'Reframe your positioning around the one major trend your solution most directly serves.',
  }),
];

/** Unscored background that frames the report — the equivalent of FounderFit's context step. */
export interface ProfileField {
  key: 'stage' | 'sector' | 'teamSize' | 'funding';
  label: string;
  options: string[];
}

export const PROFILE_FIELDS: ProfileField[] = [
  { key: 'stage', label: 'Current stage', options: ['Idea', 'Prototype', 'MVP', 'Early revenue', 'Scaling'] },
  {
    key: 'sector',
    label: 'Sector',
    options: ['Software / SaaS', 'Deep tech', 'Health & life sciences', 'Climate & energy', 'Fintech', 'Consumer', 'Other'],
  },
  { key: 'teamSize', label: 'Full-time team size', options: ['1', '2–3', '4–10', '11–25', '25+'] },
  { key: 'funding', label: 'Funding to date', options: ['Bootstrapped', 'Grants only', 'Pre-seed', 'Seed', 'Series A+'] },
];

export interface StartupProfile {
  name: string;
  description: string;
  stage?: string;
  sector?: string;
  teamSize?: string;
  funding?: string;
}

export const MAX_SCORE = 500;

export const sectionOf = (key: CategoryKey) => SECTIONS.find((s) => s.key === key)!;
export const questionsIn = (key: CategoryKey) => QUESTIONS.filter((x) => x.category === key);
