import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

app.get('/api/health', (req, res) => {
  const hasApiKey = Boolean(GEMINI_API_KEY || OPENAI_API_KEY);
  res.json({
    status: 'ok',
    hasApiKey,
    provider: GEMINI_API_KEY ? 'gemini' : OPENAI_API_KEY ? 'openai' : 'none',
  });
});

app.post('/api/ai/split', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return res.status(503).json({ error: 'No API key configured on server' });
  }

  try {
    const sentences = await callGeminiSplit(text, GEMINI_API_KEY);
    return res.json({ sentences });
  } catch (error) {
    console.error('AI Split error:', error);
    return res.status(500).json({ error: error.message || 'AI split failed' });
  }
});

async function callGeminiSplit(text, apiKey) {
  const systemInstruction = `당신은 한국어 문맥 분석 및 문장 분할 전문가입니다.
사용자가 제공한 원문은 마침표(.)나 문장부호가 생략된 블로그, 일기, 구어체 글일 수 있습니다.
원문의 글자나 표현을 절대로 임의로 수정하거나 누락하지 말고, 의미와 호흡이 완결되는 자연스러운 단위로 문장들을 정확하게 분할하세요.
반드시 아래 JSON 포맷으로만 응답하세요:
{
  "sentences": ["첫 번째 문장", "두 번째 문장", "세 번째 문장"]
}`;

  const prompt = `분할할 원문:
${text}`;

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.sentences) && parsed.sentences.length > 0) {
        return parsed.sentences;
      }
    } catch (e) {
      console.warn(`Split error with ${model}:`, e.message);
    }
  }

  throw new Error('AI split candidates failed');
}

