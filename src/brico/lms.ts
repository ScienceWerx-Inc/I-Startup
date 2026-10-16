import { randomUUID } from 'node:crypto';

import { FirestoreRepository, type FirestoreLike } from '@/features/kernel/adapters/firestore';
import type { Entity } from '@/features/kernel/host/contract';
import type {
  Certificate,
  Course,
  CourseIndex,
  Curriculum,
  Enrollment,
  LessonContent,
  LessonProgress,
  LmsRepositories,
  Progress,
} from '@/features/lms/domain';
import { createLmsService, type LmsService } from '@/features/lms/server';
import { db } from '@/lib/db';

/**
 * The host's composition file for the `lms` brick (installed from the BRICO Vault).
 *
 * Bricks never import the host; this is the one place where firebase-admin meets the
 * brick's repository contract. Collections are prefixed `lms_` so they sit apart from
 * the app's own `istartup_*` collections.
 */

const PREFIX = 'lms_';

function repo<T extends Entity>(name: string): FirestoreRepository<T> {
  return new FirestoreRepository<T>(db() as unknown as FirestoreLike, `${PREFIX}${name}`);
}

let repos: LmsRepositories | null = null;
let service: LmsService | null = null;

export function lmsRepos(): LmsRepositories {
  repos ??= {
    courses: repo<Course>('courses'),
    courseIndex: repo<CourseIndex>('courseIndex'),
    curricula: repo<Curriculum>('curricula'),
    lessonContent: repo<LessonContent>('lessonContent'),
    enrollments: repo<Enrollment>('enrollments'),
    progress: repo<Progress>('progress'),
    lessonProgress: repo<LessonProgress>('lessonProgress'),
    certificates: repo<Certificate>('certificates'),
  };
  return repos;
}

export function lms(): LmsService {
  service ??= createLmsService({
    repos: lmsRepos(),
    now: () => Date.now(),
    newId: (prefix) => `${prefix}_${randomUUID().slice(0, 12)}`,
    // 411 Certificate codes: short, unguessable, easy to read aloud.
    newCode: () => `411-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
    log: (level, message, fields) => console[level === 'info' ? 'log' : level](`[lms] ${message}`, fields ?? ''),
  });
  return service;
}

/** Content rows are keyed by lesson, so a lesson page is one read. */
export const lessonContentId = (lessonId: string) => `lc_${lessonId}`;
