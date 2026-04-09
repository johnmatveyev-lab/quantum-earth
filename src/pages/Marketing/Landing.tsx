import { motion } from "framer-motion";
import { ArrowRight, Globe, Shield, Zap, Database, Activity } from "lucide-react";
import { Link } from "react-router-dom";

export default function MarketingLanding() {
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Dynamic Background Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
                />
            </div>

            <div className="relative z-10">
                {/* Navigation */}
                <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Globe className="w-6 h-6 text-primary" />
                        <span className="font-display text-xl tracking-widest text-primary glow-text">ORBITAL COMMAND</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/auth" className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
                            LOGIN
                        </Link>
                        <Link
                            to="/app"
                            className="px-4 py-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded-sm font-display text-xs tracking-widest transition-all glow-box"
                        >
                            LAUNCH CONSOLE
                        </Link>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="container mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono mb-8">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            SYSTEM ONLINE // v1.0 OMNI-TRACKER
                        </div>

                        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-6">
                            Global Aerospace <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                                Intelligence Platform
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body">
                            Real-time multi-domain tracking. Monitor commercial aviation, active satellites, and orbital launches in a single, unified 3D holographic interface.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                to="/app"
                                className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-display text-[11px] tracking-widest rounded-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group"
                            >
                                ACCESS SECURE TERMINAL
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/subscription"
                                className="w-full sm:w-auto px-8 py-4 bg-background/50 backdrop-blur-sm border border-border text-foreground font-display text-[11px] tracking-widest rounded-sm hover:bg-muted/50 transition-all"
                            >
                                VIEW DATALINK TIERS
                            </Link>
                        </div>
                    </motion.div>
                </section>

                {/* Features Grid */}
                <section className="container mx-auto px-6 py-24 border-t border-border/50">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-display tracking-widest mb-4">TACTICAL CAPABILITIES</h2>
                        <p className="text-muted-foreground font-mono text-sm max-w-2xl mx-auto">Omni-directional sensors integrated directly into your command center.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Globe className="w-6 h-6 text-primary" />}
                            title="Global Trajectory Map"
                            description="Full 3D WebGL rendering of Earth with real-time flight trails, orbital paths, and day/night cycle overlays."
                        />
                        <FeatureCard
                            icon={<Activity className="w-6 h-6 text-primary" />}
                            title="Advanced Analytics"
                            description="Deep intelligence reporting with PDF exports, 24-hour activity trend charts, and geographic distribution analysis."
                        />
                        <FeatureCard
                            icon={<Database className="w-6 h-6 text-primary" />}
                            title="Custom Data Ingestion"
                            description="Upload your own intelligent overlays with KML/KMZ support, or bring your own Two-Line Element sets for custom tracking."
                        />
                        <FeatureCard
                            icon={<Zap className="w-6 h-6 text-primary" />}
                            title="Developer API & Webhooks"
                            description="Build on top of our intelligence network with structured REST endpoints. Push alerts to Discord, Slack, and generic webhooks."
                        />
                        <FeatureCard
                            icon={<Shield className="w-6 h-6 text-primary" />}
                            title="Team Workspaces"
                            description="Invite members with granular Role-Based Access Control (RBAC). Comprehensive audit logging for all compliance environments."
                        />
                        <FeatureCard
                            icon={<Globe className="w-6 h-6 text-primary" />}
                            title="Dynamic Dashboarding"
                            description="Drag and drop fully customized intelligence dashboards. Save layouts and share them across your organization."
                        />
                    </div>
                </section>

                {/* Call to action */}
                <section className="container mx-auto px-6 py-32 mb-12">
                    <div className="relative glass-panel hud-border p-12 text-center rounded-2xl overflow-hidden">
                        <div className="absolute inset-0 bg-primary/5 z-0" />
                        <div className="relative z-10">
                            <h2 className="text-4xl font-display tracking-widest mb-6">INITIATE UPLINK</h2>
                            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                                Join aerospace professionals, researchers, and enthusiasts leveraging the most advanced spatial tracking platform available to the public.
                            </p>
                            <Link
                                to="/app"
                                className="inline-flex px-8 py-4 bg-primary text-primary-foreground font-display text-[11px] tracking-widest rounded-sm hover:bg-primary/90 transition-all items-center gap-2 shadow-[0_0_20px_rgba(var(--primary),0.4)]"
                            >
                                START FREE TRIAL
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-border/50 bg-background/80 backdrop-blur-md py-12">
                    <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2 opacity-50">
                            <Globe className="w-5 h-5 text-foreground" />
                            <span className="font-display text-sm tracking-widest text-foreground">ORBITAL COMMAND</span>
                        </div>
                        <div className="text-sm font-mono text-muted-foreground">
                            &copy; {new Date().getFullYear()} Orbital Command Systems. All systems nominal.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="glass-panel hud-border p-8 rounded-xl hover:bg-white/5 transition-colors group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
            <div className="mb-6 inline-flex p-3 rounded-lg bg-primary/10 border border-primary/20">
                {icon}
            </div>
            <h3 className="text-xl font-display tracking-wide mb-3">{title}</h3>
            <p className="text-muted-foreground font-body leading-relaxed">
                {description}
            </p>
        </div>
    );
}
