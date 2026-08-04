export type TurnRole = "student" | "tutor" | "system";

export type ConversationTurn = {
  id?: string;
  conversationId: string;
  lessonId?: string | null;
  turnOrder: number;
  role: TurnRole;
  content: string;
  meta?: Record<string, unknown>;
  createdAt?: string;
};

export type ConversationContext = {
  conversationId: string;
  rootPrompt: string;
  title?: string | null;
  lessonId?: string;
  userId?: string | null;
  plan?: unknown;
  humanSummary?: string | null;
  turns: ConversationTurn[];
};

export type ConversationListItem = {
  id: string;
  title: string;
  rootPrompt: string;
  updatedAt: string;
  preview?: string;
};
