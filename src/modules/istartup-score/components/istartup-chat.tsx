'use client';

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Bot, User as UserIcon, Send, Loader2, Download } from "lucide-react";
import { iStartupScoreFlow } from "../ai/istartup-score-flow";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useFirestore } from "@/firebase";
import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

type IStartupChatInterfaceProps = {
    applicationId: string;
    startupName?: string;
    startupDescription?: string;
    companyInfo?: any;
}

export function IStartupChatInterface({ applicationId, startupName, startupDescription, companyInfo }: IStartupChatInterfaceProps) {
    const [messages, setMessages] = useState<{ role: 'user' | 'bot', content: string | object }[]>([]);
    const [askedQuestionIds, setAskedQuestionIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [interviewStarted, setInterviewStarted] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const scrollAreaRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    React.useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
        if (!isLoading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [messages, isLoading]);

    const saveReportAndNavigate = async (reportData: any) => {
        if (!firestore || !applicationId) return;

        try {
            const reportToSave = {
                startupName: reportData.startupName,
                reportContent: reportData.markdownReport,
                scores: reportData.scores,
                finalScore: reportData.finalScore,
                conversationHistory: messages,
                createdAt: serverTimestamp(),
            };

            const reportsCollection = collection(firestore, `applications/${applicationId}/istartup-reports`);
            const snapshot = await getDocs(reportsCollection);
            const reportCount = snapshot.size;
            const newReportId = `REPORT${reportCount + 1}`;
            const docRef = doc(reportsCollection, newReportId);

            await setDoc(docRef, reportToSave);
            
            toast({
                title: "Report Saved",
                description: "The iSTARTUP Score report has been archived with this application.",
            });

        } catch (error) {
            console.error("Failed to save report:", error);
            toast({
                title: "Save Failed",
                description: "Could not save the report to the database.",
                variant: "destructive",
            });
        }
    }


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;
    
        const userMessage = { role: 'user' as const, content: inputValue };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);
    
        try {
            const answers = newMessages.filter(m => m.role === 'user').map((m, i) => ({
                questionId: askedQuestionIds[i],
                answer: m.content as string,
            }));

            const response = await iStartupScoreFlow({
                answers,
                startupName: startupName || "Startup",
                companyInfo,
                askedQuestionIds,
            });
    
            if (typeof response === 'object' && 'markdownReport' in response) {
                const reportMessage = { role: 'bot' as const, content: response.markdownReport };
                setMessages(prev => [...prev, reportMessage]);
                saveReportAndNavigate(response).catch(console.error);
                return;
            }
    
            if (typeof response === 'object' && 'question' in response) {
                const { question, questionId } = response;
                const newBotMessage = { role: 'bot' as const, content: question };
                setMessages(prev => [...prev, newBotMessage]);
                setAskedQuestionIds(prev => [...prev, questionId]);
            }
    
        } catch (error) {
            console.error("Error calling iStartupScoreFlow:", error);
            const errorMessage = { role: 'bot' as const, content: "Sorry, I seem to be having some trouble. Let's try that again." };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const startInterview = async () => {
        setIsLoading(true);
        setInterviewStarted(true);
        try {
            const response = await iStartupScoreFlow({
              answers: [],
              startupName: startupName || "Startup",
              companyInfo,
              askedQuestionIds: []
            });
            if (typeof response === 'object' && 'question' in response) {
                const { question, questionId } = response;
                setMessages([{ role: 'bot', content: question }]);
                setAskedQuestionIds([questionId]);
            } else {
                throw new Error("Initial flow response was not a question object.");
            }
        } catch (error) {
             console.error("Error starting interview:", error);
             setMessages([{ role: 'bot', content: "I'm having trouble starting the interview right now. Please try again in a moment." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!interviewStarted) {
        return (
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card max-w-xl mx-auto overflow-hidden relative"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                <div className="p-10 flex flex-col items-center text-center">
                    <div className="mb-6 relative group">
                        <div className="absolute -inset-4 bg-[var(--primary-glow)] rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                        <Image
                            src="https://firebasestorage.googleapis.com/v0/b/studio-4822316571-1b094.firebasestorage.app/o/Homepage%2FTech%20Startup%20Logo%20with%20Blue%20and%20Orange%20Contrast.png?alt=media&token=b9c089a5-1177-43cd-a737-cd04b651afa4"
                            alt="iSTARTUP Score Logo"
                            width={100}
                            height={100}
                            className="h-24 w-24 relative z-10"
                        />
                    </div>
                    <h2 className="font-headline text-3xl font-bold mb-3 text-white">Generate iSTARTUP Score</h2>
                    <p className="text-white/60 mb-10 max-w-sm">Begin the interactive interview to assess this startup's capability and readiness for seed-stage venture capital.</p>
                    <button onClick={startInterview} disabled={isLoading} className="btn-primary w-full max-w-xs text-lg">
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        Start Interview
                    </button>
                </div>
            </motion.div>
        );
    }

    const exportAsPDF = () => {
        document.body.classList.add('printing-report');
        window.print();
        setTimeout(() => document.body.classList.remove('printing-report'), 100);
    };

    const isReportGenerated = messages.some(m => typeof m.content === 'object' || (typeof m.content === 'string' && m.content.includes("### **ISTARTUP Score for")));

    return (
         <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.5)] border-white/10"
         >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            
            <div className="p-0">
                 <div className="flex flex-col h-[75vh]">
                     <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-transparent scroll-smooth">
                        <AnimatePresence initial={false}>
                            {messages.map((message, index) => (
                                <motion.div 
                                    key={index} 
                                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className={cn(
                                        "flex items-start gap-4 max-w-[85%]", 
                                        message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                    )}
                                >
                                    <Avatar className="shadow-lg border border-white/10 w-10 h-10 flex-shrink-0">
                                        <AvatarFallback className={cn(message.role === 'user' ? 'bg-gradient-to-br from-[var(--primary)] to-[#005bb5]' : 'bg-white/10')}>
                                            {message.role === 'user' ? <UserIcon className="h-5 w-5 text-white" /> : <Bot className="h-5 w-5 text-[var(--accent)]" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={cn("rounded-3xl px-6 py-4 shadow-lg text-[15px] leading-relaxed", 
                                        message.role === 'user' 
                                            ? 'bg-gradient-to-r from-[#005bb5] to-[var(--primary)] text-white rounded-tr-sm border border-white/10' 
                                            : 'glass-card border border-white/10 text-white rounded-tl-sm'
                                    )}>
                                        <div className="relative">
                                            <div id={typeof message.content === 'string' && message.content.includes('### **ISTARTUP Score for') ? "report-content" : undefined} className="prose dark:prose-invert prose-sm max-w-none text-white/90 p-4">
                                                <ReactMarkdown remarkPlugins={[remarkGfm] as any}>
                                                    {typeof message.content === 'string' ? message.content : ''}
                                                </ReactMarkdown>
                                            </div>
                                            {typeof message.content === 'string' && message.content.includes('### **ISTARTUP Score for') && (
                                                <div className="mt-6 flex justify-end">
                                                    <Button onClick={exportAsPDF} className="btn-primary gap-2">
                                                        <Download className="h-4 w-4" /> Download as PDF
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && !isReportGenerated && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-start gap-4 max-w-[85%] mr-auto"
                                >
                                    <Avatar className="shadow-lg border border-white/10 w-10 h-10 flex-shrink-0">
                                        <AvatarFallback className="bg-white/10"><Bot className="h-5 w-5 text-[var(--accent)]" /></AvatarFallback>
                                    </Avatar>
                                    <div className="glass-card rounded-3xl rounded-tl-sm px-6 py-5 shadow-lg border border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 bg-[var(--accent)] rounded-full animate-bounce delay-0" />
                                            <span className="h-2 w-2 bg-[var(--accent)] rounded-full animate-bounce delay-150" />
                                            <span className="h-2 w-2 bg-[var(--accent)] rounded-full animate-bounce delay-300" />
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                     {!isReportGenerated && (
                        <div className="p-4 md:p-6 bg-black/20 border-t border-white/10 backdrop-blur-md">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4 max-w-5xl mx-auto">
                                <div className="relative flex-1">
                                    <Input 
                                        ref={inputRef}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Type your answer here..."
                                        autoComplete="off"
                                        disabled={isLoading}
                                        className="h-14 text-base bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-2xl focus-visible:ring-[var(--primary)] focus-visible:ring-offset-0 focus-visible:bg-white/10 transition-all pl-6 pr-14"
                                    />
                                    <Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon" className="absolute right-2 top-2 bottom-2 h-10 w-10 rounded-xl bg-gradient-to-r from-[#005bb5] to-[var(--primary)] text-white hover:opacity-90 transition-opacity border-none flex-shrink-0">
                                        <Send className="h-4 w-4" />
                                        <span className="sr-only">Send</span>
                                    </Button>
                                </div>
                            </form>
                        </div>
                     )}
                 </div>
            </div>
        </motion.div>
    );
}