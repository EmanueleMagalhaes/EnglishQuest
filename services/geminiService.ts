import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, Difficulty } from '../types';

const fetchDailyQuizQuestions = async (difficulty: Difficulty): Promise<QuizQuestion[]> => {
  try {
    // Ensure the API key is available
    if (!process.env.API_KEY) {
        throw new Error("MISSING_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Create 6 distinct English quiz questions for a student at the ${difficulty} level.
    
    Requirements:
    - Questions should verify grammar, vocabulary, or idiom knowledge.
    - Context should be modern and relevant.
    - Do not repeat concepts.
    
    Output Format: JSON Array only.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a world-class English Linguistics Professor designing a curriculum for ${difficulty} students. Your goal is to test nuance and accuracy. Ensure distractors (wrong answers) are plausible but clearly incorrect to a knowledgeable student.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The question text. Use '___' for blanks.",
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "A list of exactly 4 possible options.",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "The correct option from the list.",
              },
            },
            required: ["question", "options", "correctAnswer"],
          },
        },
      },
    });

    if (!response.text) {
        throw new Error("Empty response from AI");
    }

    const questions = JSON.parse(response.text) as QuizQuestion[];

    // Basic validation
    if (!Array.isArray(questions) || questions.length !== 6) {
        throw new Error("Invalid data format received from API.");
    }
    
    return questions;
  } catch (error: any) {
    console.error("Error fetching quiz questions:", error);
    if (error.message === "MISSING_API_KEY") {
        throw new Error("API Key missing. Please add API_KEY to your Vercel Environment Variables.");
    }
    throw new Error("Failed to generate quiz. Please check your connection.");
  }
};

export { fetchDailyQuizQuestions };