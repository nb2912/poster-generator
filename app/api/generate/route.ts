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

    if (!image || !story || !building) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenAI({
      apiKey: process.env.GOOGLE_API_KEY,
    });

    const prompt = `
Create a high-quality alumni poster for SRM University.

Requirements:
- Use the provided image of the person
- Include the following story: "${story}"
- Set the scene near the ${building} of SRM University
- Apply premium SRM branding aesthetics
- Generate a visually compelling, professional poster
    `.trim();

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image,
              },
            },
          ],
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
