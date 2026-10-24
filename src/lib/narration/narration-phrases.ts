import { courseLanguage } from './course-language';

/**
 * The connective words narration adds around a lesson's own text, per course
 * language.
 *
 * The recording and the browser voice both wrap the lesson in a few spoken
 * phrases ("Before you go…", "And finally…"). Left in English, a French lesson
 * would be read in French with English stitched between its paragraphs.
 * Pure and client-safe: the browser voice builds the same script.
 */

export interface NarrationPhrases {
  alsoHas: (things: string) => string;
  video: string;
  slideDeck: string;
  and: string;
  watchOut: string;
  quickNote: string;
  oneThing: string;
  keyPointsIntro: string;
  /** The key-points slide's lead-in. */
  deckKeyPoints: string;
  ordinals: string[];
  also: string;
  andFinally: string;
  /** The separator after a lead word: ", " in most languages, "، " in Arabic. */
  comma: string;
  onOneSide: string;
  onTheOther: string;
  keyIdea: string;
  diagram: string;
  check: string;
  recap: string;
  nicelyDone: string;
}

const EN: NarrationPhrases = {
  alsoHas: (things) => `This lesson also has ${things} at the top of the page, if you'd like to look along.`,
  video: 'a video',
  slideDeck: 'a slide deck',
  and: ' and ',
  watchOut: 'One thing to watch out for.',
  quickNote: 'A quick note.',
  oneThing: 'The one thing to remember:',
  keyPointsIntro: 'Before you go, here are the key points to remember.',
  deckKeyPoints: 'Here are the key points to remember.',
  ordinals: ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'],
  also: 'Also',
  andFinally: 'And finally',
  comma: ', ',
  onOneSide: 'On one side',
  onTheOther: 'On the other',
  keyIdea: 'Here is the key idea.',
  diagram: 'Take a moment with this diagram. It shows how the ideas in this lesson connect.',
  check: 'Time to check your understanding. Pick the answer you think is right.',
  recap: "Let's recap.",
  nicelyDone: 'Nicely done.',
};

const FR: NarrationPhrases = {
  alsoHas: (things) => `Cette leçon comprend aussi ${things} en haut de la page, si vous voulez suivre.`,
  video: 'une vidéo',
  slideDeck: 'un diaporama',
  and: ' et ',
  watchOut: 'Un point auquel faire attention.',
  quickNote: 'Une petite remarque.',
  oneThing: 'La chose à retenir :',
  keyPointsIntro: 'Avant de terminer, voici les points clés à retenir.',
  deckKeyPoints: 'Voici les points clés à retenir.',
  ordinals: ['Premièrement', 'Deuxièmement', 'Troisièmement', 'Quatrièmement', 'Cinquièmement', 'Sixièmement', 'Septièmement', 'Huitièmement'],
  also: 'Aussi',
  andFinally: 'Et enfin',
  comma: ', ',
  onOneSide: "D'un côté",
  onTheOther: "De l'autre",
  keyIdea: "Voici l'idée clé.",
  diagram: 'Prenez un moment pour regarder ce schéma. Il montre comment les idées de cette leçon sont liées.',
  check: 'Vérifions votre compréhension. Choisissez la réponse qui vous semble juste.',
  recap: 'Récapitulons.',
  nicelyDone: 'Bien joué.',
};

const DE: NarrationPhrases = {
  alsoHas: (things) => `Zu dieser Lektion gibt es oben auf der Seite auch ${things}, falls Sie mitschauen möchten.`,
  video: 'ein Video',
  slideDeck: 'eine Foliensammlung',
  and: ' und ',
  watchOut: 'Eine Sache, auf die Sie achten sollten.',
  quickNote: 'Ein kurzer Hinweis.',
  oneThing: 'Das Wichtigste zum Merken:',
  keyPointsIntro: 'Bevor Sie weitermachen, hier die wichtigsten Punkte zum Merken.',
  deckKeyPoints: 'Hier die wichtigsten Punkte zum Merken.',
  ordinals: ['Erstens', 'Zweitens', 'Drittens', 'Viertens', 'Fünftens', 'Sechstens', 'Siebtens', 'Achtens'],
  also: 'Außerdem',
  andFinally: 'Und schließlich',
  comma: ', ',
  onOneSide: 'Auf der einen Seite',
  onTheOther: 'Auf der anderen Seite',
  keyIdea: 'Hier ist die Kernidee.',
  diagram: 'Nehmen Sie sich einen Moment für dieses Diagramm. Es zeigt, wie die Ideen dieser Lektion zusammenhängen.',
  check: 'Zeit, Ihr Verständnis zu prüfen. Wählen Sie die Antwort, die Sie für richtig halten.',
  recap: 'Fassen wir zusammen.',
  nicelyDone: 'Gut gemacht.',
};

const AR: NarrationPhrases = {
  alsoHas: (things) => `يتضمن هذا الدرس أيضًا ${things} في أعلى الصفحة، إن أردت المتابعة.`,
  video: 'مقطع فيديو',
  slideDeck: 'عرضًا تقديميًا',
  and: ' و',
  watchOut: 'أمر واحد يجب الانتباه إليه.',
  quickNote: 'ملاحظة سريعة.',
  oneThing: 'الشيء الأهم الذي يجب تذكره:',
  keyPointsIntro: 'قبل أن تنتقل، إليك أهم النقاط التي يجب تذكرها.',
  deckKeyPoints: 'إليك أهم النقاط التي يجب تذكرها.',
  ordinals: ['أولًا', 'ثانيًا', 'ثالثًا', 'رابعًا', 'خامسًا', 'سادسًا', 'سابعًا', 'ثامنًا'],
  also: 'كذلك',
  andFinally: 'وأخيرًا',
  comma: '، ',
  onOneSide: 'من جهة',
  onTheOther: 'ومن جهة أخرى',
  keyIdea: 'إليك الفكرة الأساسية.',
  diagram: 'خذ لحظة لتأمل هذا المخطط. فهو يوضح كيف ترتبط أفكار هذا الدرس ببعضها.',
  check: 'حان وقت التحقق من فهمك. اختر الإجابة التي تراها صحيحة.',
  recap: 'لنلخّص.',
  nicelyDone: 'أحسنت.',
};

const BY_CODE: Record<string, NarrationPhrases> = { en: EN, fr: FR, de: DE, ar: AR };

export function narrationPhrases(language?: string | null): NarrationPhrases {
  return BY_CODE[courseLanguage(language).code] ?? EN;
}

/** "First, a. Second, b. And finally, c." in the course language. */
export function spokenList(items: string[], language?: string | null, maxOrdinals = 8): string {
  const p = narrationPhrases(language);
  const ordinals = p.ordinals.slice(0, maxOrdinals);
  return items
    .map((item, i) => {
      const t = item.trim().replace(/[.!?]*$/, '.');
      const lead = i === items.length - 1 && items.length > 1 ? p.andFinally : (ordinals[i] ?? p.also);
      return `${lead}${p.comma}${t}`;
    })
    .join(' ');
}
