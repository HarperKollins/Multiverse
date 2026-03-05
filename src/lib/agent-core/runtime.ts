// ── Jupiter Agent Runtime ──
// Implements the Intelligence Gradient:
// 1. Local Knowledge (TF-IDF) → 2. Mesh Query → 3. Web Search → 4. LLM Generation

import type { ILLMProvider } from './llm-provider';
import { WebLLMProvider, OllamaProvider, APIProvider } from './llm-provider';
import { createDefaultSearchProvider, scrapeAndIngest } from './search-provider';
import type { CascadingSearchProvider } from './search-provider';
import { searchKnowledge, generateAgentResponse } from '../knowledge';
import type { WebSearchResult } from '../types';

interface RuntimeConfig {
    providerType: 'webgpu' | 'ollama' | 'api';
    modelName?: string;
    apiKey?: string;
    ollamaHost?: string;
}

interface AskResult {
    response: string;
    source: 'local' | 'web' | 'llm' | 'fallback';
    webResults?: WebSearchResult[];
}

class AgentRuntime {
    private provider: ILLMProvider | null = null;
    private searchProvider: CascadingSearchProvider;

    constructor() {
        this.searchProvider = createDefaultSearchProvider();
    }

    async setProvider(config: RuntimeConfig, onProgress?: (text: string) => void): Promise<void> {
        switch (config.providerType) {
            case 'webgpu':
                this.provider = new WebLLMProvider(config.modelName || 'gemma-2b-it-q4f16_1-MLC');
                break;
            case 'ollama':
                this.provider = new OllamaProvider(
                    config.modelName || 'llama3',
                    config.ollamaHost || 'http://localhost:11434'
                );
                break;
            case 'api':
                this.provider = new APIProvider(config.apiKey || '');
                break;
        }

        try {
            await this.provider?.initialize(onProgress);
        } catch (error: any) {
            if (onProgress) onProgress(`Provider init failed: ${error.message}`);
            console.error('[Runtime] Provider initialization failed:', error);
        }
    }

    isReady(): boolean {
        return this.provider !== null;
    }

    async ask(
        query: string,
        onUpdate?: (text: string) => void
    ): Promise<AskResult> {
        // ── Tier 1: Local Knowledge (TF-IDF) ──
        const knowledgeResults = searchKnowledge(query);

        if (knowledgeResults.length > 0 && knowledgeResults[0].score > 0.25) {
            const localResult = generateAgentResponse(query);
            if (localResult.response && localResult.response.length > 50) {
                if (onUpdate) onUpdate(localResult.response);
                return { response: localResult.response, source: 'local' };
            }
        }

        // ── Tier 2: Web Search ──
        let webResults: WebSearchResult[] = [];
        let webContext = '';
        try {
            if (onUpdate) onUpdate('Searching the web...');
            webResults = await this.searchProvider.search(query);

            if (webResults.length > 0) {
                webContext = webResults
                    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`)
                    .join('\n\n');

                // Try to scrape top result for deeper context
                try {
                    const scraped = await scrapeAndIngest(webResults[0].url);
                    if (scraped) {
                        webContext = scraped.slice(0, 2000) + '\n\n---\n\n' + webContext;
                    }
                } catch {
                    // Scraping is best-effort
                }
            }
        } catch (error) {
            console.warn('[Runtime] Web search failed:', error);
        }

        // ── Tier 3: LLM Generation ──
        if (this.provider) {
            try {
                const context = [
                    knowledgeResults.length > 0
                        ? `Local knowledge:\n${knowledgeResults.map(r => `- ${r.entry.title}: ${r.entry.content.slice(0, 200)}`).join('\n')}`
                        : '',
                    webContext ? `Web search results:\n${webContext}` : '',
                ].filter(Boolean).join('\n\n');

                const response = await this.provider.generate({
                    prompt: query,
                    context: context || undefined,
                    onUpdate,
                });

                return {
                    response,
                    source: webContext ? 'web' : 'llm',
                    webResults: webResults.length > 0 ? webResults : undefined,
                };
            } catch (error: any) {
                console.error('[Runtime] LLM generation failed:', error);
            }
        }

        // ── Tier 4: Fallback ──
        if (webResults.length > 0) {
            const fallbackResponse = `Here's what I found from the web:\n\n${webResults.slice(0, 3).map((r, i) =>
                `**${i + 1}. ${r.title}**\n${r.snippet}\n🔗 ${r.url}`
            ).join('\n\n')}\n\n_Note: No LLM is connected. Connect Ollama or enable WebGPU in Settings for intelligent responses._`;
            if (onUpdate) onUpdate(fallbackResponse);
            return { response: fallbackResponse, source: 'web', webResults };
        }

        if (knowledgeResults.length > 0) {
            const localFallback = generateAgentResponse(query);
            if (onUpdate) onUpdate(localFallback.response);
            return { response: localFallback.response, source: 'local' };
        }

        const noProviderMsg = 'No LLM provider connected and no relevant results found. Open Settings (⚙️) to connect Ollama, WebGPU, or an API provider.';
        if (onUpdate) onUpdate(noProviderMsg);
        return { response: noProviderMsg, source: 'fallback' };
    }

    refreshSearch(): void {
        this.searchProvider = createDefaultSearchProvider();
    }

    getProviderName(): string {
        return this.provider?.name || 'None';
    }

    isProviderLoaded(): boolean {
        return this.provider?.isLoaded || false;
    }
}

// Singleton
export const runtime = new AgentRuntime();
