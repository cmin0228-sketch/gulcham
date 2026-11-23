import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { LandingEditor, SAMPLE_TEXT } from './components/LandingEditor';
import { SentenceCard } from './components/SentenceCard';
import { FinalDraftPanel } from './components/FinalDraftPanel';
import { CompareModal } from './components/CompareModal';
import { Toast } from './components/Toast';
import { SentenceCard as SentenceCardType, EditMode, AppStage, DocumentState } from './types';
import { splitIntoSentenceCards, splitConversationalRunons } from './domain/sentenceSplitter';
import { assembleDraft, calculateMetrics } from './domain/draftAssembler';
import { applySuggestionToCard, updateCardText } from './domain/suggestionVersioning';
import { analyzeWritingHabits } from './domain/habitDiagnostics';
import { HabitDashboard } from './components/HabitDashboard';
import { defaultAIProvider } from './services/realAiProvider';
import { saveDocumentState, loadDocumentState, clearDocumentState } from './services/persistence';
import { ArrowLeft, Sparkles, MessageSquare, Lock, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Try restoring from localStorage
  const savedState = useMemo(() => loadDocumentState(), []);

  // 기본 첫 화면은 항상 '새 글 작성 칸(landing)'으로 시작
  const [stage, setStage] = useState<AppStage>('landing');
  const [originalFullText, setOriginalFullText] = useState<string>(savedState?.originalFullText || '');
  const [cards, setCards] = useState<SentenceCardType[]>(savedState?.cards || []);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isRealAI, setIsRealAI] = useState(false);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  const notify = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Check backend AI availability on mount
  useEffect(() => {
    defaultAIProvider.checkHealth().then(available => {
      setIsRealAI(available);
    });
  }, []);

  // Auto-save state to localStorage
  useEffect(() => {
    if (cards.length > 0 || originalFullText) {
      const docState: DocumentState = {
        id: 'current_doc',
        stage,
        originalFullText,
        cards,
        lastUpdatedAt: Date.now(),
      };
      saveDocumentState(docState);
    }
  }, [stage, originalFullText, cards]);

  // Derived assembled draft and metrics
  const currentDraft = useMemo(() => assembleDraft(cards), [cards]);
  const metrics = useMemo(() => calculateMetrics(cards), [cards]);
  const habitMetrics = useMemo(() => analyzeWritingHabits(cards), [cards]);

  // Handler: Scroll smoothly to a specific sentence card and highlight it
  const handleScrollToSentence = useCallback((sentenceId: string) => {
    const el = document.getElementById(`card-${sentenceId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-sage-primary/60');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-sage-primary/60');
      }, 2500);
    }
  }, []);

  // Handler: Split a long run-on sentence card into 2 cleaner cards
  const handleSplitCard = useCallback((cardId: string) => {
    setCards(prevCards => {
      const targetIndex = prevCards.findIndex(c => c.id === cardId);
      if (targetIndex === -1) return prevCards;

      const target = prevCards[targetIndex];
      let subTexts = splitConversationalRunons(target.currentText);

      // Fallback if conversational regex didn't split: split at middle punctuation or comma
      if (subTexts.length <= 1) {
        const mid = Math.floor(target.currentText.length / 2);
        const splitMatch = target.currentText.slice(mid - 25, mid + 25).match(/([.!?,\s]+)/);
        if (splitMatch && splitMatch.index !== undefined) {
          const cutPoint = mid - 25 + splitMatch.index + splitMatch[0].length;
          subTexts = [
            target.currentText.slice(0, cutPoint).trim(),
            target.currentText.slice(cutPoint).trim(),
          ];
        } else {
          return prevCards;
        }
      }

      const newCards: SentenceCardType[] = subTexts
        .filter(t => t.trim().length > 0)
        .map((txt, subIdx) => ({
          id: `${target.id}_s${subIdx}_${Date.now()}`,
          paragraphIndex: target.paragraphIndex,
          originalText: txt,
          currentText: txt,
          mode: target.mode,
          version: 1,
        }));

      const nextCards = [...prevCards];
      nextCards.splice(targetIndex, 1, ...newCards);
      return nextCards;
    });
    notify('문장을 2개의 카드로 나누었습니다. 각각 다듬어 보세요.');
  }, [notify]);

  // Handler: Split a single card using AI context analysis
  const handleAiSplitCard = useCallback(async (cardId: string) => {
    const target = cards.find(c => c.id === cardId);
    if (!target) return;

    notify('AI가 이 문장의 문맥과 말줄임표 등을 분석하여 분할하고 있습니다...');
    try {
      const aiSubSentences = await defaultAIProvider.splitSentencesWithAI(target.currentText);
      if (aiSubSentences && aiSubSentences.length > 1) {
        setCards(prevCards => {
          const targetIndex = prevCards.findIndex(c => c.id === cardId);
          if (targetIndex === -1) return prevCards;

          const newCards: SentenceCardType[] = aiSubSentences.map((s, idx) => ({
            id: `s_aisplit_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            paragraphIndex: target.paragraphIndex,
            originalText: s.trim(),
            currentText: s.trim(),
            mode: target.mode,
            version: 1,
          }));

          const nextCards = [...prevCards];
          nextCards.splice(targetIndex, 1, ...newCards);
          return nextCards;
        });
        notify(`AI가 해당 문장을 ${aiSubSentences.length}개의 카드로 정밀 분할했습니다.`);
        return;
      }
    } catch (err) {
      console.warn('AI card split failed:', err);
    }

    // Fallback to rule splitter if AI returned 1 sentence
    handleSplitCard(cardId);
  }, [cards, handleSplitCard, notify]);

  // Handler: Delete a card directly
  const handleDeleteCard = useCallback((cardId: string) => {
    setCards(prevCards => prevCards.filter(c => c.id !== cardId));
    notify('카드를 삭제했습니다.');
  }, [notify]);

  // Handler: Start analysis from landing screen (Rule-based Fast Split)
  const handleAnalyze = (inputText: string) => {
    const generatedCards = splitIntoSentenceCards(inputText);
    setOriginalFullText(inputText);
    setCards(generatedCards);
    setStage('workspace');
    notify(`${generatedCards.length}개의 문장 카드로 분리했습니다. 각 문장에서 퇴고를 시작하세요.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Start analysis using Gemini AI context-aware sentence splitter
  const handleAnalyzeWithAi = async (inputText: string) => {
    setIsAnalyzingAi(true);
    notify('AI가 글의 문맥과 호흡을 분석하여 문장들을 분할하고 있습니다...');
    try {
      const aiSentences = await defaultAIProvider.splitSentencesWithAI(inputText);
      if (aiSentences && aiSentences.length > 0) {
        const generatedCards: SentenceCardType[] = aiSentences.map((s, idx) => ({
          id: `s_ai_${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          paragraphIndex: 0,
          originalText: s.trim(),
          currentText: s.trim(),
          mode: 'advice',
          version: 1,
        }));
        setOriginalFullText(inputText);
        setCards(generatedCards);
        setStage('workspace');
        notify(`AI 문맥 분석으로 ${generatedCards.length}개의 문장 카드로 정밀 분할했습니다.`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch (err) {
      console.warn('AI split failed, falling back to rule splitter:', err);
    } finally {
      setIsAnalyzingAi(false);
    }

    // Fallback if AI failed or returned empty
    handleAnalyze(inputText);
  };

  // Handler: Direct typing in a sentence card
  const handleUpdateText = useCallback((id: string, newText: string) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === id) {
          return updateCardText(card, newText);
        }
        return card;
      })
    );
  }, []);

  // Handler: Mode switch for a card
  const handleChangeMode = useCallback((id: string, mode: EditMode) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === id) {
          // If changing away from rewrite, keep existing suggestion but prevent applying
          return {
            ...card,
            mode,
          };
        }
        return card;
      })
    );

    const modeLabels: Record<EditMode, string> = {
      advice: '💬 진단만 모드로 변경했습니다. 문제점 설명만 제공됩니다.',
      rewrite: '✨ AI 고쳐쓰기 모드로 변경했습니다. 대체 문장을 제안받을 수 있습니다.',
      lock: '🔒 고정 모드로 변경했습니다. AI 개입이 차단되며 직접 편집은 가능합니다.',
    };
    notify(modeLabels[mode]);
  }, [notify]);

  // Handler: Request AI feedback or rewrite
  const handleRequestAi = useCallback(async (id: string) => {
    const targetCard = cards.find(c => c.id === id);
    if (!targetCard) return;

    if (targetCard.mode === 'lock') {
      notify('고정된 문장에는 AI 분석이나 수정을 요청할 수 없습니다.');
      return;
    }

    // Set loading indicator
    setCards(prevCards =>
      prevCards.map(c => (c.id === id ? { ...c, isLoadingAi: true, aiError: null } : c))
    );

    // Extract surrounding context (previous, next, and full paragraph) to preserve author voice/style
    const targetIndex = cards.findIndex(c => c.id === id);
    const prevCard = targetIndex > 0 ? cards[targetIndex - 1] : undefined;
    const nextCard = targetIndex < cards.length - 1 ? cards[targetIndex + 1] : undefined;
    const paragraphCards = cards.filter(c => c.paragraphIndex === targetCard.paragraphIndex);
    const paragraphText = paragraphCards.map(c => c.currentText).join(' ');

    const context = {
      prevSentence: prevCard?.currentText,
      nextSentence: nextCard?.currentText,
      paragraphText,
    };

    try {
      const response = await defaultAIProvider.generateForSentence(
        targetCard.currentText,
        targetCard.mode,
        context
      );

      setCards(prevCards =>
        prevCards.map(c => {
          if (c.id === id) {
            return {
              ...c,
              isLoadingAi: false,
              suggestion: {
                id: `sug_${Date.now()}`,
                sentenceId: c.id,
                sourceText: c.currentText,
                sourceVersion: c.version,
                suggestedText: response.suggestedText,
                reason: response.reason,
                adviceData: response.advice,
                changes: response.changes,
                status: 'ready',
                isMock: response.isMock,
                createdAt: Date.now(),
              },
            };
          }
          return c;
        })
      );

      if (targetCard.mode === 'rewrite') {
        notify('대체 문장을 제안했습니다. 원문은 변경되지 않았습니다.');
      } else {
        notify('문장 진단을 완료했습니다. 조언을 참고해 직접 수정해 보세요.');
      }
    } catch (err: any) {
      setCards(prevCards =>
        prevCards.map(c =>
          c.id === id ? { ...c, isLoadingAi: false, aiError: err.message || '요청 실패' } : c
        )
      );
      notify('AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }, [cards, notify]);

  // Handler: Apply suggestion to a single card
  const handleApplySuggestion = useCallback((id: string) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === id) {
          return applySuggestionToCard(card);
        }
        return card;
      })
    );
    notify('선택한 제안을 이 문장에만 적용했습니다.');
  }, [notify]);

  // Handler: Revert a single card to originalText
  const handleRevertCard = useCallback((id: string) => {
    setCards(prevCards =>
      prevCards.map(card => {
        if (card.id === id) {
          return {
            ...card,
            currentText: card.originalText,
            version: card.version + 1,
            suggestion: undefined,
          };
        }
        return card;
      })
    );
    notify('이 문장을 최초 입력 원문으로 복원했습니다.');
  }, [notify]);

  // Handler: Reset all cards to initial text
  const handleResetAllCards = useCallback(() => {
    if (window.confirm('모든 문장을 처음 분석 시점의 원문으로 되돌리시겠습니까? 직접 수정한 내용도 복원됩니다.')) {
      setCards(prevCards =>
        prevCards.map(card => ({
          ...card,
          currentText: card.originalText,
          version: card.version + 1,
          suggestion: undefined,
        }))
      );
      notify('모든 문장을 원문으로 복원했습니다.');
    }
  }, [notify]);

  // Handler: Start a new draft
  const handleNewDraft = useCallback(() => {
    if (stage === 'workspace') {
      if (!window.confirm('새 글을 작성하시겠습니까? 현재 작업 내용은 초기화됩니다.')) {
        return;
      }
    }
    clearDocumentState();
    setOriginalFullText('');
    setCards([]);
    setStage('landing');
    notify('새 원고 입력 화면으로 이동했습니다.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage, notify]);

  // Handler: Return to landing screen with currently edited draft text
  const handleEditWholeDraft = useCallback(() => {
    if (
      window.confirm(
        '전체 원문 편집으로 돌아가시겠습니까? 현재까지 수정한 본문이 입력창에 유지되며, 다시 분석하면 문장 권한 설정은 초기화됩니다.'
      )
    ) {
      setOriginalFullText(currentDraft);
      setStage('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentDraft]);

  // Handler: Copy final draft to clipboard
  const handleCopyDraft = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentDraft);
      notify('최종 원고를 클립보드에 복사했습니다.');
    } catch {
      notify('클립보드 복사 권한이 필요합니다. TXT 저장을 이용해 주세요.');
    }
  }, [currentDraft, notify]);

  // Handler: Download TXT file
  const handleDownloadTxt = useCallback(() => {
    const textToDownload = stage === 'workspace' ? currentDraft : originalFullText;
    // Add UTF-8 BOM for Windows Notepad compatibility
    const blob = new Blob(['\uFEFF' + textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `글침_최종원고_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('TXT 파일을 다운로드했습니다.');
  }, [stage, currentDraft, originalFullText, notify]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9f6] text-ink-900 font-sans">
      <Header
        stage={stage}
        isRealAI={isRealAI}
        onNewDraft={handleNewDraft}
        onOpenCompare={() => setIsCompareOpen(true)}
        onResetAllCards={handleResetAllCards}
      />

      <main className="flex-1">
        {stage === 'landing' ? (
          <LandingEditor
            initialText={originalFullText}
            onAnalyze={handleAnalyze}
            onAnalyzeWithAi={handleAnalyzeWithAi}
            isRealAI={isRealAI}
            isAnalyzingAi={isAnalyzingAi}
            hasExistingCards={cards.length > 0}
            existingCardCount={cards.length}
            onContinueExisting={() => {
              setStage('workspace');
              notify('작업 중이던 퇴고 화면으로 복귀했습니다.');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : (
          <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6">
            {/* Workspace Lead Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 tracking-tight">
                    문장별 퇴고 작업실
                  </h1>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sage-light text-sage-primary">
                    {cards.length}개 문장
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-ink-500 mt-1">
                  AI의 개입 권한을 선택하고, 각 문장을 직접 고치거나 필요한 제안만 골라 적용하세요.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEditWholeDraft}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-700 bg-white border border-[#d8e0d6] hover:bg-ink-50 transition-colors shadow-2xs"
                  title="현재까지 수정한 내용으로 전체 원고를 다시 편집합니다"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>전체 원문 다시 입력</span>
                </button>
              </div>
            </div>

            {/* Writing Habit Comprehensive Diagnostic Dashboard */}
            <HabitDashboard
              metrics={habitMetrics}
              onScrollToSentence={handleScrollToSentence}
            />

            {/* Mode Guide Banner */}
            <div className="bg-white border border-[#e2e8df] rounded-2xl p-3.5 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-ink-700">
                <span className="font-bold text-ink-900">3가지 모드 안내</span>
                <span className="flex items-center gap-1.5 text-amber-900">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                  <b>진단만</b>: 문제점과 방향 설명 (대체문장 미제공)
                </span>
                <span className="flex items-center gap-1.5 text-purple-900">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <b>AI 고쳐쓰기</b>: 대체 문장 제안 (선택 적용)
                </span>
                <span className="flex items-center gap-1.5 text-rose-900">
                  <Lock className="w-3.5 h-3.5 text-rose-600" />
                  <b>고정</b>: AI 개입 차단 (직접 편집 가능)
                </span>
              </div>
            </div>

            {/* Two Column Layout: Cards on Left (approx 2/3), Live Preview on Right (approx 1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Sentence Cards (8 cols on lg) */}
              <div className="lg:col-span-8 space-y-4">
                {cards.map((card, index) => (
                  <SentenceCard
                    key={card.id}
                    card={card}
                    index={index}
                    onUpdateText={handleUpdateText}
                    onChangeMode={handleChangeMode}
                    onRequestAi={handleRequestAi}
                    onApplySuggestion={handleApplySuggestion}
                    onRevertCard={handleRevertCard}
                    onSplitCard={handleSplitCard}
                    onRequestAiSplit={handleAiSplitCard}
                    onDeleteCard={handleDeleteCard}
                  />
                ))}

                {/* Bottom Add/Re-edit notice */}
                <button
                  type="button"
                  onClick={handleEditWholeDraft}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#d6dfd4] text-ink-600 hover:text-ink-900 hover:bg-white/80 hover:border-sage-primary text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <span>＋ 문장을 추가하거나 문단을 재구성하려면 전체 원문 편집으로 이동</span>
                </button>
              </div>

              {/* Right Column: Sticky Final Draft Panel (4 cols on lg) */}
              <div className="lg:col-span-4">
                <FinalDraftPanel
                  draftText={currentDraft}
                  metrics={metrics}
                  onCopy={handleCopyDraft}
                  onDownload={handleDownloadTxt}
                  onOpenCompare={() => setIsCompareOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-[#e2e8df] text-center text-xs text-ink-400 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-medium text-ink-600">
            글침 (GEULCHIM) — 사람의 표현을 우선하는 선택형 AI 문장 퇴고 에디터
          </p>
          <p className="text-[11px] text-ink-400 mt-1">
            ‘문장 단위로 내용을 진단합니다.’
          </p>
        </div>
      </footer>

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        originalText={originalFullText}
        currentText={currentDraft}
      />

      {/* Toast */}
      <Toast message={toastMessage} onClear={() => setToastMessage(null)} />
    </div>
  );
};

export default App;
