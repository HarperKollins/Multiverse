import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { Ollama } from 'ollama/browser';

export interface GenerateOptions {
    prompt: string;
    context?: string;
    onUpdate?: (text: string) => void;
}

export interface ILLMProvider {
    name: string;
    isLoaded: boolean;
    initialize(onProgress?: (text: string) => void): Promise<void>;
    generate(options: GenerateOptions): Promise<string>;
}

// ---------------------------------------------------------------------------
// Tauri Detection Utility
// ---------------------------------------------------------------------------
function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI__' in window;
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<T>(cmd, args);
}

// ---------------------------------------------------------------------------
// 1. WebGPU / WebLLM Provider (Local, in-browser)
// ---------------------------------------------------------------------------
export class WebLLMProvider implements ILLMProvider {
    name = 'WebGPU (Local)';
    isLoaded = false;
    private engine: any = null;
    private modelId: string;

    constructor(modelId: string = 'gemma-2b-it-q4f16_1-MLC') {
        this.modelId = modelId;
    }

    async initialize(onProgress?: (text: string) => void): Promise<void> {
        if (this.isLoaded) return;

        try {
            if (onProgress) onProgress(`Loading ${this.modelId} into VRAM...`);

            this.engine = await CreateMLCEngine(
                this.modelId,
                {
                    initProgressCallback: (progress) => {
                        if (onProgress) onProgress(`Initializing WebLLM: ${progress.text}`);
                    },
                }
            );

            this.isLoaded = true;
            if (onProgress) onProgress('WebLLM Engine ready.');
        } catch (error: any) {
            console.error('Failed to initialize WebLLM:', error);
            if (onProgress) onProgress(`Error: ${error.message}`);
            throw error;
        }
    }

    async generate(options: GenerateOptions): Promise<string> {
        if (!this.isLoaded || !this.engine) throw new Error('WebLLM engine not loaded.');

        const messages = [];
        if (options.context) {
            messages.push({ role: 'system', content: `Context information:\n${options.context}\n\nUse this context to answer the user's question accurately. If the context does not contain the answer, say you don't know based on local knowledge.` });
        }
        messages.push({ role: 'user', content: options.prompt });

        if (options.onUpdate) {
            let fullText = '';
            const chunks = await this.engine.chat.completions.create({
                messages,
                stream: true,
            });

            for await (const chunk of chunks) {
                const delta = chunk.choices[0]?.delta.content || '';
                fullText += delta;
                options.onUpdate(fullText);
            }
            return fullText;
        } else {
            const reply = await this.engine.chat.completions.create({ messages });
            return reply.choices[0].message.content || '';
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Ollama Provider (Local desktop host)
//    Uses Tauri Rust proxy when in Tauri environment to bypass CORS.
//    Falls back to direct browser fetch when running as web app.
// ---------------------------------------------------------------------------
export class OllamaProvider implements ILLMProvider {
    name = 'Ollama (Localhost)';
    isLoaded = true;
    private ollama: Ollama;
    private modelName: string;
    private host: string;
    private useTauriProxy: boolean;

    constructor(modelName: string = 'llama3', host = 'http://localhost:11434') {
        this.modelName = modelName;
        this.host = host;
        this.useTauriProxy = isTauri();
        this.ollama = new Ollama({ host });
    }

    async initialize(onProgress?: (text: string) => void): Promise<void> {
        if (onProgress) onProgress(`Connecting to Ollama at ${this.host}...`);

        try {
            if (this.useTauriProxy) {
                // Use Tauri Rust proxy — no CORS issues
                if (onProgress) onProgress('Using Tauri proxy for Ollama (CORS-free)...');
                const models = await tauriInvoke<string[]>('ollama_list_models', { host: this.host });

                if (!models.some((m: string) => m.includes(this.modelName))) {
                    if (onProgress) onProgress(`Warning: Model "${this.modelName}" not found. Available: ${models.join(', ')}. Run 'ollama pull ${this.modelName}' to download.`);
                } else {
                    if (onProgress) onProgress(`Ollama connected via Tauri proxy. Active model: ${this.modelName}`);
                }
            } else {
                // Direct browser fetch (requires OLLAMA_ORIGINS=* on Ollama side)
                const list = await this.ollama.list();
                if (!list.models.some((m: any) => m.name.includes(this.modelName))) {
                    if (onProgress) onProgress(`Warning: Model ${this.modelName} not found locally. Run 'ollama pull ${this.modelName}'.`);
                } else {
                    if (onProgress) onProgress(`Ollama connected (direct). Active model: ${this.modelName}`);
                }
            }
        } catch (error: any) {
            const msg = this.useTauriProxy
                ? `Failed to connect to Ollama via Tauri proxy. Ensure Ollama is running. Error: ${error.message || error}`
                : 'Failed to connect to Ollama. Ensure the Ollama app is running and OLLAMA_ORIGINS=* is set.';
            console.error(msg, error);
            if (onProgress) onProgress(msg);
            throw new Error(msg);
        }
    }

    async generate(options: GenerateOptions): Promise<string> {
        const messages = [];
        if (options.context) {
            messages.push({ role: 'system', content: `Context information:\n${options.context}` });
        }
        messages.push({ role: 'user', content: options.prompt });

        if (this.useTauriProxy) {
            // Use Tauri Rust backend — completely bypasses CORS
            const response = await tauriInvoke<{ content: string }>('ollama_chat', {
                request: {
                    model: this.modelName,
                    messages,
                    host: this.host,
                },
            });

            if (options.onUpdate) {
                options.onUpdate(response.content);
            }
            return response.content;
        }

        // Direct browser fallback
        if (options.onUpdate) {
            const response = await this.ollama.chat({
                model: this.modelName,
                messages,
                stream: true,
            });
            let fullText = '';
            for await (const part of response) {
                fullText += part.message.content;
                options.onUpdate(fullText);
            }
            return fullText;
        } else {
            const response = await this.ollama.chat({
                model: this.modelName,
                messages,
                stream: false,
            });
            return response.message.content;
        }
    }
}

// ---------------------------------------------------------------------------
// 3. API Provider (Remote fallback)
// ---------------------------------------------------------------------------
export class APIProvider implements ILLMProvider {
    name = 'OpenAI API';
    isLoaded = true;
    private apiKey: string;
    private model = 'gpt-4o-mini';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async initialize(onProgress?: (text: string) => void): Promise<void> {
        if (!this.apiKey && onProgress) {
            onProgress('Waiting for API Key configuration...');
        } else if (onProgress) {
            onProgress('API Provider configured.');
        }
    }

    async generate(options: GenerateOptions): Promise<string> {
        if (!this.apiKey) {
            throw new Error('API Key missing for remote provider.');
        }

        const messages = [];
        if (options.context) {
            messages.push({ role: 'system', content: `Context information:\n${options.context}` });
        }
        messages.push({ role: 'user', content: options.prompt });

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                stream: !!options.onUpdate
            })
        });

        if (!res.ok) {
            throw new Error(`API Error: ${res.statusText}`);
        }

        if (options.onUpdate) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = '';
            while (reader) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    if (line.includes('[DONE]')) break;
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices[0]?.delta?.content) {
                                fullText += data.choices[0].delta.content;
                                options.onUpdate(fullText);
                            }
                        } catch (e) { }
                    }
                }
            }
            return fullText;
        } else {
            const data = await res.json();
            return data.choices[0].message.content;
        }
    }
}
