import { AIProvider } from './aiProvider';
import { MockAIProvider } from './mockAiProvider';
import { AIServiceResponse, SentenceContext } from '../types';

export class HybridAIProvider implements AIProvider {
  private mockProvider = new MockAIProvider();
  private realAvailable: boolean = false;
  private hasChecked: boolean = false;

  constructor() {
    this.checkHealth();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        this.realAvailable = !!data.hasApiKey;
      } else {
        this.realAvailable = false;
      }
    } catch {
      this.realAvailable = false;
    } finally {
      this.hasChecked = true;
    }
    return this.realAvailable;
  }

  isRealAI(): boolean {
    return this.realAvailable;
  }

  async generateForSentence(
    sentence: string,
    mode: 'advice' | 'rewrite',
    context?: SentenceContext
  ): Promise<AIServiceResponse> {
    if (!this.hasChecked) {
      await this.checkHealth();
    }

    if (!this.realAvailable) {
      return this.mockProvider.generateForSentence(sentence, mode, context);
    }

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, mode, context }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI 서버 응답 오류');
      }

      const data = await response.json();
      return {
        mode,
        isMock: false,
        suggestedText: data.suggestedText || data.revised_text,
        reason: data.reason || 'AI 분석 결과입니다.',
        advice: data.advice,
        changes: data.changes,
      };
    } catch (err) {
      console.warn('Real AI request failed, falling back to Mock:', err);
      // Fallback cleanly to mock with notice
      const fallback = await this.mockProvider.generateForSentence(sentence, mode, context);
      return {
        ...fallback,
        reason: `[AI 서버 연결 불안정으로 데모 규칙 적용] ${fallback.reason}`,
      };
    }
  }

  async splitSentencesWithAI(text: string): Promise<string[] | null> {
    if (!this.hasChecked) {
      await this.checkHealth();
    }

    if (!this.realAvailable) return null;

    try {
      const response = await fetch('/api/ai/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (Array.isArray(data.sentences) && data.sentences.length > 0) {
        return data.sentences;
      }
      return null;
    } catch (err) {
      console.warn('AI split request failed:', err);
      return null;
    }
  }
}

export const defaultAIProvider = new HybridAIProvider();
