// ── Multiverse Knowledge Manager ──
// Keyword-based search with TF-IDF scoring (no GPU needed)

import type { KnowledgeEntry, SearchResult } from './types';
import { getAllKnowledge, updateKnowledgeAccess } from './database';

/** Tokenize text into lowercase words */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
}

/** Calculate term frequency for a document */
function termFrequency(term: string, tokens: string[]): number {
    const count = tokens.filter((t) => t === term).length;
    return count / tokens.length;
}

/** Calculate inverse document frequency across all entries */
function inverseDocFrequency(term: string, allTokenSets: string[][]): number {
    const docsWithTerm = allTokenSets.filter((tokens) =>
        tokens.includes(term)
    ).length;
    if (docsWithTerm === 0) return 0;
    return Math.log(allTokenSets.length / docsWithTerm);
}

/** Search knowledge entries by query string */
export function searchKnowledge(query: string, maxResults = 5): SearchResult[] {
    const entries = getAllKnowledge();
    if (entries.length === 0 || !query.trim()) return [];

    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    // Pre-tokenize all entries
    const entryTokenSets = entries.map((entry) =>
        tokenize(`${entry.title} ${entry.content} ${entry.tags.join(' ')}`)
    );

    // Score each entry
    const scored: SearchResult[] = entries
        .map((entry, idx) => {
            const tokens = entryTokenSets[idx];
            let score = 0;
            const matchedTerms: string[] = [];

            for (const queryTerm of queryTokens) {
                const tf = termFrequency(queryTerm, tokens);
                const idf = inverseDocFrequency(queryTerm, entryTokenSets);
                const tfidf = tf * idf;

                if (tfidf > 0) {
                    score += tfidf;
                    matchedTerms.push(queryTerm);
                }

                // Bonus for title match
                if (entry.title.toLowerCase().includes(queryTerm)) {
                    score += 0.5;
                }

                // Bonus for tag match
                if (entry.tags.some((t) => t.toLowerCase().includes(queryTerm))) {
                    score += 0.3;
                }
            }

            // Trust weighting
            score *= entry.trustScore;

            // Recency bonus (slight boost for newer entries)
            const ageHours = (Date.now() - entry.createdAt) / (1000 * 60 * 60);
            score *= 1 + Math.max(0, 1 - ageHours / (24 * 30)); // Decay over 30 days

            return { entry, score, matchedTerms };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

    // Mark accessed
    for (const result of scored) {
        updateKnowledgeAccess(result.entry.id);
    }

    return scored;
}

/** Generate agent response based on knowledge search */
export function generateAgentResponse(
    query: string
): { response: string; results: SearchResult[] } {
    const results = searchKnowledge(query);

    if (results.length === 0) {
        return {
            response: `I don't have any local knowledge about "${query}" yet. As you browse and index pages, I'll learn and be able to help with similar queries. For now, you could try searching the web.`,
            results: [],
        };
    }

    const topResult = results[0];
    const otherCount = results.length - 1;

    let response = `Based on my local knowledge, here's what I found:\n\n`;
    response += `**${topResult.entry.title}**\n`;
    response += topResult.entry.content;

    if (otherCount > 0) {
        response += `\n\n_Found ${otherCount} more related ${otherCount === 1 ? 'entry' : 'entries'} in your knowledge graph._`;
    }

    if (topResult.entry.sourceUrl) {
        response += `\n\n📎 Source: ${topResult.entry.sourceUrl}`;
    }

    return { response, results };
}

/** Get knowledge stats for the dashboard */
export function getKnowledgeStats() {
    const entries = getAllKnowledge();
    const uniqueSources = new Set(entries.map((e) => e.sourceUrl).filter(Boolean));
    const avgTrust =
        entries.length > 0
            ? entries.reduce((sum, e) => sum + e.trustScore, 0) / entries.length
            : 0;

    return {
        totalEntries: entries.length,
        uniqueSources: uniqueSources.size,
        avgTrustScore: Math.round(avgTrust * 100) / 100,
        recentEntries: entries.slice(0, 5),
    };
}
