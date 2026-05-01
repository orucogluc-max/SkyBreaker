import { GoogleGenAI } from "@google/genai";
import { RunStats } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCrewChiefFeedback = async (stats: RunStats): Promise<string> => {
  try {
    const prompt = `
      You are a high-octane racing commentator. 
      The player just crashed in an endless runner dodging game.
      
      Stats:
      - Max Speed: ${Math.floor(stats.maxSpeed)} km/h
      - Score: ${Math.floor(stats.score)}
      - Difficulty: ${stats.difficulty}
      
      Give a SINGLE, short, energetic sentence.
      If score is low (< 500), tell them to wake up.
      If score is high (> 2000), praise their reflexes.
      Be funny and referencing "traffic" or "reflexes".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Watch the road!";
  } catch (error) {
    console.error("Crew Chief unavailable:", error);
    return "Signal lost. Eyes on the road.";
  }
};
