import React, { useRef } from 'react';
import { Sparkles, MessageSquare, Lock, RotateCcw, Check, AlertTriangle, ArrowRight, Loader2, ShieldCheck, Scissors, Trash2 } from 'lucide-react';
import { SentenceCard as SentenceCardType, EditMode } from '../types';
import { isSuggestionStale, canApplySuggestion } from '../domain/suggestionVersioning';
import { COMMON_INTENSIFIERS } from '../domain/habitDiagnostics';

interface SentenceCardProps {
  card: SentenceCardType;
  index: number;
  onUpdateText: (id: string, text: string) => void;
  onChangeMode: (id: string, mode: EditMode) => void;
  onRequestAi: (id: string) => void;
  onApplySuggestion: (id: string) => void;
  onRevertCard: (id: string) => void;
  onSplitCard?: (id: string) => void;
  onRequestAiSplit?: (id: string) => void;
  onDeleteCard?: (id: string) => void;
}

export const SentenceCard: React.FC<SentenceCardProps> = ({
  card,
  index,
  onUpdateText,
  onChangeMode,
  onRequestAi,
  onApplySuggestion,
  onRevertCard,
  onSplitCard,
  onRequestAiSplit,
  onDeleteCard,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEdited = card.currentText.trim() !== card.originalText.trim();
  const stale = isSuggestionStale(card, card.suggestion);
  const canApply = canApplySuggestion(card);

  const textLength = card.currentText.length;
  const isLongSentence = textLength >= 65;
  const hasValidText = /[가-힣A-Za-z0-9]/.test(card.currentText);

  // Check intensifier adverbs in this sentence
  const matchedAdverbs = COMMON_INTENSIFIERS.filter(adv => {
    const regex = new RegExp(`(^|\\s)${adv}(\\s|$|[은는이가을를도])`);
    return regex.test(card.currentText);
  });
  const hasAdverbCluster = matchedAdverbs.length >= 2;

  // Border and accent styling based on active mode
  const modeBorderClass =
    card.mode === 'advice'
      ? 'border-l-4 border-l-amber-500'
      : card.mode === 'rewrite'
      ? 'border-l-4 border-l-purple-500'
      : 'border-l-4 border-l-rose-500';

  return (
    <article
      id={`card-${card.id}`}
      className={`bg-white border border-[#e2e8df] rounded-2xl shadow-xs transition-shadow duration-200 overflow-hidden ${modeBorderClass}`}
    >
      {/* Card Header: Number, paragraph indicator, and edit status */}
      <div className="px-5 pt-4 pb-2.5 flex items-center justify-between gap-3 border-b border-[#f0f4ef]">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-[#edf4ee] text-sage-primary text-xs font-bold flex items-center justify-center">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-xs font-bold text-ink-800">
            문장 {index + 1}
          </span>
          {card.paragraphIndex > 0 && (
            <span className="text-[10px] text-ink-400 font-medium">
              (문단 {card.paragraphIndex + 1})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isLongSentence && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200"
              title="한 문장이 80자 이상으로 길어 읽는 호흡이 무거워질 수 있습니다."
            >
              🚨 호흡 주의 ({textLength}자)
            </span>
          )}

          {hasAdverbCluster && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
              title="강조 부사가 연속 사용되었습니다."
            >
              ⚡ 부사 중복 ({matchedAdverbs.slice(0, 2).join(', ')})
            </span>
          )}

          {isLongSentence && onSplitCard && (
            <button
              type="button"
              onClick={() => onSplitCard(card.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              title="긴 문장을 규칙 기반으로 2개의 카드로 쪼갭니다"
            >
              <Scissors className="w-2.5 h-2.5" />
              <span>문장 쪼개기</span>
            </button>
          )}

          {onRequestAiSplit && hasValidText && (
            <button
              type="button"
              onClick={() => onRequestAiSplit(card.id)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sage-light text-sage-primary hover:bg-sage-light/80 border border-sage-primary/30 transition-colors"
              title="문맥과 호흡을 분석하여 이 문장을 AI가 2~3개의 카드로 쪼갭니다 (말줄임표나 애매한 문장에 추천)"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>AI 문장 쪼개기</span>
            </button>
          )}

          {onDeleteCard && (
            <button
              type="button"
              onClick={() => onDeleteCard(card.id)}
              className="p-1 rounded-md text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="이 문장 카드 삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {isEdited ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              수정됨
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ink-50 text-ink-500 border border-ink-100">
              원문 유지
            </span>
          )}
        </div>
      </div>

      {/* Mode Selection Tabs (Section 3: advice / rewrite / lock) */}
      <div className="px-5 pt-3 pb-1">
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f4f7f4] rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => onChangeMode(card.id, 'advice')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              card.mode === 'advice'
                ? 'bg-white text-amber-900 shadow-2xs font-bold border border-amber-200'
                : 'text-ink-600 hover:text-ink-900 hover:bg-white/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
            <span>💬 진단만</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode(card.id, 'rewrite')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              card.mode === 'rewrite'
                ? 'bg-white text-purple-900 shadow-2xs font-bold border border-purple-200'
                : 'text-ink-600 hover:text-ink-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>✨ AI 고쳐쓰기</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMode(card.id, 'lock')}
            className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              card.mode === 'lock'
                ? 'bg-white text-rose-900 shadow-2xs font-bold border border-rose-200'
                : 'text-ink-600 hover:text-ink-900 hover:bg-white/60'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>🔒 고정</span>
          </button>
        </div>
      </div>

      {/* Direct Editable Text Area (All modes support typing) */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center justify-between text-[11px] mb-1.5 text-ink-500 font-medium">
          <span className="flex items-center gap-1 font-semibold text-ink-700">
            ✍ 내 문장 직접 수정
          </span>
          <span>{card.currentText.length}자</span>
        </div>

        <textarea
          ref={textareaRef}
          value={card.currentText}
          onChange={(e) => onUpdateText(card.id, e.target.value)}
          rows={2}
          placeholder="문장 내용을 수정해 보세요."
          className="w-full p-3.5 rounded-xl border border-[#d6dfd5] bg-[#fafcf9] text-ink-900 text-sm leading-relaxed focus:bg-white focus:outline-none focus:border-sage-primary focus:ring-2 focus:ring-sage-light font-sans transition-all resize-y"
          spellCheck={false}
        />
      </div>

      {/* If currentText has no valid words (only spaces, newlines, etc.), hide diagnosis panel entirely */}
      {!hasValidText ? (
        <div className="px-5 py-3 bg-[#fbfbfa] border-t border-[#f0f3ef] flex items-center justify-between text-xs text-ink-500">
          <span className="font-medium text-ink-400">
            ⚠️ 문장 내용이 비어 있습니다. (공백 또는 엔터만 입력됨)
          </span>
          {onDeleteCard && (
            <button
              type="button"
              onClick={() => onDeleteCard(card.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>빈 카드 삭제</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Card Actions Row (Revert button & Generate AI button) */}
          <div className="px-5 py-2.5 flex items-center justify-between gap-2 border-t border-[#f0f4ee] bg-[#fbfdfa]">
            <div className="text-[11px] text-ink-500 font-medium truncate">
              {card.mode === 'advice' && '💬 조언을 참고해 원문을 직접 고쳐 보세요'}
              {card.mode === 'rewrite' && '✨ AI 제안 중 원하는 문장만 선택 적용하세요'}
              {card.mode === 'lock' && '🔒 AI 개입 차단 · 작성자 직접 수정 가능'}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isEdited && (
                <button
                  type="button"
                  onClick={() => onRevertCard(card.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-ink-600 hover:text-rose-700 hover:bg-rose-50 border border-[#d9e2d8] transition-colors"
                  title="이 문장만 최초 분석 원문으로 되돌립니다"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>원문 복원</span>
                </button>
              )}

              {card.mode !== 'lock' && (
                <button
                  type="button"
                  onClick={() => onRequestAi(card.id)}
                  disabled={card.isLoadingAi}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                    card.mode === 'rewrite'
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-amber-600 hover:bg-amber-700 text-white'
                  } disabled:opacity-50`}
                >
                  {card.isLoadingAi ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>분석 중...</span>
                    </>
                  ) : (
                    <>
                      {card.mode === 'rewrite' ? (
                        <Sparkles className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      <span>
                        {card.suggestion
                          ? card.mode === 'rewrite'
                            ? '다시 제안받기'
                            : '다시 진단하기'
                          : card.mode === 'rewrite'
                          ? '수정안 만들기'
                          : '진단 분석하기'}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Bottom Result Panel for Each Mode */}
          <div className="px-5 py-3.5 bg-[#f8faf7] border-t border-[#edf2ec] text-xs">
            {/* Mode 1: ADVICE */}
            {card.mode === 'advice' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-amber-900 font-bold">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                문장 진단 및 개선 포인트
              </span>
              {card.suggestion?.isMock && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  데모 분석
                </span>
              )}
            </div>

            {card.suggestion?.adviceData ? (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
                <ul className="list-disc list-inside space-y-1 text-ink-800 text-xs">
                  {card.suggestion.adviceData.issues.map((issue, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="font-semibold text-amber-950">{issue}</span>
                    </li>
                  ))}
                </ul>
                {card.suggestion.adviceData.explanation && (
                  <p className="text-ink-600 pt-1 border-t border-amber-200/50 leading-relaxed">
                    💡 {card.suggestion.adviceData.explanation}
                  </p>
                )}
                {card.suggestion.adviceData.actionableHint && (
                  <p className="text-[11px] text-amber-800 font-medium">
                    ↳ {card.suggestion.adviceData.actionableHint}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-3 bg-white border border-[#e2e8df] rounded-xl text-ink-500 text-xs flex items-center justify-between">
                <span>‘진단 분석하기’를 누르면 문제점과 개선 이유를 안내합니다.</span>
              </div>
            )}
            <p className="text-[11px] text-ink-400">
              ※ 진단 모드에서는 완성된 대체 문장을 제공하지 않으며, 조언을 참고하여 상단 입력창에서 직접 수정합니다.
            </p>
          </div>
        )}

        {/* Mode 2: REWRITE */}
        {card.mode === 'rewrite' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-purple-900 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI 대체 문장 제안
              </span>
              {card.suggestion && (
                <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-md">
                  {card.suggestion.isMock ? '데모 제안 (규칙 기반)' : 'AI 모델 응답'}
                </span>
              )}
            </div>

            {stale ? (
              /* F06 Safety feature: Stale suggestion detected */
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-xs font-bold text-amber-900">
                      원문이 변경되어 이전 제안 적용이 차단되었습니다
                    </strong>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      제안이 생성된 이후 원문을 직접 수정하셨습니다. 방금 고친 내용이 의도치 않게 덮어씌워지는 것을 방지했습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRequestAi(card.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>수정한 원문 기준으로 다시 제안받기</span>
                </button>
              </div>
            ) : card.suggestion?.suggestedText ? (
              /* Ready Suggestion */
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 space-y-2.5">
                <div className="text-sm font-semibold text-purple-950 bg-white/90 p-3 rounded-lg border border-purple-100 shadow-2xs leading-relaxed font-sans whitespace-pre-wrap">
                  {card.suggestion.suggestedText}
                </div>

                {card.suggestion.reason && (
                  <p className="text-xs text-purple-800 leading-relaxed font-medium">
                    ↳ 이유: {card.suggestion.reason}
                  </p>
                )}

                {card.suggestion.changes && card.suggestion.changes.length > 0 && (
                  <div className="pt-1 border-t border-purple-100/80 space-y-1">
                    <span className="text-[11px] font-bold text-purple-900 block">
                      주요 수정 내역:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {card.suggestion.changes.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-purple-200 text-[11px] text-purple-950 shadow-2xs"
                          title={item.reason || undefined}
                        >
                          <span className="line-through text-ink-400">{item.original}</span>
                          <span className="text-purple-600 font-bold">→</span>
                          <span className="font-bold text-purple-900">{item.revised}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-ink-500 font-medium">
                    {card.suggestion.status === 'applied'
                      ? '✓ 이 문장에 적용되었습니다'
                      : '적용 전까지 원문은 그대로 유지됩니다'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onApplySuggestion(card.id)}
                    disabled={!canApply}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                    title="이 카드의 문장만 제안된 문장으로 교체합니다"
                  >
                    <span>이 문장에 적용</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white border border-[#e2e8df] rounded-xl text-ink-500 text-xs flex items-center justify-between">
                <span>‘수정안 만들기’를 누르면 대안 문장과 수정 이유를 제안합니다.</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 3: LOCK */}
        {card.mode === 'lock' && (
          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-rose-950">
            <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="block text-xs font-bold text-rose-900">
                🔒 고정 보호 모드 활성화
              </strong>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                AI가 이 문장을 분석하거나 수정안을 만들어 덮어쓰지 못하도록 애플리케이션 차원에서 완전히 차단합니다.
              </p>
              <p className="text-[11px] text-ink-700 font-semibold pt-1 border-t border-rose-200/60">
                ※ 원작자인 사용자는 상단 입력창에서 언제든지 자유롭게 문장을 타이핑해 고칠 수 있습니다.
              </p>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </article>
  );
};
