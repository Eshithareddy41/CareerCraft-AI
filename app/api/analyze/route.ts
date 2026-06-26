import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const resumeFile = formData.get("resume") as File | null;
    const jobDescription = formData.get("jobDescription") as string | null;

    if (!resumeFile) {
      return NextResponse.json(
        { error: "Resume PDF is required" },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (resumeFile.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    const arrayBuffer = await resumeFile.arrayBuffer();
    const base64Resume = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `
You are an ATS Resume Analyzer.

Analyze the uploaded resume PDF against this job description.

Job Description:
${jobDescription}

Return ONLY valid JSON. Do not include markdown, explanation, or code block.

Use this exact format:
{
  "score": 85,
  "matchPercentage": 80,
  "summary": "Short professional summary based on the actual resume and job description.",
  "strengths": ["skill1", "skill2", "skill3"],
  "missingSkills": ["skill1", "skill2"],
  "suggestions": [
    "Specific improvement suggestion 1",
    "Specific improvement suggestion 2",
    "Specific improvement suggestion 3"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64Resume,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const text = response.text ?? "";

    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze API Error:", error);

    return NextResponse.json(
      { error: "Failed to analyze resume" },
      { status: 500 }
    );
  }
}