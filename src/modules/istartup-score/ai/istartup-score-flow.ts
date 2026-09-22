
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { format } from 'date-fns';

/* ------------------------- Schema Definitions ------------------------- */
const CompanyInfoSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  incorporationState: z.string().optional(),
  incorporationYear: z.string().optional(),
  officerName: z.string().optional(),
}).optional().nullable();

const iStartupScoreFlowSchema = z.object({
  answers: z.array(z.object({
    questionId: z.number(),
    answer: z.string(),
  })),
  startupName: z.string(),
  companyInfo: CompanyInfoSchema,
  askedQuestionIds: z.array(z.number()),
});

const ReportOutputSchema = z.object({
  startupName: z.string(),
  markdownReport: z.string(),
  scores: z.array(z.object({
    category: z.string(),
    score: z.number(),
  })),
  finalScore: z.number(),
  generatedDate: z.string(),
});

export type IStartupReport = z.infer<typeof ReportOutputSchema>;

import assessmentData from './istartup-assessment-data.json';

const { assessmentConfig, categoryWeights, questionPoints } = assessmentData;

const getCategoryName = (index: number) => {
  if (index < 5) return "Management";
  if (index < 11) return "Momentum";
  if (index < 16) return "Business Model";
  if (index < 21) return "Motivation";
  return "Market";
};

const calculateScores = (answers: number[]) => {
  const categoryScores: { [key: string]: { score: number, maxScore: number } } = {
    Management: { score: 0, maxScore: 0 },
    Momentum: { score: 0, maxScore: 0 },
    'Business Model': { score: 0, maxScore: 0 },
    Motivation: { score: 0, maxScore: 0 },
    Market: { score: 0, maxScore: 0 },
  };

  answers.forEach((answer, index) => {
    const category = getCategoryName(index);
    if (categoryScores[category] && questionPoints[index] !== undefined) {
      categoryScores[category].score += answer * (questionPoints[index] / 5);
      categoryScores[category].maxScore += questionPoints[index];
    }
  });

  let finalScore = 0;
  const categoryPercentages: { category: string, score: number }[] = [];
  for (const category in categoryScores) {
    const { score, maxScore } = categoryScores[category];
    const percentage = maxScore > 0 ? (score / maxScore) : 0;
    categoryPercentages.push({ category, score: Math.round(percentage * 100) });
    const weightedScore = percentage * categoryWeights[category as keyof typeof categoryWeights];
    finalScore += weightedScore;
  }

  return {
    finalScore: Math.round(finalScore * 500),
    categoryScores: categoryPercentages,
  };
};

const localGenerateReport = (
  startupName: string,
  startupDescription: string,
  answers: number[],
  companyInfo: z.infer<typeof CompanyInfoSchema>
): IStartupReport => {
  const { finalScore, categoryScores } = calculateScores(answers);

  let report = `### **ISTARTUP Score for ${startupName}**\n\n`;
  if (companyInfo) {
    report += `**Company Information:**\n`;
    if (companyInfo.name) report += `- **Name:** ${companyInfo.name}\n`;
    if (companyInfo.type) report += `- **Type:** ${companyInfo.type}\n`;
    if (companyInfo.incorporationState) report += `- **State of Incorporation:** ${companyInfo.incorporationState}\n`;
    if (companyInfo.incorporationYear) report += `- **Year of Incorporation:** ${companyInfo.incorporationYear}\n`;
    if (companyInfo.officerName) report += `- **Officer Name:** ${companyInfo.officerName}\n`;
    report += `\n`;
  }
  report += `**1. Startup Overview:** ${startupDescription}\n\n`;
  report += `**2. Key Findings & Deep Analysis:**\n`;
  categoryScores.forEach(c => {
    report += `- **${c.category}:** The ${c.category.toLowerCase()} score of ${c.score}% indicates potential with areas for optimization. `;
    report += `A deeper analysis suggests focusing on strategic improvements to enhance investor appeal.\n`;
  });
  report += `\n**3. Final Readiness Assessment & Funding Recommendation:**\n`;
  report += `Your final readiness score is **${finalScore}/500**.\n\n`;
  report += `**Commentary:**\n`;
  if (finalScore > 400) {
    report += `An exceptionally strong score, indicating a high degree of investor readiness. This startup is likely to be a top contender for funding.\n`;
  } else if (finalScore > 300) {
    report += `A strong score, suggesting a solid foundation and good potential. With targeted improvements, this startup can become highly attractive to investors.\n`;
  } else if (finalScore > 200) {
    report += `A moderate score, indicating that while the startup has potential, there are significant areas that need to be addressed to attract investors.\n`;
  } else {
    report += `A low score, suggesting that the startup is in the early stages of development and requires significant work before it will be ready for investment.\n`;
  }
  report += `\nGenerated on ${format(new Date(), "MMMM d, yyyy")}.\n`;

  return {
    startupName,
    markdownReport: report,
    scores: categoryScores,
    finalScore,
    generatedDate: format(new Date(), "MMMM d, yyyy"),
  };
};


export const iStartupScoreFlow = ai.defineFlow(
  {
    name: 'iStartupScoreFlow',
    inputSchema: iStartupScoreFlowSchema as any,
    outputSchema: z.union([
      z.object({
        question: z.string(),
        questionId: z.number(),
      }),
      ReportOutputSchema
    ]) as any,
  },
  async ({ answers, startupName, companyInfo, askedQuestionIds }) => {
    const firstQuestion = assessmentConfig.questions.find(q => q.id === 1 && q.isFixed);
    
    if (!firstQuestion) {
      throw new Error("The fixed question with ID 1 is missing in the assessment configuration.");
    }

    // Step 1: Handle the initial question
    if (askedQuestionIds.length === 0) {
      return {
        question: firstQuestion.question,
        questionId: firstQuestion.id,
      };
    }

    const remainingQuestions = assessmentConfig.questions.filter(q => !(q.id === 1 && q.isFixed));
    const unaskedQuestions = remainingQuestions.filter(q => !askedQuestionIds.includes(q.id));

    // Step 2: Ask the remaining questions randomly
    if (unaskedQuestions.length > 0) {
      const nextQuestion = unaskedQuestions[Math.floor(Math.random() * unaskedQuestions.length)];
      const variationIndex = Math.floor(Math.random() * (nextQuestion.variations?.length || 1));
      
      return {
        question: nextQuestion.variations ? nextQuestion.variations[variationIndex] : nextQuestion.question,
        questionId: nextQuestion.id,
      };
    }

    // Step 3: All questions are asked, generate the report directly
    const descriptionAnswer = answers.find((a: any) => (a as any).questionId === 1);
    const description = descriptionAnswer ? descriptionAnswer.answer : "No description provided.";

    const sortedAnswers = answers
      .filter((a: any) => (a as any).questionId !== 1)
      .sort((a: any, b: any) => (a as any).questionId - b.questionId);
    
    const numericAnswers = sortedAnswers
      .map((a: any) => parseInt((a as any).answer, 10))
      .filter((num: any) => !isNaN(num) && num >= 1 && num <= 5);
    
    return localGenerateReport(startupName, description, numericAnswers, companyInfo);
  }
);