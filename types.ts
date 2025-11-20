
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
    Beginner = "Beginner",
    Intermediate = "Intermediate",
    Advanced = "Advanced",
}

export interface QuizHistoryItem {
    date: string; // ISO String
    score: number;
    totalQuestions: number;
    difficulty: Difficulty;
}
