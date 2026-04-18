import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

interface GenerateRequest {
  businessName: string;
  category: string;
  location: string;
  offerSummary: string;
  originalPrice: string;
  dealPrice: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  const body: GenerateRequest = await request.json();
  const { businessName, category, location, offerSummary, originalPrice, dealPrice } = body;

  if (!businessName || !category || !location || !offerSummary || !originalPrice || !dealPrice) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const orig = parseFloat(originalPrice);
  const deal = parseFloat(dealPrice);

  if (isNaN(orig) || isNaN(deal) || deal >= orig || orig <= 0) {
    return NextResponse.json(
      { error: "Deal price must be lower than original price" },
      { status: 400 }
    );
  }

  const savings = (orig - deal).toFixed(2);
  const savingsPercent = Math.round(((orig - deal) / orig) * 100);

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `You are an expert copywriter for Groupon, the deal marketplace. You write compelling, editorial-quality deal descriptions that drive conversions. Your tone is warm, confident, and slightly playful — like a knowledgeable friend who found a great deal. You never sound like AI-generated content.`,
    messages: [
      {
        role: "user",
        content: `Write a Groupon-style deal description. Output each section on its own line with a prefix. Use EXACTLY this format — no extra blank lines between items:

HEADLINE: [punchy headline under 80 chars, lead with "${savingsPercent}% Off"]
SUBHEADER: [one-sentence teaser under 120 chars, no emojis]
COMPANY: [2-3 editorial sentences about the business, mention location naturally]
BULLET: [what's included, specific and value-focused]
BULLET: [another inclusion or benefit]
BULLET: [another inclusion or benefit]
BULLET: [deal price $${deal.toFixed(2)} saves $${savings} off the $${orig.toFixed(2)} value]
FINE: [expiration window, e.g. "Expires 6 months from purchase date"]
FINE: [appointment requirement]
FINE: [limit per customer]
FINE: [new vs. existing customer policy]
FINE: [any category-specific restriction]

Business: ${businessName}
Category: ${category}
Location: ${location}
Offer: ${offerSummary}
Original Price: $${orig.toFixed(2)}
Deal Price: $${deal.toFixed(2)}
Savings: $${savings} (${savingsPercent}% off)

Output ONLY the prefixed lines above. No JSON, no markdown, no extra text.`,
      },
    ],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
