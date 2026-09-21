import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Product, RagSearchResponse } from '../types';
import { safeLower, safeJsonStringify, formatCurrency } from '../utils/helpers';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { SEO } from '../components/SEO';

const QUICK_FILTERS = [
    { label: '🔥 All Collections', query: '' },
    { label: '👶 Baby Clothing', query: 'baby' },
    { label: '👦 Boy Clothing', query: 'boy' },
    { label: '🎁 Gifts', query: 'gift' },
    { label: '💖 Girlfriend Gifts', query: 'girlfriend' },
    { label: '💙 Boyfriend Gifts', query: 'boyfriend' },
    { label: '👗 Women Fashion', query: 'women' },
    { label: '👑 Luxury & Party', query: 'party' },
];

export const Search = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { products, isLoading: areProductsLoading } = useStore();
    
    const [ragData, setRagData] = useState<RagSearchResponse | null>(null);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragError, setRagError] = useState('');
    const [sortBy, setSortBy] = useState<'relevance' | 'price-asc' | 'price-desc' | 'newest'>('relevance');

    const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);

    // 1. INSTANT LOCAL RETRIEVAL (0ms Delay - foran show ho jaye)
    const localMatches = useMemo(() => {
        const rawQuery = query.trim();
        if (!rawQuery || products.length === 0) return [];

        const lowerQuery = safeLower(rawQuery);
        const tokens = lowerQuery.split(/\s+/).filter(t => t.length > 0);

        return products
            .filter(p => p.isVisible)
            .map(product => {
                let score = 0;
                let reason = '';

                const customId = safeLower(product.customId || '');
                const id = safeLower(product.id);
                const name = safeLower(product.name);
                const category = safeLower(product.category);
                const description = safeLower(product.description || '');

                // Exact ID match
                if (customId === lowerQuery || id === lowerQuery) {
                    score += 5000;
                    reason = 'Exact Product ID';
                } else if (customId.includes(lowerQuery) || id.includes(lowerQuery)) {
                    score += 2500;
                    reason = 'Product ID Match';
                }

                // Exact full title match
                if (name === lowerQuery) {
                    score += 3000;
                    reason = 'Exact Title Match';
                } else if (name.includes(lowerQuery)) {
                    score += 1500;
                    reason = 'Direct Title Match';
                }

                // Multi-token keyword matching
                tokens.forEach(token => {
                    if (token.length < 2) return;
                    if (name.includes(token)) {
                        score += 400;
                        if (!reason) reason = 'Title Keyword';
                    }
                    if (category.includes(token)) {
                        score += 500;
                        if (!reason) reason = 'Category Match';
                    }
                    if (description.includes(token)) {
                        score += 150;
                        if (!reason) reason = 'Details Match';
                    }
                });

                return { product, score, reason: reason || 'Relevant Product' };
            })
            .filter(item => item.score > 0);
    }, [query, products]);

    // 2. BACKGROUND ASYNC AI RAG SEARCH (Baad mein AI recommendations seamlessly inject hon)
    useEffect(() => {
        let isMounted = true;
        const rawQuery = query.trim();

        if (!rawQuery || areProductsLoading || products.length === 0) {
            setRagData(null);
            setRagLoading(false);
            return;
        }

        setRagLoading(true);
        setRagError('');

        const fetchRagSearch = async () => {
            try {
                const cleanProducts = products.map((p) => ({
                    id: p.id,
                    customId: p.customId || '',
                    name: p.name,
                    category: p.category,
                    price: p.price,
                    description: p.description ? p.description.substring(0, 150) : '',
                    shopName: p.shopName || 'Zivio'
                }));

                let resData: any = null;
                try {
                    // Call Assistant API to extract keywords, category_filter, price_max, and intent summary
                    const [ragRes, assistantRes] = await Promise.allSettled([
                        fetch('/api/gemini/rag-search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: safeJsonStringify({ query: rawQuery, products: cleanProducts })
                        }),
                        fetch('/api/gemini/assistant', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: safeJsonStringify({ input: rawQuery, preferredType: 'search_query' })
                        })
                    ]);

                    if (ragRes.status === 'fulfilled' && ragRes.value.ok) {
                        resData = await ragRes.value.json();
                    }

                    if (assistantRes.status === 'fulfilled' && assistantRes.value.ok) {
                        const assistData = await assistantRes.value.json();
                        if (assistData?.data?.type === 'search_query' && assistData.data.search) {
                            const { keywords, category_filter, user_intent_summary } = assistData.data.search;
                            if (resData?.data) {
                                if (user_intent_summary && !resData.data.aiSummary) {
                                    resData.data.aiSummary = user_intent_summary;
                                }
                                if (category_filter && (!resData.data.detectedCategory || resData.data.detectedCategory === 'All Products')) {
                                    resData.data.detectedCategory = category_filter;
                                }
                                if (keywords && Array.isArray(resData.data.suggestedKeywords)) {
                                    const kwTokens = keywords.split(/[, ]+/).filter((k: string) => k.length > 2);
                                    resData.data.suggestedKeywords = [...new Set([...resData.data.suggestedKeywords, ...kwTokens])];
                                }
                            }
                        }
                    }
                } catch (netErr) {
                    console.warn('Backend search API unreachable, attempting edge fallback:', netErr);
                }

                // If backend/edge API returned valid data
                if (resData && resData.success && resData.data && resData.data.rankedProductIds?.length > 0) {
                    if (isMounted) {
                        setRagData(resData.data);
                        return;
                    }
                }

                // Direct Fallback to Gemini REST API if backend API is offline or deployed on static CDN
                try {
                    const candidateDocs = cleanProducts.slice(0, 20);
                    const prompt = `You are a helpful e-commerce shopping assistant for luxury baby products. Query: "${rawQuery}". Products: ${JSON.stringify(candidateDocs)}. Return JSON with keys: "detectedIntent" (string), "detectedCategory" (string), "suggestedKeywords" (string array), "aiSummary" (short recommendation in English/Urdu), "rankedProductIds" (array of objects with "id", "matchScore" (0-100), and "matchReason").`;

                    const candidateModels = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
                    for (const model of candidateModels) {
                        try {
                            const directGemini = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=AIzaSyDlLGz_GjqXXlQ7o8333ZqDgSmdcxKO_HA`,
                                {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        contents: [{ parts: [{ text: prompt }] }],
                                        generationConfig: { responseMimeType: 'application/json' }
                                    })
                                }
                            );

                            if (directGemini.ok) {
                                const gData = await directGemini.json();
                                const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    const parsed = JSON.parse(text);
                                    if (isMounted && parsed && parsed.rankedProductIds) {
                                        setRagData(parsed);
                                        return;
                                    }
                                }
                            }
                        } catch (mErr) {
                            console.warn(`Model ${model} fallback error:`, mErr);
                        }
                    }
                } catch (directErr) {
                    console.warn('Direct Gemini fallback note:', directErr);
                }

                // Local intelligent semantic boost if both APIs are slow/offline
                if (isMounted) {
                    const fallbackMatches = localMatches.slice(0, 10).map((m) => ({
                        id: m.product.id,
                        matchScore: Math.min(95, Math.round(m.score / 15)),
                        matchReason: m.reason || 'Semantic Match'
                    }));

                    setRagData({
                        detectedIntent: rawQuery,
                        detectedCategory: localMatches[0]?.product.category || 'Baby Collections',
                        suggestedKeywords: [rawQuery, 'soft cotton', 'baby gift', 'luxury suit'],
                        aiSummary: `Showing best matching luxury baby items for "${rawQuery}".`,
                        rankedProductIds: fallbackMatches
                    });
                }
            } catch (err: any) {
                if (isMounted) {
                    console.warn('AI search note:', err?.message || 'Using fast local index');
                    setRagError('Fast local search active');
                }
            } finally {
                if (isMounted) {
                    setRagLoading(false);
                }
            }
        };

        fetchRagSearch();

        return () => {
            isMounted = false;
        };
    }, [query, products, areProductsLoading]);

    // AI-Ranked Combined List (Local + AI Score Boost)
    const finalRankedProducts = useMemo(() => {
        const rawQuery = query.trim();
        if (!rawQuery || products.length === 0) return [];

        const aiScoreMap = new Map<string, { score: number; reason?: string }>();
        if (ragData && ragData.rankedProductIds) {
            ragData.rankedProductIds.forEach((item) => {
                aiScoreMap.set(item.id, { score: item.matchScore, reason: item.matchReason });
            });
        }

        const combined = products
            .filter(p => p.isVisible)
            .map(product => {
                // Find base local score
                const localItem = localMatches.find(m => m.product.id === product.id);
                let score = localItem ? localItem.score : 0;
                let reason = localItem ? localItem.reason : '';
                let isAiMatch = false;

                // AI boost if Gemini recommended it
                if (aiScoreMap.has(product.id)) {
                    const aiItem = aiScoreMap.get(product.id)!;
                    score += aiItem.score * 25; // 0-100 scaled to 0-2500
                    reason = aiItem.reason || '✨ AI Recommended Pick';
                    isAiMatch = true;
                }

                return { product, score, reason, isAiMatch };
            })
            .filter(item => item.score > 0);

        // Sorting
        return combined.sort((a, b) => {
            if (sortBy === 'price-asc') return a.product.price - b.product.price;
            if (sortBy === 'price-desc') return b.product.price - a.product.price;
            if (sortBy === 'newest') return (b.product.createdAt || 0) - (a.product.createdAt || 0);
            return b.score - a.score;
        });
    }, [query, products, localMatches, ragData, sortBy]);

    // Separate AI Curated Highlights if available
    const aiCuratedPicks = useMemo(() => {
        if (!ragData || !ragData.rankedProductIds || ragData.rankedProductIds.length === 0) return [];
        const topAiIds = new Set(ragData.rankedProductIds.slice(0, 4).map(r => r.id));
        return finalRankedProducts.filter(item => topAiIds.has(item.product.id));
    }, [ragData, finalRankedProducts]);

    const handleQuickFilter = (kw: string) => {
        if (!kw) {
            navigate('/');
        } else {
            navigate(`/search?q=${encodeURIComponent(kw)}`);
        }
    };

    const { settings } = useStore();
    const appName = settings?.appName || 'onliny';

    return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-5">
            <SEO 
                title={query ? `Search: "${query}" | ${appName}` : `Search Baby & Boy Clothes, Gifts & Fashion | ${appName}`}
                description={query ? `Find verified products matching "${query}" on ${appName} Pakistan with Cash on Delivery.` : `Search baby clothing, boy clothes, girlfriend gifts, boyfriend gifts, couples hampers, and fashion on ${appName}.`}
                keywords={[
                    'baby clothing',
                    'boy clothing',
                    'gifts for girlfriend',
                    'gifts for boyfriend',
                    'gifts Pakistan',
                    'online shopping Pakistan',
                    'COD',
                    query
                ].filter(Boolean)}
                noindex={!query}
            />

            {/* Store Hero Header */}
            <div className="relative rounded-3xl p-6 sm:p-8 text-white shadow-lg overflow-hidden bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 border border-rose-400/30">
                {/* Decorative background sparkles */}
                <div className="absolute right-0 top-0 opacity-15 pointer-events-none transform translate-x-4 -translate-y-4">
                    <span className="text-9xl">✨</span>
                </div>
                
                <div className="relative z-10 space-y-2.5 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-rose-50 border border-white/30 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
                        <span>{appName} Collection • Smart AI Search</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-serif tracking-tight drop-shadow-xs">
                        {query ? `Results for "${query}"` : `Search ${appName}`}
                    </h1>
                    
                    <p className="text-rose-100/90 text-xs sm:text-sm font-sans leading-relaxed">
                        Instant live catalog matching with Gemini AI smart recommendations for fast, verified shopping.
                    </p>
                </div>

                {/* Quick Category Filter Pills */}
                <div className="relative z-10 flex flex-wrap items-center gap-1.5 pt-4">
                    {QUICK_FILTERS.map((f, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleQuickFilter(f.query)}
                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-xs active:scale-95 ${
                                (query.toLowerCase() === f.query.toLowerCase() || (!query && !f.query))
                                    ? 'bg-white text-rose-800 shadow-md ring-2 ring-amber-300'
                                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Live Search Status Bar */}
            {query.trim() !== '' && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-100 shadow-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                            <Icons.search className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-slate-800">
                                    Instant Results Ready:
                                </span>
                                <span className="bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded-full font-black">
                                    {finalRankedProducts.length} items
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                0ms instant local indexing + background AI semantic analysis
                            </p>
                        </div>
                    </div>

                    {/* AI Loading Status Badge */}
                    {ragLoading ? (
                        <div className="inline-flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-1.5 rounded-full text-xs font-bold animate-pulse">
                            <Spinner size="sm" />
                            <span>✨ Gemini AI Analyzing Catalog & Intent...</span>
                        </div>
                    ) : ragData ? (
                        <div className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                            <span>✨ Gemini AI Augmented</span>
                        </div>
                    ) : null}
                </div>
            )}

            {/* AI Smart Recommendation Box (When AI Search Finishes in Background) */}
            {ragData && (
                <div className="bg-gradient-to-r from-rose-50/90 via-amber-50/60 to-rose-50/90 border border-rose-200 rounded-3xl p-5 shadow-sm space-y-4 animate-slide-in-up">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 pb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 flex items-center justify-center text-white text-xs shadow-xs">
                                ✨
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-rose-900 font-serif">
                                    AI Shopping Stylist Recommendation
                                </h3>
                                <p className="text-[11px] text-rose-700/80">Personalized semantic insights for "{query}"</p>
                            </div>
                        </div>

                        {ragData.detectedCategory && (
                            <span className="bg-white border border-rose-200 text-rose-800 font-bold px-3 py-0.5 rounded-full text-xs shadow-xs">
                                🛍️ {ragData.detectedCategory}
                            </span>
                        )}
                    </div>

                    {ragData.aiSummary && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans bg-white/80 p-3 rounded-2xl border border-rose-100">
                            <strong className="text-rose-800">Stylist Note:</strong> {ragData.aiSummary}
                        </p>
                    )}

                    {/* AI Suggested Query Tags */}
                    {ragData.suggestedKeywords && ragData.suggestedKeywords.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-xs font-bold text-rose-900">Suggested Tags:</span>
                            {ragData.suggestedKeywords.map((kw, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleQuickFilter(kw)}
                                    className="text-xs bg-white hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 px-3 py-1 rounded-full transition-colors shadow-xs active:scale-95 cursor-pointer"
                                >
                                    + {kw}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* AI Top Recommended Picks Showcase (if AI returned top matches) */}
            {aiCuratedPicks.length > 0 && (
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold font-serif text-rose-900">
                                🌟 Top AI Curated Picks
                            </span>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                High Match
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {aiCuratedPicks.map(({ product, reason }) => (
                            <div key={`ai-${product.id}`} className="relative group baby-card">
                                <div className="absolute top-2 left-2 z-20 bg-gradient-to-r from-rose-600 to-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                    <span>✨</span>
                                    <span className="truncate max-w-[120px]">{reason || 'AI Match'}</span>
                                </div>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Matching Products Section Header & Sorting */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-rose-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2 font-serif">
                    All Matching Baby Products
                    <span className="bg-rose-100 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                        {finalRankedProducts.length}
                    </span>
                </h2>

                <div className="flex items-center gap-2">
                    <label htmlFor="search-sort" className="text-xs text-slate-500 font-medium">Sort by:</label>
                    <select
                        id="search-sort"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-xs bg-white border border-rose-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400 text-slate-700 font-medium shadow-xs"
                    >
                        <option value="relevance">Best Match / AI Score</option>
                        <option value="price-asc">Price: Low to High</option>
                        <option value="price-desc">Price: High to Low</option>
                        <option value="newest">Newest Arrivals</option>
                    </select>
                </div>
            </div>

            {/* Products Grid */}
            {areProductsLoading ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-rose-100 space-y-3">
                    <Spinner size="lg" />
                    <p className="text-sm font-bold text-rose-800 font-serif">Loading baby products...</p>
                </div>
            ) : finalRankedProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                    {finalRankedProducts.map(({ product, reason, isAiMatch }) => (
                        <div key={product.id} className="relative group baby-card flex flex-col">
                            {reason && reason !== 'Relevant Baby Item' && (
                                <div className={`absolute top-2 left-2 z-20 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs pointer-events-none truncate max-w-[130px] ${
                                    isAiMatch 
                                        ? 'bg-rose-700 text-white ring-1 ring-amber-300'
                                        : 'bg-slate-900/80 backdrop-blur-md text-white'
                                }`}>
                                    {reason}
                                </div>
                            )}
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-3xl border border-rose-100 p-8 space-y-4 max-w-lg mx-auto shadow-xs">
                    <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                        🧸
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-800 font-serif">No Matching Baby Products Found</h4>
                        <p className="text-xs sm:text-sm text-slate-500">
                            We couldn't find items for "{query}". Try searching by Product ID, baby clothes (e.g. "romper", "frock", "suit"), or select a category above.
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-bold px-6 py-2.5 rounded-full shadow-sm transition-all active:scale-95"
                    >
                        Explore All Baby Collections &rarr;
                    </button>
                </div>
            )}
        </div>
    );
};

export default Search;
