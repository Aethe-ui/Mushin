import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOpenAI, MUSHIN_SYSTEM_PROMPT } from "@/lib/openai";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    workspace_content: string;
    session_goal?: string;
    user_signal: "inactivity" | "manual";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.workspace_content !== "string") {
    return NextResponse.json({ error: "workspace_content required" }, { status: 400 });
  }

  const signal = body.user_signal === "manual" ? "manual" : "inactivity";

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 150,
      temperature: 0.4,
      messages: [
        { role: "system", content: MUSHIN_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Content: ${body.workspace_content}\nGoal: ${body.session_goal ?? ""}\nSignal: ${signal}`,
        },
      ],
    });

    const suggestion_text =
      completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      suggestion_text,
      suggestion_type: "passive",
    });
  } catch {
    return NextResponse.json(
      { suggestion_text: "", suggestion_type: "passive" },
      { status: 200 }
    );
  }
}
