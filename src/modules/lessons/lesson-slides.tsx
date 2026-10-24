'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { ComponentType } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Eye,
  FileText,
  Filter,
  Flag,
  GitBranch,
  Globe,
  GraduationCap,
  Heart,
  Key,
  Layers,
  Lightbulb,
  Link,
  ListChecks,
  Lock,
  Mail,
  Map as MapIcon,
  Maximize2,
  MessageCircle,
  Minimize2,
  Pause,
  PenTool,
  Play,
  Puzzle,
  Quote,
  Repeat,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

import type { LessonCheckpoint, LessonContent } from '@/features/lms/domain';
import { learnerSlides, slideSpeech } from '@/lib/lessons/deck';
import type { DeckSlide, SlideIcon } from '@/lib/lessons/deck';
import { NARRATION_MAX_CHARS, NARRATOR, slideClipUrl } from '@/lib/lessons/narrator';
import { pickNaturalVoice } from '@/lib/narration/speech-voice';
import { cn } from '@/lib/utils';
import { Checkpoint } from '@/modules/gap-course/lesson-actions';
import { createVoiceContext, MediaVoice, SyntheticVoice, type VoiceSource } from '@/modules/talking-avatar/levels';
import { einsteinPersona, type NarratorPhase } from '@/modules/talking-avatar/personas';
import { TalkingAvatar } from '@/modules/talking-avatar/talking-avatar';

import { MermaidView } from './mermaid-view';

/**
 * A lesson's reading as interactive slides.
 *
 * The deck is the author's designed one when there is one (re-validated here —
 * stored data is never rendered on trust), otherwise derived from the text on
 * the spot, so every lesson has slides. Keyboard (← → space), swipe, a
 * clickable progress bar and full screen. Ported from ScienceWerx
 * (src/components/learn/lesson-slides.tsx).
 *
 * "Narrate" reads each slide aloud the ScienceWerx way: a recorded Gemini voice
 * (made on first listen, then cached — /api/course/narration), shown as the
 * holographic Einstein whose lips follow the real audio (talking-avatar brick),
 * with captions. If a recording can't be had, the device's most natural voice
 * reads the slide and the face keeps a speaking rhythm. "Auto-play" moves on
 * when the narration ends.
 *
 * Motion carries the rhythm (slides glide, points arrive one by one, steps draw
 * their connector), and all of it collapses under prefers-reduced-motion.
 */

const ICONS: Record<SlideIcon, ComponentType<{ className?: string }>> = {
  lightbulb: Lightbulb, target: Target, rocket: Rocket, sparkles: Sparkles, brain: Brain,
  'book-open': BookOpen, 'graduation-cap': GraduationCap, compass: Compass, map: MapIcon, flag: Flag,
  puzzle: Puzzle, layers: Layers, workflow: Workflow, 'git-branch': GitBranch, settings: Settings,
  wrench: Wrench, 'shield-check': ShieldCheck, lock: Lock, key: Key, mail: Mail, calendar: Calendar,
  clock: Clock, users: Users, user: User, 'message-circle': MessageCircle, search: Search, filter: Filter,
  database: Database, cpu: Cpu, bot: Bot, zap: Zap, 'bar-chart': BarChart3, 'trending-up': TrendingUp,
  'check-circle': CheckCircle2, 'alert-triangle': AlertTriangle, eye: Eye, 'pen-tool': PenTool,
  'file-text': FileText, link: Link, globe: Globe, heart: Heart, star: Star, repeat: Repeat,
  'list-checks': ListChecks,
};

/** Per-layout backdrop, so consecutive slides don't all look alike. */
const BACKDROP: Record<DeckSlide['kind'], string> = {
  title: 'from-tech/25 via-tech/10 to-surface',
  concept: 'from-sky-500/15 via-surface to-surface',
  steps: 'from-violet-500/15 via-surface to-surface',
  compare: 'from-emerald-500/12 via-surface to-sky-500/12',
  highlight: 'from-amber-400/20 via-surface to-surface',
  diagram: 'from-slate-500/10 via-surface to-surface',
  keypoints: 'from-tech/15 via-surface to-surface',
  check: 'from-fuchsia-500/12 via-surface to-surface',
  recap: 'from-tech/25 via-emerald-500/10 to-surface',
};

type Content = Pick<LessonContent, 'body' | 'keyPoints' | 'callout' | 'diagram' | 'checkpoint' | 'deck'>;

