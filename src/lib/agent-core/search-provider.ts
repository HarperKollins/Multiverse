import { addKnowledge } from '../database';

export interface SearchResultItem {
    title: string;
    snippet: string;
    url: string;
}

export interface ISearchProvider {
    search(query: string, maxResults?: number): Promise<SearchResultItem[]>;
}

// ---------------------------------------------------------------------------
// 1. Google Custom Search Provider
// ---------------------------------------------------------------------------
export class GoogleSearchProvider implements ISearchProvider {
    private apiKey: string;
    private searchEngineId: string;

    constructor(apiKey: string, searchEngineId: string) {
        this.apiKey = apiKey;
        this.searchEngineId = searchEngineId;
    }

    async search(query: string, maxResults = 3): Promise<SearchResultItem[]> {
        if (!this.apiKey || !this.searchEngineId) {
            throw new Error('Google Search API Key or Search Engine ID is missing.');
        }

        const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`;

        const response = await fetch(url);
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Google Search API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        if (!data.items) {
            return []; // No results found
        }

        return data.items.map((item: any) => ({
            title: item.title,
            snippet: item.snippet,
            url: item.link
        }));
    }
}

// ---------------------------------------------------------------------------
// 2. DuckDuckGo Search Provider (Free HTML Scraper via CORS proxy)
// ---------------------------------------------------------------------------
export class DuckDuckGoSearchProvider implements ISearchProvider {
    async search(query: string, maxResults = 3): Promise<SearchResultItem[]> {
        // We use allorigins as a free public CORS proxy since browser fetch blocks direct DDG HTML access
        const targetUrl = encodeURIComponent(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
        const proxyUrl = `https://api.allorigins.win/get?url=${targetUrl}`;

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Proxy fetch failed');

            const data = await response.json();
            const html = data.contents;
            if (!html) return [];

            // Naive Regex HTML parsing since we can't reliably DOMParse without throwing errors on some payloads
            // DuckDuckGo HTML has <a class="result__url" href="..."> and <a class="result__snippet" ...>
            const results: SearchResultItem[] = [];
            const resultBlocks = html.split('class="result__body"');

            for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
                const block = resultBlocks[i];

                // Extract URL
                const urlMatch = block.match(/href="([^"]+)"/);
                const url = urlMatch ? urlMatch[1] : '';

                // Extract Title
                const titleMatch = block.match(/<h2 class="result__title">[\s\S]*?<a[^>]*>(.*?)<\/a>/);
                const titleText = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Search Result';

                // Extract Snippet
                const snippetMatch = block.match(/class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
                const snippetText = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';

                if (url && !url.includes('duckduckgo.com')) {
                    // Clean up URL parsing since DDG wraps URLs in /url?q=...
                    let cleanUrl = url;
                    if (cleanUrl.startsWith('//duckduckgo.com/l/?uddg=')) {
                        try {
                            cleanUrl = decodeURIComponent(cleanUrl.split('uddg=')[1].split('&')[0]);
                        } catch (e) { }
                    }

                    results.push({
                        title: titleText,
                        snippet: snippetText,
                        url: cleanUrl
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('DuckDuckGo search error:', error);
            return [];
        }
    }
}

// ---------------------------------------------------------------------------
// HTML Scraper Utility (Fetch -> DOMParser -> Text)
// ---------------------------------------------------------------------------
export async function scrapeAndIngest(item: SearchResultItem): Promise<boolean> {
    try {
        // Basic proxy workaround for CORS if needed, but assuming a Tauri backend / standard fetch can handle it or we use a public proxy for demo
        // For production in Tauri, we would use the Rust backend to fetch avoiding CORS.
        // As an MVP browser app, we fetch directly (might hit CORS depending on target server).

        // Since we are running in browser environment, direct fetch to arbitrary URLs usually fails due to CORS.
        // We will fallback to injecting the snippet if full fetch fails.
        let fullText = item.snippet;

        try {
            // Attempt full fetch (Will likely fail in pure web browser without proxy, but Tauri webviews can sometimes bypass or we build a rust command)
            const res = await fetch(item.url, { mode: 'cors' });
            if (res.ok) {
                const html = await res.text();
                // Extremely naive HTML to text parsing (Removes tags)
                fullText = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .substring(0, 3000); // Limit to 3000 chars to save LLM context
            }
        } catch (e) {
            // CORS or network error, fallback to snippet
            console.warn(`Could not scrape full HTML for ${item.url} (likely CORS). Falling back to snippet.`, e);
        }

        // Ingest into local knowledge DB
        addKnowledge({
            title: item.title,
            content: fullText,
            sourceUrl: item.url,
            sourceType: 'search',
            tags: ['web-search-fallback'],
            trustScore: 0.8 // Search results should have decent baseline trust, but maybe lower than explicit user bookmarks
        });

        return true;
    } catch (e) {
        console.error('Failed to scrape and ingest', e);
        return false;
    }
}
