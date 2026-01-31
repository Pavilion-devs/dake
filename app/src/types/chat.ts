export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MarketContext {
  question: string;
  status: string;
  totalYesAmount: number;
  totalNoAmount: number;
  yesProbability: number;
  noProbability: number;
  participantCount: number;
  resolutionDate: string;
}