app.post('/api/ai/process', async (req, res) => {
  const { sentence, mode, context } = req.body;

  if (!sentence || typeof sentence !== 'string') {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  if (mode !== 'advice' && mode !== 'rewrite') {
    return res.status(400).json({ error: 'Invalid mode. Must be "advice" or "rewrite"' });
  }

  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    return res.status(503).json({ error: 'No API key configured on server. Use Demo mode.' });
  }

  try {
    if (GEMINI_API_KEY) {
      const result = await callGemini(sentence, mode, GEMINI_API_KEY, context);
      return res.json(result);
    } else {
      const result = await callOpenAI(sentence, mode, OPENAI_API_KEY, context);
      return res.json(result);
    }
  } catch (error) {
    console.error('AI call error:', error);
    return res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

async function callGemini(sentence, mode, apiKey, context) {
  const systemInstruction = mode === 'advice'
    ? `당신은 한국어 글쓰기 에디터 '글침'의 분석 코치입니다.
글쓴이 고유의 어조와 문체, 개성을 최대한 존중하면서 해당 문장의 문제점을 객관적으로 진단하세요.
절대로 '완성된 대체 문장'을 제공하지 마세요! 문제점 지적과 글쓴이의 어조를 살리는 수정 방향 안내만 제공해야 합니다.
반드시 아래 JSON 포맷으로만 응답하세요:
{
  "issues": ["문제점1", "문제점2"],
  "explanation": "원문의 어조를 유지하며 개선할 수 있는 이유와 맥락 설명",
  "actionableHint": "글쓴이가 직접 입력창에서 고칠 때 참고할 구체적인 팁"
}`
    : `당신은 한국어 글쓰기 에디터 '글침'의 퇴고 어시스턴트입니다.
당신의 임무는 문장의 원래 어조와 개성을 지키면서, [문장 구조 개선]과 [표현 개선]의 2가지 작업을 모두 확실히 수행하는 것입니다.
문장 구조만 단순히 분리하고 문제 있는 표현(부사 남용, 의미 중복, 장황한 군더더기)을 그대로 방치하는 것은 수정이 완료된 것이 아닙니다!

반드시 다음 기준을 엄격히 준수하여 퇴고하세요.

[1. 문장 구조 개선]
- 지나치게 길거나 만연체인 문장은 자연스러운 의미 단위로 분리한다. 분리된 문장들은 온전하게 마침표나 물음표로 나누어 revised_text 안에 포함한다.
- 불필요하게 반복되는 접속사나 연결 표현('그런데', '그리고', '~하고', '~해서')을 줄이고 문장 간 흐름을 자연스럽게 정리한다.
- 문장을 나눌 때 원문의 사건 순서, 인과관계, 핵심 의미를 왜곡 없이 유지한다.

[2. 표현 개선 (부사 남용 · 중복 표현 · 군더더기 적극 정돈)]
- 과도하게 사용된 부사와 강조 표현을 실제로 수정한다:
  * 같은 문맥이나 문장에서 반복되는 '정말', '굉장히', '상당히', '너무', '매우', '진짜' 등의 표현을 점검하고, 의미 전달과 감정 강조에 꼭 필요한 1~2개만 남기고 불필요한 중복 부사는 삭제하거나 간결하게 정리한다.
  * 부사를 다른 비슷한 부사로 단순 교체(예: '굉장히' -> '무척')하지 말고, 삭제하거나 문장 자체를 간결하게 만든다.
- 의미가 겹치거나 중복되는 표현을 간결하게 압축한다:
  * 예: '먹으면 먹을수록 점점 더' -> '먹을수록'
  * 예: '커피도 정말 맛있었고 디저트도 굉장히 맛있어서'처럼 동일한 평가가 반복되면 -> '커피와 디저트 모두 맛있어서'
- 문맥상 없어도 의미가 충분히 전달되는 장황한 군더더기 표현을 정리한다:
  * 문두나 문중의 습관적 군더더기('사실', '결과적으로는') 정리
  * 동일 어구의 불필요한 반복('~생각이 들었고 ... ~생각이 들었다' -> '~생각이 들었고 ... 꼭 다시 방문하고 싶어졌다' 등) 정리

[3. 무조건 삭제 금지 및 감정 보존]
- 모든 부사를 기계적으로 일괄 삭제하지 않는다.
- 감정을 강조하거나 생생한 의미 전달에 필요한 핵심 부사는 자연스럽게 살려둔다.
- 작성자의 본래 감정 강도를 임의로 낮추거나 높이지 않는다.
- 원문에 없는 새로운 사실, 상황, 유행어를 지어내어 추가하지 않는다.
- 문제나 어색함이 없는 자연스러운 표현은 억지로 바꾸지 않고 그대로 둔다.

[4. 원문 문체 및 말투 절대 보존]
- 원문의 문체와 종결 방식을 절대 바꾸지 않는다.
  * 반말은 반말로, 해요체는 해요체로, -다체는 -다체로, -음체는 -음체로 유지한다.
  * '-음', '-했음', '-거든?', '-잖아', '-ㅋㅋ' 등 SNS 말투, 축약어, 개성 있는 어휘('개큰 만족' 등)를 임의로 삭제하거나 표준어/격식체로 순화하지 않는다.
  * 구어체 표현('친구랑', '웨이팅' 등)을 불필요하게 문어체나 격식체('친구와', '대기')로 바꾸지 않는다.
  * 존댓말(~습니다, ~해요)로 임의 격식화하지 않는다.

[5. 출력 형식]
- 수정문(revised_text) 전체를 큰따옴표(“...”)나 감싸는 기호로 감싸지 않는다.
- 인사말, 설명 문구, 마크다운 코드블록을 출력하지 않는다.
- 실제로 수정한 부분만 changes 배열에 { original, revised, reason } 형식으로 기록한다.
- 수정할 필요가 전혀 없다면 원문을 그대로 revised_text에 반환하고 changes는 빈 배열([])로 둔다.

[수정 예시 참고]
원문 1: 오늘 친구랑 성수동 갔다 왔는데 요즘 인스타에 계속 뜨던 카페가 있어서 드디어 가봤음 개큰 만족ㅋㅋ
올바른 수정 1: 오늘 친구랑 성수동 갔다 왔음. 요즘 인스타에 계속 뜨던 카페가 있어서 드디어 가봤음. 개큰 만족ㅋㅋ
(이유: 원문의 SNS 말투와 '개큰 만족ㅋㅋ' 고유 표현을 보존하며 문장을 분리함)

원문 2: 원래 가려고 했던 카페가 사람이 굉장히 많기도 하고 웨이팅도 상당히 길어서 우연히 발견하게 된 곳이었다.
올바른 수정 2: 원래 가려던 카페는 사람이 많고 웨이팅도 길어서 우연히 발견한 곳이었다.
(이유: 중복 강조 부사인 '굉장히'와 '상당히'를 정돈하고, 장황한 연결을 간결하게 압축함)

원문 3: 커피도 정말 맛있었고 디저트도 굉장히 맛있어서 처음에는 별로 기대하지 않았지만 먹으면 먹을수록 점점 더 만족스러워졌고 커피랑 같이 먹기에 정말 좋았다.
올바른 수정 3: 커피와 디저트 모두 맛있었다. 처음에는 별로 기대하지 않았지만 먹을수록 만족스러웠고, 커피와 같이 먹기에도 정말 좋았다.
(이유: '정말 맛있었고 ... 굉장히 맛있어서'의 반복 평가를 '모두 맛있었다'로 통합하고, '먹으면 먹을수록 점점 더'를 '먹을수록'으로 간결화함)

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "revised_text": "수정된 문장 (큰따옴표 없이 순수 텍스트만)",
  "reason": "수정한 이유 (구조 개선 및 표현 정리 내용 포함 1~2문장)",
  "changes": [
    {
      "original": "원래 표현",
      "revised": "수정 표현",
      "reason": "수정 이유"
    }
  ]
}`;

  let prompt = '';
  if (context?.paragraphText) {
    prompt += `[참고 문맥 (해당 문단 전체 - 작성자의 원래 어조/문체 파악 및 문단 전체의 중복 어휘/부사 남용 파악용)]\n${context.paragraphText}\n(※ 참고 문맥은 글쓴이의 어조와 문체, 문단 전체에서 반복 남발되는 부사를 파악하기 위한 자료입니다. [수정 대상 문장]만 수정하여 반환하세요.)\n\n`;
  } else if (context?.prevSentence || context?.nextSentence) {
    prompt += `[참고 문맥]\n${context.prevSentence ? `이전 문장: ${context.prevSentence}\n` : ''}${context.nextSentence ? `다음 문장: ${context.nextSentence}\n` : ''}\n`;
  }
  prompt += `[수정 대상 문장]\n${sentence}`;

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Gemini (${model}) error: ${response.status} ${errorText}`);
        console.warn(`Gemini (${model}) failed with ${response.status}, trying next model...`);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Empty response from Gemini (${model})`);
        continue;
      }

      const parsed = JSON.parse(text);
      if (mode === 'advice') {
        return {
          mode: 'advice',
          advice: {
            issues: Array.isArray(parsed.issues) ? parsed.issues : ['표현 검토 필요'],
            explanation: parsed.explanation || '',
            actionableHint: parsed.actionableHint || '',
          },
          reason: parsed.explanation || '문장 진단 결과입니다.',
        };
      } else {
        let cleanText = (parsed.revised_text || parsed.suggestedText || sentence).trim();
        // Remove surrounding quotes if model added them
        cleanText = cleanText.replace(/^["'“”]+|["'“”]+$/g, '').trim();

        return {
          mode: 'rewrite',
          suggestedText: cleanText,
          revised_text: cleanText,
          reason: parsed.reason || '자연스럽게 다듬었습니다.',
          changes: Array.isArray(parsed.changes) ? parsed.changes : [],
        };
      }
    } catch (err) {
      lastError = err;
      console.warn(`Error with ${model}:`, err.message);
    }
  }

  throw lastError || new Error('All Gemini model candidates failed');
}

async function callOpenAI(sentence, mode, apiKey, context) {
  const systemPrompt = mode === 'advice'
    ? `당신은 한국어 글쓰기 에디터 '글침'의 분석 코치입니다.
글쓴이 고유의 어조와 문체, 개성을 최대한 존중하면서 해당 문장의 문제점을 객관적으로 진단하세요.
절대로 '완성된 대체 문장'을 제공하지 마세요! 문제점 지적과 글쓴이의 어조를 살리는 수정 방향 안내만 제공해야 합니다.
반드시 아래 JSON 포맷으로만 응답하세요:
{
  "issues": ["문제점1", "문제점2"],
  "explanation": "원문의 어조를 유지하며 개선할 수 있는 이유와 맥락 설명",
  "actionableHint": "글쓴이가 직접 입력창에서 고칠 때 참고할 구체적인 팁"
}`
    : `당신은 한국어 글쓰기 에디터 '글침'의 퇴고 어시스턴트입니다.
당신의 임무는 문장의 원래 어조와 개성을 지키면서, [문장 구조 개선]과 [표현 개선]의 2가지 작업을 모두 확실히 수행하는 것입니다.
문장 구조만 단순히 분리하고 문제 있는 표현(부사 남용, 의미 중복, 장황한 군더더기)을 그대로 방치하는 것은 수정이 완료된 것이 아닙니다!

반드시 다음 기준을 엄격히 준수하여 퇴고하세요.

[1. 문장 구조 개선]
- 지나치게 길거나 만연체인 문장은 자연스러운 의미 단위로 분리한다. 분리된 문장들은 온전하게 마침표나 물음표로 나누어 revised_text 안에 포함한다.
- 불필요하게 반복되는 접속사나 연결 표현('그런데', '그리고', '~하고', '~해서')을 줄이고 문장 간 흐름을 자연스럽게 정리한다.
- 문장을 나눌 때 원문의 사건 순서, 인과관계, 핵심 의미를 왜곡 없이 유지한다.

[2. 표현 개선 (부사 남용 · 중복 표현 · 군더더기 적극 정돈)]
- 과도하게 사용된 부사와 강조 표현을 실제로 수정한다:
  * 같은 문맥이나 문장에서 반복되는 '정말', '굉장히', '상당히', '너무', '매우', '진짜' 등의 표현을 점검하고, 의미 전달과 감정 강조에 꼭 필요한 1~2개만 남기고 불필요한 중복 부사는 삭제하거나 간결하게 정리한다.
  * 부사를 다른 비슷한 부사로 단순 교체(예: '굉장히' -> '무척')하지 말고, 삭제하거나 문장 자체를 간결하게 만든다.
- 의미가 겹치거나 중복되는 표현을 간결하게 압축한다:
  * 예: '먹으면 먹을수록 점점 더' -> '먹을수록'
  * 예: '커피도 정말 맛있었고 디저트도 굉장히 맛있어서'처럼 동일한 평가가 반복되면 -> '커피와 디저트 모두 맛있어서'
- 문맥상 없어도 의미가 충분히 전달되는 장황한 군더더기 표현을 정리한다:
  * 문두나 문중의 습관적 군더더기('사실', '결과적으로는') 정리
  * 동일 어구의 불필요한 반복('~생각이 들었고 ... ~생각이 들었다' -> '~생각이 들었고 ... 꼭 다시 방문하고 싶어졌다' 등) 정리

[3. 무조건 삭제 금지 및 감정 보존]
- 모든 부사를 기계적으로 일괄 삭제하지 않는다.
- 감정을 강조하거나 생생한 의미 전달에 필요한 핵심 부사는 자연스럽게 살려둔다.
- 작성자의 본래 감정 강도를 임의로 낮추거나 높이지 않는다.
- 원문에 없는 새로운 사실, 상황, 유행어를 지어내어 추가하지 않는다.
- 문제나 어색함이 없는 자연스러운 표현은 억지로 바꾸지 않고 그대로 둔다.

[4. 원문 문체 및 말투 절대 보존]
- 원문의 문체와 종결 방식을 절대 바꾸지 않는다.
  * 반말은 반말로, 해요체는 해요체로, -다체는 -다체로, -음체는 -음체로 유지한다.
  * '-음', '-했음', '-거든?', '-잖아', '-ㅋㅋ' 등 SNS 말투, 축약어, 개성 있는 어휘('개큰 만족' 등)를 임의로 삭제하거나 표준어/격식체로 순화하지 않는다.
  * 구어체 표현('친구랑', '웨이팅' 등)을 불필요하게 문어체나 격식체('친구와', '대기')로 바꾸지 않는다.
  * 존댓말(~습니다, ~해요)로 임의 격식화하지 않는다.

[5. 출력 형식]
- 수정문(revised_text) 전체를 큰따옴표(“...”)나 감싸는 기호로 감싸지 않는다.
- 인사말, 설명 문구, 마크다운 코드블록을 출력하지 않는다.
- 실제로 수정한 부분만 changes 배열에 { original, revised, reason } 형식으로 기록한다.
- 수정할 필요가 전혀 없다면 원문을 그대로 revised_text에 반환하고 changes는 빈 배열([])로 둔다.

[수정 예시 참고]
원문 1: 오늘 친구랑 성수동 갔다 왔는데 요즘 인스타에 계속 뜨던 카페가 있어서 드디어 가봤음 개큰 만족ㅋㅋ
올바른 수정 1: 오늘 친구랑 성수동 갔다 왔음. 요즘 인스타에 계속 뜨던 카페가 있어서 드디어 가봤음. 개큰 만족ㅋㅋ
(이유: 원문의 SNS 말투와 '개큰 만족ㅋㅋ' 고유 표현을 보존하며 문장을 분리함)

원문 2: 원래 가려고 했던 카페가 사람이 굉장히 많기도 하고 웨이팅도 상당히 길어서 우연히 발견하게 된 곳이었다.
올바른 수정 2: 원래 가려던 카페는 사람이 많고 웨이팅도 길어서 우연히 발견한 곳이었다.
(이유: 중복 강조 부사인 '굉장히'와 '상당히'를 정돈하고, 장황한 연결을 간결하게 압축함)

원문 3: 커피도 정말 맛있었고 디저트도 굉장히 맛있어서 처음에는 별로 기대하지 않았지만 먹으면 먹을수록 점점 더 만족스러워졌고 커피랑 같이 먹기에 정말 좋았다.
올바른 수정 3: 커피와 디저트 모두 맛있었다. 처음에는 별로 기대하지 않았지만 먹을수록 만족스러웠고, 커피와 같이 먹기에도 정말 좋았다.
(이유: '정말 맛있었고 ... 굉장히 맛있어서'의 반복 평가를 '모두 맛있었다'로 통합하고, '먹으면 먹을수록 점점 더'를 '먹을수록'으로 간결화함)

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "revised_text": "수정된 문장 (큰따옴표 없이 순수 텍스트만)",
  "reason": "수정한 이유 (구조 개선 및 표현 정리 내용 포함 1~2문장)",
  "changes": [
    {
      "original": "원래 표현",
      "revised": "수정 표현",
      "reason": "수정 이유"
    }
  ]
}`;

  let userPrompt = '';
  if (context?.paragraphText) {
    userPrompt += `[참고 문맥 (해당 문단 전체 - 작성자의 원래 어조/문체 파악 및 문단 전체의 중복 어휘/부사 남용 파악용)]\n${context.paragraphText}\n(※ 참고 문맥은 글쓴이의 어조와 문체, 문단 전체에서 반복 남발되는 부사를 파악하기 위한 자료입니다. [수정 대상 문장]만 수정하여 반환하세요.)\n\n`;
  }
  userPrompt += `[수정 대상 문장]\n${sentence}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(text);

  if (mode === 'advice') {
    return {
      mode: 'advice',
      advice: {
        issues: Array.isArray(parsed.issues) ? parsed.issues : ['표현 검토 필요'],
        explanation: parsed.explanation || '',
        actionableHint: parsed.actionableHint || '',
      },
      reason: parsed.explanation || '문장 진단 결과입니다.',
    };
  } else {
    let cleanText = (parsed.revised_text || parsed.suggestedText || sentence).trim();
    cleanText = cleanText.replace(/^["'“”]+|["'“”]+$/g, '').trim();

    return {
      mode: 'rewrite',
      suggestedText: cleanText,
      revised_text: cleanText,
      reason: parsed.reason || '자연스럽게 다듬었습니다.',
      changes: Array.isArray(parsed.changes) ? parsed.changes : [],
    };
  }
}

app.listen(port, () => {
  console.log(`Geulchim backend server running on http://localhost:${port}`);
});
