import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, RotateCcw, ChevronDown } from 'lucide-react';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useState } from 'react';

export function AdvancedFilterPanel() {
    const {
        filterPanelOpen, toggleFilterPanel,
        activeFilters, setActiveFilters, clearFilters,
    } = useTrackingStore();

    const [localAltMin, setLocalAltMin] = useState('');
    const [localAltMax, setLocalAltMax] = useState('');
    const [localSpeedMin, setLocalSpeedMin] = useState('');
    const [localSpeedMax, setLocalSpeedMax] = useState('');
    const [localCallsign, setLocalCallsign] = useState('');
    const [localCountry, setLocalCountry] = useState('');

    const applyFilters = () => {
        setActiveFilters({
            altitudeMin: localAltMin ? parseFloat(localAltMin) : undefined,
            altitudeMax: localAltMax ? parseFloat(localAltMax) : undefined,
            speedMin: localSpeedMin ? parseFloat(localSpeedMin) : undefined,
            speedMax: localSpeedMax ? parseFloat(localSpeedMax) : undefined,
            callsignPattern: localCallsign || undefined,
            country: localCountry || undefined,
        });
    };

    const handleClear = () => {
        clearFilters();
        setLocalAltMin('');
        setLocalAltMax('');
        setLocalSpeedMin('');
        setLocalSpeedMax('');
        setLocalCallsign('');
        setLocalCountry('');
    };

    const typeToggles: { key: 'aircraft' | 'satellite' | 'rocket'; label: string; color: string }[] = [
        { key: 'aircraft', label: 'AIR', color: 'text-primary' },
        { key: 'satellite', label: 'SAT', color: 'text-accent' },
        { key: 'rocket', label: 'RKT', color: 'text-glow-warning' },
    ];

    const toggleType = (t: 'aircraft' | 'satellite' | 'rocket') => {
        const current = activeFilters.types || [];
        const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
        setActiveFilters({ types: next });
    };

    const hasFilters = activeFilters.altitudeMin !== undefined ||
        activeFilters.altitudeMax !== undefined ||
        activeFilters.speedMin !== undefined ||
        activeFilters.speedMax !== undefined ||
        activeFilters.callsignPattern ||
        activeFilters.country ||
        (activeFilters.types && activeFilters.types.length > 0);

    return (
        <AnimatePresence>
            {filterPanelOpen && (
                <motion.div
                    initial={{ x: 80, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 80, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-16 right-3 z-30 glass-panel hud-border rounded-xl w-72 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                        <div className="flex items-center gap-2">
                            <Filter size={12} className="text-primary" />
                            <span className="font-display text-[9px] tracking-[0.25em] text-primary">ADVANCED FILTERS</span>
                            {hasFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <button onClick={toggleFilterPanel} className="text-muted-foreground hover:text-foreground">
                            <X size={14} />
                        </button>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto max-h-[60vh] scrollbar-thin">
                        {/* Type filters */}
                        <FilterSection title="TYPE">
                            <div className="flex gap-1">
                                {typeToggles.map(t => (
                                    <button
                                        key={t.key}
                                        onClick={() => toggleType(t.key)}
                                        className={`flex-1 py-1.5 rounded-md text-[8px] font-mono tracking-wider transition-all ${activeFilters.types?.includes(t.key)
                                                ? `${t.color} bg-primary/10 border border-primary/25`
                                                : 'text-muted-foreground hover:text-foreground border border-transparent'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </FilterSection>

                        {/* Altitude */}
                        <FilterSection title="ALTITUDE (KM)">
                            <div className="flex gap-2">
                                <input
                                    type="number" placeholder="Min" value={localAltMin}
                                    onChange={(e) => setLocalAltMin(e.target.value)}
                                    onBlur={applyFilters}
                                    className="flex-1 bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                                <span className="text-muted-foreground text-[9px] self-center">—</span>
                                <input
                                    type="number" placeholder="Max" value={localAltMax}
                                    onChange={(e) => setLocalAltMax(e.target.value)}
                                    onBlur={applyFilters}
                                    className="flex-1 bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </FilterSection>

                        {/* Speed */}
                        <FilterSection title="SPEED (KM/H)">
                            <div className="flex gap-2">
                                <input
                                    type="number" placeholder="Min" value={localSpeedMin}
                                    onChange={(e) => setLocalSpeedMin(e.target.value)}
                                    onBlur={applyFilters}
                                    className="flex-1 bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                                <span className="text-muted-foreground text-[9px] self-center">—</span>
                                <input
                                    type="number" placeholder="Max" value={localSpeedMax}
                                    onChange={(e) => setLocalSpeedMax(e.target.value)}
                                    onBlur={applyFilters}
                                    className="flex-1 bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                                />
                            </div>
                        </FilterSection>

                        {/* Callsign */}
                        <FilterSection title="CALLSIGN">
                            <input
                                type="text" placeholder="e.g. UAL* or RYR123" value={localCallsign}
                                onChange={(e) => setLocalCallsign(e.target.value)}
                                onBlur={applyFilters}
                                className="w-full bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                            />
                        </FilterSection>

                        {/* Country */}
                        <FilterSection title="COUNTRY / ORIGIN">
                            <input
                                type="text" placeholder="e.g. US, RU, CN" value={localCountry}
                                onChange={(e) => setLocalCountry(e.target.value)}
                                onBlur={applyFilters}
                                className="w-full bg-muted/20 border border-border rounded px-2 py-1.5 text-[10px] font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                            />
                        </FilterSection>
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-border flex gap-2">
                        <button
                            onClick={handleClear}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-muted/20 text-muted-foreground text-[9px] font-mono tracking-wider hover:bg-muted/30 transition-colors"
                        >
                            <RotateCcw size={9} />
                            CLEAR
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-primary/15 text-primary text-[9px] font-mono tracking-wider hover:bg-primary/25 transition-colors"
                        >
                            APPLY
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full mb-1.5">
                <span className="font-mono text-[8px] text-muted-foreground tracking-wider">{title}</span>
                <ChevronDown size={10} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && children}
        </div>
    );
}
