import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";

export async function POST(req: Request) {
  const { imageUrl, companyName, country } = await req.json();

  // 1. OCR extract text from document
  const result = await Tesseract.recognize(imageUrl, "eng");

  const text = result.data.text.toLowerCase();

  let score = 100;
  let flags = [];

  // 2. Check company name match
  if (!text.includes(companyName.toLowerCase())) {
    score -= 30;
    flags.push("Company name mismatch");
  }

  // 3. Check country match
  if (!text.includes(country.toLowerCase())) {
    score -= 20;
    flags.push("Country mismatch");
  }

  // 4. Fake document risk signals
  if (text.length < 50) {
    score -= 25;
    flags.push("Document too short / suspicious");
  }

  // 5. Final classification
  let status = "approved";

  if (score < 40) status = "rejected";
  else if (score < 70) status = "under_review";

  return NextResponse.json({
    score,
    status,
    flags,
    extractedText: text,
  });
}