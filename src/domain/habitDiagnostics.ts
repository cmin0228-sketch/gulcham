import { SentenceCard } from '../types';

export interface HabitMetrics {
  healthScore: number; // 0 ~ 100
  summaryFeedback: string;
  
  // 1. Sentence Length / Breath
  totalSentences: number;
  averageCharLength: number;
  longSentences: Array<{
    sentenceId: string;
    index: number;
    text: string;
    charCount: number;
    severity: 'warning' | 'danger'; // warning: 60~90 chars, danger: > 90 chars
  }>;

  // 2. Intensifier Adverbs
  adverbFrequency: Record<string, number>;
  totalAdverbCount: number;
  adverbClusters: Array<{
    sentenceId: string;
    index: number;
    adverbs: string[];
    text: string;
  }>;

  // 3. Repeated Words (Vocabulary)
  repeatedKeywords: Array<{
    word: string;
    count: number;
    sentenceIndices: number[];
  }>;

  // 4. Missing Periods / Casual endings
  unpunctuatedSentences: Array<{
    sentenceId: string;
    index: number;
    ending: string;
  }>;
}

// Common Korean intensifier adverbs that dilute writing impact when overused
export const COMMON_INTENSIFIERS = [
  '진짜', '정말', '너무', '되게', '완전', '엄청',
  '무척', '굉장히', '대단히', '매우', '아주', '참',
  '몹시', '그냥', '막', '약간', '좀', '솔직히'
];

// Korean stop words to exclude from keyword repetition tracking
const STOP_WORDS = new Set([
  '이', '그', '저', '것', '수', '등', '때', '곳', '말', '일',
  '나', '내', '너', '네', '우리', '저희', '자신', '그녀', '그들',
  '있다', '없다', '하다', '되다', '않다', '같다', '보다', '가다', '오다',
  '그리고', '그러나', '그런데', '하지만', '그래서', '그러면', '그래도',
  '또한', '즉', '따라서', '더구나', '결국', '다만', '왜냐하면',
  '때문에', '대해', '대한', '통해', '위해', '관한', '따라', '의해',
  '하고', '에서', '으로', '까지', '부터', '에게', '한테', '로서', '로써',
  '은', '는', '이', '가', '을', '를', '의', '에', '와', '과', '도', '로'
]);

/**
 * Extracts substantive Korean words (2+ characters, ignoring particles and stop words)
 */
