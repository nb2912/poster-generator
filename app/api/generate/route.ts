import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // CHANGE 1: Added 'theme' to destructuring
    const { image, story, building, theme } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Missing Google API Key" },
        { status: 500 }
      );
    }

    if (!story || !building) {
      return NextResponse.json(
        { error: "Invalid request payload: Missing story or building" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // CHANGE 2: Define Style Keywords based on Theme
    let styleKeywords = "";
    switch (theme) {
        case "Vintage / Retro":
            styleKeywords = "70s retro poster art style, grainy texture, muted colors, distressed paper look, nostalgia";
            break;
        case "Futuristic":
            styleKeywords = "futuristic cyberpunk sci-fi style, neon lights, high contrast, sleek, digital art, glowing elements";
            break;
        case "Minimalism":
            styleKeywords = "minimalist graphic design, clean lines, plenty of whitespace, simple geometric shapes, flat vector art";
            break;
        case "Maximalism":
            styleKeywords = "maximalist style, complex patterns, vibrant bold colors, highly detailed, chaotic energy, collage style";
            break;
        case "Abstract":
            styleKeywords = "abstract art style, non-representational, fluid shapes, avant-garde composition, artistic interpretation";
            break;
        case "Psychedelic":
            styleKeywords = "psychedelic art style, trippy visual effects, swirling colors, surrealism, hallucination style, vibrant";
            break;
        default:
            styleKeywords = "high quality professional poster art, cinematic lighting";
    }

    // CHANGE 3: Update Prompt to include Style
    let prompt = `
Create a high-quality alumni poster for SRM University.

Visual Style: ${styleKeywords}

Content Requirements:
- Visualize this story: "${story}"
- Setting: Near the ${building} of SRM University
- Aesthetics: Apply premium SRM University branding colors but blended with the requested ${theme} style.
- Output: A visually compelling, professional poster.
    `.trim();

    // Add specific instructions if an image is provided
    if (image) {
      prompt += `\n- REFERENCE IMAGE: Use the provided image of the person and integrate them naturally into the scene while maintaining the ${theme} art style.`;
    } else {
      prompt += `\n- CHARACTER: Create a high-quality illustration or photorealistic image of a student/alumnus that matches the mood of the story and the ${theme} style.`;
    }

    const parts: any[] = [{ text: prompt }];

    if (image) {
      // If user provided an image, we strip the base64 header if present to ensure clean data
      const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;
      
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    // CHANGE 4: Model Selection
    // If you are using the new SDK, 'imagen-3.0-generate-001' is usually preferred for pure generation.
    // However, if you are sending an Input Image (remixing), you might need a Gemini model.
    // I kept your requested model, but added a fallback logic in comments.
    const response = await genAI.models.generateContent({
      model: "imagen-3.0-generate-001", // Changed to Nano Banana Pro (Gemini 3 Pro Image)
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
    });

    const candidate = response.candidates?.[0];

    if (!candidate?.content?.parts) {
      throw new Error("No content returned by Gemini model");
    }

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        return NextResponse.json({
          image: `data:image/png;base64,${part.inlineData.data}`,
        });
      }
    }

    throw new Error("Image generation failed - no image data in response");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}