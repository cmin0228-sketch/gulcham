import { describe, it, expect } from 'vitest';
import { analyzeWritingHabits } from '../src/domain/habitDiagnostics';
import { SentenceCard } from '../src/types';

describe('글쓰기 습관 종합 진단 엔진 (analyzeWritingHabits)', () => {
  it('문장 호흡 과다(만연체)와 강조 부사 중복(진짜, 정말)을 정확히 진단한다', () => {
    const mockCards: SentenceCard[] = [
      {
        id: 's_1',
        paragraphIndex: 0,
        originalText: '진짜 정말 추워서 깬거였어요 근데 온도설정도 했을 텐데 에어컨이 갑자기 왜 추워지냐!',
        currentText: '진짜 정말 추워서 깬거였어요 근데 온도설정도 했을 텐데 에어컨이 갑자기 왜 추워지냐!',
        mode: 'advice',
        version: 1,
      },
      {
        id: 's_2',
        paragraphIndex: 0,
        originalText:
          '이틀 전부터 에어컨이 잘 안 나오길래 관리실에 말씀을 드렸거든요 이거는 실외기 문제고 내일 고쳐주러 오실 거다 그러셔서 넵 하고 돌아왔는데용 이게 나오긴 나오는데 찬 바람이 안 나오는 거라 켜놓고 자야 그나마 잘 만 하거든요 그래서 켜놓고 잤는데 무슨 아침 댓바람부터 고쳐주신 건지 감사했습니다',
        currentText:
          '이틀 전부터 에어컨이 잘 안 나오길래 관리실에 말씀을 드렸거든요 이거는 실외기 문제고 내일 고쳐주러 오실 거다 그러셔서 넵 하고 돌아왔는데용 이게 나오긴 나오는데 찬 바람이 안 나오는 거라 켜놓고 자야 그나마 잘 만 하거든요 그래서 켜놓고 잤는데 무슨 아침 댓바람부터 고쳐주신 건지 감사했습니다',
        mode: 'advice',
        version: 1,
      },
    ];

    const result = analyzeWritingHabits(mockCards);

    // 1. 호흡 과다 문장 (120자 이상 danger)
    expect(result.longSentences.length).toBe(1);
    expect(result.longSentences[0].sentenceId).toBe('s_2');
    expect(result.longSentences[0].severity).toBe('danger');

    // 2. 부사 중복 문장 ('진짜', '정말'이 한 문장에 겹침)
    expect(result.adverbClusters.length).toBe(1);
    expect(result.adverbClusters[0].sentenceId).toBe('s_1');
    expect(result.adverbClusters[0].adverbs).toContain('진짜');
    expect(result.adverbClusters[0].adverbs).toContain('정말');

    // 3. 건강 점수 감점 반영
    expect(result.healthScore).toBeLessThan(90);
    expect(result.summaryFeedback).toContain('부사');
  });
});