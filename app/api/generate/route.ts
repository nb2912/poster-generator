import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image, story, building } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: "Missing Google API Key" },
        { status: 500 }
      );
    }

    // CHANGE 1: Image is no longer required in this check
    if (!story || !building) {
      return NextResponse.json(
        { error: "Invalid request payload: Missing story or building" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // CHANGE 2: Base prompt setup
    let prompt = `
Create a high-quality alumni poster for SRM University.

Requirements:
- Include the following story: "${story}"
- Set the scene near the ${building} of SRM University
- Apply premium SRM branding aesthetics
- Generate a visually compelling, professional poster
    `.trim();

    // CHANGE 3: Add specific instructions based on whether an image was uploaded
    if (image) {
      prompt += `\n- Use the provided image of the person and integrate them naturally into the scene.`;
    } else {
      prompt += `\n- Create a high-quality illustration or photorealistic image of a student/alumnus that matches the mood of the story.`;
    }

    // CHANGE 4: Construct the 'parts' array dynamically
    const parts: any[] = [{ text: prompt }];

    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image",
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

    throw new Error("Image generation failed");

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}