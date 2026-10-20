import Link from 'next/link';
import { CheckCircle2, Lock, XCircle } from 'lucide-react';

import type { CourseReview, ReviewItem } from '@/lib/gap-course/quiz-run';
import { Panel } from '@/modules/istartup-score/components/chrome';

/**
 * "Questions to review": what the founder got wrong in this course — each module quiz's
 * latest attempt and the lesson self-checks — with the explanation, and the right answer
 * once a quiz is passed or out of attempts (until then, retrying is how they find it).
 */
export function ReviewPanel({ review, courseId }: { review: CourseReview; courseId: string }) {
  const quizMisses = review.quizzes.flatMap((q) => q.missed.map((m) => ({ ...m, quiz: q })));
  const total = quizMisses.length + review.checkpoints.length;
  if (review.quizzes.length === 0 && review.checkpoints.length === 0) return null;

  return (
    <Panel>
      <h2 className="text-lg font-semibold text-ink">Questions to review</h2>
      <p className="mt-0.5 text-sm text-mut">
        {total === 0
          ? 'Nothing missed so far. Every question you answered was right.'
          : `${total} question${total === 1 ? '' : 's'} you got wrong. Read why, then revisit the lesson.`}
      </p>

      {review.quizzes.map((q) =>
        q.missed.length ? (
          <section key={q.lessonId} className="mt-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link href={`/learn/${courseId}/${q.lessonId}`} className="text-sm font-semibold text-ink hover:text-brand hover:underline">
                {q.title}
              </Link>
              <span className="font-mono text-xs text-mut">
                Last attempt {q.percent}% · {q.passed ? 'passed' : 'not passed'}
              </span>
            </div>
            {!q.revealed ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-mut">
                <Lock className="h-3.5 w-3.5" /> Right answers show once you pass this quiz or use every attempt.
              </p>
            ) : null}
            <ul className="mt-3 space-y-3">{q.missed.map((m, i) => <Item key={i} item={m} />)}</ul>
          </section>
        ) : null,
      )}

      {review.checkpoints.length ? (
        <section className="mt-6">
          <p className="text-sm font-semibold text-ink">Lesson self-checks</p>
          <ul className="mt-3 space-y-3">
            {review.checkpoints.map((m, i) => (
              <Item key={i} item={m} href={`/learn/${courseId}/${m.lessonId}`} />
            ))}
          </ul>
        </section>
      ) : null}
    </Panel>
  );
}

/** One answer inline; several (a multiple-choice question) as a list, since each is a sentence. */
export function Answers({ label, items }: { label: string; items: string[] }) {
  if (items.length <= 1) return <span>{label}: {items[0] ?? '—'}</span>;
  return (
    <div>
      <span>{label}:</span>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-4">
        {items.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
    </div>
  );
}

function Item({ item, href }: { item: ReviewItem; href?: string }) {
  return (
    <li className="rounded-lg border border-line p-4">
      {href ? (
        <Link href={href} className="text-xs text-mut hover:text-ink hover:underline">
          {item.lessonTitle}
        </Link>
      ) : null}
      <p className="mt-0.5 text-sm font-medium leading-relaxed text-ink">{item.stem}</p>
      <div className="mt-2 flex items-start gap-1.5 text-sm text-risk">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <Answers label="You answered" items={item.answered} />
      </div>
      {item.correctAnswer?.length ? (
        <div className="mt-1 flex items-start gap-1.5 text-sm text-good">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <Answers label={item.correctAnswer.length > 1 ? 'Right answers' : 'Right answer'} items={item.correctAnswer} />
        </div>
      ) : null}
      {item.explanation ? <p className="mt-2 text-sm leading-relaxed text-mut">{item.explanation}</p> : null}
    </li>
  );
}
