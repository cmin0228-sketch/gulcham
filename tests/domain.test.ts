import { describe, it, expect, beforeEach } from 'vitest';
import { splitIntoSentenceCards, resetSentenceCounter } from '../src/domain/sentenceSplitter';
import { assembleDraft, calculateMetrics } from '../src/domain/draftAssembler';
import {
  isSuggestionStale,
  canApplySuggestion,
  applySuggestionToCard,
  updateCardText,
} from '../src/domain/suggestionVersioning';
import { computeTokenDiff } from '../src/domain/diff';
import { MockAIProvider } from '../src/services/mockAiProvider';
import { SentenceCard } from '../src/types';

describe('글침 핵심 도메인 및 수용 시나리오 테스트 (T01 - T14)', () => {
  beforeEach(() => {
    resetSentenceCounter(1);
  });

  const sample5Sentences =
    '오늘은 오래 기다렸던 전시를 보러 갔다. 전시장 분위기가 좋았다. 설명문은 다소 어려웠다. 이런 경험은 좋은 추억이 되었다. 다음에 꼭 다시 가고 싶다.';

  // T01: 첫 화면에 5문장 입력 -> 분석하기 -> 5개 카드 생성
  it('T01: 5개 문장 텍스트를 입력하면 5개의 문장 카드로 분리된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    expect(cards.length).toBe(5);
    expect(cards[0].originalText).toBe('오늘은 오래 기다렸던 전시를 보러 갔다.');
    expect(cards[0].currentText).toBe('오늘은 오래 기다렸던 전시를 보러 갔다.');
    expect(cards[0].mode).toBe('advice');
    expect(cards[4].currentText).toBe('다음에 꼭 다시 가고 싶다.');
  });

  // T01-Quote: 따옴표 내부 마침표 및 인용격 조사 결합 완벽 보존
  it('T01-Quote: 대화문 따옴표 내부에 마침표가 있어도 따옴표가 짝을 이룰 때까지 분리되지 않고 온전하게 묶인다', () => {
    const dialogueText =
      '주인장은 "오늘은 비가 와서 손님이 드무네요. 천천히 편하게 머물다 가세요."라고 나직하게 말을 건넸다. 정말 친절했다.';
    const cards = splitIntoSentenceCards(dialogueText);
    expect(cards.length).toBe(2);
    expect(cards[0].currentText).toBe(
      '주인장은 "오늘은 비가 와서 손님이 드무네요. 천천히 편하게 머물다 가세요."라고 나직하게 말을 건넸다.'
    );
    expect(cards[1].currentText).toBe('정말 친절했다.');
  });

  // T01-LeadingNewlines: 맨 앞 엔터나 빈 줄이 있어도 첫 문장이 빈 카드로 나오지 않는다
  it('T01-LeadingNewlines: 글 맨 앞에 엔터나 공백이 있어도 빈 문장 카드가 생성되지 않고 실제 첫 문장부터 시작한다', () => {
    const textWithLeadingNewlines = '\n\n\n\n첫 문장입니다. 두 번째 문장입니다.';
    const cards = splitIntoSentenceCards(textWithLeadingNewlines);
    expect(cards.length).toBe(2);
    expect(cards[0].originalText).toBe('첫 문장입니다.');
    expect(cards[0].currentText).toBe('첫 문장입니다.');
    expect(cards[1].currentText).toBe('두 번째 문장입니다.');
  });

  // T01-Conversational: 마침표가 생략된 블로그/구어체 만연체 문장도 연결어미와 접속사를 기준으로 스마트 분할된다
  it('T01-Conversational: 마침표가 생략된 구어체 문장(~거든요, ~는데요 등)을 스마트하게 분할한다', () => {
    const conversationalText =
      '관리실에 말씀을 드렸거든요 이거는 실외기 문제라 그러셔서 돌아왔는데용 이게 나오긴 나오는데 찬 바람이 안 나오는 거라 켜놓고 자야 하거든요 그래서 켜놓고 잤습니다.';
    const cards = splitIntoSentenceCards(conversationalText);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    expect(cards[0].currentText).toContain('관리실에 말씀을 드렸거든요');
    expect(cards.some(c => c.currentText.startsWith('이거는'))).toBe(true);
    expect(cards.some(c => c.currentText.startsWith('그래서'))).toBe(true);
  });

  // T01-UserSamples: 사용자가 지적한 실제 블로그/구어체 예문 1과 2 분할 검증
  it('T01-UserSamples: ~네요 그리고, ~거예요, ~있어요, ~있었습니다 등 마침표 없는 구어체 글도 정확히 분리된다', () => {
    const sample1 =
      '갑자기 든 생각인데 어쩌면 꿈이 잔고 다시 보라는 계시였을 수도 있겠네요 그리고 이 옷을 왜 이렇게 금액적으로 망설였냐면요 제가 삼 년 정도 전에 우연히 마주친 옷이 너무 갖고 싶은 거예요 계속 망설이다 이주 정도 뒤에 그 옷을 결국 샀는데 이게 얼마나 갖고 싶었냐면 일주일에 서너 번은 그 가게 앞을 지나가면서 옷 잘 있나...';
    const cards1 = splitIntoSentenceCards(sample1);
    expect(cards1.length).toBeGreaterThanOrEqual(3);
    expect(cards1[0].currentText).toBe('갑자기 든 생각인데 어쩌면 꿈이 잔고 다시 보라는 계시였을 수도 있겠네요');
    expect(cards1.some(c => c.currentText.includes('갖고 싶은 거예요'))).toBe(true);

    const sample2 =
      '삼 년 전에 산 옷은 가을이 되면 꺼내입고 있어요 옷 입은 어느 날 친한 언니가 옷이 저랑 잘 어울린다고 해줘서 그날 그 언니에 대한 호감도 백배상승 이벤트가 있었습니다 이번에 사는 옷도 오래오래 잘 입으면 좋겠네요 혹시라도 질리면 긍민군한테 떨드핸드(Thirdhand~)로 플미 붙여서 팔려구요(??:안사요.)';
    const cards2 = splitIntoSentenceCards(sample2);
    expect(cards2.length).toBe(4);
    expect(cards2[0].currentText).toBe('삼 년 전에 산 옷은 가을이 되면 꺼내입고 있어요');
    expect(cards2[1].currentText).toContain('이벤트가 있었습니다');
    expect(cards2[2].currentText).toBe('이번에 사는 옷도 오래오래 잘 입으면 좋겠네요');
    const sample3 = '옷 잘 있나....아닌듯 해서 그냥 돌아왔습니다.';
    const cards3 = splitIntoSentenceCards(sample3);
    expect(cards3.length).toBe(2);
    expect(cards3[0].currentText).toContain('옷 잘 있나....');
    expect(cards3[1].currentText).toContain('아닌듯');
  });

  // T02: 카드 2번 직접 타이핑 -> 카드 내용과 최종 원고가 즉시 변경됨
  it('T02: 특정 카드의 문장을 직접 수정하면 해당 카드의 currentText와 최종 조립 원고가 즉시 반영된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    const updatedCard1 = updateCardText(cards[1], '전시장 분위기가 차분하고 아늑했다.');
    cards[1] = updatedCard1;

    expect(cards[1].currentText).toBe('전시장 분위기가 차분하고 아늑했다.');
    expect(cards[1].originalText).toBe('전시장 분위기가 좋았다.');
    expect(cards[1].version).toBe(2);

    const fullDraft = assembleDraft(cards);
    expect(fullDraft).toContain('전시장 분위기가 차분하고 아늑했다.');
    expect(fullDraft).not.toContain('전시장 분위기가 좋았다.');
  });

  // T03: 진단만 선택 -> 설명만 표시되고 완성된 대체 문장과 적용 버튼이 없음
  it('T03: 진단만(advice) 모드에서는 설명과 검토 이유만 생성되며 완성된 대체 문장이 생성되지 않는다', async () => {
    const provider = new MockAIProvider();
    const res = await provider.generateForSentence('전시가 정말 좋았고 작품도 정말 인상적이었다.', 'advice');

    expect(res.mode).toBe('advice');
    expect(res.advice).toBeDefined();
    expect(res.advice?.issues.length).toBeGreaterThan(0);
    expect(res.suggestedText).toBeUndefined(); // Spec rule: NO replacement sentence!
  });

  // T04: AI 고쳐쓰기 선택 -> 제안 생성 -> 대체 문장·수정 이유가 표시되며 원문은 불변
  it('T04: AI 고쳐쓰기(rewrite) 모드에서는 대체 문장과 수정 이유가 생성되며 원문 카드는 불변이다', async () => {
    const provider = new MockAIProvider();
    const original = '전시장 분위기가 정말 좋았고 작품들도 정말 인상적이었다.';
    const res = await provider.generateForSentence(original, 'rewrite');

    expect(res.mode).toBe('rewrite');
    expect(res.suggestedText).toBeDefined();
    expect(res.suggestedText).not.toBe(original);
    expect(res.reason).toBeDefined();
    expect(res.isMock).toBe(true);
  });

  // T05: 2번 카드의 제안만 적용 -> 2번 카드만 변경, 나머지 카드 불변
  it('T05: 특정 카드의 제안만 적용하면 해당 카드만 교체되고 다른 카드는 전혀 변경되지 않는다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    const card2 = cards[1];

    card2.suggestion = {
      id: 'sug_test',
      sentenceId: card2.id,
      sourceText: card2.currentText,
      sourceVersion: card2.version,
      suggestedText: '전시장 내부는 은은한 조명으로 무척 아름다웠다.',
      reason: '분위기를 보다 구체적으로 묘사했습니다.',
      status: 'ready',
      isMock: true,
      createdAt: Date.now(),
    };

    expect(canApplySuggestion(card2)).toBe(true);
    const appliedCard2 = applySuggestionToCard(card2);
    cards[1] = appliedCard2;

    expect(cards[1].currentText).toBe('전시장 내부는 은은한 조명으로 무척 아름다웠다.');
    expect(cards[1].suggestion?.status).toBe('applied');

    // Verify other cards untouched
    expect(cards[0].currentText).toBe('오늘은 오래 기다렸던 전시를 보러 갔다.');
    expect(cards[2].currentText).toBe('설명문은 다소 어려웠다.');
    expect(cards[3].currentText).toBe('이런 경험은 좋은 추억이 되었다.');
    expect(cards[4].currentText).toBe('다음에 꼭 다시 가고 싶다.');
  });

  // T06: 3번 카드를 고정으로 변경 -> AI 적용 불가, 그러나 직접 타이핑은 가능
  it('T06: 고정(lock) 모드 문장은 AI 제안 적용이 절대 불가하지만 직접 타이핑 수정은 완전히 허용된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    const card3 = cards[2];
    card3.mode = 'lock';

    card3.suggestion = {
      id: 'sug_test_lock',
      sentenceId: card3.id,
      sourceText: card3.currentText,
      sourceVersion: card3.version,
      suggestedText: 'AI가 만든 대체 문장',
      reason: '수정 이유',
      status: 'ready',
      isMock: true,
      createdAt: Date.now(),
    };

    // 1. Protection check: cannot apply AI
    expect(canApplySuggestion(card3)).toBe(false);
    const resultAfterAttempt = applySuggestionToCard(card3);
    expect(resultAfterAttempt.currentText).toBe(card3.originalText);

    // 2. Direct user editing check: User can freely edit!
    const userEditedCard = updateCardText(card3, '내가 직접 수정한 설명문 내용이다.');
    expect(userEditedCard.currentText).toBe('내가 직접 수정한 설명문 내용이다.');
  });

  // T07: 제안 생성 후 원문을 직접 수정 -> 이전 제안이 stale 처리되고 바로 적용되지 않음
  it('T07: 제안이 생성된 후 사용자가 원문을 직접 수정하면 제안이 stale 상태가 되어 적용이 차단된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    let card = cards[0];

    card.suggestion = {
      id: 'sug_test_stale',
      sentenceId: card.id,
      sourceText: card.currentText,
      sourceVersion: card.version,
      suggestedText: '오늘 전시회 방문을 했다.',
      reason: '간결화',
      status: 'ready',
      isMock: true,
      createdAt: Date.now(),
    };

    expect(isSuggestionStale(card, card.suggestion)).toBe(false);
    expect(canApplySuggestion(card)).toBe(true);

    // User types directly in the card
    card = updateCardText(card, '오늘 오후 비가 내리는 가운데 전시를 보러 갔다.');

    expect(isSuggestionStale(card, card.suggestion)).toBe(true);
    expect(card.suggestion?.status).toBe('stale');
    expect(canApplySuggestion(card)).toBe(false);

    // Attempting apply should not alter user's custom edit!
    const applied = applySuggestionToCard(card);
    expect(applied.currentText).toBe('오늘 오후 비가 내리는 가운데 전시를 보러 갔다.');
  });

  // T08: 카드 1개 원문 복원 -> 해당 카드만 최초 분석 당시 텍스트로 복원
  it('T08: 수정된 카드 중 1개만 원문 복원하면 해당 카드만 복원되고 다른 수정 사항은 유지된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    cards[0] = updateCardText(cards[0], '첫 번째 문장 수정됨.');
    cards[1] = updateCardText(cards[1], '두 번째 문장 수정됨.');

    expect(cards[0].currentText).toBe('첫 번째 문장 수정됨.');
    expect(cards[1].currentText).toBe('두 번째 문장 수정됨.');

    // Revert card 0 only
    cards[0] = {
      ...cards[0],
      currentText: cards[0].originalText,
      version: cards[0].version + 1,
      suggestion: undefined,
    };

    expect(cards[0].currentText).toBe('오늘은 오래 기다렸던 전시를 보러 갔다.');
    expect(cards[1].currentText).toBe('두 번째 문장 수정됨.');
  });

  // T09: 수정 전후 비교 (Diff)
  it('T09: 원문과 수정본 간의 삭제 및 추가 토큰 diff를 정확히 계산한다', () => {
    const orig = '전시가 정말 좋았고 작품도 정말 인상적이었다.';
    const curr = '전시가 좋았고 작품도 깊은 인상을 남겼다.';

    const { originalSegments, currentSegments } = computeTokenDiff(orig, curr);

    const hasDelete = originalSegments.some(s => s.type === 'delete');
    const hasInsert = currentSegments.some(s => s.type === 'insert');

    expect(hasDelete).toBe(true);
    expect(hasInsert).toBe(true);
  });

  // T13: 타이핑 도중 문장 부호 입력 시 카드가 소멸하거나 재분할되지 않음
  it('T13: 카드 안에서 직접 수정 시 마침표나 느낌표를 입력해도 전체 카드가 재분할되지 않는다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    const initialCount = cards.length;

    // User types multiple periods inside card 0
    cards[0] = updateCardText(cards[0], '오늘은. 정말. 오래. 기다렸던 전시였다.');

    expect(cards.length).toBe(initialCount);
    expect(cards[0].currentText).toBe('오늘은. 정말. 오래. 기다렸던 전시였다.');
  });

  // T14: 문장 사이 줄바꿈 및 문단 구분 보존
  it('T14: 2개 문단으로 구성된 글을 분리하고 다시 조립할 때 문단 간 줄바꿈(\\n\\n)이 정확히 보존된다', () => {
    const twoParaText = '첫 번째 문단의 첫 문장입니다. 첫 번째 문단의 두 번째 문장입니다.\n\n두 번째 문단의 첫 문장입니다. 두 번째 문단의 두 번째 문장입니다.';

    const cards = splitIntoSentenceCards(twoParaText);
    expect(cards.length).toBe(4);
    expect(cards[0].paragraphIndex).toBe(0);
    expect(cards[1].paragraphIndex).toBe(0);
    expect(cards[2].paragraphIndex).toBe(1);
    expect(cards[3].paragraphIndex).toBe(1);

    const reassembled = assembleDraft(cards);
    expect(reassembled).toBe(twoParaText);
  });

  // Metrics calculation
  it('통계 메트릭이 정확하게 계산된다', () => {
    const cards = splitIntoSentenceCards(sample5Sentences);
    cards[0] = updateCardText(cards[0], '문장 수정');
    cards[1].mode = 'rewrite';
    cards[2].mode = 'lock';

    const metrics = calculateMetrics(cards);
    expect(metrics.totalSentences).toBe(5);
    expect(metrics.editedSentences).toBe(1);
    expect(metrics.rewriteCount).toBe(1);
    expect(metrics.lockedCount).toBe(1);
    expect(metrics.adviceCount).toBe(3);
    expect(metrics.charCountWithSpaces).toBeGreaterThan(0);
  });
});
