import { GoogleGenAI, Type } from "@google/genai";
import { QuizQuestion, Difficulty } from '../types';

const fetchDailyQuizQuestions = async (difficulty: Difficulty): Promise<QuizQuestion[]> => {
  try {
    // Ensure the API key is available
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured in your environment.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
    Generate 6 unique, ${difficulty.toLowerCase()}-level English quiz questions.
    Provide them in a valid JSON array format.
    Each question object in the array must have three properties:
    1. "question": A string for the question text. It can be a fill-in-the-blank (using "___"), a vocabulary definition, or a grammar challenge.
    2. "options": An array of 4 unique strings representing possible answers.
    3. "correctAnswer": A string containing the correct answer, which must be one of the options.

    Ensure the questions cover a mix of grammar, vocabulary, and sentence structure appropriate for the ${difficulty} level.
    Do not repeat questions or answers.
    The output must be only the JSON array, with no other text or markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert English language teacher helping students improve their skills through daily practice. Create engaging, educational, and accurate questions.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "The quiz question text.",
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "An array of four possible answers.",
              },
              correctAnswer: {
                type: Type.STRING,
                description: "The correct answer, must be one of the options.",
              },
            },
            required: ["question", "options", "correctAnswer"],
          },
        },
      },
    });

    const jsonText = response.text.trim();
    const questions = JSON.parse(jsonText) as QuizQuestion[];

    // Basic validation
    if (!Array.isArray(questions) || questions.length !== 6) {
        throw new Error("Invalid data format received from API.");
    }
    
    return questions;
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    throw new Error("Failed to generate new quiz questions. Please check your connection and API key.");
  }
};

export { fetchDailyQuizQuestions };