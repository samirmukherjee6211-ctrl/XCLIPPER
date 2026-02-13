
import { GoogleGenAI } from "@google/genai";

const FLASH_MODEL = 'gemini-2.5-flash-image';
const PRO_MODEL = 'gemini-3-pro-image-preview';
const REASONING_MODEL = 'gemini-3-pro-preview';
const GEMINI_IMAGE_GEN = 'gemini-2.0-flash-exp';

export class GeminiService {
  /**
   * Enhances a thumbnail prompt using Google Gemini to make it more effective for viral thumbnails.
   */
  async enhancePrompt(userPrompt: string): Promise<string> {
    const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error("API key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const systemPrompt = `You are an expert YouTube thumbnail designer and viral content strategist. You have analyzed thousands of successful thumbnails from top creators like MrBeast, MKBHD, and other viral YouTubers. You understand:

- Visual hierarchy and composition
- Color psychology and contrast
- Emotional triggers and curiosity gaps
- Text placement and readability
- Audience retention tactics
- Click-through rate optimization
- Trending visual styles

Your task is to take a user's thumbnail idea and enhance it into a detailed, professional prompt that will generate a high-performing YouTube thumbnail. Focus on:
- Making it visually striking and attention-grabbing
- Adding specific details about composition, colors, and elements
- Incorporating proven viral thumbnail techniques
- Ensuring the design drives clicks and engagement

Keep the enhanced prompt concise but detailed (2-3 sentences max). Make it actionable for image generation.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: {
          parts: [{
            text: systemPrompt + `\n\nEnhance this YouTube thumbnail idea into a detailed, professional prompt: "${userPrompt}"`
          }]
        },
        config: {
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 200
          }
        }
      });

      const enhancedPrompt = response.text?.trim();

      if (!enhancedPrompt) {
        throw new Error('No enhanced prompt returned');
      }

      return enhancedPrompt;
    } catch (error) {
      console.error("Prompt Enhancement Error:", error);
      throw error;
    }
  }

  /**
   * Analyzes a thumbnail using Google Gemini Vision to provide virality score and feedback.
   */
  async analyzeThumbnail(imageBase64: string): Promise<{
    viralityScore: number;
    pros: string[];
    cons: string[];
    suggestions: string[];
  }> {
    const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error("API key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const systemPrompt = `You are an expert YouTube thumbnail analyst and viral content strategist. You have analyzed thousands of successful thumbnails from top creators like MrBeast, MKBHD, and other viral YouTubers.

Your task is to analyze the provided thumbnail and provide:
1. A virality score (0-100) based on click-through rate potential
2. 3-5 specific pros (what works well)
3. 3-5 specific cons (what could be improved)
4. 3-5 actionable suggestions for improvement

Consider these factors:
- Visual hierarchy and composition
- Color psychology and contrast
- Text readability and placement
- Emotional impact and curiosity gap
- Face expressions (if present)
- Background and foreground balance
- Thumbnail clarity at small sizes
- Competitive advantage in the niche

Respond with ONLY a valid JSON object in this exact format:
{
  "viralityScore": 85,
  "pros": ["Strong contrast makes text pop", "Facial expression creates curiosity"],
  "cons": ["Too much text", "Background is cluttered"],
  "suggestions": ["Reduce text to 3-5 words max", "Simplify background"]
}`;

    try {
      // Extract base64 data from data URL
      const base64Data = imageBase64.includes('base64,') 
        ? imageBase64.split('base64,')[1] 
        : imageBase64;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: {
          parts: [
            {
              text: systemPrompt + '\n\nAnalyze this YouTube thumbnail and provide a detailed assessment in JSON format.'
            },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data
              }
            }
          ]
        },
        config: {
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        }
      });

      const analysisText = response.text?.trim();

      if (!analysisText) {
        throw new Error('No analysis returned');
      }

      // Extract JSON from markdown code blocks if present
      let jsonText = analysisText;
      const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      // Parse the JSON response
      let analysis;
      try {
        analysis = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', jsonText);
        throw new Error('Failed to parse analysis results. Please try again.');
      }

      return {
        viralityScore: analysis.viralityScore || 0,
        pros: analysis.pros || [],
        cons: analysis.cons || [],
        suggestions: analysis.suggestions || []
      };
    } catch (error) {
      console.error("Thumbnail Analysis Error:", error);
      throw error;
    }
  }

  /**
   * Creates a variation of an existing prompt by tweaking it slightly for recreation.
   */
  async recreatePrompt(originalPrompt: string): Promise<string> {
    const GEMINI_API_KEY = import.meta.env.VITE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error("API key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const systemPrompt = `You are a creative YouTube thumbnail designer. Your task is to take an existing thumbnail prompt and create a fresh variation of it. The variation should:

- Keep the core concept and theme
- Change specific details like colors, angles, composition, or styling
- Add creative twists or alternative perspectives
- Maintain the same energy and appeal
- Be different enough to feel fresh but similar enough to be recognizable as a variation

Keep the recreated prompt concise but detailed (2-3 sentences max). Make it actionable for image generation.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: {
          parts: [{
            text: systemPrompt + `\n\nCreate a fresh variation of this YouTube thumbnail prompt with different details but same concept: "${originalPrompt}"`
          }]
        },
        config: {
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 200
          }
        }
      });

      const recreatedPrompt = response.text?.trim();

      if (!recreatedPrompt) {
        throw new Error('No recreated prompt returned');
      }

      return recreatedPrompt;
    } catch (error) {
      console.error("Prompt Recreation Error:", error);
      throw error;
    }
  }

  /**
   * Generates an image from a text prompt using the backend API (Nano Banana).
   * Optimized for YouTube thumbnails in 16:9 ratio.
   */
  async generateImageFromPrompt(prompt: string, persona?: any): Promise<string> {
    try {
      // Call the backend API instead of Google directly
      const response = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'Failed to generate image');
      }

      const data = await response.json();
      
      if (!data.success || !data.image) {
        throw new Error('No image data returned from server');
      }

      return data.image;
    } catch (error: any) {
      console.error("Image Generation Error:", error);
      throw new Error(error.message || 'Failed to generate thumbnail');
    }
  }

  /**
   * Analyzes 10 images of a person to extract a persistent "Identity Profile".
   * This profile describes unique facial geometry, skin texture, and markers.
   */
  async trainPersona(images: string[]): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    
    const imageParts = images.map(img => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img.split(',')[1]
      }
    }));

    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: [
        {
          parts: [
            ...imageParts,
            { text: "Analyze these 10 images of the same individual. Extract a precise, technical facial identity profile. Describe their unique bone structure, eye shape, nose bridge profile, skin tone nuances, and any distinguishing facial markers. This profile will be used to reconstruct their face in high-fidelity edits. Be extremely detailed but concise." }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a biometric identity analyst. Your output must be a clinical, high-fidelity description of facial features used for surgical-grade face reconstruction."
      }
    });

    return response.text || "Standard identity profile extracted.";
  }

  /**
   * Performs high-fidelity editing using Gemini 3 Pro (Nano Banana Pro) or Flash.
   */
  async editImage(
    base64Image: string, 
    maskBase64: string | null, 
    prompt: string, 
    personaImages: string[] = [],
    identityProfile: string | null = null,
    isFaceSwap: boolean = false
  ): Promise<string> {
    if (!import.meta.env.VITE_API_KEY) {
      throw new Error("API Key is not configured.");
    }

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    const parts: any[] = [];

    // PART 1: TARGET
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: base64Image.split(',')[1]
      }
    });

    // PART 2: MASK (General only)
    if (!isFaceSwap && maskBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: maskBase64.split(',')[1]
        }
      });
    }

    // PART 3+: IDENTITY SAMPLES (Max 10 for Pro)
    personaImages.slice(0, 10).forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: img.split(',')[1]
        }
      });
    });

    let systemInstruction = "";
    let technicalPrompt = "";

    if (isFaceSwap) {
      systemInstruction = 
        "You are Gemini 3 Pro (Nano Banana Pro), a surgical-grade identity replacement engine. " +
        "You operate on IMAGE 1 (The Target Frame). You must preserve 100% of the original background, clothing, lighting, and environment. " +
        "YOUR MISSION: Locate the specific face in IMAGE 1 described in the prompt. " +
        "REPLACE that face with the identity provided in the reference images and the Identity Profile. " +
        "IDENTITY PROFILE: " + (identityProfile || "No profile provided.") + " " +
        "STRICT: Ensure the replacement face matches the lighting and angle of the original face perfectly. " +
        "The results must be photorealistic and indistinguishable from a real photo.";
      
      technicalPrompt = `HIGH-FIDELITY SWAP: Locate "${prompt}" in IMAGE 1. Overwrite their facial features with the identity from the provided references. Ensure the blend is seamless and professional.`;
    } else {
      systemInstruction = 
        "You are an expert inpainter. Use IMAGE 2 as a mask for IMAGE 1. Preserve context. Instructions: " + prompt;
      technicalPrompt = `Inpaint IMAGE 1 via MASK 2: ${prompt}`;
    }

    parts.push({ text: technicalPrompt });

    try {
      const response = await ai.models.generateContent({
        model: isFaceSwap ? PRO_MODEL : FLASH_MODEL,
        contents: { parts },
        config: {
          systemInstruction,
          imageConfig: {
            aspectRatio: "16:9"
          }
        }
      });

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("Pro model generation failed to return valid image parts.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image data returned from Nano Banana Pro.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("entity was not found")) {
        throw new Error("API_KEY_RESET");
      }
      console.error("Gemini Edit Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
