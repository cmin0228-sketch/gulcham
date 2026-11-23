import { DocumentState } from '../types';

const STORAGE_KEY = 'geulchim_document_state_v1';

export function saveDocumentState(state: DocumentState): boolean {
  try {
    const serialized = JSON.stringify({
      ...state,
      lastUpdatedAt: Date.now(),
    });
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.warn('Failed to save state to localStorage:', error);
    return false;
  }
}

export function loadDocumentState(): DocumentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DocumentState;
    if (parsed && Array.isArray(parsed.cards) && typeof parsed.originalFullText === 'string') {
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load state from localStorage:', error);
  }
  return null;
}

export function clearDocumentState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear state from localStorage:', error);
  }
}