interface Props {
  content: Content;
  title: string;
  /** Where "Finish" on the last slide sends the learner (the complete button). */
  finishTargetId?: string;
  /** Saves the founder's first checkpoint answer (the course score). */
  record?: { courseId: string; lessonId: string; learnerId?: string };
}

const PERSONA = einsteinPersona();
const noSubscribe = () => () => {};

/** A first recording takes a few seconds; past this the browser voice reads the slide instead. */
const RECORDING_PATIENCE_MS = 20_000;

export function LessonSlides({ content, title, finishTargetId, record }: Props) {
  const reduceMotion = useReducedMotion() ?? false;

  // The exercise paragraph becomes its own slide before the self-check (learnerSlides).
  const slides = useMemo<DeckSlide[]>(() => learnerSlides(content, title), [content, title]);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [narrate, setNarrate] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [showFace, setShowFace] = useState(true);
  /** Where the narrator is, set only from audio callbacks; the phase is derived from it. */
  const [said, setSaid] = useState<{ at: number; state: 'speaking' | 'done' } | null>(null);
  const [voice, setVoice] = useState<VoiceSource | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<number | null>(null);

  const last = slides.length - 1;
  const slide = slides[Math.min(index, last)]!;

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(last, to));
      setDirection(next >= index ? 1 : -1);
      setIndex(next);
    },
    [index, last],
  );

  // Keyboard, when the learner isn't typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      // Space on a focused button (a quiz option, a control) presses it; it must not also turn the page.
      if (e.key === ' ' && el && /^(BUTTON|A)$/.test(el.tagName)) return;
      if (!stageRef.current) return;
      const rect = stageRef.current.getBoundingClientRect();
      const onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!onScreen && !fullscreen) return;
      if (e.key === 'ArrowRight' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(last);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, last, fullscreen]);

  // Full screen: the real API when the browser offers it.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  /* ---- narration: the slide's recording, else the most natural voice on the device ---- */
  const speech = useMemo(() => slideSpeech(slide), [slide]);
  const phase: NarratorPhase = !narrate ? 'idle' : said?.at !== index ? 'thinking' : said.state === 'speaking' ? 'speaking' : 'idle';
  const indexRef = useRef(index);
  const autoplayRef = useRef(autoplay);
  useEffect(() => {
    indexRef.current = index;
    autoplayRef.current = autoplay;
  }, [index, autoplay]);
  /** One <audio> for every clip: an element can be routed into Web Audio only once. */
  const player = useRef<{ audio: HTMLAudioElement; lips: MediaVoice | null } | null>(null);
  const synthetic = useRef<SyntheticVoice | null>(null);

  const startNarrating = () => {
    // Inside the click: iOS only lets audio start, and an AudioContext run, from a gesture.
    if (!player.current) {
      const audio = new Audio();
      audio.preload = 'auto';
      let lips: MediaVoice | null = null;
      try {
        lips = new MediaVoice(audio, createVoiceContext());
      } catch {
        // No Web Audio: the clip still plays, and the face keeps a speaking rhythm instead.
      }
      player.current = { audio, lips };
    }
    void player.current.lips?.ctx.resume().catch(() => undefined);
    setSaid(null);
    setNarrate(true);
  };

  useEffect(() => {
    if (!narrate || typeof window === 'undefined') return;
    const at = index;
    const audio = player.current?.audio;
    const synth = (synthetic.current ??= new SyntheticVoice());
    let finished = false;
    let fellBack = false;

    const advance = () => {
      if (autoplayRef.current && indexRef.current === at && at < last) {
        setTimeout(() => {
          if (indexRef.current === at) {
            setDirection(1);
            setIndex(at + 1);
          }
        }, 700);
      }
    };
    const done = () => {
      if (finished) return;
      finished = true;
      synth.stop();
      setSaid({ at, state: 'done' });
      advance();
    };

    // The device's voice, when there's no recording to play.
    const speakWithBrowser = () => {
      if (fellBack || finished) return;
      fellBack = true;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      if (!('speechSynthesis' in window)) {
        setSaid({ at, state: 'done' });
        return;
      }
      const s = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(speech);
      const best = pickNaturalVoice(s.getVoices(), document.documentElement.lang || navigator.language || 'en-US');
      if (best) {
        utterance.voice = best;
        utterance.lang = best.lang;
      }
      utterance.onstart = () => {
        synth.start();
        setVoice(synth);
        setSaid({ at, state: 'speaking' });
      };
      utterance.onboundary = () => synth.boundary();
      utterance.onend = done;
      utterance.onerror = () => {
        synth.stop();
        setSaid({ at, state: 'done' });
      };
      // A tick's delay: Chrome drops an utterance queued in the same task as cancel().
      setTimeout(() => !finished && s.speak(utterance), 60);
    };

    // One voice at a time: anything else playing on the page stops for the narrator.
    document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((m) => m !== audio && !m.paused && m.pause());
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const recordable = record && audio && speech.trim() && speech.length <= NARRATION_MAX_CHARS;
    let patience: ReturnType<typeof setTimeout> | undefined;
    if (recordable) {
      audio.src = slideClipUrl(record.courseId, record.lessonId, at, speech);
      audio.onplaying = () => {
        clearTimeout(patience);
        // Real lip-sync from the audio when Web Audio is there; a speaking rhythm otherwise.
        if (player.current?.lips) setVoice(player.current.lips);
        else {
          synth.start();
          setVoice(synth);
        }
        setSaid({ at, state: 'speaking' });
      };
      audio.onended = done;
      audio.onerror = speakWithBrowser;
      patience = setTimeout(() => audio.readyState < 3 && speakWithBrowser(), RECORDING_PATIENCE_MS);
      audio.play().catch((error: unknown) => {
        // A newer slide replacing this one aborts the play; anything else means no recording.
        if (!(error instanceof DOMException && error.name === 'AbortError')) speakWithBrowser();
      });
      // Record the next slide while this one plays, so moving on doesn't wait.
      const next = slides[at + 1];
      const nextSpeech = next ? slideSpeech(next) : '';
      if (nextSpeech.trim() && nextSpeech.length <= NARRATION_MAX_CHARS) {
        void fetch(slideClipUrl(record.courseId, record.lessonId, at + 1, nextSpeech)).catch(() => undefined);
      }
    } else {
      speakWithBrowser();
    }

    return () => {
      finished = true;
      clearTimeout(patience);
      if (audio) {
        audio.onplaying = audio.onended = audio.onerror = null;
        audio.pause();
      }
      synth.stop();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [narrate, index, speech, slides, last, record]);

  // Leaving the slides: silence, and release the audio graph.
  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      const p = player.current;
      if (p) {
        p.audio.pause();
        p.lips?.dispose();
        void p.lips?.ctx.close().catch(() => undefined);
        player.current = null;
      }
    },
    [],
  );

  // Read after hydration, so the server and the first client render agree.
  const browserVoice = useSyncExternalStore(noSubscribe, () => 'speechSynthesis' in window, () => false);
  const narrationSupported = Boolean(record) || browserVoice;

  const variants = reduceMotion
    ? { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        enter: (d: number) => ({ opacity: 0, x: d * 60, scale: 0.98 }),
        center: { opacity: 1, x: 0, scale: 1 },
        exit: (d: number) => ({ opacity: 0, x: d * -60, scale: 0.98 }),
      };

  return (
    <section
      ref={stageRef}
      aria-roledescription="slide deck"
      aria-label={`${title} — slides`}
      className={cn(
        'relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm',
        fullscreen ? 'h-screen w-screen rounded-none border-0' : 'mt-6',
      )}
    >
      {/* Progress: one segment per slide, each a jump target. */}
      <div className="relative z-10 flex gap-1 bg-surface px-4 pb-2 pt-4" role="tablist" aria-label="Slides">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Slide ${i + 1}`}
            onClick={() => go(i)}
            className="group h-1.5 flex-1 overflow-hidden rounded-full bg-mist"
          >
            <motion.span
              className="block h-full rounded-full bg-tech"
              initial={false}
              animate={{ width: i < index ? '100%' : i === index ? '100%' : '0%', opacity: i === index ? 1 : i < index ? 0.55 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.35 }}
            />
          </button>
        ))}
      </div>

      {/* The narrator: Einstein's face, lip-synced to the voice, and live captions. */}
      {narrate && (
        <div className="relative z-10 flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          {showFace && !reduceMotion && (
            <TalkingAvatar
              persona={PERSONA}
              voice={voice}
              phase={phase}
              label={`${NARRATOR.name}, narrating`}
              className="h-20 w-20 shrink-0 rounded-xl ring-1 ring-tech/30 sm:h-24 sm:w-24"
            />
          )}
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xs font-medium text-mut">
              {NARRATOR.name}
              <span className="text-mut/70">
                {' · '}
                {phase === 'thinking' ? 'getting ready…' : phase === 'speaking' ? 'speaking' : autoplay ? 'auto-play on' : 'finished this slide'}
              </span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink sm:line-clamp-3">{speech}</p>
          </div>
          {!reduceMotion && (
            <button
              type="button"
              onClick={() => setShowFace((v) => !v)}
              aria-pressed={showFace}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-mut transition-colors hover:bg-mist hover:text-ink"
              aria-label={showFace ? 'Hide the narrator' : 'Show the narrator'}
              title={showFace ? 'Hide the narrator' : 'Show the narrator'}
            >
              <UserRound className={cn('h-4 w-4', !showFace && 'opacity-50')} />
            </button>
          )}
        </div>
      )}

      {/* The stage. */}
      <div
        className={cn(
          'relative flex-1 touch-pan-y select-none',
          fullscreen ? 'min-h-0' : 'min-h-[440px] md:aspect-[16/9] md:min-h-0',
        )}
        onPointerDown={(e) => (pointer.current = e.clientX)}
        onPointerUp={(e) => {
          if (pointer.current === null) return;
          const dx = e.clientX - pointer.current;
          pointer.current = null;
          if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: reduceMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            // The edges fade, so a tall slide reads as "scroll for more" rather than cut off.
            className={cn(
              'absolute inset-0 overflow-y-auto bg-gradient-to-br p-6 [mask-image:linear-gradient(to_bottom,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)] sm:p-10',
              BACKDROP[slide.kind],
            )}
            aria-live="polite"
          >
            {!reduceMotion && <Orbs seed={index} />}
            {/* min-h-full, not h-full: a short slide is centred, a tall one (a long self-check)
                grows from the top and scrolls inside the stage instead of clipping both ends. */}
            <div className="relative mx-auto flex min-h-full max-w-3xl flex-col justify-center">
              <SlideBody slide={slide} content={content} reduceMotion={reduceMotion} total={slides.length} record={record} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface/80 px-3 py-2.5 backdrop-blur">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="inline-flex h-9 items-center gap-1 rounded-lg border border-line px-3 text-sm transition-colors hover:bg-mist disabled:opacity-40"
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back</span>
        </button>

        <span className="px-1 font-mono text-xs tabular-nums text-mut" aria-live="polite">
          {index + 1} / {slides.length}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {narrationSupported && (
            <>
              <button
                type="button"
                onClick={() => (narrate ? setNarrate(false) : startNarrating())}
                aria-pressed={narrate}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                  narrate ? 'border-tech/50 bg-tech/10 text-tech' : 'border-line hover:bg-mist',
                )}
                title={`${NARRATOR.name} reads each slide aloud`}
              >
                {narrate ? (
                  <Volume2 className={cn('h-4 w-4', phase === 'speaking' && !reduceMotion && 'animate-pulse')} />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Narrate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoplay((a) => !a);
                  if (!narrate) startNarrating();
                }}
                aria-pressed={autoplay}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                  autoplay ? 'border-tech/50 bg-tech/10 text-tech' : 'border-line hover:bg-mist',
                )}
                title="Move to the next slide when the narration ends"
              >
                {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span className="hidden sm:inline">Auto-play</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line transition-colors hover:bg-mist"
            aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {index < last ? (
            <motion.button
              type="button"
              onClick={() => go(index + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-tech px-4 text-sm font-medium text-white"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              aria-label="Next slide"
            >
              Next <ChevronRight className="h-4 w-4" />
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                if (finishTargetId) document.getElementById(finishTargetId)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-tech px-4 text-sm font-medium text-white"
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              initial={reduceMotion ? false : { scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <Check className="h-4 w-4" /> Finish
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Soft drifting shapes behind the content — depth, not decoration fighting the text. */
function Orbs({ seed }: { seed: number }) {
  const a = (seed * 37) % 60;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute h-64 w-64 rounded-full bg-tech/10 blur-3xl"
        style={{ top: `${10 + (a % 30)}%`, left: `${55 + (a % 25)}%` }}
        animate={{ x: [0, 18, 0], y: [0, -14, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-48 w-48 rounded-full bg-sky-400/10 blur-3xl"
        style={{ bottom: `${5 + (a % 20)}%`, left: `${5 + (a % 30)}%` }}
        animate={{ x: [0, -14, 0], y: [0, 12, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/** Items that arrive one after another. */
function stagger(reduceMotion: boolean, i: number, base = 0.15) {
  return reduceMotion
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { delay: base + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
      };
}

function SlideIcon({ name, reduceMotion, large }: { name: SlideIcon; reduceMotion: boolean; large?: boolean }) {
  const Icon = ICONS[name] ?? Lightbulb;
  return (
    <motion.div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl bg-tech/15 text-tech shadow-sm ring-1 ring-tech/20',
        large ? 'h-20 w-20' : 'h-12 w-12',
      )}
      initial={reduceMotion ? false : { scale: 0.5, rotate: -12, opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { scale: 1, rotate: 0, opacity: 1, y: [0, -4, 0] }}
      transition={
        reduceMotion
          ? undefined
          : { scale: { type: 'spring', stiffness: 260, damping: 16 }, rotate: { type: 'spring', stiffness: 260, damping: 16 }, y: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 } }
      }
    >
      <Icon className={large ? 'h-10 w-10' : 'h-6 w-6'} />
    </motion.div>
  );
}

function Heading({ children, reduceMotion }: { children: React.ReactNode; reduceMotion: boolean }) {
  return (
    <motion.h3
      className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl"
      {...stagger(reduceMotion, 0, 0.05)}
    >
      {children}
    </motion.h3>
  );
}

function SlideBody({
  slide,
  content,
  reduceMotion,
  total,
  record,
}: {
  slide: DeckSlide;
  content: Content;
  reduceMotion: boolean;
  total: number;
  record?: { courseId: string; lessonId: string; learnerId?: string };
}) {
  switch (slide.kind) {
    case 'title':
      return (
        <div className="flex flex-col items-center text-center">
          <SlideIcon name={slide.icon} reduceMotion={reduceMotion} large />
          <motion.h2 className="mt-6 text-3xl font-bold leading-tight tracking-tight sm:text-4xl" {...stagger(reduceMotion, 0, 0.1)}>
            {slide.title}
          </motion.h2>
          {slide.subtitle && (
            <motion.p className="mt-4 max-w-xl text-lg leading-relaxed text-mut" {...stagger(reduceMotion, 1, 0.1)}>
              {slide.subtitle}
            </motion.p>
          )}
          <motion.p className="mt-6 text-xs font-medium uppercase tracking-wider text-mut" {...stagger(reduceMotion, 2, 0.1)}>
            {total} slides · use → or swipe
          </motion.p>
        </div>
      );

    case 'concept':
      return (
        <div>
          <div className="flex items-start gap-4">
            <SlideIcon name={slide.icon} reduceMotion={reduceMotion} />
            <Heading reduceMotion={reduceMotion}>{slide.title}</Heading>
          </div>
          <ul className="mt-8 space-y-4">
            {slide.points.map((point, i) => (
              <motion.li key={i} className="flex gap-3 text-lg leading-relaxed text-ink/90" {...stagger(reduceMotion, i, 0.3)}>
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-tech" aria-hidden />
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      );

    case 'steps':
      return (
        <div>
          <Heading reduceMotion={reduceMotion}>{slide.title}</Heading>
          <ol className="relative mt-8 space-y-5">
            {/* The connector draws down as the steps arrive. */}
            <motion.span
              aria-hidden
              className="absolute left-[19px] top-5 w-0.5 origin-top bg-tech/30"
              style={{ bottom: '1.25rem' }}
              initial={reduceMotion ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.35 + slide.steps.length * 0.14, ease: 'easeOut', delay: 0.25 }}
            />
            {slide.steps.map((step, i) => (
              <motion.li key={i} className="relative flex gap-4" {...stagger(reduceMotion, i, 0.3)}>
                <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tech text-sm font-bold text-white shadow">
                  {i + 1}
                </span>
                <span className="pt-1.5">
                  <span className="block text-lg font-semibold leading-snug">{step.label}</span>
                  {step.detail && <span className="mt-0.5 block text-base leading-relaxed text-mut">{step.detail}</span>}
                </span>
              </motion.li>
            ))}
          </ol>
        </div>
      );

    case 'compare':
      return (
        <div>
          <Heading reduceMotion={reduceMotion}>{slide.title}</Heading>
          <div className="relative mt-8 grid gap-4 sm:grid-cols-2">
            {[slide.left, slide.right].map((side, s) => (
              <motion.div
                key={s}
                className={cn('rounded-2xl border border-line bg-surface/80 p-5 shadow-sm', s === 0 ? 'border-sky-500/30' : 'border-emerald-500/30')}
                initial={reduceMotion ? false : { opacity: 0, x: s === 0 ? -40 : 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + s * 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className={cn('text-sm font-bold uppercase tracking-wide', s === 0 ? 'text-sky-600' : 'text-emerald-600')}>
                  {side.label}
                </p>
                <ul className="mt-3 space-y-2">
                  {side.points.map((p, i) => (
                    <li key={i} className="text-base leading-relaxed text-ink/90">{p}</li>
                  ))}
                </ul>
              </motion.div>
            ))}
            <motion.span
              aria-hidden
              className="absolute left-1/2 top-1/2 hidden h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold shadow sm:flex"
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 14 }}
            >
              vs
            </motion.span>
          </div>
        </div>
      );

    case 'highlight': {
      const warning = slide.tone === 'warning';
      return (
        <div className="text-center">
          <motion.div
            className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-full', warning ? 'bg-amber-500/20 text-amber-600' : 'bg-tech/15 text-tech')}
            initial={reduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          >
            {warning ? <AlertTriangle className="h-7 w-7" /> : <Quote className="h-7 w-7" />}
          </motion.div>
          <motion.p className="mt-3 text-xs font-bold uppercase tracking-wider text-mut" {...stagger(reduceMotion, 0, 0.15)}>
            {warning ? 'Watch out' : 'The key idea'}
          </motion.p>
          <motion.blockquote className="mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl" {...stagger(reduceMotion, 1, 0.15)}>
            {slide.text}
          </motion.blockquote>
        </div>
      );
    }

    case 'diagram':
      return (
        <div>
          <Heading reduceMotion={reduceMotion}>{slide.title}</Heading>
          <motion.div className="mt-6" {...stagger(reduceMotion, 1, 0.2)}>
            {content.diagram ? (
              <MermaidView source={content.diagram} title={slide.title} compact hideOnError />
            ) : null}
          </motion.div>
        </div>
      );

    case 'keypoints':
      return (
        <div>
          <div className="flex items-center gap-3">
            <motion.span
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tech/15 text-tech"
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 15 }}
            >
              <Lightbulb className="h-6 w-6" />
            </motion.span>
            <Heading reduceMotion={reduceMotion}>{slide.title}</Heading>
          </div>
          <ul className="mt-8 space-y-3">
            {slide.points.map((point, i) => (
              <motion.li key={i} className="flex gap-3 rounded-xl border border-line bg-surface/70 px-4 py-3 text-base leading-relaxed shadow-sm" {...stagger(reduceMotion, i, 0.25)}>
                <motion.span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tech text-white"
                  initial={reduceMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 400, damping: 14 }}
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.span>
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      );

    case 'check':
      return content.checkpoint ? (
        <motion.div {...stagger(reduceMotion, 0, 0.1)}>
          <Checkpoint checkpoint={content.checkpoint as LessonCheckpoint} record={record} />
        </motion.div>
      ) : null;

    case 'recap':
      return (
        <div className="text-center">
          <motion.div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-tech text-white shadow-lg shadow-tech/30"
            initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 12 }}
          >
            <Sparkles className="h-8 w-8" />
          </motion.div>
          {!reduceMotion && <Burst />}
          <Heading reduceMotion={reduceMotion}>
            <span className="mt-5 block">{slide.title}</span>
          </Heading>
          <ul className="mx-auto mt-6 max-w-xl space-y-2 text-left">
            {slide.points.map((point, i) => (
              <motion.li key={i} className="flex gap-3 text-lg leading-relaxed" {...stagger(reduceMotion, i, 0.4)}>
                <Star className="mt-1.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{point}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      );
  }
}

/** A small celebratory burst on the recap slide. */
function Burst() {
  const bits = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-[18%] h-0 w-0">
      {bits.map((i) => {
        const angle = (i / bits.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className={cn('absolute h-2 w-2 rounded-full', i % 3 === 0 ? 'bg-tech' : i % 3 === 1 ? 'bg-amber-400' : 'bg-emerald-400')}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 90, y: Math.sin(angle) * 70, opacity: 0, scale: 0.4 }}
            transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
          />
        );
      })}
    </div>
  );
}
