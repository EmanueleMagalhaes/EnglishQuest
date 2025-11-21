
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizQuestion, Difficulty } from '../types';

const cleanJSON = (text: string): string => {
  // Remove markdown code blocks if present (```json ... ```)
  let clean = text.replace(/```json/g, '').replace(/```/g, '');
  // Remove any leading/trailing whitespace
  return clean.trim();
};

// Helper function to shuffle an array (Fisher-Yates algorithm)
export const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

const getPhaseDescription = (difficulty: Difficulty): string => {
    switch (difficulty) {
        case Difficulty.Phase1:
            return "Level: Absolute Beginner (CEFR A1). Content: Simple vocabulary (colors, numbers, family, days), basic greetings, and present simple tense ('I am', 'He likes'). Short, clear sentences.";
        case Difficulty.Phase2:
            return "Level: Elementary (CEFR A2). Content: Daily routines, past simple tense, basic prepositions, shopping conversations, and travel phrases. Sentences with simple conjunctions.";
        case Difficulty.Phase3:
            return "Level: Intermediate (CEFR B1/B2). Content: Conditionals (if clauses), present perfect tense, passive voice, and varied vocabulary related to work, technology, and opinions.";
        case Difficulty.Phase4:
            return "Level: Advanced (CEFR C1/C2). Content: Complex grammar structures, idioms, phrasal verbs, nuance in meaning, and professional/academic vocabulary.";
        default:
            return "General English knowledge.";
    }
};

const fetchDailyQuizQuestions = async (difficulty: Difficulty): Promise<QuizQuestion[]> => {
  try {
    // Access the key directly. The vite config handles the trimming.
    const apiKey = process.env.API_KEY;

    // --- DEBUGGING LOGIC START ---
    // This will appear in your browser console (F12) so you can verify the key status
    if (!apiKey || apiKey === "undefined" || apiKey === "") {
        console.error("CRITICAL ERROR: API Key is completely missing in the app code.");
        throw new Error("MISSING_API_KEY");
    } else {
        // We show the first 4 chars to verify it's the NEW key, not the old one.
        console.log(`[Gemini Service] Key loaded successfully. Prefix: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);
    }
    // --- DEBUGGING LOGIC END ---

    const ai = new GoogleGenAI({ apiKey: apiKey });

    const phaseContext = getPhaseDescription(difficulty);

    const prompt = `
    Create 6 distinct English quiz questions for a student at the "${difficulty}" level.
    
    Specific Instructions for this Level:
    ${phaseContext}
    
    General Requirements:
    - Context should be modern and relevant.
    - Do not repeat concepts within the same quiz.
    - Ensure the difficulty strictly matches the description above.
    
    Output Format: JSON Array only.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are a world-class English Linguistics Professor designing a curriculum. Your goal is to create a quiz that matches the requested proficiency level exactly. Ensure distractors (wrong answers) are plausible but clearly incorrect to a knowledgeable student.`,
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
    
    // Process questions: Ensure exactly 6 and SHUFFLE options for randomness
    const processedQuestions = questions.slice(0, 6).map(q => ({
        ...q,
        // Shuffle options so the answer isn't always A or B.
        options: shuffleArray(q.options) 
    }));

    return processedQuestions;

  } catch (error: any) {
    console.error("Detailed API Error:", error);
    
    let errorMessage = error.message || JSON.stringify(error);

    // Detect Google Security Block (Leaked Key) or Invalid Key
    if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED")) {
         throw new Error("API Key Permission Denied (403). Google blocked this request. Ensure 'Generative Language API' is enabled in Google Cloud Console.");
    }
    
    if (errorMessage.includes("400") || errorMessage.includes("INVALID_ARGUMENT") || errorMessage.includes("not valid")) {
         throw new Error("API Key Invalid. The key provided in Vercel settings is incorrect.");
    }

    if (errorMessage === "MISSING_API_KEY") {
        throw new Error("API Key missing. Please check Vercel Environment Variables and Redeploy.");
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
