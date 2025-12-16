// app/api/generate/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    
    // Try using the Imagen 3 model
    const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const response = await result.response;
    
    // Log the response to debug if it fails again
    console.log("API Response:", JSON.stringify(response, null, 2));

    // Extract image safely
    const images = response.candidates?.[0]?.content?.parts?.filter(p => p.inlineData);

    if (!images || images.length === 0) {
       throw new Error("No image generated. The model might have returned text instead.");
    }

    const imageBase64 = images[0].inlineData?.data;

    return NextResponse.json({ image: `data:image/png;base64,${imageBase64}` });

  } catch (error: any) {
    console.error("Generation Error:", error);
    
    // Send back the specific error message to the frontend for better debugging
    return NextResponse.json({ error: error.message || "Failed to generate image" }, { status: 500 });
  }
}