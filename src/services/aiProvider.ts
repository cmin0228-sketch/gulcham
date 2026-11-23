import { AIServiceResponse, SentenceContext } from '../types';

export interface AIProvider {
  /**
   * Generates feedback or rewrites for a single sentence.
   * Locked sentences should NEVER be passed here.
   */
  generateForSentence(
    sentence: string,
    mode: 'advice' | 'rewrite',
    context?: SentenceContext
  ): Promise<AIServiceResponse>;
  
  /**
   * Checks if real AI service is configured (e.g. backend has API key).
   */
  isRealAI(): boolean;
}
