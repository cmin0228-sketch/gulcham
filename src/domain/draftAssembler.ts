import { SentenceCard } from '../types';

/**
 * Reassembles sentence cards into full text, maintaining paragraph boundaries.
 * Sentences within the same paragraph are joined with a space.
 * Sentences in different paragraphs are separated by a double newline.
 */
export function assembleDraft(cards: SentenceCard[]): string {
  if (!cards || cards.length === 0) {
    return '';
  }

  let result = '';
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const text = card.currentText.trim();
    if (!text) continue;

    if (i === 0) {
      result += text;
    } else {
      const prevCard = cards[i - 1];
      if (card.paragraphIndex !== prevCard.paragraphIndex) {
        result += '\n\n' + text;
      } else {
        result += ' ' + text;
      }
    }
  }

  return result;
}

export interface DraftMetrics {
  totalSentences: number;
  editedSentences: number;
  rewriteCount: number;
  adviceCount: number;
  lockedCount: number;
  charCountWithSpaces: number;
  charCountWithoutSpaces: number;
}

export function calculateMetrics(cards: SentenceCard[]): DraftMetrics {
  const fullText = assembleDraft(cards);
  let edited = 0;
  let rewrite = 0;
  let advice = 0;
  let locked = 0;

  cards.forEach(c => {
    if (c.currentText.trim() !== c.originalText.trim()) {
      edited++;
    }
    if (c.mode === 'rewrite') rewrite++;
    else if (c.mode === 'advice') advice++;
    else if (c.mode === 'lock') locked++;
  });

  return {
    totalSentences: cards.length,
    editedSentences: edited,
    rewriteCount: rewrite,
    adviceCount: advice,
    lockedCount: locked,
    charCountWithSpaces: fullText.length,
    charCountWithoutSpaces: fullText.replace(/\s/g, '').length,
  };
}
