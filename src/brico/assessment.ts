import { FirestoreRepository, type FirestoreLike } from '@/features/kernel/adapters/firestore';
import type { Entity } from '@/features/kernel/host/contract';
import type {
  Assessment,
  AssessmentRepositories,
  Attempt,
  AttemptIndex,
  Question,
  QuestionKey,
} from '@/features/assessment/domain';
import { createAssessmentService, type AssessmentService } from '@/features/assessment/server';
import { db } from '@/lib/db';

/**
 * The host's composition file for the `assessment` brick (ported from ScienceWerx): the
 * graded module quizzes of a gap-closing course. Collections are prefixed `assessment_`,
 * apart from `lms_*` and the app's own `istartup_*`. Answer keys live in their own
 * collection and never leave the server.
 */

const PREFIX = 'assessment_';

function repo<T extends Entity>(name: string): FirestoreRepository<T> {
  return new FirestoreRepository<T>(db() as unknown as FirestoreLike, `${PREFIX}${name}`);
}

let repos: AssessmentRepositories | null = null;
let service: AssessmentService | null = null;

export function assessmentRepos(): AssessmentRepositories {
  repos ??= {
    questions: repo<Question>('questions'),
    questionKeys: repo<QuestionKey>('questionKeys'),
    assessments: repo<Assessment>('assessments'),
    attempts: repo<Attempt>('attempts'),
    attemptIndex: repo<AttemptIndex>('attemptIndex'),
  };
  return repos;
}

export function assessment(): AssessmentService {
  service ??= createAssessmentService({ repos: assessmentRepos(), now: () => Date.now() });
  return service;
}
