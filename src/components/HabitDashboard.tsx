import React, { useState } from 'react';
import { HabitMetrics } from '../domain/habitDiagnostics';
import { Activity, AlertTriangle, Sparkles, Repeat, ChevronDown, ChevronUp, ArrowRight, CheckCircle2 } from 'lucide-react';

interface HabitDashboardProps {
  metrics: HabitMetrics;
  onScrollToSentence: (sentenceId: string) => void;
}

export const HabitDashboard: React.FC<HabitDashboardProps> = ({
  metrics,
  onScrollToSentence,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (metrics.totalSentences === 0) return null;

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 70) return 'text-amber-800 bg-amber-50 border-amber-200';
    return 'text-rose-800 bg-rose-50 border-rose-200';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return '쾌적한 문장 호흡';
    if (score >= 70) return '호흡·부사 다듬기 권장';
    return '만연체·부사 중복 주의';
  };

  return (
    <section className="bg-white border border-[#e2e8df] rounded-2xl mb-6 shadow-2xs overflow-hidden transition-all">
      {/* Top Header / Bar */}
      <div
        className="px-5 py-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer bg-gradient-to-r from-[#fbfdfa] to-white border-b border-[#edf2ec]"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sage-light text-sage-primary flex items-center justify-center shadow-2xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-ink-900 tracking-tight">
                내 글쓰기 습관 종합 진단
              </h2>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getScoreColor(
                  metrics.healthScore
                )}`}
              >
                글 건강도 {metrics.healthScore}점 · {getScoreBadge(metrics.healthScore)}
              </span>
            </div>
            <p className="text-xs text-ink-500 mt-0.5 font-medium line-clamp-1">
              {metrics.summaryFeedback}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-xs text-ink-500">
            <span>
              긴 문장 <strong className="text-rose-700 font-bold">{metrics.longSentences.length}</strong>개
            </span>
            <span>·</span>
            <span>
              강조 부사 <strong className="text-amber-700 font-bold">{metrics.totalAdverbCount}</strong>회
            </span>
            <span>·</span>
            <span>
              반복 어휘 <strong className="text-indigo-700 font-bold">{metrics.repeatedKeywords.length}</strong>종
            </span>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-50 transition-colors"
            aria-label={isExpanded ? '진단 세부 내용 접기' : '진단 세부 내용 펼치기'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Diagnostic Detail Panels */}
      {isExpanded && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white text-xs">
          {/* Card 1: Sentence Breath (Run-on sentences) */}
          <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-rose-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  호흡 긴 문장 (만연체 경보)
                </span>
                <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                  {metrics.longSentences.length}개 발견
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mb-3 leading-relaxed">
                한 문장에 내용이 너무 많으면 읽는 사람이 지칩니다. 평균 {metrics.averageCharLength}자 대비 85자 이상의 문장을 나누어 보세요.
              </p>

              {metrics.longSentences.length > 0 ? (
                <div className="space-y-1.5">
                  {metrics.longSentences.slice(0, 3).map((item) => (
                    <button
                      key={item.sentenceId}
                      type="button"
                      onClick={() => onScrollToSentence(item.sentenceId)}
                      className="w-full text-left p-2 rounded-lg bg-white border border-rose-200/80 hover:border-rose-400 hover:bg-rose-50/50 transition-all text-ink-800 text-[11px] flex items-center justify-between group"
                    >
                      <span className="font-semibold text-rose-800 mr-2 shrink-0">
                        문장 {item.index} ({item.charCount}자)
                      </span>
                      <span className="truncate text-ink-500 flex-1">
                        "{item.text}"
                      </span>
                      <ArrowRight className="w-3 h-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white border border-emerald-100 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>모든 문장이 적절한 호흡(85자 이하)으로 잘 정돈되어 있습니다.</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Intensifier Adverbs */}
          <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  강조 부사 과다 사용 점검
                </span>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                  총 {metrics.totalAdverbCount}회 출현
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mb-3 leading-relaxed">
                '진짜', '정말', '너무' 같은 부사가 겹치면 주장이 가벼워집니다. 구체적인 사실 묘사로 대체해 보세요.
              </p>

              {/* Adverb frequency tags */}
              {Object.keys(metrics.adverbFrequency).length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {Object.entries(metrics.adverbFrequency)
                    .sort(([, a], [, b]) => b - a)
                    .map(([adv, count]) => (
                      <span
                        key={adv}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${
                          count >= 2
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-white text-ink-700 border-amber-200'
                        }`}
                      >
                        {adv} <b className="font-bold text-amber-700">×{count}</b>
                      </span>
                    ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white border border-emerald-100 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>남발된 강조 부사가 없습니다. 단정한 문체입니다.</span>
                </div>
              )}

              {/* Sentences with 2+ adverbs clustered */}
              {metrics.adverbClusters.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-900 bg-white p-2 rounded-lg border border-amber-200">
                  <span className="font-bold text-amber-800 block mb-1">
                    ⚡ 부사 연속 중복 문장 ({metrics.adverbClusters.length}곳):
                  </span>
                  {metrics.adverbClusters.slice(0, 2).map((item) => (
                    <button
                      key={item.sentenceId}
                      type="button"
                      onClick={() => onScrollToSentence(item.sentenceId)}
                      className="block text-left w-full truncate text-ink-700 hover:text-amber-800 hover:underline"
                    >
                      문장 {item.index}: [{item.adverbs.join(', ')}] 중복 사용됨
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Word Repetition */}
          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                  반복 어휘 및 표현 점검
                </span>
                <span className="text-[11px] font-bold text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  {metrics.repeatedKeywords.length}개 어휘 반복
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mb-3 leading-relaxed">
                짧은 간격 안에 동일한 핵심 단어가 3회 이상 등장하면 문맥이 단조로워집니다. 유의어로 변주해 보세요.
              </p>

              {metrics.repeatedKeywords.length > 0 ? (
                <div className="space-y-1.5">
                  {metrics.repeatedKeywords.slice(0, 4).map((kw) => (
                    <div
                      key={kw.word}
                      className="p-2 rounded-lg bg-white border border-indigo-200/80 text-[11px] flex items-center justify-between"
                    >
                      <span className="font-bold text-indigo-900">
                        '{kw.word}' ({kw.count}회 반복)
                      </span>
                      <div className="flex items-center gap-1">
                        {kw.sentenceIndices.slice(0, 4).map((idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold"
                          >
                            #{idx}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-white border border-emerald-100 text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>단어 반복 없이 어휘가 다채롭게 구성되어 있습니다.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};