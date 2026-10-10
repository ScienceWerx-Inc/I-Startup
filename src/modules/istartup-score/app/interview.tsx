'use client';

import React, { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { useAccount, type Account, type AccountUser } from "@/hooks/use-account";

import { assessmentDraftKey } from "../assessment/draft-key";
import { priorityActions, type IStartupReport } from "../assessment/scoring";
import type { ReportScreenProps } from "../components/assessment-shell";
import { Nav } from "../components/landing/editorial/nav";
import { CourseOffer, UnlockCard } from "../components/paywall";
import { ReportView } from "../components/report-view";
import { profileFromOnboarding } from "../onboarding/fields";

// Client-only: the shell restores a saved draft from localStorage on its first render.
const AssessmentShell = dynamic(
    () => import("../components/assessment-shell").then((m) => m.AssessmentShell),
    { ssr: false, loading: () => <Loading label="Loading assessment…" /> },
);

function Loading({ label }: { label: string }) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-sm text-mut">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
            {label}
        </div>
    );
}

type Notice = { tone: "good" | "risk"; text: string } | null;

interface Gate {
    account: Account;
    user: AccountUser;
    buying: "report" | "course" | null;
    checkout: (product: "report" | "course") => void;
}

const GateContext = createContext<Gate | null>(null);

/** The report as the shell shows it: score always, analysis behind the paywall, course offer below. */
function GatedReport({ report, onEdit, onRestart }: ReportScreenProps) {
    const gate = useContext(GateContext);
    if (!gate) return null;
    const { account, user, buying, checkout } = gate;
    const testMode = account.payments === "mock";
    const actionCount = priorityActions(report).length;
    return (
        <ReportView
            report={report}
            onEdit={onEdit}
            onRestart={onRestart}
            locked={!account.access.report}
            lockOverlay={
                <UnlockCard
                    price={account.prices.report}
                    strengths={report.strengths.length}
                    gaps={report.gaps.length}
                    actions={actionCount}
                    busy={buying === "report"}
                    testMode={testMode}
                    onUnlock={() => checkout("report")}
                />
            }
            extra={
                <CourseOffer
                    price={account.prices.course}
                    owned={account.access.course}
                    email={user.email}
                    gapCount={Math.max(report.gaps.length, actionCount)}
                    busy={buying === "course"}
                    testMode={testMode}
                    onEnroll={() => checkout("course")}
                />
            }
        />
    );
}

/**
 * The assessment for a signed-in founder (proxy.ts sends everyone else to onboarding).
 * The profile comes pre-filled from onboarding; the finished report shows the score and
 * keeps the analysis locked until the founder buys the full report. Checkout returns here
 * with `?checkout=success|cancelled`.
 */
function IstartupInterviewPageComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { account, user, isLoading, setAccount } = useAccount();

    const [reportId, setReportId] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<"idle" | "saved" | "failed">("idle");
    const [buying, setBuying] = useState<"report" | "course" | null>(null);
    const [notice, setNotice] = useState<Notice>(() =>
        searchParams.get("checkout") === "cancelled"
            ? { tone: "risk", text: "Checkout was cancelled. Nothing was charged." }
            : null,
    );

    const appId = searchParams.get("appId");

    useEffect(() => {
        if (!isLoading && !user) router.replace("/start");
    }, [isLoading, user, router]);

    // Back from checkout: confirm the payment (Stripe) and refresh access, then tidy the URL.
    const handledCheckout = useRef(false);
    useEffect(() => {
        const outcome = searchParams.get("checkout");
        if (!outcome || !user || handledCheckout.current) return;
        handledCheckout.current = true;
        if (outcome === "cancelled") {
            router.replace("/interview");
            return;
        }
        const sessionId = searchParams.get("session_id");
        (async () => {
            try {
                const res = await fetch(`/api/checkout/verify${sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ""}`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setAccount((a) => (a ? { ...a, access: data.access } : a));
                setNotice({ tone: "good", text: "Payment received, thank you. Your purchase is unlocked." });
            } catch {
                setNotice({ tone: "risk", text: "We couldn't confirm your payment yet. Refresh in a moment, or contact support if it persists." });
            } finally {
                router.replace("/interview");
            }
        })();
    }, [searchParams, user, router, setAccount]);

    // Memoised: the shell derives its blank profile from this object's identity.
    const onboarding = user?.onboarding;
    const initialProfile = useMemo(() => profileFromOnboarding(onboarding), [onboarding]);

    /** Archives the report in Vercel Postgres via /api/reports, linked to the signed-in founder. */
    const saveReport = useCallback(async (report: IStartupReport) => {
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appId,
                    startupName: report.profile.name,
                    profile: { ...report.profile, onboarding },
                    companyInfo: null,
                    answers: report.answers,
                    scores: report.categories.map((c) => ({ category: c.title, score: c.percent })),
                    finalScore: report.finalScore,
                    band: report.band.code,
                }),
            });
            if (!res.ok) throw new Error(`Save failed: ${res.status}`);
            const data = await res.json();
            setReportId(data.id ?? null);
            setSaveState("saved");
        } catch (error) {
            console.error("Failed to save report:", error);
            setSaveState("failed");
        }
    }, [appId, onboarding]);

    const checkout = useCallback(async (product: "report" | "course") => {
        setBuying(product);
        setNotice(null);
        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ product, reportId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout.");
            window.location.href = data.url;
        } catch (err) {
            setNotice({ tone: "risk", text: err instanceof Error ? err.message : "Could not start checkout." });
            setBuying(null);
        }
    }, [reportId]);

    const gate = useMemo<Gate | null>(
        () => (account && user ? { account, user, buying, checkout } : null),
        [account, user, buying, checkout],
    );

    let body: React.ReactNode;
    if (isLoading || !user) {
        body = <Loading label="Loading your account…" />;
    } else {
        body = (
            <>
                {notice ? (
                    <p className={`no-print mx-auto mt-4 flex w-full max-w-5xl items-center gap-2 px-4 text-sm sm:px-6 ${notice.tone === "good" ? "text-good" : "text-risk"}`}>
                        {notice.tone === "good" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {notice.text}
                    </p>
                ) : null}
                {saveState === "failed" ? (
                    <p className="no-print mx-auto mt-4 w-full max-w-5xl px-4 text-xs text-risk sm:px-6">
                        The report could not be saved to your account. Your answers are kept on this device; try again by editing and resubmitting.
                    </p>
                ) : null}
                <GateContext.Provider value={gate}>
                    <AssessmentShell
                        initialProfile={initialProfile}
                        onComplete={saveReport}
                        storageKey={assessmentDraftKey(user.id)}
                        ReportScreen={GatedReport}
                    />
                </GateContext.Provider>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-paper">
            <Nav variant="page" />
            {body}
        </div>
    );
}

export default function IstartupInterviewPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-paper"><Loading label="Loading…" /></div>}>
            <IstartupInterviewPageComponent />
        </Suspense>
    );
}
