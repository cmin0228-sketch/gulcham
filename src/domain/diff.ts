export interface DiffSegment {
  type: 'equal' | 'delete' | 'insert';
  value: string;
}

/**
 * Splits Korean text into whitespace-delimited tokens and punctuation tokens.
 */
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) || [];
}

/**
 * Computes difference between two texts using token-level LCS (Longest Common Subsequence).
 */
export function computeTokenDiff(original: string, current: string): { originalSegments: DiffSegment[]; currentSegments: DiffSegment[] } {
  const origTokens = tokenize(original);
  const currTokens = tokenize(current);
  const n = origTokens.length;
  const m = currTokens.length;

  // For very long texts, fall back gracefully
  if (n * m > 150000) {
    return {
      originalSegments: [{ type: 'equal', value: original }],
      currentSegments: [{ type: 'equal', value: current }],
    };
  }

  // 2D DP array for LCS
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (origTokens[i] === currTokens[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = 0;
  let j = 0;
  const originalSegments: DiffSegment[] = [];
  const currentSegments: DiffSegment[] = [];

  while (i < n || j < m) {
    if (i < n && j < m && origTokens[i] === currTokens[j]) {
      originalSegments.push({ type: 'equal', value: origTokens[i] });
      currentSegments.push({ type: 'equal', value: currTokens[j] });
      i++;
      j++;
    } else if (i < n && (j >= m || dp[i + 1][j] >= dp[i][j + 1])) {
      originalSegments.push({ type: 'delete', value: origTokens[i] });
      i++;
    } else {
      currentSegments.push({ type: 'insert', value: currTokens[j] });
      j++;
    }
  }

  return { originalSegments, currentSegments };
}
