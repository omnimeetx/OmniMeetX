"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BRAND } from "@/lib/brand"
import {
    FileText,
    ShieldCheck,
    UserCheck,
    AlertTriangle,
    Scale,
    Lock,
    Brain,
    CreditCard,
    Clock,
    Ban,
    Hammer,
    Gavel,
    Mail,
    Info
} from "lucide-react"

export default function TermsPage() {
    return (
        <div className="min-h-screen">

            {/* Hero Section */}
            <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-16 h-16 tile-accent rounded-lg flex items-center justify-center mx-auto mb-6 glow floating">
                        <Scale className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                        Terms & Conditions
                    </h1>
                    <p className="text-xl text-muted-foreground">
                        Please read these terms carefully before using OmniMeetX
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">

                    {/* Introduction */}
                    <Card className="glass-card mb-12 ring-1 ring-primary/20">
                        <CardContent className="p-8">
                            <div className="flex items-start gap-4">
                                <Info className="w-6 h-6 text-primary mt-1 shrink-0" />
                                <p className="text-lg leading-relaxed text-foreground/90">
                                    These Terms and Conditions are a contract between you and {BRAND.legalName}.
                                    By accessing or using OmniMeetX, you agree to be legally bound by them.
                                    If you do not agree with any part of these terms, you must not use the service.
                                    OmniMeetX reserves the right to update or modify these terms at any time,
                                    and continued use of the platform indicates acceptance of the revised terms.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* 1. Service Overview */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Service Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    OmniMeetX provides AI-powered speech-to-text and transcription services for live and recorded audio,
                                    meetings, and other supported content. The service is offered on an “as-is” and “as-available” basis,
                                    and we may change, suspend, or discontinue any part of the service at our discretion without prior notice.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 2. User Eligibility */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">User Eligibility</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    You must be at least 18 years of age to use OmniMeetX, or you must have permission and supervision from a legal guardian.
                                    You agree that all information you provide while using the service is accurate, complete, and lawful.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 3. Content Responsibility */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Content & Responsibility</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Users are solely responsible for the audio, recordings, and content they upload or transcribe using OmniMeetX.
                                    You agree not to use the service for any illegal, harmful, or unauthorized activities, including recording conversations
                                    without the required consent or uploading copyrighted material without permission.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 4. Privacy & Security */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">Privacy & Security</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    OmniMeetX respects user privacy and processes data in accordance with its Privacy Policy.
                                    While reasonable security measures are implemented, OmniMeetX does not guarantee absolute data security
                                    and is not responsible for unauthorized access beyond its control.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 5. AI Technology & Accuracy */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <Brain className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">AI & Accuracy</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    The service uses artificial intelligence technology, which may result in transcription inaccuracies or errors.
                                    OmniMeetX does not guarantee the accuracy or reliability of transcriptions, and users are responsible
                                    for reviewing and verifying all generated content.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 6. No Professional Advice */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">No Professional Advice</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    OmniMeetX is not intended to provide legal, medical, or financial advice.
                                    Any decisions taken based on AI-generated transcriptions are at the user’s own risk,
                                    and OmniMeetX shall not be held liable for any outcomes.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 7. Intellectual Property */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <Scale className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Intellectual Property</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    All intellectual property rights related to the platform remain the exclusive property of OmniMeetX.
                                    Users retain ownership of their content but grant a limited license to process it solely for providing the service.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 8. Payments & Subscriptions */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">Payments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-muted-foreground">
                                    <p>
                                        Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders.
                                    </p>
                                    <p>
                                        Paid plans renew automatically each month or year until you cancel. You can cancel at any time from Manage subscription,
                                        and your plan runs until the end of the period you paid for.
                                    </p>
                                    <p>
                                        You can ask for a full refund within 14 days of a payment. See our{" "}
                                        <Link href="/refund-policy" className="text-brand-light underline underline-offset-4">Refund Policy</Link>.
                                        OmniMeetX reserves the right to modify pricing with reasonable notice.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 9. Service Availability */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Service Availability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    While we aim for continuous service, uninterrupted access is not guaranteed.
                                    Temporary interruptions may occur due to maintenance or technical issues beyond our control.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 10. Termination */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <Ban className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">Termination</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    OmniMeetX reserves the right to suspend or terminate accounts if Terms are violated or misuse
                                    is detected. Users may stop using the service at any time.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 11. Limitation of Liability */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <Hammer className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Liability Limitation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    OmniMeetX shall not be liable for any indirect, incidental, or consequential damages,
                                    including loss of data or profits, arising from the use of the service.
                                </p>
                            </CardContent>
                        </Card>

                        {/* 12. Indemnification */}
                        <Card className="glass-card smooth-transition scale-hover">
                            <CardHeader className="flex flex-row items-center space-x-4">
                                <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                                    <Gavel className="w-5 h-5 text-accent" />
                                </div>
                                <CardTitle className="text-xl">Indemnification</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    You agree to indemnify and hold harmless OmniMeetX from any claims or legal expenses
                                    arising out of your use of the service or violation of these Terms.
                                </p>
                            </CardContent>
                        </Card>

                    </div>

                    {/* Governing Law & Contact */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <Card className="glass-card border-l-4 border-l-primary">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-primary" />
                                    Governing Law
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground italic">
                                    These Terms and Conditions are governed by the laws of Pakistan.
                                    Any disputes shall be subject to the jurisdiction of the applicable courts.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-l-4 border-l-accent">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-accent" />
                                    Contact Us
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Questions regarding these Terms? Send us a message through our{" "}
                                    <Link href="/contact" className="text-brand-light underline underline-offset-4">contact page</Link>.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </section>

        </div>
    )
}
