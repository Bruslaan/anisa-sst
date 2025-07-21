import { EasyInputMessage } from 'openai/resources/responses/responses';
import {Supabase} from "../supabase";
import Message = Supabase.Message;

const MAX_CONTEXT_TOKENS = 8000;
const AVERAGE_TOKENS_PER_MESSAGE = 50;

export const optimizeContextWindow = (
  messages: Message[],
  maxMessages: number = 8
): Message[] => {
  if (messages.length <= maxMessages) {
    return messages;
  }

  const recentMessages = messages.slice(-maxMessages);
  const estimatedTokens = recentMessages.length * AVERAGE_TOKENS_PER_MESSAGE;
  
  if (estimatedTokens > MAX_CONTEXT_TOKENS) {
    const maxMessagesForTokens = Math.floor(MAX_CONTEXT_TOKENS / AVERAGE_TOKENS_PER_MESSAGE);
    return messages.slice(-maxMessagesForTokens);
  }
  
  return recentMessages;
};

export const getRelevantImageContext = (
  messages: Message[],
  maxImages: number = 3
): string[] => {
  return messages
    .filter(msg => msg.media_url?.type === 'image')
    .map(msg => msg.media_url?.url!)
    .filter(Boolean)
    .slice(-maxImages);
};

export const buildContextualHistory = (
  messages: Message[]
): {
  messageHistory: EasyInputMessage[];
  imageUrls: string[];
  contextSummary: string;
} => {
  const optimizedMessages = optimizeContextWindow(messages);
  const imageUrls = getRelevantImageContext(optimizedMessages);
  
  const messageHistory: EasyInputMessage[] = optimizedMessages
    .filter(msg => msg.content)
    .map(msg => ({
      role: msg.role,
      content: msg.content!,
    }));

  const hasImages = imageUrls.length > 0;
  const imageCount = imageUrls.length;
  const contextSummary = hasImages 
    ? `Context includes ${imageCount} recent image(s) for reference and editing.`
    : 'Text-only conversation context.';

  return {
    messageHistory,
    imageUrls,
    contextSummary
  };
};