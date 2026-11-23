import React from 'react';
import { Copy, Download, Columns, Check, FileText, BarChart3, ShieldCheck } from 'lucide-react';
import { DraftMetrics } from '../domain/draftAssembler';

interface FinalDraftPanelProps {
  draftText: string;
  metrics: DraftMetrics;
  onCopy: () => void;
  onDownload: () => void;
  onOpenCompare: () => void;
}

export const FinalDraftPanel: React.FC<FinalDraftPanelProps> = ({
  draftText,
  metrics,
  onCopy,
  onDownload,
  onOpenCompare,
}) => {
  return (
    <aside className="space-y-4 sticky top-20">
      {/* Live Preview Card */}
      <div className="bg-white border border-[#e2e8df] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-ink-900">완성 중인 원고</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 animate-pulse">
              LIVE
            </span>
          </div>
          <span className="text-[11px] text-ink-400 font-medium">
            {metrics.charCountWithSpaces.toLocaleString()}자
          </span>
        </div>

        {/* Live Text Area */}
        <div
          tabIndex={0}
          aria-label="완성 중인 원고 미리보기"
          className="p-4 rounded-xl border border-[#dce5dd] bg-[#fafcf9] text-ink-900 text-sm leading-relaxed min-h-[180px] max-h-[360px] overflow-y-auto whitespace-pre-wrap break-words font-sans selection:bg-sage-light"
        >
          {draftText || (
            <span className="text-ink-400 italic">
              아직 작성된 내용이 없습니다. 문장 카드에서 글을 수정해 보세요.
            </span>
          )}
        </div>

        <p className="text-[11px] text-ink-500 mt-2.5 leading-relaxed">
          문장 카드에서 수정한 내용이 실시간으로 조립됩니다. AI 제안을 적용하지 않아도 직접 고친 문장이 최종본에 즉시 반영됩니다.
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#edf2ec]">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sage-primary bg-sage-light hover:bg-[#dbeee0] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>원고 복사</span>
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-sage-primary hover:bg-sage-deep transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>TXT 저장</span>
          </button>
        </div>
      </div>

      {/* Editing Metrics & Summary */}
      <div className="bg-white border border-[#e2e8df] rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between text-xs font-bold text-ink-900">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-sage-primary" />
            퇴고 진행 통계
          </span>
          <button
            type="button"
            onClick={onOpenCompare}
            className="text-[11px] font-semibold text-sage-primary hover:underline flex items-center gap-1"
          >
            <Columns className="w-3 h-3" />
            상세 비교
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#f6f9f6] border border-[#e4ebe2]">
            <span className="text-ink-500 text-[11px] block">전체 문장</span>
            <strong className="text-base text-ink-900 font-extrabold">{metrics.totalSentences}개</strong>
          </div>

          <div className="p-2.5 rounded-xl bg-[#f6f9f6] border border-[#e4ebe2]">
            <span className="text-ink-500 text-[11px] block">직접·AI 수정</span>
            <strong className="text-base text-emerald-700 font-extrabold">{metrics.editedSentences}개</strong>
          </div>

          <div className="p-2.5 rounded-xl bg-[#f6f9f6] border border-[#e4ebe2]">
            <span className="text-ink-500 text-[11px] block">AI 제안 모드</span>
            <strong className="text-base text-purple-700 font-extrabold">{metrics.rewriteCount}개</strong>
          </div>

          <div className="p-2.5 rounded-xl bg-[#f6f9f6] border border-[#e4ebe2]">
            <span className="text-ink-500 text-[11px] block">🔒 고정 보호</span>
            <strong className="text-base text-rose-700 font-extrabold">{metrics.lockedCount}개</strong>
          </div>
        </div>

        <div className="text-[11px] text-ink-500 border-t border-[#edf2ec] pt-2 flex justify-between">
          <span>글자 수 (공백 제외)</span>
          <span className="font-semibold text-ink-700">{metrics.charCountWithoutSpaces.toLocaleString()}자</span>
        </div>
      </div>

      {/* Philosophy Callout Card */}
      <div className="bg-[#f3f7f4] border border-[#d8e6dc] rounded-2xl p-4 text-xs text-ink-700 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-sage-deep">
          <ShieldCheck className="w-4 h-4 text-sage-primary" />
          <span>프롬프트가 아닌 프로그램 차원의 통제</span>
        </div>
        <p className="text-[11px] text-ink-600 leading-relaxed">
          고정된 문장은 AI API로 전송되지 않으며, 제안 적용도 차단됩니다. 또한 원문을 수정한 후에는 이전 제안으로 덮어쓰지 않도록 안전하게 보호합니다.
        </p>
      </div>
    </aside>
  );
};
