import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // 1. Image Formatting (Works for jfif, webp, png, jpeg)
    let mimeType = file.type || "image/jpeg";
    if (mimeType === "image/jfif" || file.name.toLowerCase().endsWith(".jfif")) {
      mimeType = "image/jpeg";
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const dataURI = `data:${mimeType};base64,${base64Data}`;

    // 2. The GPT-4o System Prompt
    const systemPrompt = `
      You are an expert data extraction API. Analyze the provided receipt image.
      Extract: merchant name, date, total amount, and currency.
      
      You MUST return a JSON object using exactly this structure:
      {
        "merchant": { "value": "Example Store", "confidence": "high" },
        "date": { "value": "YYYY-MM-DD", "confidence": "high" },
        "totalAmount": { "value": "150.50", "confidence": "medium" },
        "currency": { "value": "USD", "confidence": "high" }
      }
      Use "high", "medium", or "low" for confidence. Use null for missing values.
    `;

    console.log(`Sending ${file.name} to GitHub Models (GPT-4o)...`);

    // 3. Call Microsoft/GitHub's Official Inference API
    const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [
              { type: "image_url", image_url: { url: dataURI } }
            ]
          }
        ],
        // This forces GPT-4o to strictly output JSON, preventing crashes
        response_format: { type: "json_object" } 
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("GitHub API Error:", err);
      throw new Error("Failed to fetch from GitHub API");
    }

    const data = await response.json();
    const resultText = data.choices[0].message.content;

    const jsonData = JSON.parse(resultText);
    console.log(`Success! Extracted data for ${file.name}`);
    
    return NextResponse.json(jsonData, { status: 200 });

  } catch (error) {
    console.error("🔥 Extraction Error:", error);
    return NextResponse.json(
      { error: "Failed to process receipt" },
      { status: 500 }
    );
  }
}