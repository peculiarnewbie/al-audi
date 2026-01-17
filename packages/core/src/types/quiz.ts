export type QuizQuestionBase = {
    id: string;
    prompt: string;
    type: "multiple-choice" | "text";
};

export type MultipleChoiceQuestion = QuizQuestionBase & {
    type: "multiple-choice";
    options: string[];
    correctOptionIndex: number | null;
};

export type TextQuestion = QuizQuestionBase & {
    type: "text";
    answer: string;
};

export type QuizQuestion = MultipleChoiceQuestion | TextQuestion;

export type QuizPayload = {
    id: string;
    creatorId: string;
    createdAt: string;
    questions: QuizQuestion[];
};
