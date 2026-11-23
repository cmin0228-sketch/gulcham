import { SentenceCard, Suggestion } from '../types';

/**
 * Checks whether an existing suggestion is considered stale relative to the current card state.
 * If the user edited the sentence after the suggestion was generated, the suggestion is stale.
 */
export function isSuggestionStale(card: SentenceCard, suggestion?: Suggestion): boolean {
  if (!suggestion) return false;
  return (
    suggestion.sourceText.trim() !== card.currentText.trim() ||
    suggestion.sourceVersion !== card.version
  );
}

/**
 * Validates if the suggestion can be applied to the sentence card.
 * Strict protection rules:
 * 1. Cards in 'lock' mode can NEVER have AI suggestions applied.
 * 2. Stale suggestions cannot be applied (must regenerate).
 * 3. Suggestion must contain non-empty suggestedText.
 */
export function canApplySuggestion(card: SentenceCard): boolean {
  if (card.mode === 'lock') return false;
  if (!card.suggestion) return false;
  if (card.suggestion.status === 'applied') return false;
  if (isSuggestionStale(card, card.suggestion)) return false;
  if (!card.suggestion.suggestedText || card.suggestion.suggestedText.trim() === card.currentText.trim()) {
    return false;
  }
  return true;
}

/**
 * Safely applies the suggestion to the card, updating currentText and marking suggestion as applied.
 * Returns an updated copy of the SentenceCard without modifying any other cards.
 */
export function applySuggestionToCard(card: SentenceCard): SentenceCard {
  if (!canApplySuggestion(card) || !card.suggestion?.suggestedText) {
    return card;
  }

  const nextText = card.suggestion.suggestedText;
  const nextVersion = card.version + 1;

  return {
    ...card,
    currentText: nextText,
    version: nextVersion,
    suggestion: {
      ...card.suggestion,
      status: 'applied',
    },
  };
}

/**
 * Safely updates currentText when user manually edits a card.
 * Does not re-split the document.
 * Automatically marks any existing suggestion as stale if the text changed.
 */
export function updateCardText(card: SentenceCard, newText: string): SentenceCard {
  if (card.currentText === newText) {
    return card;
  }

  const nextVersion = card.version + 1;
  let nextSuggestion = card.suggestion;

  if (nextSuggestion) {
    const isStale = newText.trim() !== nextSuggestion.sourceText.trim();
    if (isStale && nextSuggestion.status !== 'applied') {
      nextSuggestion = {
        ...nextSuggestion,
        status: 'stale',
      };
    }
  }

  return {
    ...card,
    currentText: newText,
    version: nextVersion,
    suggestion: nextSuggestion,
  };
}
