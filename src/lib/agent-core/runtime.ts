import { ILLMProvider, WebLLMProvider, OllamaProvider, APIProvider } from './llm-provider';
import { searchKnowledge } from '../knowledge';
import { GoogleSearchProvider, DuckDuckGoSearchProvider, scrapeAndIngest } from './search-provider';

export type ProviderType = 'webgpu' | 'ollama' | 'api';

class AgentRuntime {
    private provider: ILLMProvider | null = null;
    private currentProviderType: ProviderType = 'webgpu';

    constructor() {
        // Start uninitialized, wait for UI to pick or default
    }

    async setProvider(type: ProviderType, options: { apiKey?: string; modelName?: string }, onProgress?: (msg: string) => void) {
        this.currentProviderType = type;

        switch (type) {
            case 'webgpu':
                this.provider = new WebLLMProvider(options.modelName || 'gemma-2b-it-q4f16_1-MLC');
                break;
            case 'ollama':
                this.provider = new OllamaProvider(options.modelName || 'llama3');
                break;
            case 'api':
                this.provider = new APIProvider(options.apiKey || '');
                break;
        }

        if (this.provider) {
            await this.provider.initialize(onProgress);
        }
    }

    getProviderName(): string {
        return this.provider?.name || 'Uninitialized';
    }

    getProviderType(): ProviderType {
        return this.currentProviderType;
    }

    isReady(): boolean {
        return this.provider?.isLoaded || false;
    }

    async ask(query: string, onUpdate?: (text: string) => void): Promise<string> {
        if (!this.provider || !this.provider.isLoaded) {
            throw new Error('LLM Provider not initialized or loaded yet.');
        }

        // Step 1: CHECK LOCAL (The Intelligence Gradient)
        const localResults = searchKnowledge(query, 3);
        let context = '';
        let foundEnough = false;

        // Arbitrary threshold for "good enough" local knowledge
        if (localResults.length > 0 && localResults[0].score > 0.5) {
            context = localResults.map(r => `Source: ${r.entry.title}\nContent: ${r.entry.content}`).join('\n\n');
            foundEnough = true;
        }

        // Step 2: ASK MESH (Handled asynchronously by AgentSidebar/PeerManager)

        // Step 3: FALLBACK TO WEB SEARCH
        if (!foundEnough) {
            try {
                const searchType = localStorage.getItem('MV_SEARCH_PROVIDER') || 'duckduckgo';
                let searchProvider = null;

                if (searchType === 'google') {
                    const searchKey = localStorage.getItem('MV_SEARCH_API_KEY');
                    const searchCx = localStorage.getItem('MV_SEARCH_CX');
                    if (searchKey && searchCx) {
                        searchProvider = new GoogleSearchProvider(searchKey, searchCx);
                    }
                } else if (searchType === 'duckduckgo') {
                    searchProvider = new DuckDuckGoSearchProvider();
                }

                if (searchProvider) {
                    if (onUpdate) onUpdate('_Searching the web for answers..._');
                    const webResults = await searchProvider.search(query, 2);

                    if (webResults.length > 0) {
                        if (onUpdate) onUpdate('_Reading webpages and learning..._');
                        for (const res of webResults) {
                            // Scrape and save to local DB permanently
                            await scrapeAndIngest(res);
                            context += `Source: ${res.title}\nContent: ${res.snippet}\n\n`; // Use snippet for quick LLM context
                        }
                    }
                }
            } catch (e) {
                console.warn('Web search fallback failed', e);
            }
        }

        // Step 2 & 3: Run through provider
        return this.provider.generate({
            prompt: query,
            context: context || undefined,
            onUpdate
        });
    }
}

// Singleton for the browser shell to use
export const runtime = new AgentRuntime();
