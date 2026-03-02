import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { Ollama } from 'ollama/browser'; // use the browser-compatible entry

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
// 1. WebGPU / WebLLM Provider (Local, in-browser)
// ---------------------------------------------------------------------------
export class WebLLMProvider implements ILLMProvider {
    name = 'WebGPU (Local)';
    isLoaded = false;
    private engine: any = null;
    // Default model to use (small enough for most dedicated/integrated GPUs)
    private modelId = 'Llama-3-8B-Instruct-q4f16_1-MLC';

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
            // Streaming response
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
            // Static response
            const reply = await this.engine.chat.completions.create({ messages });
            return reply.choices[0].message.content || '';
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Ollama Provider (Local desktop host)
// ---------------------------------------------------------------------------
export class OllamaProvider implements ILLMProvider {
    name = 'Ollama (Localhost)';
    isLoaded = true; // Doesn't need massive client-side loading
    private ollama: Ollama;
    private modelName = 'llama3'; // Configurable later

    constructor(host = 'http://localhost:11434') {
        this.ollama = new Ollama({ host });
    }

    async initialize(onProgress?: (text: string) => void): Promise<void> {
        if (onProgress) onProgress(`Connecting to Ollama at http://localhost:11434...`);
        try {
            // Just verifying model exists
            const list = await this.ollama.list();
            if (!list.models.some((m: any) => m.name.includes(this.modelName))) {
                if (onProgress) onProgress(`Warning: Model ${this.modelName} not found locally. You may need to run 'ollama run ${this.modelName}'`);
            } else {
                if (onProgress) onProgress(`Ollama connected. Active model: ${this.modelName}`);
            }
        } catch (error) {
            const msg = 'Failed to connect to Ollama. Ensure the Ollama app is running locally.';
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
            // Streaming not fully implemented for API side perfectly in this snippet to save complexity,
            // standard HTTP stream chunking for now:
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