function extractSubstantiveWords(text: string): string[] {
  // Strip punctuation and numbers
  const cleaned = text.replace(/[^가-힣\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).filter(t => t.length >= 2);

  return tokens.filter(token => !STOP_WORDS.has(token));
}

/**
 * Analyzes full draft for overall writing habits:
 * - Run-on sentence breath
 * - Intensifier adverb overuse & clusters
 * - Keyword repetition
 * - Sentence ending variety
 * Calculates a 100-point Writing Health Score.
 */
export function analyzeWritingHabits(cards: SentenceCard[]): HabitMetrics {
  if (!cards || cards.length === 0) {
    return {
      healthScore: 100,
      summaryFeedback: '분석할 문장이 아직 없습니다.',
      totalSentences: 0,
      averageCharLength: 0,
      longSentences: [],
      adverbFrequency: {},
      totalAdverbCount: 0,
      adverbClusters: [],
      repeatedKeywords: [],
      unpunctuatedSentences: [],
    };
  }

  const longSentences: HabitMetrics['longSentences'] = [];
  const adverbFrequency: Record<string, number> = {};
  const adverbClusters: HabitMetrics['adverbClusters'] = [];
  const unpunctuatedSentences: HabitMetrics['unpunctuatedSentences'] = [];
  const keywordMap: Map<string, number[]> = new Map();

  let totalChars = 0;

  cards.forEach((card, idx) => {
    const text = card.currentText.trim();
    const len = text.length;
    totalChars += len;

    // 1. Long breath sentence check
    if (len >= 85) {
      longSentences.push({
        sentenceId: card.id,
        index: idx + 1,
        text,
        charCount: len,
        severity: len >= 120 ? 'danger' : 'warning',
      });
    }

    // 2. Intensifier adverb check
    const matchedAdverbsInSentence: string[] = [];
    COMMON_INTENSIFIERS.forEach(adv => {
      // Word boundary or particle boundary
      const regex = new RegExp(`(^|\\s)${adv}(\\s|$|[은는이가을를도])`, 'g');
      const matches = text.match(regex);
      if (matches) {
        const count = matches.length;
        adverbFrequency[adv] = (adverbFrequency[adv] || 0) + count;
        for (let i = 0; i < count; i++) {
          matchedAdverbsInSentence.push(adv);
        }
      }
    });

    if (matchedAdverbsInSentence.length >= 2) {
      adverbClusters.push({
        sentenceId: card.id,
        index: idx + 1,
        adverbs: Array.from(new Set(matchedAdverbsInSentence)),
        text,
      });
    }

    // 3. Repeated substantive words
    const words = extractSubstantiveWords(text);
    words.forEach(w => {
      // Normalize suffix if possible (keep simple stem of 2+ chars)
      const list = keywordMap.get(w) || [];
      list.push(idx + 1);
      keywordMap.set(w, list);
    });

    // 4. Missing final punctuation
    const lastChar = text.slice(-1);
    if (!['.', '!', '?', '~', '”', '"', '’', "'"].includes(lastChar)) {
      unpunctuatedSentences.push({
        sentenceId: card.id,
        index: idx + 1,
        ending: text.slice(-6),
      });
    }
  });

  // Calculate repeated keywords (words appearing 3+ times, or in adjacent sentences)
  const repeatedKeywords: HabitMetrics['repeatedKeywords'] = [];
  keywordMap.forEach((indices, word) => {
    if (indices.length >= 3 && !COMMON_INTENSIFIERS.includes(word)) {
      repeatedKeywords.push({
        word,
        count: indices.length,
        sentenceIndices: indices,
      });
    }
  });
  repeatedKeywords.sort((a, b) => b.count - a.count);

  const totalAdverbCount = Object.values(adverbFrequency).reduce((acc, c) => acc + c, 0);
  const averageCharLength = Math.round(totalChars / cards.length);

  // Health Score Calculation (100 base)
  let score = 100;

  // Deduct for long run-on sentences
  score -= longSentences.filter(s => s.severity === 'danger').length * 8;
  score -= longSentences.filter(s => s.severity === 'warning').length * 4;

  // Deduct for adverb clusters (2+ intensifiers in one sentence)
  score -= adverbClusters.length * 5;

  // Deduct for high adverb density
  const adverbDensity = totalAdverbCount / cards.length;
  if (adverbDensity > 0.8) {
    score -= Math.min(15, Math.round((adverbDensity - 0.8) * 15));
  }

  // Deduct for severe repetition
  if (repeatedKeywords.length >= 3) {
    score -= Math.min(10, (repeatedKeywords.length - 2) * 2);
  }

  score = Math.max(35, Math.min(100, score));

  // Determine summary feedback
  let summaryFeedback = '전체적으로 문장 호흡과 어휘 구성이 안정적입니다.';
  if (longSentences.length >= 2 && adverbClusters.length >= 1) {
    summaryFeedback = '문장의 호흡이 다소 길고 강조 부사(진짜, 정말 등)가 겹쳐 쓰였습니다. 문장을 둘로 나누고 부사를 줄여보세요.';
  } else if (longSentences.length >= 2) {
    summaryFeedback = '호흡이 긴 만연체 문장이 발견되었습니다. 쉼표나 접속어미 대신 문장을 마침표로 끊으면 가독성이 높아집니다.';
  } else if (adverbClusters.length >= 1 || adverbDensity > 0.6) {
    summaryFeedback = '강조 부사(너무, 진짜, 정말 등)의 빈도가 높습니다. 부사 대신 구체적인 서술로 대체해 보세요.';
  } else if (repeatedKeywords.length >= 3) {
    summaryFeedback = '동일한 어휘가 짧은 간격으로 자주 반복됩니다. 유의어나 대명사로 다듬으면 글이 풍성해집니다.';
  }

  return {
    healthScore: score,
    summaryFeedback,
    totalSentences: cards.length,
    averageCharLength,
    longSentences,
    adverbFrequency,
    totalAdverbCount,
    adverbClusters,
    repeatedKeywords: repeatedKeywords.slice(0, 6),
    unpunctuatedSentences,
  };
}