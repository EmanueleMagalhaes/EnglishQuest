import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizQuestion, Difficulty } from '../types';

const cleanJSON = (text: string): string => {
  // Remove markdown code blocks if present (```json ... ```)
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  // Remove any leading/trailing whitespace
  return clean.trim();
};

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
    - Questions should verify grammar, vocabulary, or idiom knowledge appropriate for ${difficulty}.
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
        // Disable safety settings to prevent blocking valid educational content
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ],
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

    // Clean the response text before parsing
    const cleanedText = cleanJSON(response.text);
    
    let questions: QuizQuestion[];
    try {
        questions = JSON.parse(cleanedText) as QuizQuestion[];
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", response.text);
        throw new Error("Failed to process AI response format.");
    }

    // Basic validation
    if (!Array.isArray(questions) || questions.length < 1) {
        throw new Error("Invalid data structure received from API.");
    }
    
    // Ensure exactly 6 questions (sometimes AI generates 5 or 7)
    return questions.slice(0, 6);

  } catch (error: any) {
    console.error("Error fetching quiz questions:", error);
    
    let errorMessage = error.message || JSON.stringify(error);

    // Detect Google Security Block (Leaked Key)
    if (errorMessage.includes("leaked") || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("403")) {
         throw new Error("Your API Key was blocked by Google Security because it was leaked publicly. Please generate a NEW key at Google AI Studio.");
    }

    if (errorMessage === "MISSING_API_KEY") {
        throw new Error("API Key missing. Please add API_KEY to your .env file.");
    }
    
    // Clean up common JSON error dumps from the UI
    if (errorMessage.includes("{")) {
        try {
             // Try to extract a readable message if it's a JSON error
             const match = errorMessage.match(/"message":\s*"([^"]+)"/);
             if (match && match[1]) {
                 errorMessage = match[1];
             }
        } catch (e) { /* ignore */ }
    }

    throw new Error(`${errorMessage}`);
  }
};

export { fetchDailyQuizQuestions };