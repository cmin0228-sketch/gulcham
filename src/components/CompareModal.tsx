import React, { useEffect } from 'react';
import { X, Columns, Check } from 'lucide-react';
import { computeTokenDiff } from '../domain/diff';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  currentText: string;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  originalText,
  currentText,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { originalSegments, currentSegments } = computeTokenDiff(originalText, currentText);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="수정 전후 비교 창"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-ink-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-[#e2e8df] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top */}
        <div className="px-6 py-4 border-b border-[#e5ebe2] flex items-center justify-between bg-[#fafcf9]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sage-light text-sage-primary flex items-center justify-center">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">수정 전후 비교</h2>
              <span className="text-xs text-ink-500">
                처음 입력한 원문과 현재 완성된 원고의 차이를 확인합니다.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-800 hover:bg-ink-100 transition-colors"
            title="닫기 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Diff Panels Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1 font-sans">
          {/* Left: Original with deletions */}
          <div className="flex flex-col rounded-xl border border-[#e2e8df] bg-[#fafcf9] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#f0f4ef] border-b border-[#e2e8df] text-xs font-bold text-ink-700 flex items-center justify-between">
              <span>최초 입력 원문</span>
              <span className="text-[11px] text-ink-400 font-normal">
                {originalText.length.toLocaleString()}자
              </span>
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words flex-1 text-ink-900 overflow-y-auto max-h-[420px]">
              {originalSegments.map((seg, i) => {
                if (seg.type === 'delete') {
                  return (
                    <mark
                      key={i}
                      className="bg-rose-100 text-rose-900 line-through rounded-sm px-0.5 mx-0.5"
                    >
                      {seg.value}
                    </mark>
                  );
                }
                return <span key={i}>{seg.value}</span>;
              })}
            </div>
          </div>

          {/* Right: Current with additions */}
          <div className="flex flex-col rounded-xl border border-[#e2e8df] bg-[#fafcf9] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#edf5ef] border-b border-[#e2e8df] text-xs font-bold text-sage-deep flex items-center justify-between">
              <span>현재 완성된 원고</span>
              <span className="text-[11px] text-sage-primary font-normal">
                {currentText.length.toLocaleString()}자
              </span>
            </div>
            <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap break-words flex-1 text-ink-900 overflow-y-auto max-h-[420px]">
              {currentSegments.map((seg, i) => {
                if (seg.type === 'insert') {
                  return (
                    <mark
                      key={i}
                      className="bg-emerald-100 text-emerald-950 font-semibold rounded-sm px-0.5 mx-0.5 not-italic"
                    >
                      {seg.value}
                    </mark>
                  );
                }
                return <span key={i}>{seg.value}</span>;
              })}
            </div>
          </div>
        </div>

        {/* Legend & Footer */}
        <div className="px-6 py-3.5 bg-[#f8faf7] border-t border-[#e5ebe2] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-ink-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-200 inline-block border border-rose-300"></span>
              삭제된 부분
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-200 inline-block border border-emerald-300"></span>
              추가·변경된 부분
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-ink-700 bg-white border border-[#d6ded4] hover:bg-ink-50 transition-colors"
          >
            작업실로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
