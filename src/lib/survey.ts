import type { SurveyQuestion } from "./constants";

export interface SurveyAnswer {
  question_id: string;
  answer: string;
}

export interface SurveyAnswerIssue {
  code:
    | "unknown_question"
    | "missing_required"
    | "invalid_likert"
    | "invalid_choice";
  question_id: string;
}

export function validateSurveyAnswers(
  questions: SurveyQuestion[],
  answers: SurveyAnswer[]
): SurveyAnswerIssue | null {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answerById = new Map(
    answers.map((answer) => [answer.question_id, answer.answer.trim()])
  );

  for (const answer of answers) {
    const question = byId.get(answer.question_id);
    if (!question) {
      return { code: "unknown_question", question_id: answer.question_id };
    }
    if (
      question.type === "likert5" &&
      !["1", "2", "3", "4", "5"].includes(answer.answer)
    ) {
      return { code: "invalid_likert", question_id: question.id };
    }
    if (
      question.type === "choice" &&
      !(question.options ?? []).includes(answer.answer)
    ) {
      return { code: "invalid_choice", question_id: question.id };
    }
  }

  for (const question of questions) {
    if (question.required && !answerById.get(question.id)) {
      return { code: "missing_required", question_id: question.id };
    }
  }

  return null;
}
