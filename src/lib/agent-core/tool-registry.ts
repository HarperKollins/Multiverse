// ── Multiverse Tool Registry ──
// Dynamic tool registration system for Jupiter agent.
// Built-in tools + plugin-registered tools.

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: ToolParameter[];
    execute: (params: Record<string, any>) => Promise<ToolResult>;
    source: 'builtin' | 'plugin';
    pluginName?: string;
}

export interface ToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    default?: any;
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
}

class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    register(tool: ToolDefinition): void {
        if (this.tools.has(tool.name)) {
            console.warn(`[ToolRegistry] Overwriting existing tool: ${tool.name}`);
        }
        this.tools.set(tool.name, tool);
        console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
    }

    unregister(name: string): void {
        this.tools.delete(name);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    getBySource(source: 'builtin' | 'plugin'): ToolDefinition[] {
        return this.getAll().filter(t => t.source === source);
    }

    async execute(name: string, params: Record<string, any>): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return { success: false, error: `Tool "${name}" not found` };
        }

        // Validate required parameters
        for (const param of tool.parameters) {
            if (param.required && !(param.name in params)) {
                return { success: false, error: `Missing required parameter: ${param.name}` };
            }
        }

        try {
            return await tool.execute(params);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Generate tool descriptions for LLM context
    getToolDescriptions(): string {
        return this.getAll()
            .map(t => {
                const params = t.parameters
                    .map(p => `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`)
                    .join('\n');
                return `Tool: ${t.name}\n  ${t.description}\n  Parameters:\n${params}`;
            })
            .join('\n\n');
    }
}

// ── Built-in Tools ──

import { searchKnowledge } from '../knowledge';
import { addKnowledge, getAllKnowledge } from '../database';
import { scrapeAndIngest, createDefaultSearchProvider } from './search-provider';

function registerBuiltinTools(registry: ToolRegistry): void {
    registry.register({
        name: 'search_local',
        description: 'Search the local knowledge base using TF-IDF',
        parameters: [
            { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
        source: 'builtin',
        execute: async (params) => {
            const results = searchKnowledge(params.query);
            return {
                success: true,
                data: results.map(r => ({
                    title: r.entry.title,
                    content: r.entry.content.slice(0, 300),
                    score: r.score,
                    source: r.entry.sourceUrl,
                })),
            };
        },
    });

    registry.register({
        name: 'search_web',
        description: 'Search the web using available search providers (SearXNG, Brave, DuckDuckGo)',
        parameters: [
            { name: 'query', type: 'string', description: 'Web search query', required: true },
        ],
        source: 'builtin',
        execute: async (params) => {
            const provider = createDefaultSearchProvider();
            const results = await provider.search(params.query);
            return { success: true, data: results };
        },
    });

    registry.register({
        name: 'scrape_url',
        description: 'Scrape a web page and add its content to the knowledge base',
        parameters: [
            { name: 'url', type: 'string', description: 'URL to scrape', required: true },
        ],
        source: 'builtin',
        execute: async (params) => {
            const content = await scrapeAndIngest(params.url);
            return {
                success: content.length > 0,
                data: { contentLength: content.length, preview: content.slice(0, 200) },
                error: content.length === 0 ? 'Failed to scrape URL' : undefined,
            };
        },
    });

    registry.register({
        name: 'store_knowledge',
        description: 'Store a new knowledge entry in the local database',
        parameters: [
            { name: 'title', type: 'string', description: 'Title of the knowledge', required: true },
            { name: 'content', type: 'string', description: 'Content to store', required: true },
            { name: 'tags', type: 'string', description: 'Comma-separated tags', required: false },
        ],
        source: 'builtin',
        execute: async (params) => {
            const entry = await addKnowledge({
                title: params.title,
                content: params.content,
                sourceType: 'user',
                tags: params.tags ? params.tags.split(',').map((t: string) => t.trim()) : [],
                trustScore: 1.0,
            });
            return { success: true, data: { id: entry.id } };
        },
    });

    registry.register({
        name: 'knowledge_stats',
        description: 'Get statistics about the local knowledge base',
        parameters: [],
        source: 'builtin',
        execute: async () => {
            const entries = getAllKnowledge();
            const byType: Record<string, number> = {};
            for (const e of entries) {
                byType[e.sourceType] = (byType[e.sourceType] || 0) + 1;
            }
            return {
                success: true,
                data: {
                    totalEntries: entries.length,
                    bySourceType: byType,
                    avgTrustScore: entries.length > 0
                        ? entries.reduce((s, e) => s + e.trustScore, 0) / entries.length
                        : 0,
                },
            };
        },
    });
}

// Singleton
export const toolRegistry = new ToolRegistry();
registerBuiltinTools(toolRegistry);
