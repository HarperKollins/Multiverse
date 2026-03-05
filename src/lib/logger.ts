// ── Multiverse Logger & Benchmarks ──
// Structured logging and performance tracking for the dashboard.

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
    id: string;
    level: LogLevel;
    module: string;
    message: string;
    timestamp: number;
    data?: any;
}

interface BenchmarkEntry {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
}

// ── Logger ──

class Logger {
    private logs: LogEntry[] = [];
    private maxLogs = 500;
    private listeners: Array<(entry: LogEntry) => void> = [];

    private addEntry(level: LogLevel, module: string, message: string, data?: any): void {
        const entry: LogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            level,
            module,
            message,
            timestamp: Date.now(),
            data,
        };

        this.logs.push(entry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // Notify listeners 
        for (const listener of this.listeners) {
            listener(entry);
        }

        // Also log to console
        const prefix = `[${module}]`;
        switch (level) {
            case 'DEBUG': console.debug(prefix, message, data || ''); break;
            case 'INFO': console.info(prefix, message, data || ''); break;
            case 'WARN': console.warn(prefix, message, data || ''); break;
            case 'ERROR': console.error(prefix, message, data || ''); break;
        }
    }

    debug(module: string, message: string, data?: any): void {
        this.addEntry('DEBUG', module, message, data);
    }

    info(module: string, message: string, data?: any): void {
        this.addEntry('INFO', module, message, data);
    }

    warn(module: string, message: string, data?: any): void {
        this.addEntry('WARN', module, message, data);
    }

    error(module: string, message: string, data?: any): void {
        this.addEntry('ERROR', module, message, data);
    }

    getLogs(level?: LogLevel, limit = 100): LogEntry[] {
        let filtered = level ? this.logs.filter(l => l.level === level) : this.logs;
        return filtered.slice(-limit);
    }

    subscribe(listener: (entry: LogEntry) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    clear(): void {
        this.logs = [];
    }
}

// ── Benchmarks ──

class Benchmarks {
    private entries: Map<string, BenchmarkEntry> = new Map();
    private timers: Map<string, number> = new Map();

    // Start a timer
    start(name: string): void {
        this.timers.set(name, performance.now());
    }

    // End timer and record measurement
    end(name: string, unit = 'ms'): number {
        const start = this.timers.get(name);
        if (start === undefined) return 0;

        const duration = performance.now() - start;
        this.timers.delete(name);

        this.entries.set(name, {
            name,
            value: Math.round(duration * 100) / 100,
            unit,
            timestamp: Date.now(),
        });

        return duration;
    }

    // Record a direct measurement
    record(name: string, value: number, unit: string): void {
        this.entries.set(name, { name, value, unit, timestamp: Date.now() });
    }

    get(name: string): BenchmarkEntry | undefined {
        return this.entries.get(name);
    }

    getAll(): BenchmarkEntry[] {
        return Array.from(this.entries.values());
    }

    // Get formatted summary
    getSummary(): string {
        return this.getAll()
            .map(e => `${e.name}: ${e.value}${e.unit}`)
            .join('\n');
    }
}

// ── Metrics Collector ──
// Tracks real-time stats for the dashboard

export interface DashboardMetrics {
    knowledgeCount: number;
    peerCount: number;
    onlinePeerCount: number;
    totalTokensUsed: number;
    llmProvider: string;
    llmProviderStatus: 'connected' | 'disconnected' | 'loading';
    inferenceLatency: number;    // ms, last measurement
    memoryUsageMB: number;
    searchSuccessRate: number;   // 0-1
    meshMessagesTotal: number;
    uptime: number;              // seconds since start
}

class MetricsCollector {
    private startTime = Date.now();
    private tokenCount = 0;
    private searchAttempts = 0;
    private searchSuccesses = 0;
    private meshMessageCount = 0;
    private lastInferenceLatency = 0;
    private listeners: Array<() => void> = [];

    addTokens(count: number): void {
        this.tokenCount += count;
        this.notifyListeners();
    }

    recordSearch(success: boolean): void {
        this.searchAttempts++;
        if (success) this.searchSuccesses++;
        this.notifyListeners();
    }

    recordMeshMessage(): void {
        this.meshMessageCount++;
        this.notifyListeners();
    }

    recordInferenceLatency(ms: number): void {
        this.lastInferenceLatency = ms;
        this.notifyListeners();
    }

    getMetrics(): Partial<DashboardMetrics> {
        const memUsage = (performance as any).memory
            ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
            : 0;

        return {
            totalTokensUsed: this.tokenCount,
            inferenceLatency: Math.round(this.lastInferenceLatency),
            memoryUsageMB: memUsage,
            searchSuccessRate: this.searchAttempts > 0
                ? this.searchSuccesses / this.searchAttempts
                : 0,
            meshMessagesTotal: this.meshMessageCount,
            uptime: Math.round((Date.now() - this.startTime) / 1000),
        };
    }

    subscribe(listener: () => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

// Singletons
export const logger = new Logger();
export const benchmarks = new Benchmarks();
export const metrics = new MetricsCollector();
