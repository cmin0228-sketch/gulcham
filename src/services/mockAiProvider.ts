import { AIProvider } from './aiProvider';
import { AIServiceResponse, SentenceContext, TextChangeItem } from '../types';

export class MockAIProvider implements AIProvider {
  isRealAI(): boolean {
    return false;
  }

  async generateForSentence(
    sentence: string,
    mode: 'advice' | 'rewrite',
    context?: SentenceContext
  ): Promise<AIServiceResponse> {
    // Artificial small delay to simulate processing feel (150ms)
    await new Promise(resolve => setTimeout(resolve, 150));

    const trimmed = sentence.trim();

    if (mode === 'advice') {
      const issues: string[] = [];
      let explanation = '';
      let actionableHint = '';

      const countJungmal = (trimmed.match(/정말/g) || []).length;
      const countNeomu = (trimmed.match(/너무/g) || []).length;

      if (countJungmal >= 2 || countNeomu >= 2 || (countJungmal >= 1 && countNeomu >= 1)) {
        issues.push('강조 부사(정말, 너무 등)가 반복되어 글의 호흡이 무거워질 수 있습니다.');
      } else if (/정말|너무|굉장히|무척|아주|진짜/.test(trimmed)) {
        issues.push('강조 부사 사용을 점검해 보세요. 수식어 대신 구체적인 사실이나 감각적 묘사를 사용하면 글의 신뢰도가 높아집니다.');
      }

      if (/긍정적인|정서적|만족감|제공하였다|도모|제고|수행|다소/.test(trimmed)) {
        issues.push('공문서나 번역투에 자주 쓰이는 딱딱한 어휘가 포함되어 있습니다.');
      }

      if (/어려운.*어려웠|어렵다.*어려운/.test(trimmed)) {
        issues.push('동일한 어근(어렵다)이 한 문장 안에서 반복됩니다.');
      }

      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount >= 18) {
        issues.push(`문장 길이가 긴 편입니다 (어절 수: ${wordCount}개). 두 문장으로 쪼개거나 불필요한 연결 어미를 줄여 보세요.`);
      }

      if (/에 대하여|에 있어서|에 의해|을 통해/.test(trimmed)) {
        issues.push('일본어투나 영문 번역투 조사(~에 있어서, ~에 의해)가 사용되었습니다.');
      }

      if (issues.length === 0) {
        issues.push('명백한 어법 오류는 발견되지 않았습니다. 앞뒤 문맥과의 호흡 및 어조가 자연스러운지 직접 확인해 보세요.');
        explanation = '문장이 간결하고 정돈되어 있습니다. 다만 글의 전체적인 분위기나 독자에 맞춰 어휘의 온도를 미세 조정해 볼 수 있습니다.';
        actionableHint = '위 입력창에서 문맥에 맞는 단어나 표현을 직접 덧붙여 보세요.';
      } else {
        explanation = `이 문장에서는 ${issues.length}가지 검토 지점이 발견되었습니다. 과도한 수식이나 경직된 표현을 덜어내면 메시지가 더 선명해집니다.`;
        actionableHint = 'AI의 대체 문장 대신 위 입력창에서 직접 표현을 다듬어 보세요.';
      }

      return {
        mode: 'advice',
        isMock: true,
        reason: explanation,
        advice: {
          issues,
          explanation,
          actionableHint,
        },
      };
    }

    // Rewrite mode
    let candidate = trimmed;
    const reasons: string[] = [];

