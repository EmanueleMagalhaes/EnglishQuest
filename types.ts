
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface UserAnswer {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export enum GameState {
  Start,
  Playing,
  Finished
}

export enum AnswerFeedback {
  None,
  Correct,
  Incorrect
}

export enum Difficulty {
    Phase1 = "Fase 1",
    Phase2 = "Fase 2",
    Phase3 = "Fase 3",
    Phase4 = "Fase 4",
}

export interface QuizHistoryItem {
    date: string; // ISO String
    score: number;
    totalQuestions: number;
    difficulty: Difficulty;
}
