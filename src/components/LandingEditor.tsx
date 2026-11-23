import React, { useState, useEffect } from 'react';
import { ArrowRight, RotateCcw, Trash2, Sparkles, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LandingEditorProps {
  initialText: string;
  onAnalyze: (text: string) => void;
  onAnalyzeWithAi?: (text: string) => void;
  isRealAI?: boolean;
  isAnalyzingAi?: boolean;
  hasExistingCards?: boolean;
  onContinueExisting?: () => void;
  existingCardCount?: number;
}

export const SAMPLE_TEXT = `오늘은 정말 오래 기다렸던 전시를 보러 갔다. 전시장 분위기가 정말 좋았고 작품들도 정말 인상적이었다. 그런데 설명문은 다소 어려운 단어가 많아서 이해하기가 조금 어려웠다. 이런 경험은 나에게 긍정적인 정서적 만족감을 제공하였다. 시간이 된다면 꼭 다시 방문하고 싶다.

글을 올리고 나서 다시 읽어보니까 정말이라는 말을 너무 많이 쓴 것 같다. 그래도 내가 좋아하는 말투는 그대로 남겨두고 싶다.`;

export const LandingEditor: React.FC<LandingEditorProps> = ({
  initialText,
  onAnalyze,
  onAnalyzeWithAi,
  isRealAI = false,
  isAnalyzingAi = false,
  hasExistingCards = false,
  onContinueExisting,
  existingCardCount = 0,
}) => {
  const [text, setText] = useState(initialText || '');

  useEffect(() => {
    setText(initialText || '');
  }, [initialText]);

  const handleLoadSample = () => {
    setText(SAMPLE_TEXT);
  };

  const handleClear = () => {
    if (!text || window.confirm('입력한 내용을 모두 지우시겠습니까?')) {
      setText('');
    }
  };

  const handleStart = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      alert('분석할 원고를 입력해 주세요.');
      return;
    }
    onAnalyze(trimmed);
  };

  const charCount = text.length;
  const sentenceEstimate = (text.match(/[^.!?\n]+[.!?]+(\s|$)/g) || []).length || (text.trim() ? 1 : 0);

  return (
    <div className="max-w-[1000px] mx-auto py-8 px-4 sm:px-6">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <span className="inline-block text-[11px] font-extrabold tracking-widest text-sage-primary uppercase mb-2 bg-sage-light px-3 py-1 rounded-full">
          GEULCHIM · SELECTIVE REVISION EDITOR
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 tracking-tight leading-tight mb-3">
          글은 내가 쓰고,<br className="sm:hidden" /> AI는 필요한 만큼만.
        </h1>
        <p className="text-sm sm:text-base text-ink-500 max-w-xl mx-auto leading-relaxed">
          글을 입력하고 <strong className="text-ink-800 font-semibold">문장별 분석하기</strong>를 누르면 문장 카드로 나뉩니다.<br />
          각 문장마다 진단만 들을지, AI 제안을 받을지, 보호할지 직접 선택하세요.
        </p>
      </div>

      {/* Continue previous draft banner if available */}
      {hasExistingCards && onContinueExisting && (
        <div className="mb-6 p-4 rounded-2xl bg-sage-light/60 border border-sage-primary/20 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 text-sm text-sage-deep">
            <span className="w-2.5 h-2.5 rounded-full bg-sage-primary animate-ping" />
            <span>
              이전에 작업 중이던 원고가 있습니다 (분리된 문장: <strong>{existingCardCount}개</strong>).
            </span>
          </div>
          <button
            type="button"
            onClick={onContinueExisting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sage-primary hover:bg-sage-deep transition-all shadow-xs"
          >
            <span>작업 중이던 퇴고 화면으로 이어하기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Surface */}
      <div className="bg-white border border-[#e2e8df] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink-800">✍ 내 원고 입력</span>
            <span className="text-ink-400">|</span>
            <span className="text-ink-500 font-medium">대략 {sentenceEstimate}개 문장</span>
          </div>
          <div className="flex items-center gap-2 text-ink-400 font-medium">
            <span className="hidden sm:inline text-[11px] text-sage-primary bg-sage-light/60 px-2 py-0.5 rounded-md font-semibold">
              구어체·블로그 스마트 분할 지원
            </span>
            <span>{charCount.toLocaleString()}자</span>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="퇴고하고 싶은 글을 이곳에 붙여넣거나 직접 작성해 보세요."
          className="w-full min-h-[300px] p-5 rounded-xl border border-[#d8e2d7] bg-[#fdfdfb] text-ink-900 text-base leading-relaxed focus:outline-none focus:border-sage-primary focus:ring-3 focus:ring-sage-light/80 transition-all resize-y placeholder:text-ink-300 font-sans"
          spellCheck={false}
        />

        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-700 bg-[#f7faf7] border border-[#dce5dd] hover:bg-ink-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sage-primary" />
              <span>예시 글 불러오기</span>
            </button>
            {text && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>지우기</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isRealAI && onAnalyzeWithAi && (
              <button
                type="button"
                onClick={() => onAnalyzeWithAi(text.trim())}
                disabled={!text.trim() || isAnalyzingAi}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl text-xs font-bold text-sage-deep bg-sage-light hover:bg-sage-light/80 disabled:opacity-40 transition-all border border-sage-primary/30"
                title="마침표가 없는 자유글이나 일기를 AI가 문맥을 분석하여 문장 단위로 분할합니다"
              >
                <Sparkles className="w-3.5 h-3.5 text-sage-primary" />
                <span>{isAnalyzingAi ? 'AI 분할 중...' : 'AI 문맥 분할'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleStart}
              disabled={!text.trim() || isAnalyzingAi}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-sage-primary hover:bg-sage-deep disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
            >
              <span>문장별 분석하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Step Guide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <div className="bg-white border border-[#e4eae2] rounded-xl p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-sage-light text-sage-primary font-extrabold flex items-center justify-center shrink-0 text-sm">
            01
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink-900 mb-1">문장 자동 분리</h3>
            <p className="text-xs text-ink-500 leading-normal">
              입력한 원고를 문맥과 문단 구조를 유지하며 카드 단위로 정돈합니다.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#e4eae2] rounded-xl p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-sage-light text-sage-primary font-extrabold flex items-center justify-center shrink-0 text-sm">
            02
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink-900 mb-1">문장별 권한 설정</h3>
            <p className="text-xs text-ink-500 leading-normal">
              문장마다 💬진단만, ✨AI 고쳐쓰기, 🔒고정(보호)을 독립적으로 부여합니다.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#e4eae2] rounded-xl p-5 flex items-start gap-3.5 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-sage-light text-sage-primary font-extrabold flex items-center justify-center shrink-0 text-sm">
            03
          </div>
          <div>
            <h3 className="font-bold text-sm text-ink-900 mb-1">직접 퇴고와 완성</h3>
            <p className="text-xs text-ink-500 leading-normal">
              원문을 직접 타이핑해 고치거나 마음에 드는 AI 수정안만 선택 적용합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
