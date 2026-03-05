// ── Multiverse Search Providers ──
// Multiple search providers: SearXNG (self-hosted meta), Brave, DuckDuckGo, Google
// SearXNG is preferred: 243 engines, JSON API, no scraping, privacy-focused.

import { addKnowledge } from '../database';
import type { WebSearchResult } from '../types';

export interface ISearchProvider {
    name: string;
    search(query: string): Promise<WebSearchResult[]>;
}

// ---------------------------------------------------------------------------
// 1. SearXNG Provider (self-hosted meta-search, always try first)
//    Aggregates 243 search engines. JSON API. No API key needed.
//    User can run via: docker run -p 8888:8080 searxng/searxng 
// ---------------------------------------------------------------------------
export class SearXNGSearchProvider implements ISearchProvider {
    name = 'SearXNG';
    private host: string;

    constructor(host = 'http://localhost:8888') {
        this.host = host;
    }

    async search(query: string): Promise<WebSearchResult[]> {
        try {
            const url = `${this.host}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`SearXNG error: ${response.status}`);

            const data = await response.json();
            return (data.results || []).slice(0, 8).map((r: any) => ({
                title: r.title || '',
                url: r.url || '',
                snippet: r.content || '',
                source: 'searxng',
            }));
        } catch (error) {
            console.warn('[SearXNG] Not available:', error);
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// 2. Brave Search API (2000 free queries/month, no CC required)
// ---------------------------------------------------------------------------
export class BraveSearchProvider implements ISearchProvider {
    name = 'Brave Search';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async search(query: string): Promise<WebSearchResult[]> {
        if (!this.apiKey) return [];

        try {
            const response = await fetch(
                `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`,
                {
                    headers: { 'X-Subscription-Token': this.apiKey },
                }
            );
            if (!response.ok) throw new Error(`Brave error: ${response.status}`);

            const data = await response.json();
            return (data.web?.results || []).slice(0, 8).map((r: any) => ({
                title: r.title || '',
                url: r.url || '',
                snippet: r.description || '',
                source: 'brave',
            }));
        } catch (error) {
            console.warn('[BraveSearch] Error:', error);
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// 3. Google Custom Search (100 free/day)
// ---------------------------------------------------------------------------
export class GoogleSearchProvider implements ISearchProvider {
    name = 'Google Search';
    private apiKey: string;
    private cseId: string;

    constructor(apiKey: string, cseId: string) {
        this.apiKey = apiKey;
        this.cseId = cseId;
    }

    async search(query: string): Promise<WebSearchResult[]> {
        if (!this.apiKey || !this.cseId) return [];

        try {
            const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(query)}&key=${this.apiKey}&cx=${this.cseId}&num=5`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Google error: ${response.status}`);

            const data = await response.json();
            return (data.items || []).map((item: any) => ({
                title: item.title || '',
                url: item.link || '',
                snippet: item.snippet || '',
                source: 'google',
            }));
        } catch (error) {
            console.warn('[GoogleSearch] Error:', error);
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// 4. DuckDuckGo HTML Scraper (free, no key, but fragile)
// ---------------------------------------------------------------------------
export class DuckDuckGoSearchProvider implements ISearchProvider {
    name = 'DuckDuckGo';

    async search(query: string): Promise<WebSearchResult[]> {
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
                `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
            )}`;

            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`DDG proxy error: ${response.status}`);
            const html = await response.text();

            const results: WebSearchResult[] = [];
            const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
            const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;

            const links = [...html.matchAll(linkRegex)];
            const snippets = [...html.matchAll(snippetRegex)];

            for (let i = 0; i < Math.min(links.length, 5); i++) {
                const rawUrl = links[i][1];
                const decodedUrl = decodeURIComponent(
                    rawUrl.replace(/.*uddg=/, '').replace(/&.*/, '')
                );
                results.push({
                    title: links[i][2].replace(/<[^>]*>/g, ''),
                    url: decodedUrl,
                    snippet: snippets[i]
                        ? snippets[i][1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&')
                        : '',
                    source: 'duckduckgo',
                });
            }

            return results;
        } catch (error) {
            console.warn('[DDG] Scraper failed:', error);
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// Cascading Search: tries providers in order, returns first success
// ---------------------------------------------------------------------------
export class CascadingSearchProvider implements ISearchProvider {
    name = 'Cascading Search';
    private providers: ISearchProvider[];

    constructor(providers: ISearchProvider[]) {
        this.providers = providers;
    }

    async search(query: string): Promise<WebSearchResult[]> {
        for (const provider of this.providers) {
            try {
                const results = await provider.search(query);
                if (results.length > 0) {
                    console.log(`[Search] ${provider.name} returned ${results.length} results`);
                    return results;
                }
            } catch (error) {
                console.warn(`[Search] ${provider.name} failed, trying next...`);
            }
        }
        return [];
    }
}

// ---------------------------------------------------------------------------
// Scrape & Ingest: fetch full page content and add to knowledge base
// ---------------------------------------------------------------------------
export async function scrapeAndIngest(url: string): Promise<string> {
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

        const html = await res.text();

        // Strip HTML to plain text
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Remove script, style, nav elements
        doc.querySelectorAll('script, style, nav, footer, header, aside').forEach(el => el.remove());

        const text = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
        const title = doc.querySelector('title')?.textContent?.trim() || url;

        if (text.length > 100) {
            // Truncate to reasonable size
            const content = text.slice(0, 4000);

            await addKnowledge({
                title,
                content,
                sourceUrl: url,
                sourceType: 'page',
                tags: extractTags(content),
                trustScore: 0.6,
            });

            return content;
        }

        return text;
    } catch (error) {
        console.warn('[Scrape] Failed:', error);
        return '';
    }
}

// Simple tag extraction from content
function extractTags(text: string): string[] {
    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4);
    const freq: Record<string, number> = {};
    for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
    }
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
}

// ---------------------------------------------------------------------------
// Default search provider factory
// ---------------------------------------------------------------------------
export function createDefaultSearchProvider(): CascadingSearchProvider {
    const searxngHost = localStorage.getItem('mv_searxng_host') || 'http://localhost:8888';
    const braveKey = localStorage.getItem('mv_brave_api_key') || '';
    const googleKey = localStorage.getItem('mv_google_search_key') || '';
    const googleCseId = localStorage.getItem('mv_google_cse_id') || '';

    const providers: ISearchProvider[] = [
        new SearXNGSearchProvider(searxngHost),
    ];

    if (braveKey) providers.push(new BraveSearchProvider(braveKey));
    if (googleKey && googleCseId) providers.push(new GoogleSearchProvider(googleKey, googleCseId));

    // Always include DDG as last resort
    providers.push(new DuckDuckGoSearchProvider());

    return new CascadingSearchProvider(providers);
}
