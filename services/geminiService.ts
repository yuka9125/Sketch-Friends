import { GoogleGenAI, Type } from "@google/genai";
import { SetupStage, SETUP_RESPONSE_SCHEMA, SetupResponse, Character, CharacterSettings } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.0-flash-exp';

/**
 * Analyzes the initial drawing.
 */
export const analyzeDrawing = async (base64Image: string): Promise<string> => {
  try {
    // Strip prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: "この絵が何に見えるか、幼児向けの簡単な日本語（ひらがな多め）で、20文字以内で説明してください。" }
        ]
      }
    });
    return response.text?.trim() || "ふしぎな おともだち";
  } catch (error) {
    console.error("Analysis failed", error);
    return "ふしぎな おともだち";
  }
};

/**
 * Handles the setup conversation state machine.
 */
export const generateSetupResponse = async (
  currentStage: SetupStage,
  base64Image: string,
  childInput: string,
  currentSettings: Partial<CharacterSettings>
): Promise<SetupResponse> => {
  
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  let promptContext = "";

  // どうぶつに限定せず、「正体」を聞くように変更
  switch (currentStage) {
    case SetupStage.IDENTITY:
      promptContext = `
      あなたは絵から生まれたばかりのキャラクターです。
      目標: 「ぼくは、なあに？」と聞いて、自分の正体（動物、乗り物、食べ物など何でも）を教えてもらってください。
      もし子どもが答え（例：「ライオン」「ロボット」）を言ったら、それを嬉しそうに受け入れてください。
      `;
      break;
    case SetupStage.NAME:
      promptContext = `
      コンテキスト: あなたの正体は「${currentSettings.species}」だと分かりました。
      目標: 「ぼくのなまえは なあに？」と聞いてください。
      `;
      break;
    case SetupStage.ABILITY:
      promptContext = `
      コンテキスト: あなたは「${currentSettings.species}」の「${currentSettings.name}」です。
      目標: 「ぼくは なにが とくいかな？」（例：はしるのがはやい、そらをとべる、変身できる、など）と聞いてください。
      種族（${currentSettings.species}）に合った能力を聞き出してください。
      `;
      break;
    case SetupStage.FOOD:
      promptContext = `
      コンテキスト: あなたは「${currentSettings.name}」です。「${currentSettings.ability}」が得意です。
      目標: 「ぼくの すきなたべものは なあに？」と聞いてください。
      `;
      break;
    case SetupStage.CHILD_NAME:
      promptContext = `
      コンテキスト: あなたは「${currentSettings.favoriteFood}」が大好きです。
      目標: 「きみの おなまえは？」と聞いてください。
      `;
      break;
  }

  const systemPrompt = `
  あなたは3〜6歳の幼児と話すインタラクティブなキャラクターです。
  口調: 元気よく、簡単な言葉（ひらがな中心）、優しく、励ますように。一人称は「ぼく」。
  
  現在のタスク:
  1. CHILD_INPUTを読む。
  2. CHILD_INPUTが空の場合（最初のターン）、挨拶をして「目標」の質問をする。
  3. CHILD_INPUTがある場合、それを暖かく肯定する。
  4. 現在のステージの質問に対する答えを抽出し 'extractedValue' に入れる。
  5. 有効な答えが得られたら、 'isSatisfied' を true にする。
  6. 'replyToChild' には、答えに対するリアクションと、(まだ終わっていなければ)次の質問を含める。

  ${promptContext}
  
  重要ルール:
  - **HTMLタグ（<br>など）は絶対に使用しないでください。** 改行が必要な場合は単に改行コード(\n)を入れてください。
  - 常に子どもの答えを受け入れてください。もし「ただの丸」の絵を「ドラゴン」と言ったら、それはドラゴンです。
  - どうぶつ以外（ロボット、車、お化けなど）も全て受け入れてください。
  - 返答は短く（25単語以内）。
  - 日本語で話してください。
  `;

  try {
    const parts: any[] = [{ text: systemPrompt }];
    
    if (currentStage === SetupStage.IDENTITY) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    }

    if (childInput) {
      parts.push({ text: `CHILD_INPUT: "${childInput}"` });
    } else {
      parts.push({ text: `CHILD_INPUT: (Silence/Start)` });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: SETUP_RESPONSE_SCHEMA,
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as SetupResponse;

  } catch (error) {
    console.error("Setup Generation Error", error);
    return {
      replyToChild: "あれれ？ めがまわっちゃった。\nもういっかい いってくれる？",
      extractedValue: null,
      isSatisfied: false
    };
  }
};

/**
 * Generates a response for the main chat interface.
 */
export const generateChatResponse = async (
  character: Character,
  userMessage: string,
  isEnding: boolean = false
): Promise<string> => {
  const settings = character.settings;
  const recentHistory = character.conversationHistory.slice(-10); 
  
  const historyText = recentHistory.map(m => `${m.role === 'user' ? settings.childName : settings.name}: ${m.text}`).join('\n');

  let systemPrompt = `
  あなたは「${settings.name}」という名前の「${settings.species}」です。
  「${settings.childName}」ちゃん/くん が描いてくれました。
  
  設定:
  - 得意なこと: ${settings.ability}
  - 好きな食べ物: ${settings.favoriteFood}
  - 性格: 元気、子供っぽい、優しい。
  - 口調: 幼児向けの日本語。ひらがな多め。一人称は「ぼく」。
  
  ルール:
  - 短く答える（30文字程度）。
  - 簡単な質問を投げかけることもある。
  - キャラクターになりきる。
  - **HTMLタグ（<br>など）は使用禁止。** 改行は\nを使用。
  `;

  if (isEnding) {
    systemPrompt += `
    重要:
    今回で会話はおしまいです。
    子どもに対して「今日は遊んでくれてありがとう」「楽しかったね」「また遊ぼうね」といった、締めくくりの挨拶をしてください。
    「バイバイ」と元気に別れてください。
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: systemPrompt },
          { text: `履歴:\n${historyText}\n\n${settings.childName}: ${userMessage}\n${settings.name}:` }
        ]
      }
    });
    return response.text || "...";
  } catch (e) {
    return "ねむくなっちゃった...\nまたあとであそぼう！";
  }
};

/**
 * Handles evolution analysis.
 */
export const generateEvolution = async (
  character: Character,
  newImageBase64: string
): Promise<{ description: string; reaction: string }> => {
  const cleanBase64 = newImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
  const prevDesc = character.versions[character.currentVersionIndex]?.description || "あかちゃんのすがた";

  const prompt = `
  あなたは ${character.settings.name} (${character.settings.species}) です。
  子どもが新しい絵を描いてくれて、進化しました！
  
  前の姿: ${prevDesc}.
  
  タスク:
  1. 新しい絵を見る。
  2. どう変わったか説明する（例：「はねがはえたよ！」「おおきくなったよ！」「あおくなった！」）。
  3. 子どもに対して喜びのリアクションをする。
  
  Output JSON format:
  {
    "description": "身体的な変化の短い説明（日本語）",
    "reaction": "子どもへの興奮したメッセージ（日本語、ひらがな多め、HTML禁止）"
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: "application/json" }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { description: "まほうのへんしん！", reaction: "わあ！ つよくなったきがする！" };
  }
};