    const replacements: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
      {
        pattern: /정말 오래 기다렸던/g,
        replacement: '오랫동안 기다렸던',
        reason: '반복될 수 있는 강조 부사를 자연스러운 시간 표현으로 다듬었습니다.',
      },
      {
        pattern: /전시장 분위기가 정말 좋았고 작품들도 정말 인상적이었다/g,
        replacement: '전시장 분위기는 아늑했고 작품들도 깊은 인상을 남겼다',
        reason: '반복된 ‘정말’을 덜어내고 구체적인 묘사로 생동감을 더했습니다.',
      },
      {
        pattern: /정말 인상적이었다/g,
        replacement: '인상적이었다',
        reason: '습관적인 강조어를 덜어내어 문장을 깔끔하게 정돈했습니다.',
      },
      {
        pattern: /정말 좋았고/g,
        replacement: '좋았고',
        reason: '강조 부사를 덜어내 담백하게 표현했습니다.',
      },
      {
        pattern: /설명문은 다소 어려운 단어가 많아서 이해하기가 조금 어려웠다/g,
        replacement: '설명문에는 낯선 전문 용어가 많아 단번에 이해하기는 쉽지 않았다',
        reason: '반복되는 ‘어려운/어려웠다’를 정리하고 어휘 선택을 명확히 했습니다.',
      },
      {
        pattern: /긍정적인 정서적 만족감을 제공하였다/g,
        replacement: '마음이 풍성해지는 기분 좋은 경험이었다',
        reason: '보고서식 경직된 표현을 편안하고 진솔한 일상어로 순화했습니다.',
      },
      {
        pattern: /시간이 된다면 꼭 다시 방문하고 싶다/g,
        replacement: '기회가 닿는다면 다시 한 번 찾고 싶다',
        reason: '상투적인 문장을 조금 더 여운이 남는 자연스러운 문체로 다듬었습니다.',
      },
      {
        pattern: /정말이라는 말을 너무 많이 쓴 것 같다/g,
        replacement: '‘정말’이라는 수식어를 지나치게 자주 쓴 것 같다',
        reason: '구어적 표현을 문맥에 맞게 매끄럽게 정리했습니다.',
      },
      {
        pattern: /제고하다/g,
        replacement: '높이다',
        reason: '어려운 한자어를 쉬운 우리말로 바꿨습니다.',
      },
      {
        pattern: /다소\s+/g,
        replacement: '조금 ',
        reason: '격식 표현을 부드러운 일상 표현으로 바꿨습니다.',
      },
    ];

    const changes: TextChangeItem[] = [];
    for (const rule of replacements) {
      if (rule.pattern.test(candidate)) {
        const match = candidate.match(rule.pattern)?.[0] || '';
        candidate = candidate.replace(rule.pattern, rule.replacement);
        reasons.push(rule.reason);
        if (match) {
          changes.push({
            original: match,
            revised: rule.replacement,
            reason: rule.reason,
          });
        }
      }
    }

    // Fallback heuristic if no specific pattern matched
    if (candidate === trimmed) {
      if (/정말\s+|너무\s+|굉장히\s+|무척\s+/.test(candidate)) {
        candidate = candidate.replace(/정말\s+|너무\s+|굉장히\s+|무척\s+/g, '');
        reasons.push('문장 앞머리의 부사를 덜어내어 문장의 본뜻을 돋보이게 했습니다.');
      } else if (candidate.endsWith('하였다.')) {
        candidate = candidate.replace(/하였다\.$/, '했다.');
        reasons.push('딱딱한 종결 어미를 구어에 가깝고 산뜻하게 수정했습니다.');
      } else if (candidate.endsWith('것이다.')) {
        candidate = candidate.replace(/것이다\.$/, '다.');
        reasons.push('장황한 우언적 표현(~것이다)을 축약하여 명료하게 정리했습니다.');
      } else {
        // Subtle generic polish
        reasons.push('데모 규칙 기반으로 어휘와 호흡을 매끄럽게 가다듬은 예시입니다.');
      }
    }

    return {
      mode: 'rewrite',
      isMock: true,
      suggestedText: candidate !== trimmed ? candidate : `${trimmed} (다듬은 표현)`,
      reason: reasons.join(' ') || '문장의 흐름을 보다 간결하게 정리했습니다.',
      changes: changes.length > 0 ? changes : undefined,
    };
  }
}
