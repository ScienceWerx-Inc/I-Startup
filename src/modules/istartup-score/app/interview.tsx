'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, Shield, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { getApplicationById } from "@/lib/data";

import type { StartupProfile } from "../assessment/bank";
import type { IStartupReport } from "../assessment/scoring";
import { Eyebrow, Panel, SiteHeader } from "../components/chrome";

type ApplicationData = any;

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

function IstartupInterviewPageComponent() {
    const [appId, setAppId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [showVerification, setShowVerification] = useState(true);
    const [verifiedApplication, setVerifiedApplication] = useState<ApplicationData | null>(null);
    const [saveState, setSaveState] = useState<"idle" | "saved" | "failed">("idle");

    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { isAdmin, isLoading: roleLoading } = useUserRole();

    const appIdFromUrl = searchParams.get('appId');
    const errorFromUrl = searchParams.get('error');

    const hasVerified = React.useRef(false);

    useEffect(() => {
        if (authLoading || roleLoading) return;

        if (isAdmin) {
            if (!hasVerified.current) {
                hasVerified.current = true;
                setVerifiedApplication({ id: 'ADMIN_BYPASS' } as any);
                setShowVerification(false);
                setIsLoading(false);
            }
            return;
        }

        if (user && appIdFromUrl) {
            if (hasVerified.current) return;
            hasVerified.current = true;

            const verifyAppId = async () => {
                setIsLoading(true);
                setVerificationError(null);
                const appData = await getApplicationById(appIdFromUrl);

                if (appData) {
                    setVerifiedApplication(appData);
                    setShowVerification(false);
                } else {
                    setVerificationError("The Application ID provided is invalid or does not belong to your account. Please try again.");
                    setShowVerification(true);
                }
                setIsLoading(false);
            };
            verifyAppId();
        } else {
            setShowVerification(false);
            setIsLoading(false);
        }
    }, [user?.uid, authLoading, isAdmin, roleLoading, appIdFromUrl, errorFromUrl]);

    const handleProceedToLogin = () => {
        if (appId) {
            router.push(`/login?next=/pnpl/apply/istartup-interview?appId=${appId}`);
        }
    };

    const isLinked = !!verifiedApplication?.id && verifiedApplication.id !== 'ADMIN_BYPASS';
    const companyOwner = verifiedApplication?.owners?.find((o: any) => o.ownerType === 'company' || o.ownerType === 'institution');

    // Memoised: the shell derives its blank profile from this object's identity.
    const initialProfile = useMemo<Partial<StartupProfile>>(() => ({
        name: companyOwner?.companyName || companyOwner?.institutionName || verifiedApplication?.title || "",
        description: verifiedApplication?.abstract || verifiedApplication?.inventionDescription || "",
    }), [companyOwner, verifiedApplication]);

    /** Archives the report in Vercel Postgres via /api/reports. Works for linked and anonymous assessments. */
    const saveReport = useCallback(async (report: IStartupReport) => {
        try {
            const res = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appId: verifiedApplication?.id ?? null,
                    startupName: report.profile.name,
                    profile: report.profile,
                    companyInfo: companyOwner ? {
                        name: companyOwner.companyName || companyOwner.institutionName,
                        type: companyOwner.companyType,
                        incorporationState: companyOwner.stateOfIncorporation,
                        incorporationYear: companyOwner.yearOfIncorporation,
                        officerName: companyOwner.officerName,
                    } : null,
                    answers: report.answers,
                    scores: report.categories.map((c) => ({ category: c.title, score: c.percent })),
                    finalScore: report.finalScore,
                    band: report.band.code,
                }),
            });
            if (!res.ok) throw new Error(`Save failed: ${res.status}`);
            setSaveState("saved");
        } catch (error) {
            console.error("Failed to save report:", error);
            setSaveState("failed");
        }
    }, [verifiedApplication, companyOwner]);

    const headerRight = isLinked ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-good/30 bg-good-soft px-2.5 py-1 font-mono text-[11px] font-medium text-good">
            <ShieldCheck className="h-3.5 w-3.5" /> {verifiedApplication.id}
        </span>
    ) : null;

    let body: React.ReactNode;
    if (isLoading) {
        body = <Loading label="Verifying your details…" />;
    } else if (showVerification) {
        body = (
            <div className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
                <Panel>
                    <Eyebrow>iSTARTUP Score</Eyebrow>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Link your application</h1>
                    <p className="mt-1.5 text-sm leading-relaxed text-mut">
                        Enter your Application ID and log in to continue to the iSTARTUP Score assessment.
                    </p>

                    {verificationError ? (
                        <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-risk/30 bg-risk-soft p-3.5 text-sm text-risk">
                            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                            {verificationError}
                        </p>
                    ) : null}

                    <label className="mt-6 block">
                        <span className="mb-1.5 block text-sm font-medium text-ink">Application ID</span>
                        <input
                            placeholder="e.g. PN-001"
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                            className="w-full rounded-lg border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-mut/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </label>
                    <p className="mt-2 text-xs text-mut">
                        Don&apos;t have one?{" "}
                        <Link href="/pnpl/apply" className="font-medium text-brand hover:underline">
                            Start a PNPL application
                        </Link>
                        .
                    </p>
                    <Button className="mt-6 w-full" size="lg" onClick={handleProceedToLogin} disabled={!appId}>
                        <LogIn className="h-4 w-4" /> Proceed to login
                    </Button>
                </Panel>
            </div>
        );
    } else {
        body = (
            <>
                {saveState !== "idle" ? (
                    <p className={`no-print mx-auto mt-4 w-full max-w-5xl px-4 text-xs sm:px-6 ${saveState === "saved" ? "text-good" : "text-risk"}`}>
                        {saveState === "saved"
                            ? "Report archived with your application."
                            : "The report could not be archived with your application. Download the PDF to keep a copy."}
                    </p>
                ) : null}
                <AssessmentShell initialProfile={initialProfile} onComplete={saveReport} />
            </>
        );
    }

    return (
        <div className="min-h-screen bg-paper">
            <SiteHeader right={headerRight} />
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
