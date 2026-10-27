import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { AIUnavailableError, aiUnavailableBody, generateWithClaude } from "@/src/lib/ai/client";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, context } = await request.json();

  try {
    const result = await generateWithClaude({
      systemPrompt: `You are a marketing AI assistant for Conduikt. Provide brief, actionable suggestions.

Context: ${JSON.stringify(context || {})}

Respond in JSON format: { "suggestions": [{ "text": "string", "type": "string" }] }`,
      userPrompt: prompt,
      model: "claude-sonnet-4-6",
      maxTokens: 1000,
    });

    return NextResponse.json({ content: result.content });
  } catch (err) {
    if (err instanceof AIUnavailableError) return NextResponse.json(aiUnavailableBody(err), { status: 503 });
    throw err;
  }
}
