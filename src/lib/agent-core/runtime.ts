import { ILLMProvider, WebLLMProvider, OllamaProvider, APIProvider } from './llm-provider';
import { searchKnowledge } from '../knowledge';

export type ProviderType = 'webgpu' | 'ollama' | 'api';

class AgentRuntime {
    private provider: ILLMProvider | null = null;
    private currentProviderType: ProviderType = 'webgpu';

    constructor() {
        // Start uninitialized, wait for UI to pick or default
    }

    async setProvider(type: ProviderType, apiKey?: string, onProgress?: (msg: string) => void) {
        this.currentProviderType = type;

        switch (type) {
            case 'webgpu':
                this.provider = new WebLLMProvider();
                break;
            case 'ollama':
                this.provider = new OllamaProvider();
                break;
            case 'api':
                this.provider = new APIProvider(apiKey || '');
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

        if (localResults.length > 0) {
            context = localResults.map(r => `Source: ${r.entry.title}\nContent: ${r.entry.content}`).join('\n\n');
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
