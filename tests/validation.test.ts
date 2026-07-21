import test from "node:test";
import assert from "node:assert/strict";
import {
  surveyDefinitionSchema,
  surveySubmitSchema,
} from "../src/lib/schemas";
import { validateSurveyAnswers } from "../src/lib/survey";
import { collectLaunchIssues } from "../src/lib/launchReadiness";

test("survey definitions require unique IDs and valid choice options", () => {
  assert.equal(
    surveyDefinitionSchema.safeParse([
      { id: "q1", type: "text", prompt: "First" },
      { id: "q1", type: "text", prompt: "Second" },
    ]).success,
    false
  );
  assert.equal(
    surveyDefinitionSchema.safeParse([
      { id: "q1", type: "choice", prompt: "Pick", options: ["Only"] },
    ]).success,
    false
  );
  assert.equal(
    surveyDefinitionSchema.safeParse([
      { id: "q1", type: "choice", prompt: "Pick", options: ["A", "B"] },
    ]).success,
    true
  );
});

test("an all-optional survey accepts an empty answer list", () => {
  assert.equal(surveySubmitSchema.safeParse({ answers: [] }).success, true);
  assert.equal(
    validateSurveyAnswers(
      [{ id: "optional", type: "text", prompt: "Optional" }],
      []
    ),
    null
  );
});

test("a submitted survey cannot repeat a question ID", () => {
  assert.equal(
    surveySubmitSchema.safeParse({
      answers: [
        { question_id: "q1", answer: "A" },
        { question_id: "q1", answer: "B" },
      ],
    }).success,
    false
  );
});

test("survey answers are checked by question type", () => {
  const questions = [
    { id: "scale", type: "likert5" as const, prompt: "Scale", required: true },
    {
      id: "choice",
      type: "choice" as const,
      prompt: "Choice",
      options: ["A", "B"],
    },
  ];
  assert.equal(validateSurveyAnswers(questions, [])?.code, "missing_required");
  assert.equal(
    validateSurveyAnswers(questions, [{ question_id: "scale", answer: "6" }])?.code,
    "invalid_likert"
  );
  assert.equal(
    validateSurveyAnswers(questions, [
      { question_id: "scale", answer: "3" },
      { question_id: "choice", answer: "C" },
    ])?.code,
    "invalid_choice"
  );
});

test("launch readiness blocks missing pages, routes, and usable content", () => {
  const issues = collectLaunchIssues({
    welcomeContent: "",
    completionContent: "",
    completionRedirectUrl: null,
    completionCode: null,
    surveyJson: null,
    conditions: [
      {
        id: "condition",
        label: "Control",
        weight: 0,
        contentSet: { items: [{ contentItem: { approved: false } }] },
      },
    ],
  });
  assert.deepEqual(
    new Set(issues.map((issue) => issue.code)),
    new Set([
      "missing_welcome",
      "missing_completion",
      "missing_completion_route",
      "invalid_weight",
      "empty_content_set",
    ])
  );
});

test("a complete launch candidate passes readiness", () => {
  assert.deepEqual(
    collectLaunchIssues({
      welcomeContent: "Welcome",
      completionContent: "Thanks",
      completionRedirectUrl: null,
      completionCode: "DONE",
      surveyJson: [{ id: "q1", type: "likert5", prompt: "Question" }],
      conditions: [
        {
          id: "condition",
          label: "Control",
          weight: 1,
          contentSet: { items: [{ contentItem: { approved: true } }] },
        },
      ],
    }),
    []
  );
});
