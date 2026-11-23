import { SentenceCard } from '../types';

let sentenceCounter = 1;

export function resetSentenceCounter(start = 1): void {
  sentenceCounter = start;
}

/**
 * Checks if a string contains unclosed quotes, brackets, or typographical quotation marks.
 */
export function hasUnclosedScope(text: string): boolean {
  // 1. Standard symmetrical quotes
  const doubleQuotes = (text.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) return true;

  const singleQuotes = (text.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) return true;

  // 2. Paired brackets and Korean typographical quotes
  const pairs: Array<[string, string]> = [
    ['(', ')'],
    ['[', ']'],
    ['{', '}'],
    ['“', '”'],
    ['‘', '’'],
    ['『', '』'],
    ['「', '」'],
  ];

  for (const [open, close] of pairs) {
    const openCount = (text.match(new RegExp('\\' + open, 'g')) || []).length;
    const closeCount = (text.match(new RegExp('\\' + close, 'g')) || []).length;
    if (openCount > closeCount) return true;
  }

  return false;
}

const CONVERSATIONAL_ENDINGS = [
  '[었았였겠]?습니다',
  '[었았였겠]?ㅂ니다',
  '[었았였겠]?네요',
  '[었았였겠]?군요',
  '[었았였겠]?잖아요',
  '[었았였겠]?더라고요',
  '[었았였겠]?더라고용',
  '[었았였겠]?더군요',
  '[었았였겠]?던데요',
  '(?:[가-힣]+\\s+)?거예요',
  '(?:[가-힣]+\\s+)?거였어요',
  '(?:[가-힣]+\\s+)?거거든요',
  '(?:[가-힣]+\\s+)?거랍니다',
  '[었았였겠]?거든요',
  '[었았였겠]?지요',
  '[었았였겠]?죠',
  '[었았였]?어요',
  '[었았였]?아요',
  '[었았였]?여요',
  '겠어요',
  '[은는]?데요',
  '[은는]?데용',
  '[으]?려구요',
  '[으]?려고요',
  '하구요',
  '했구요',
  '했고요',
  '답니다',
  '답니다요',
  '대요',
  '래요',
  '했지요',
  '했죠',
  '냐구요',
  '냐면요'
].join('|');

const POSTPOSITIONS_TO_AVOID = '라고|라며|라는|하고|마저|조차|만|도';

/**
 * Splits conversational run-on sentences where periods are omitted:
 * e.g. casual blog/diary sentences ending with '~있겠네요 그리고', '~거예요 계속', '~있어요 옷 입은', '~있었습니다 이번에', '~팔려구요'
 * and trailing ellipses with new clauses like '옷 잘 있나....아닌듯'
 */
export function splitConversationalRunons(text: string): string[] {
  if (text.length < 15) return [text];

  // Pattern 1: Verb/Adjective conversational endings + space + not followed by quoting particle
  const endingPattern = new RegExp(
    '([가-힣]+(?:' + CONVERSATIONAL_ENDINGS + ')|(?:[가-힣]+\\s+)?(?:거예요|거였어요|거거든요|거랍니다))\\s+(?!(?:' + POSTPOSITIONS_TO_AVOID + ')[\\s,.]|$)',
    'g'
  );

  // Pattern 2: Multiple dots/ellipses followed by space or immediately by a new word (e.g. "잘 있나....아닌듯")
  const ellipsisPattern = /([가-힣A-Za-z0-9]+(?:\.{2,}|…+))\s*(?=[가-힣A-Za-z0-9])/g;

  // First pass: split by conversational endings
  const firstPass: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = endingPattern.exec(text)) !== null) {
    const splitPoint = match.index + match[1].length;
    const prefix = text.slice(0, splitPoint);
    if (!hasUnclosedScope(prefix)) {
      const segment = text.slice(lastIndex, splitPoint).trim();
      if (segment && /[가-힣A-Za-z0-9]/.test(segment)) {
        firstPass.push(segment);
      }
      lastIndex = splitPoint;
    }
  }

  const remainder = text.slice(lastIndex).trim();
  if (remainder && /[가-힣A-Za-z0-9]/.test(remainder)) {
    firstPass.push(remainder);
  }

  const candidateSegments = firstPass.length > 0 ? firstPass : [text];

  // Second pass: split ellipses with trailing thoughts (e.g. "잘 있나....아닌듯")
  const secondPass: string[] = [];
  for (const seg of candidateSegments) {
    let subLast = 0;
    let ellMatch: RegExpExecArray | null;
    let foundEllipsisSplit = false;

    while ((ellMatch = ellipsisPattern.exec(seg)) !== null) {
      const splitPoint = ellMatch.index + ellMatch[1].length;
      const prefix = seg.slice(0, splitPoint);
      if (!hasUnclosedScope(prefix)) {
        const sub = seg.slice(subLast, splitPoint).trim();
        if (sub && /[가-힣A-Za-z0-9]/.test(sub)) {
          secondPass.push(sub);
          foundEllipsisSplit = true;
        }
        subLast = splitPoint;
      }
    }

    const subRem = seg.slice(subLast).trim();
    if (subRem && /[가-힣A-Za-z0-9]/.test(subRem)) {
      secondPass.push(subRem);
    } else if (!foundEllipsisSplit && /[가-힣A-Za-z0-9]/.test(seg)) {
      secondPass.push(seg);
    }
  }

  return secondPass.length > 0 ? secondPass : [text];
}

