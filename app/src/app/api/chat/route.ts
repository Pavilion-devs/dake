import OpenAI from "openai";
import { ChatMessage, MarketContext } from "@/types/chat";

const openai = new OpenAI();

function buildSystemPrompt(market: MarketContext): string {
  return `You are an AI analyst for Dake, a confidential prediction market on Solana.

You are analyzing this market:
- Question: "${market.question}"
- Status: ${market.status}
- YES pool: ${market.totalYesAmount.toFixed(2)} SOL (${market.yesProbability.toFixed(1)}% implied probability)
- NO pool: ${market.totalNoAmount.toFixed(2)} SOL (${market.noProbability.toFixed(1)}% implied probability)
- Total participants: ${market.participantCount}
- Resolution date: ${market.resolutionDate}

Use web search to find the latest real-time information relevant to this prediction market question. Analyze the current evidence and provide:
1. A clear assessment of what the evidence suggests
2. Key factors that could influence the outcome
3. Your confidence level and reasoning

Be concise but thorough. Use markdown formatting. Frame everything as analysis, not financial advice. Always cite your sources when referencing searched information.`;
}

export async function POST(request: Request) {
  const { messages, market }: { messages: ChatMessage[]; market: MarketContext } =
    await request.json();

  const systemPrompt = buildSystemPrompt(market);

  const input = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = await openai.responses.create({
    model: "gpt-4.1-mini",
    input,
    tools: [{ type: "web_search_preview" as const }],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode((event as any).delta));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
