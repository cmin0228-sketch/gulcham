export type EditMode = 'advice' | 'rewrite' | 'lock';

export type SuggestionStatus = 'ready' | 'stale' | 'applied' | 'error';

export interface AdviceData {
  issues: string[];
  explanation: string;
  actionableHint: string;
}

export interface TextChangeItem {
  original: string;
  revised: string;
  reason?: string;
}

export interface Suggestion {
  id: string;
  sentenceId: string;
  sourceText: string;
  sourceVersion: number;
  suggestedText?: string; // rewrite 모드에서 제공되는 대체 문장
  reason: string;
  adviceData?: AdviceData; // advice 모드에서 제공되는 문제점 목록 및 진단
  changes?: TextChangeItem[]; // 세부 수정 내역 목록
  status: SuggestionStatus;
  isMock: boolean;
  createdAt: number;
}

export interface SentenceCard {
  id: string;
  paragraphIndex: number;
  originalText: string;
  currentText: string;
  mode: EditMode;
  version: number;
  suggestion?: Suggestion;
  isLoadingAi?: boolean;
  aiError?: string | null;
}

export type AppStage = 'landing' | 'workspace';

export interface DocumentState {
  id: string;
  stage: AppStage;
  originalFullText: string;
  cards: SentenceCard[];
  lastUpdatedAt: number;
}

export interface SentenceContext {
  prevSentence?: string;
  nextSentence?: string;
  paragraphText?: string;
}

export interface AIServiceResponse {
  mode: 'advice' | 'rewrite';
  advice?: AdviceData;
  suggestedText?: string;
  reason: string;
  changes?: TextChangeItem[];
  isMock: boolean;
}
