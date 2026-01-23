import { GoogleGenerativeAI } from "@google/generative-ai";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

// 1. Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { image, story, building, theme } = await req.json();

    // 2. Initialize Gemini 2.5 Flash (The CURRENT standard model)
    // FIX: Changed from 'gemini-1.5-flash' (retired) to 'gemini-2.5-flash' (active)
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });

    // 3. Construct the "Director" Prompt (Gemini will write the description)
    let promptContext = `
    You are an expert AI Art Director.
    Task: Write a single, highly detailed image generation prompt for a poster.
    
    Context:
    - Story: "${story}"
    - Setting: "${building}" of SRM University
    - Art Style: "${theme}"
    `;

    let generatedPrompt = "";

    // 4. IF IMAGE EXISTS: Use Gemini Vision to "See" it
    if (image) {
        // Strip base64 header if present
        const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;
        
        const visionResult = await model.generateContent([
            { text: promptContext + "\n\nINSTRUCTION: Analyze the uploaded user photo. Write a prompt that describes a movie poster featuring THIS PERSON (describe their look, hair, clothes from the photo) integrated into the scene described above. Ensure the lighting and mood match the requested theme." },
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
        ]);
        generatedPrompt = visionResult.response.text();
    } else {
        // IF NO IMAGE: Just write a prompt based on the story
        const textResult = await model.generateContent([
            { text: promptContext + "\n\nINSTRUCTION: Write a prompt for a high-quality poster illustration representing this story. Describe the character, lighting, and composition." }
        ]);
        generatedPrompt = textResult.response.text();
    }

    // Clean the prompt
    const finalImagePrompt = generatedPrompt.replace(/\n/g, " ").trim();
    console.log("Generated Prompt for AI:", finalImagePrompt);

    // 5. GENERATE IMAGE (Using Pollinations as the Engine)
    // We use the 'Flux' model for high quality.
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalImagePrompt)}?width=768&height=1024&model=flux&nologo=true`;

    const imageRes = await fetch(pollinationsUrl);
    if (!imageRes.ok) throw new Error("Image generation failed");
    
    const arrayBuffer = await imageRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. UPLOAD TO AWS S3
    const filename = `poster-${Date.now()}.jpg`;

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: "image/jpeg",
    });

    await s3Client.send(command);

    // 7. RETURN S3 URL
    const s3Url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;

    return NextResponse.json({ 
        image: s3Url 
    });

  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}