export interface SplitOptions {
  conversationalSplit?: boolean;
}

/**
 * Splits Korean text into sentence objects while preserving paragraph boundaries.
 * Features:
 * 1. Skips leading, trailing, and inter-paragraph empty lines completely.
 * 2. Filters out any segment that contains NO alphanumeric or Korean hangul characters (never creates blank cards).
 * 3. Leverages Intl.Segmenter with Korean language context.
 * 4. Strict Quotation Scope Tracking: Prevents splitting inside quotations.
 * 5. Quotation Particle Binding: Correctly binds trailing particles (e.g. '라고', '라며').
 * 6. Conversational Run-on Detection: Recognizes '~네요', '~거예요', '~어요', '~습니다', '~구요' etc.
 * 7. Ellipsis Splitting: Handles '...아닌듯' style casual trailing thoughts.
 * 8. Preserves decimal numbers (e.g. 42.195km, 3.14%) and parenthetical expressions.
 */
export function splitIntoSentenceCards(text: string, options: SplitOptions = { conversationalSplit: true }): SentenceCard[] {
  if (!text || !text.trim()) {
    return [];
  }

  // Trim leading and trailing newlines/whitespace so the first sentence is never blank
  const cleanFullText = text.trim();

  // Split by double newline or multiple newlines with optional spaces in-between
  const rawParagraphs = cleanFullText.split(/(?:\r?\n\s*){2,}/);
  const cards: SentenceCard[] = [];

  rawParagraphs.forEach((paragraph, pIndex) => {
    const trimmedPara = paragraph.trim();
    // Must contain at least one valid Korean, alphabet, or number character
    if (!trimmedPara || !/[가-힣A-Za-z0-9]/.test(trimmedPara)) return;

    let rawSentences: string[] = [];

    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter('ko', { granularity: 'sentence' });
      const rawSegments: string[] = Array.from(segmenter.segment(trimmedPara)).map((s: any) => s.segment);

      for (let i = 0; i < rawSegments.length; i++) {
        const seg = rawSegments[i];
        const trimmedSeg = seg.trim();
        const prev = rawSentences[rawSentences.length - 1] || '';

        // Condition 1: Previous accumulated sentence has an unclosed quote or bracket
        const unclosed = hasUnclosedScope(prev);

        // Condition 2: Current segment starts with a quotation particle or postposition
        const isQuoteParticle = /^(?:["'”’』」]?\s*(?:라고|라며|라는|하며|하고|이라며|이란|면서|등|조차|마저|뿐|도|은|는|이|가|을|를)(?=[\s,.]|$))/.test(trimmedSeg);

        // Condition 3: Stray punctuation
        const isStrayPunct = /^[.,!?:;~]+$/.test(trimmedSeg);

        if (rawSentences.length > 0 && (unclosed || isQuoteParticle || isStrayPunct)) {
          rawSentences[rawSentences.length - 1] += seg;
        } else {
          rawSentences.push(seg);
        }
      }
    } else {
      // Regex fallback
      const regex = /[^.!?。！？\r\n]+(?:(?:\.{3,}|[.!?。！？]+)(?=["'』」\s]|$)|$)/g;
      const rawMatches = trimmedPara.match(regex);
      rawSentences = rawMatches ? Array.from(rawMatches) : [trimmedPara];
    }

    // Secondary pass: Conversational run-on splitting if enabled
    let refinedSentences: string[] = [];
    for (const rawSentence of rawSentences) {
      const trimmed = rawSentence.trim();
      // Skip whitespace or empty
      if (!trimmed || !/[가-힣A-Za-z0-9]/.test(trimmed)) continue;

      if (options.conversationalSplit && trimmed.length >= 15) {
        const subSentences = splitConversationalRunons(trimmed);
        refinedSentences.push(...subSentences);
      } else {
        refinedSentences.push(trimmed);
      }
    }

    // Filter strictly for valid sentences containing actual words
    const finalSentences = refinedSentences
      .map(s => s.trim())
      .filter(s => s.length > 0 && /[가-힣A-Za-z0-9]/.test(s));

    finalSentences.forEach(sentenceText => {
      // Absolute check: never push blank, whitespace-only, or symbol-only card
      if (!sentenceText.trim() || !/[가-힣A-Za-z0-9]/.test(sentenceText)) return;

      const id = `s_${sentenceCounter++}_${Math.random().toString(36).substring(2, 7)}`;
      cards.push({
        id,
        paragraphIndex: pIndex,
        originalText: sentenceText,
        currentText: sentenceText,
        mode: 'advice',
        version: 1,
      });
    });
  });

  return cards;
}