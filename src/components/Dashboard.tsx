import { useState } from "react";
import TopologyView from "./TopologyView";
import "./Dashboard.css";

const tabs = ["Overview", "Topology", "Memory Heap", "Logs"];

interface StatCard {
    label: string;
    sublabel?: string;
    value: string;
    unit?: string;
    change?: string;
    changePositive?: boolean;
    icon?: string;
}

const stats: StatCard[] = [
    {
        label: "ACTIVE NODES",
        value: "842",
        change: "+2.1%",
        changePositive: true,
        icon: "nodes",
    },
    {
        label: "SYSTEM LOAD",
        value: "14%",
        sublabel: "STABLE",
        icon: "load",
    },
    {
        label: "LATENCY",
        value: "12",
        unit: "ms",
        change: "-1ms",
        changePositive: true,
        icon: "latency",
    },
];

// Simulated chart data
const fluxData = [20, 25, 22, 30, 28, 35, 40, 38, 45, 50, 48, 55, 52, 58, 62, 60, 65, 62, 58, 55, 60, 65, 70, 68];
const tokenData = [
    { day: "Mon", values: [60, 45] },
    { day: "Tue", values: [55, 40] },
    { day: "Wed", values: [50, 35] },
    { day: "Thu", values: [65, 50] },
    { day: "Fri", values: [80, 70] },
];

function FluxChart() {
    const max = Math.max(...fluxData);
    const width = 520;
    const height = 140;
    const padding = 20;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = fluxData.map((v, i) => {
        const x = padding + (i / (fluxData.length - 1)) * chartW;
        const y = padding + chartH - (v / max) * chartH;
        return `${x},${y}`;
    });

    const linePath = `M ${points.join(" L ")}`;
    const areaPath = `${linePath} L ${padding + chartW},${padding + chartH} L ${padding},${padding + chartH} Z`;

    const timeLabels = ["00:00", "06:00", "12:00", "18:00", "24:00"];

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="flux-chart">
            <defs>
                <linearGradient id="fluxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((pct) => (
                <line
                    key={pct}
                    x1={padding} y1={padding + chartH * (1 - pct)}
                    x2={padding + chartW} y2={padding + chartH * (1 - pct)}
                    stroke="var(--border-subtle)" strokeWidth="0.5"
                />
            ))}
            {/* Area fill */}
            <path d={areaPath} fill="url(#fluxGradient)" />
            {/* Line */}
            <path d={linePath} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            {/* Glow line */}
            <path d={linePath} fill="none" stroke="var(--accent-primary)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" opacity="0.15" filter="blur(4px)" />
            {/* Time labels */}
            {timeLabels.map((label, i) => (
                <text
                    key={label}
                    x={padding + (i / (timeLabels.length - 1)) * chartW}
                    y={height - 2}
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                >
                    {label}
                </text>
            ))}
        </svg>
    );
}

function TokenChart() {
    const barWidth = 28;
    const gap = 8;
    const groupGap = 36;
    const height = 120;
    const maxVal = 100;

    return (
        <div className="token-chart">
            {tokenData.map((group, gi) => (
                <div key={group.day} className="token-group" style={{ marginRight: gi < tokenData.length - 1 ? groupGap : 0 }}>
                    <div className="token-bars">
                        {group.values.map((val, vi) => (
                            <div
                                key={vi}
                                className={`token-bar ${vi === 0 ? "bar-bg" : "bar-accent"} ${gi === tokenData.length - 1 && vi === 1 ? "bar-highlight" : ""}`}
                                style={{
                                    height: `${(val / maxVal) * height}px`,
                                    width: barWidth,
                                    marginRight: vi === 0 ? gap : 0,
                                    animationDelay: `${gi * 0.1 + vi * 0.05}s`,
                                }}
                            />
                        ))}
                    </div>
                    <span className={`token-label mono ${gi === tokenData.length - 1 ? "label-highlight" : ""}`}>
                        {group.day}
                    </span>
                </div>
            ))}
        </div>
    );
}

function NodesIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" opacity="0.3">
            <circle cx="5" cy="5" r="2" stroke="var(--accent-primary)" strokeWidth="1" />
            <circle cx="13" cy="5" r="2" stroke="var(--accent-primary)" strokeWidth="1" />
            <circle cx="9" cy="13" r="2" stroke="var(--accent-primary)" strokeWidth="1" />
            <line x1="6.5" y1="6.5" x2="8" y2="11.5" stroke="var(--accent-primary)" strokeWidth="0.8" />
            <line x1="11.5" y1="6.5" x2="10" y2="11.5" stroke="var(--accent-primary)" strokeWidth="0.8" />
            <line x1="7" y1="5" x2="11" y2="5" stroke="var(--accent-primary)" strokeWidth="0.8" />
        </svg>
    );
}

function LoadIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" opacity="0.5">
            <circle cx="9" cy="9" r="7" stroke="var(--accent-primary)" strokeWidth="1.5" opacity="0.2" />
            <circle cx="9" cy="9" r="7" stroke="var(--accent-primary)" strokeWidth="1.5" strokeDasharray="11 33" strokeLinecap="round" />
        </svg>
    );
}

function LatencyIcon() {
    return (
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" opacity="0.4">
            {[0, 1, 2, 3, 4].map((i) => (
                <rect
                    key={i}
                    x={i * 4 + 1}
                    y={14 - (i + 1) * 2.5}
                    width="2.5"
                    height={(i + 1) * 2.5}
                    rx="0.5"
                    fill="var(--accent-primary)"
                />
            ))}
        </svg>
    );
}

function getIcon(icon?: string) {
    switch (icon) {
        case "nodes": return <NodesIcon />;
        case "load": return <LoadIcon />;
        case "latency": return <LatencyIcon />;
        default: return null;
    }
}

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("Overview");

    return (
        <div className="dashboard">
            {/* Tabs */}
            <div className="dashboard-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="dashboard-content">
                {activeTab === "Overview" && (
                    <>
                        {/* Stats Row */}
                        <div className="stats-row">
                            {stats.map((stat) => (
                                <div key={stat.label} className="stat-card">
                                    <div className="stat-header">
                                        <span className="stat-label mono">{stat.label}</span>
                                        <span className="stat-icon">{getIcon(stat.icon)}</span>
                                    </div>
                                    <div className="stat-body">
                                        <span className="stat-value">{stat.value}</span>
                                        {stat.unit && <span className="stat-unit">{stat.unit}</span>}
                                        {stat.sublabel && <span className="stat-sublabel mono">{stat.sublabel}</span>}
                                        {stat.change && (
                                            <span className={`stat-change ${stat.changePositive ? "positive" : "negative"}`}>
                                                {stat.change}
                                            </span>
                                        )}
                                    </div>
                                    {stat.label === "SYSTEM LOAD" && (
                                        <div className="stat-progress">
                                            <div className="progress-bar" style={{ width: "14%" }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className="charts-row">
                            <div className="chart-card">
                                <div className="chart-header">
                                    <div>
                                        <span className="chart-title">Neural Flux</span>
                                        <span className="chart-subtitle">I/O Throughput</span>
                                    </div>
                                    <div className="chart-value">
                                        <span className="value-number">94.2</span>
                                        <span className="value-unit">TB</span>
                                    </div>
                                </div>
                                <FluxChart />
                            </div>

                            <div className="chart-card">
                                <div className="chart-header">
                                    <div>
                                        <span className="chart-title">Token Consumption</span>
                                        <span className="chart-subtitle">Burn Rate</span>
                                    </div>
                                    <div className="chart-value">
                                        <span className="value-number">4.2</span>
                                        <span className="value-unit">M</span>
                                    </div>
                                </div>
                                <TokenChart />
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "Topology" && <TopologyView />}

                {activeTab === "Memory Heap" && (
                    <div className="tab-placeholder">
                        <span className="text-muted mono">Memory Heap — Coming in Sprint 4</span>
                    </div>
                )}

                {activeTab === "Logs" && (
                    <div className="tab-placeholder">
                        <span className="text-muted mono">Logs — Coming in Sprint 4</span>
                    </div>
                )}
            </div>
        </div>
    );
}
