import { z } from 'zod';

import { lessonContentId, lms, lmsRepos } from '@/brico/lms';
import { sessionUserId } from '@/lib/account';
import { getCourseView } from '@/lib/gap-course/view';
import { learnerSlides, slideSpeech } from '@/lib/lessons/deck';
import { slideClip } from '@/lib/lessons/narration-clips';
import { NARRATION_MAX_CHARS, slideClipHash } from '@/lib/lessons/narrator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** A first listen records the slide: one TTS call, plus a rate-limit wait at worst. */
export const maxDuration = 60;

const Schema = z.object({
  courseId: z.string().regex(/^gap_[0-9a-f-]{36}$/),
  lessonId: z.string().regex(/^les_[0-9a-f-]{1,40}$/),
  slide: z.coerce.number().int().min(0).max(40),
  h: z.string().regex(/^[0-9a-z]{1,16}$/),
});

/**
 * GET /api/course/narration?courseId&lessonId&slide&h — one slide read aloud, as MP3.
 *
 * The words are never taken from the request: the server derives the slide from the
 * lesson the founder can open, exactly as the player does, so no one can spend TTS on
 * text of their choosing. `h` is the player's fingerprint of those words; a mismatch
 * (the lesson changed under an open page) is a 409, and the player uses the browser
 * voice. A match names one recording forever, so the response is cached immutably.
 */
export async function GET(request: Request) {
  const userId = await sessionUserId();
  if (!userId) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const parsed = Schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const { courseId, lessonId, slide, h } = parsed.data;

  try {
    const view = await getCourseView(userId, courseId);
    if (!view?.curriculum || view.job.status !== 'ready') return Response.json({ error: 'Not found.' }, { status: 404 });
    const access = await lms().canAccessLesson({ courseId, userId, lessonId });
    if (!access.allowed) return Response.json({ error: 'Not found.' }, { status: 404 });

    const lesson = view.curriculum.sections.flatMap((s) => s.lessons).find((l) => l.id === lessonId);
    const content = lesson ? await lmsRepos().lessonContent.get(lessonContentId(lessonId)) : null;
    if (!lesson || !content) return Response.json({ error: 'Not found.' }, { status: 404 });

    const target = learnerSlides(content, lesson.title)[slide];
    if (!target) return Response.json({ error: 'No such slide.' }, { status: 404 });
    const speech = slideSpeech(target);
    if (slideClipHash(speech) !== h) return Response.json({ error: 'This slide has changed.' }, { status: 409 });
    if (!speech.trim() || speech.length > NARRATION_MAX_CHARS) {
      return Response.json({ error: 'Too long to record.' }, { status: 413 });
    }

    const clip = await slideClip(speech);
    return new Response(new Uint8Array(clip.mp3), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(clip.mp3.length),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Audio-Seconds': String(clip.seconds),
      },
    });
  } catch (error) {
    console.error('Slide narration failed:', error);
    return Response.json({ error: 'Could not record this slide.' }, { status: 502 });
  }
}
