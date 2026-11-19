"use client"

import Link from "next/link"
import { Shield, Lock, Eye, Database, Globe, UserCheck, Bell, Mail, Info, FileText, Scale, Key } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { BRAND } from "@/lib/brand"

export default function PrivacyPage() {
    const sections = [
        {
            title: "Data We Collect",
            icon: <Database className="w-6 h-6 text-primary" />,
            content: "We collect information you provide directly to us, including your name, email address, phone number, and any meeting recordings or transcripts you upload for processing. We also automatically collect certain technical information when you use our platform."
        },
        {
            title: "How We Use Your Data",
            icon: <Globe className="w-6 h-6 text-accent" />,
            content: "Your data is used specifically to provide, maintain, and improve our services. This includes transcribing your recordings and writing summaries, decisions and action items from them."
        },
        {
            title: "AI Processing Privacy",
            icon: <Shield className="w-6 h-6 text-primary" />,
            content: "Your audio and transcripts are sent to the AI providers listed under Third-Party Services so they can produce your notes. We do not use your meetings to train AI models of our own."
        },
        {
            title: "Data Security",
            icon: <Lock className="w-6 h-6 text-accent" />,
            content: "Data travels between your browser and our servers over encrypted HTTPS connections, and your meetings are only available through your account. No system is perfectly secure, so we cannot promise absolute security."
        },
        {
            title: "Data Retention",
            icon: <FileText className="w-6 h-6 text-primary" />,
            content: "We retain your meeting data only for as long as necessary to provide you with the documentation you've requested or as required by law. You can delete your recordings and transcripts at any time via your dashboard."
        },
        {
            title: "User Rights",
            icon: <UserCheck className="w-6 h-6 text-accent" />,
            content: "You have the right to access, correct, or delete your personal information. You can manage your data preferences directly through your account settings or by contacting our support team."
        },
        {
            title: "Third-Party Services",
            icon: <Scale className="w-6 h-6 text-primary" />,
            content: "We use these providers to run the service: AssemblyAI and Groq (speech recognition), Google Gemini and Groq (AI notes), Clerk (Google sign-in), Resend (email) and Paddle (our Merchant of Record, which takes payments and handles billing details). They receive the data they need to do that job, under their own privacy terms."
        },
        {
            title: "Cookies & Tracking",
            icon: <Eye className="w-6 h-6 text-accent" />,
            content: "We use cookies and similar technologies to enhance your experience, analyze platform usage, and remember your preferences. You can control cookie settings through your browser."
        },
        {
            title: "Where Data Is Processed",
            icon: <Globe className="w-6 h-6 text-primary" />,
            content: "OmniMeetX and the providers above may process your data outside your country. If you have a privacy request under the laws where you live, contact us and we will help."
        },
        {
            title: "Policy Updates",
            icon: <Bell className="w-6 h-6 text-accent" />,
            content: "We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the 'Last Modified' date."
        },
        {
            title: "Who We Are and How to Reach Us",
            icon: <Mail className="w-6 h-6 text-primary" />,
            content: <>{BRAND.legalName} is responsible for the personal data described here. If you have questions about this Privacy Policy or our data practices, send us a message through our <Link href="/contact" className="text-brand-light underline underline-offset-4">contact page</Link>.</>
        },
        {
            title: "Legal Basis",
            icon: <Info className="w-6 h-6 text-accent" />,
            content: "Our processing of your data is based on contract fulfillment (providing the services you signed up for), legal obligations, and our legitimate interest in improving our AI platform."
        }
    ]

    return (
        <div className="min-h-screen bg-canvas">

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6"
                        >
                            <Shield className="w-4 h-4" />
                            <span>Privacy</span>
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight gradient-text"
                        >
                            Privacy Policy
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-white/60 max-w-3xl mx-auto"
                        >
                            Last modified: November 5, 2026. What we collect, why, and who else handles it.
                        </motion.p>
                    </div>

                    {/* Policy Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sections.map((section, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * (idx % 6) }}
                            >
                                <Card className="glass-card hover:border-primary/30 transition-all duration-300 h-full group">
                                    <CardContent className="p-8">
                                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                            {section.icon}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-4">{section.title}</h3>
                                        <p className="text-white/60 text-sm leading-relaxed">
                                            {section.content}
                                        </p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

        </div>
    )
}
