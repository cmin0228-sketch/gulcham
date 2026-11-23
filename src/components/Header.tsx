import React from 'react';
import { PenLine, FileText, RotateCcw, Columns, Sparkles, ShieldCheck } from 'lucide-react';
import { AppStage } from '../types';

interface HeaderProps {
  stage: AppStage;
  isRealAI: boolean;
  onNewDraft: () => void;
  onOpenCompare: () => void;
  onResetAllCards: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stage,
  isRealAI,
  onNewDraft,
  onOpenCompare,
  onResetAllCards,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#e5e9e2] transition-all">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity - Click to start new draft */}
        <button
          type="button"
          onClick={onNewDraft}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-hidden hover:opacity-90 transition-opacity"
          title="새 글 작성 창으로 이동"
        >
          <div className="w-9 h-9 rounded-xl bg-sage-primary text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
            글
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-ink-900 font-sans group-hover:text-sage-deep transition-colors">
                글침
              </span>
              <span className="text-[11px] font-semibold text-ink-500 hidden sm:inline-block border-l border-ink-200 pl-2">
                GEULCHIM
              </span>
            </div>
            <span className="text-[11px] text-ink-500 block -mt-0.5">
              문장 단위로 내용을 진단합니다.
            </span>
          </div>
        </button>

        {/* AI Mode indicator pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#f4f7f4] border border-[#dce5dd] text-ink-700">
          {isRealAI ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-800">실제 AI 연동 모드</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-amber-800">오프라인 데모 모드 (규칙 기반)</span>
            </>
          )}
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {stage === 'workspace' && (
            <>
              <button
                type="button"
                onClick={onOpenCompare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-700 bg-white border border-[#d8e0d6] hover:bg-ink-50 transition-colors shadow-2xs"
                title="원본과 현재 수정본의 단어 단위 비교"
              >
                <Columns className="w-3.5 h-3.5 text-sage-primary" />
                <span className="hidden sm:inline">수정 전후 비교</span>
              </button>

              <button
                type="button"
                onClick={onResetAllCards}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                title="모든 문장을 처음 분석 시점의 원문으로 되돌립니다"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">전체 복원</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onNewDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-sage-primary hover:bg-sage-deep transition-all shadow-xs"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>새 글 작성</span>
          </button>
        </div>
      </div>
    </header>
  );
};
