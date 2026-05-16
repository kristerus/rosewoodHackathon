import { NextResponse } from "next/server";
import { searchImages } from "@/lib/tavily";

export const runtime = "nodejs";

interface ResearchImagesRequest {
  name?: string;
  role_hint?: string;
  max_images?: number;
}

export async function POST(req: Request) {
  let body: ResearchImagesRequest;
  try {
    body = (await req.json()) as ResearchImagesRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = (body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Missing required field: name" },
      { status: 400 },
    );
  }

  if (!process.env.TAVILY_API_KEY) {
    return NextResponse.json(
      {
        error: "TAVILY_API_KEY not set",
        message:
          "Add TAVILY_API_KEY=tvly-... to your .env.local to enable guest image research.",
      },
      { status: 400 },
    );
  }

  try {
    const { images, query } = await searchImages(name, {
      roleHint: body.role_hint,
      maxImages: body.max_images,
    });
    return NextResponse.json({ images, query });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.warn("[research-images] Tavily call failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
