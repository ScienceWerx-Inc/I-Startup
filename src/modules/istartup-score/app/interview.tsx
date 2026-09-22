'use client';

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { getApplicationById } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, LogIn, HardHat, Check, User, Shield, Briefcase, Building, Calendar, Mail, Edit } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IStartupChatInterface } from "../components/istartup-chat";
import Image from "next/image";
import { motion } from "framer-motion";

type ApplicationData = any;

function CompanyInformationDisplay({ application }: { application: any }) {
    const companyOwner = application?.owners?.find((o: any) => o.ownerType === 'company' || o.ownerType === 'institution');

    if (!companyOwner) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 glass-card p-6 md:p-8"
        >
            <div className="mb-6 border-b border-white/10 pb-4">
                <h3 className="text-xl font-bold text-white mb-2">Company Information</h3>
                <p className="text-white/60 text-sm">This information was imported from your patent application.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-lg bg-[var(--primary-glow)]"><Building className="h-5 w-5 text-[var(--accent)]" /></div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">Company Name</p>
                        <p className="font-medium text-white">{companyOwner.companyName || companyOwner.institutionName}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-lg bg-[var(--primary-glow)]"><Briefcase className="h-5 w-5 text-[var(--accent)]" /></div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">Company Type</p>
                        <p className="font-medium text-white">{companyOwner.companyType || "N/A"}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-lg bg-[var(--primary-glow)]"><Briefcase className="h-5 w-5 text-[var(--accent)]" /></div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">State of Incorporation</p>
                        <p className="font-medium text-white">{companyOwner.stateOfIncorporation || "N/A"}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-lg bg-[var(--primary-glow)]"><Calendar className="h-5 w-5 text-[var(--accent)]" /></div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">Year of Incorporation</p>
                        <p className="font-medium text-white">{companyOwner.yearOfIncorporation || "NA"}</p>
                    </div>
                </div>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5 md:col-span-2">
                    <div className="p-2 rounded-lg bg-[var(--primary-glow)]"><User className="h-5 w-5 text-[var(--accent)]" /></div>
                    <div>
                        <p className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-1">Officer/Director Name</p>
                        <p className="font-medium text-white">{companyOwner.officerName || "N/A"}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function IstartupInterviewPageComponent() {
    const [appId, setAppId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const [showVerification, setShowVerification] = useState(true);
    const [verifiedApplication, setVerifiedApplication] = useState<ApplicationData | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isLoading: authLoading } = useAuth();
    const { isAdmin, isLoading: roleLoading } = useUserRole();
    
    const appIdFromUrl = searchParams.get('appId');
    const errorFromUrl = searchParams.get('error');

    const hasVerified = React.useRef(false);

    useEffect(() => {
        if (authLoading || roleLoading) return;
        
        if(isAdmin) {
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
    }
    
    const companyOwner = verifiedApplication?.owners?.find((o: any) => o.ownerType === 'company' || o.ownerType === 'institution');
    const hasCompanyInfo = verifiedApplication?.id === 'ADMIN_BYPASS' || !!companyOwner;
    
    const companyInfoForFlow = {
        name: companyOwner?.companyName || companyOwner?.institutionName,
        type: companyOwner?.companyType,
        incorporationState: companyOwner?.stateOfIncorporation,
        incorporationYear: companyOwner?.yearOfIncorporation,
        officerName: companyOwner?.officerName,
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center bg-[var(--background)]">
                <Loader2 className="h-16 w-16 animate-spin text-[var(--accent)] mb-6"/>
                <h1 className="font-headline text-3xl font-bold text-white">Verifying Information...</h1>
                <p className="mt-4 text-white/60 text-lg">Please wait while we check your details.</p>
            </div>
        );
    }
    
    if (showVerification) {
         return (
            <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-lg p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                    <div className="mb-8 text-center">
                        <h2 className="text-3xl font-bold text-white mb-2">Link Your Application</h2>
                        <p className="text-white/60">
                            Please enter your Application ID and log in to continue to the iSTARTUP Score submission.
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        {verificationError && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-start gap-3">
                                <Shield className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <span>{verificationError}</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            <Label htmlFor="app-id" className="text-white/80">Application ID</Label>
                            <Input 
                                id="app-id" 
                                placeholder="e.g., PN-001" 
                                value={appId} 
                                onChange={(e) => setAppId(e.target.value)} 
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12"
                            />
                            <p className="text-xs text-white/50 pt-2">
                                Don't have one?{" "}
                                <Link href="/pnpl/apply" className="text-[var(--accent)] hover:underline">
                                    Start a PNPL application
                                </Link>
                                .
                            </p>
                        </div>
                        <button className="btn-primary w-full" onClick={handleProceedToLogin} disabled={!appId}>
                            <LogIn className="mr-2 h-5 w-5" /> Proceed to Login
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] relative overflow-hidden pt-12 pb-24">
            {/* Abstract Backgrounds */}
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[var(--primary-glow)] rounded-full blur-[120px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[var(--accent-glow)] rounded-full blur-[100px] opacity-15 pointer-events-none" />

            <div className="container mx-auto max-w-5xl px-6 relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center text-center mb-16"
                >
                    <div className="p-2 rounded-2xl bg-white/5 border border-white/10 mb-8 backdrop-blur-sm relative group">
                        <div className="absolute inset-0 bg-[var(--primary-glow)] blur-xl opacity-30 group-hover:opacity-60 transition-opacity rounded-full" />
                        <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4822316571-1b094.firebasestorage.app/o/Homepage%2FTech%20Startup%20Logo%20with%20Blue%20and%20Orange%20Contrast.png?alt=media&token=b9c089a5-1177-43cd-a737-cd04b651afa4"
                            alt="iSTARTUP Score Logo"
                            width={128}
                            height={128}
                            className="h-24 w-24 relative z-10"
                        />
                    </div>
                    <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight mb-4">
                        iSTARTUP <span className="text-gradient">Interview</span>
                    </h1>
                    <p className="max-w-2xl text-lg text-white/60">
                        {hasCompanyInfo ? "Your application has been verified. Please provide the following details to assess your startup's capability." : "Welcome! Let's get started on your iSTARTUP Score assessment."}
                    </p>
                    
                    {verifiedApplication?.id !== 'ADMIN_BYPASS' && verifiedApplication?.id && (
                        <div className="mt-8 px-6 py-3 rounded-full glass-card border-green-500/30 bg-green-500/10 flex items-center gap-3">
                            <Shield className="h-5 w-5 text-green-400" />
                            <span className="text-green-300 text-sm font-medium">
                                Verified Application: <span className="font-bold">{verifiedApplication?.id}</span>
                            </span>
                        </div>
                    )}
                </motion.div>
                
                {hasCompanyInfo ? (
                    <>
                        {verifiedApplication && verifiedApplication.id !== 'ADMIN_BYPASS' && (
                            <CompanyInformationDisplay application={verifiedApplication} />
                        )}
                        <IStartupChatInterface
                            applicationId={verifiedApplication?.id || 'temp-id'}
                            startupName={companyInfoForFlow.name}
                            companyInfo={companyInfoForFlow}
                            startupDescription={verifiedApplication?.abstract || verifiedApplication?.inventionDescription}
                        />
                    </>
                ) : (
                    <IStartupChatInterface
                        applicationId={verifiedApplication?.id || 'temp-id-no-company'}
                        startupName={verifiedApplication?.title}
                        companyInfo={null}
                        startupDescription={verifiedApplication?.abstract || verifiedApplication?.inventionDescription}
                    />
                )}
            </div>
        </div>
    );
}


export default function IstartupInterviewPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-screen text-center bg-[var(--background)]">
                <Loader2 className="h-16 w-16 animate-spin text-[var(--accent)] mb-6"/>
                <h1 className="font-headline text-3xl font-bold text-white">Loading...</h1>
            </div>
        }>
            <IstartupInterviewPageComponent />
        </Suspense>
    )
}
