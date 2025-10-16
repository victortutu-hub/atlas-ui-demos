// src/atlas-layout-generator.js (ML-INTEGRATED v4.1 - FIXED)
// Generare procedurală de layout-uri CONTROLATĂ de ML actions

/**
 * Layout Generator - ENHANCED pentru ML v4.1
 * Action-urile ML (0-9) controlează parametri key: kpiCount, gridCols, sizes, etc.
 */
export class LayoutGenerator {
    constructor() {
        this.layoutHistory = new Map();
    }

    /**
     * Generează un layout complet bazat pe intent ȘI action ML
     * @param {Object} intent - intenția utilizatorului
     * @param {Number|null} mlAction - action selectat de ML (0-9) sau null pentru comportament clasic
     * @returns {Object} layout generat procedural
     */
    generate(intent, mlAction = null) {
        const cacheKey = this._getCacheKey(intent, mlAction);

        if (this.layoutHistory.has(cacheKey)) {
            return this.layoutHistory.get(cacheKey);
        }

        // ⭐ Obține variații din action ML
        const variations = this._getVariationsForAction(mlAction, intent);

        const structure = this._generateStructure(intent, variations);

        const layout = {
            id: `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            structure: structure,
            slots: this._generateSlots(intent, structure),
            grid: this._generateGridConfig(intent, variations),
            spacing: this._generateSpacing(intent),
            priority: this._calculatePriority(intent),
            metadata: {
                generated: new Date().toISOString(),
                intent: { ...intent },
                mlAction: mlAction,
                variations: variations
            }
        };

        this.layoutHistory.set(cacheKey, layout);
        return layout;
    }

    /**
     * ⭐ MAPPING: ML Action (0-9) → Parametri Layout
     * Fiecare action reprezintă o strategie diferită de layout
     */
    _getVariationsForAction(action, intent) {
        if (action === null || action === undefined) {
            return {}; // fallback la comportament normal
        }

        // ⭐ VALIDATE: Action must be 0-9
        if (typeof action !== 'number' || !Number.isFinite(action) || action < 0 || action > 9) {
            console.warn(`[LayoutGenerator] Invalid action "${action}" (expected 0-9), using fallback`);
            return {};
        }

        // Round to integer just in case
        action = Math.floor(action);

        const domain = intent.domain || 'dashboard';

        // Variații specifice per domain
        const actionMaps = {
            dashboard: {
                0: { kpiCount: 2, kpiSize: 'large', gridCols: 2, layout: 'minimal' },
                1: { kpiCount: 3, kpiSize: 'medium', gridCols: 3, layout: 'balanced' },
                2: { kpiCount: 4, kpiSize: 'medium', gridCols: 2, layout: 'grid-2x2' },
                3: { kpiCount: 4, kpiSize: 'small', gridCols: 4, layout: 'compact-row' },
                4: { kpiCount: 6, kpiSize: 'small', gridCols: 3, layout: 'dense-3x2' },
                5: { kpiCount: 6, kpiSize: 'small', gridCols: 2, layout: 'vertical' },
                6: { kpiCount: 3, kpiSize: 'large', gridCols: 1, layout: 'stacked' },
                7: { kpiCount: 5, kpiSize: 'medium', gridCols: 3, layout: 'asymmetric' },
                8: { kpiCount: 8, kpiSize: 'tiny', gridCols: 4, layout: 'dashboard-heavy' },
                9: { kpiCount: 4, kpiSize: 'medium', gridCols: 2, layout: 'classic' }
            },
            blog: {
                0: { articleCount: 2, previewSize: 'large', gridCols: 1, layout: 'featured' },
                1: { articleCount: 3, previewSize: 'medium', gridCols: 2, layout: 'magazine' },
                2: { articleCount: 4, previewSize: 'medium', gridCols: 2, layout: 'grid' },
                3: { articleCount: 6, previewSize: 'small', gridCols: 3, layout: 'compact' },
                4: { articleCount: 4, previewSize: 'large', gridCols: 1, layout: 'longform' },
                5: { articleCount: 5, previewSize: 'medium', gridCols: 2, layout: 'mixed' },
                6: { articleCount: 8, previewSize: 'tiny', gridCols: 4, layout: 'dense' },
                7: { articleCount: 3, previewSize: 'large', gridCols: 1, layout: 'editorial' },
                8: { articleCount: 6, previewSize: 'medium', gridCols: 3, layout: 'balanced' },
                9: { articleCount: 4, previewSize: 'medium', gridCols: 2, layout: 'standard' }
            },
            ecommerce: {
                0: { productCount: 3, tileSize: 'large', gridCols: 3, layout: 'showcase' },
                1: { productCount: 4, tileSize: 'medium', gridCols: 2, layout: 'featured' },
                2: { productCount: 6, tileSize: 'medium', gridCols: 3, layout: 'standard' },
                3: { productCount: 8, tileSize: 'small', gridCols: 4, layout: 'compact' },
                4: { productCount: 4, tileSize: 'large', gridCols: 2, layout: 'premium' },
                5: { productCount: 6, tileSize: 'medium', gridCols: 2, layout: 'gallery' },
                6: { productCount: 9, tileSize: 'small', gridCols: 3, layout: 'catalog' },
                7: { productCount: 5, tileSize: 'medium', gridCols: 3, layout: 'asymmetric' },
                8: { productCount: 12, tileSize: 'tiny', gridCols: 4, layout: 'browse-heavy' },
                9: { productCount: 6, tileSize: 'medium', gridCols: 3, layout: 'balanced' }
            }
        };

        const map = actionMaps[domain] || actionMaps.dashboard;
        return map[action] || {};
    }

    /**
     * ⭐ FIXED: Generează STRUCTURA layout-ului folosind variații ML
     */
    _generateStructure(intent, variations) {
        const { domain, goal, density, device } = intent;

        let structure = {
            type: 'grid',
            regions: [],
            hierarchy: []
        };

        // Dashboard → focus pe KPI și metrici
        if (domain === 'dashboard') {
            if (goal === 'kpi-focus') {
                // ⭐ USE ML VARIATIONS pentru structure type
                structure.type = variations.layout || 'kpi-dominant';

                // ⭐ USE ML VARIATIONS pentru KPI count
                let kpiCount = variations.kpiCount;

                // Fallback dacă variations lipsesc
                if (kpiCount === undefined) {
                    kpiCount = density === 'compact' && device === 'desktop' ? 6 :
                        density === 'cozy' ? 2 :
                            device === 'mobile' ? 2 : 4;
                }

                structure.regions = [{ name: 'header', size: 'compact', priority: 1 }];

                // Generează KPI regions dinamic FOLOSIND kpiCount din variations
                for (let i = 0; i < kpiCount; i++) {
                    structure.regions.push({
                        name: `kpi-${i + 1}`,
                        size: variations.kpiSize || (kpiCount > 4 ? 'small' : 'medium'),
                        priority: 10 - i
                    });
                }

                if (device !== 'mobile') {
                    structure.regions.push({ name: 'details', size: 'flexible', priority: 3 });
                }
            } else {
                structure.type = 'balanced-grid';
                structure.regions = [
                    { name: 'header', size: 'medium', priority: 5 },
                    { name: 'content-main', size: 'large', priority: 8 },
                    { name: 'sidebar', size: 'small', priority: 4 }
                ];
            }
        }

        // Blog → focus pe conținut
        if (domain === 'blog') {
            if (goal === 'read') {
                structure.type = 'content-centric';
                structure.regions = [
                    { name: 'hero', size: 'large', priority: 9 },
                    { name: 'article', size: 'dominant', priority: 10 }
                ];

                if (device === 'desktop' && density !== 'cozy') {
                    structure.regions.push({ name: 'sidebar-related', size: 'small', priority: 3 });
                }

                if (device === 'mobile') {
                    structure.regions.push({ name: 'comments', size: 'medium', priority: 4 });
                }
            } else {
                // ⭐ USE ML VARIATIONS pentru layout type
                structure.type = variations.layout || 'feed-style';

                // ⭐ USE ML VARIATIONS pentru article count
                let articleCount = variations.articleCount;

                // Fallback
                if (articleCount === undefined) {
                    articleCount = density === 'compact' ? 6 : density === 'cozy' ? 2 : 4;
                }

                structure.regions = [
                    { name: 'navbar', size: 'compact', priority: 4 },
                    {
                        name: 'feed',
                        size: variations.previewSize || 'large',
                        priority: 9,
                        metadata: { itemCount: articleCount } // ⭐ Pass count via metadata
                    }
                ];

                if (device !== 'mobile') {
                    structure.regions.push({ name: 'filters', size: 'small', priority: 5 });
                }
            }
        }

        // E-commerce → focus pe produse
        if (domain === 'ecommerce') {
            if (goal === 'browse') {
                // ⭐ USE ML VARIATIONS pentru layout type
                structure.type = variations.layout || 'product-grid';

                structure.regions = [{ name: 'header', size: 'medium', priority: 5 }];

                if (device !== 'mobile') {
                    structure.regions.push({ name: 'filters', size: 'sidebar', priority: 6 });
                }

                // ⭐ USE ML VARIATIONS pentru product count
                let productCount = variations.productCount;

                // Fallback
                if (productCount === undefined) {
                    productCount = density === 'compact' ? 8 :
                        density === 'cozy' ? 3 :
                            device === 'mobile' ? 4 : 6;
                }

                structure.regions.push({
                    name: 'products',
                    size: variations.tileSize || 'dominant',
                    priority: 10,
                    metadata: { itemCount: productCount } // ⭐ Pass count
                });
            } else if (goal === 'compare') {
                structure.type = 'comparison-layout';

                const compareCount = device === 'mobile' ? 2 :
                    density === 'compact' ? 4 : 3;

                structure.regions = [{ name: 'header', size: 'compact', priority: 4 }];

                for (let i = 0; i < compareCount; i++) {
                    structure.regions.push({
                        name: `compare-item-${i + 1}`,
                        size: 'medium',
                        priority: 9 - i
                    });
                }

                structure.regions.push({ name: 'actions', size: 'medium', priority: 7 });
            } else if (goal === 'checkout') {
                structure.type = 'linear-flow';

                const steps = device === 'mobile' ?
                    ['progress', 'form', 'summary'] :
                    ['progress', 'shipping', 'payment', 'summary', 'actions'];

                structure.regions = steps.map((step, i) => ({
                    name: step,
                    size: step === 'form' || step === 'shipping' || step === 'payment' ? 'dominant' :
                        step === 'summary' ? 'sidebar' : 'compact',
                    priority: 10 - i
                }));
            }
        }

        // Ajustări pentru device (dacă NU avem variations custom)
        if (device === 'mobile' && !variations.layout) {
            structure.regions = structure.regions.map(r => ({
                ...r,
                size: r.priority > 7 ? 'large' : 'compact'
            }));
        }

        // Ajustări pentru density (dacă NU avem variations custom)
        if (!variations.layout) {
            if (density === 'compact') {
                structure.regions = structure.regions.map(r => ({
                    ...r,
                    size: r.size === 'large' ? 'medium' : r.size === 'medium' ? 'small' : r.size
                }));
            } else if (density === 'cozy') {
                structure.regions = structure.regions.map(r => ({
                    ...r,
                    size: r.size === 'small' ? 'medium' : r.size === 'medium' ? 'large' : r.size
                }));
            }
        }

        return structure;
    }

    /**
     * Generează SLOTURI pentru componente (cu metadata propagată)
     */
    _generateSlots(intent, structureArg) {
        const structure = structureArg || this._generateStructure(intent);
        const slots = [];

        for (const region of structure.regions) {
            const slot = {
                name: region.name,
                capabilities: this._inferCapabilities(region.name, intent),
                size: region.size,
                priority: region.priority,
                constraints: {
                    minWidth: this._calculateMinWidth(region.size),
                    maxWidth: this._calculateMaxWidth(region.size),
                    aspect: this._calculateAspect(region.name, intent)
                }
            };

            // Propagă metadata
            if (region.metadata) {
                slot.metadata = region.metadata;
            }

            slots.push(slot);
        }

        return slots;
    }

    /**
     * Generează configurație GRID cu variații ML
     */
    _generateGridConfig(intent, variations) {
        const { device, density, domain } = intent;

        // ⭐ ML poate suprascrie cols
        let cols = variations.gridCols !== undefined ? variations.gridCols : 3;
        let rows = 'auto';
        let gap = 12;

        // Device-based adjustments (dacă ML nu a specificat)
        if (variations.gridCols === undefined) {
            if (device === 'mobile') {
                cols = 1;
                gap = 8;
            } else if (device === 'tablet') {
                cols = 2;
                gap = 10;
            }
        }

        // Density-based adjustments
        if (density === 'compact') {
            cols = device === 'desktop' ? Math.max(cols, 4) : cols;
            gap = 8;
        } else if (density === 'cozy') {
            cols = device === 'desktop' ? Math.min(cols, 2) : cols;
            gap = 16;
        }

        // Domain-based adjustments
        if (domain === 'ecommerce') {
            cols = device === 'desktop' ? Math.max(3, cols) : cols;
        }

        return { cols, rows, gap };
    }

    _generateSpacing(intent) {
        const base = intent.density === 'compact' ? 8 : intent.density === 'cozy' ? 16 : 12;

        return {
            base,
            section: base * 2,
            component: base,
            element: base / 2
        };
    }

    _calculatePriority(intent) {
        const priorities = {};

        if (intent.goal === 'kpi-focus') {
            priorities.kpi = 10;
            priorities.content = 5;
        } else if (intent.goal === 'browse') {
            priorities.products = 10;
            priorities.filters = 7;
        } else if (intent.goal === 'read') {
            priorities.content = 10;
            priorities.navigation = 4;
        }

        return priorities;
    }

    _inferCapabilities(slotName, intent) {
        const capabilities = [];

        if (slotName.includes('kpi') || slotName.includes('metric')) {
            capabilities.push('display-metric', 'real-time-update', 'sparkline');
        }

        if (slotName.includes('product') || slotName.includes('compare-item')) {
            capabilities.push('display-product', 'add-to-cart', 'quick-view');
        }

        if (slotName.includes('filter')) {
            capabilities.push('filter-data', 'multi-select', 'range-slider');
        }

        if (slotName.includes('hero') || slotName.includes('header')) {
            capabilities.push('display-headline', 'call-to-action', 'hero-image');
        }

        if (slotName.includes('article') || slotName.includes('content')) {
            capabilities.push('display-content', 'typography', 'reading-progress');
        }

        if (slotName.includes('comment')) {
            capabilities.push('display-content', 'user-generated');
        }

        if (slotName.includes('preview')) {
            capabilities.push('display-content', 'teaser', 'clickable');
        }

        if (slotName.includes('shipping') || slotName.includes('payment') || slotName.includes('form')) {
            capabilities.push('form-input', 'validation');
        }

        if (slotName.includes('summary')) {
            capabilities.push('display-content', 'summary');
        }

        if (slotName.includes('progress')) {
            capabilities.push('display-content', 'progress-indicator');
        }

        if (intent.goal === 'compare') {
            capabilities.push('comparison-view', 'side-by-side');
        }

        if (intent.goal === 'checkout') {
            capabilities.push('form-input', 'validation', 'payment');
        }

        return capabilities;
    }

    // Helper methods
    _getCacheKey(intent, mlAction) {
        return JSON.stringify({
            domain: intent.domain,
            goal: intent.goal,
            density: intent.density,
            device: intent.device,
            mlAction: mlAction // ⭐ Include action în cache key
        });
    }

    _calculateMinWidth(size) {
        const map = { small: 200, medium: 300, large: 400, dominant: 600, tiny: 150 };
        return map[size] || 250;
    }

    _calculateMaxWidth(size) {
        const map = { small: 400, medium: 600, large: 1000, dominant: null, tiny: 300 };
        return map[size] || 800;
    }

    _calculateAspect(slotName, intent) {
        if (slotName.includes('product')) return intent.density === 'compact' ? 0.75 : 1;
        if (slotName.includes('hero')) return 2.5;
        if (slotName.includes('kpi')) return 1.5;
        return null;
    }
}

// Singleton instance
let generatorInstance = null;
export function getLayoutGenerator() {
    if (!generatorInstance) {
        generatorInstance = new LayoutGenerator();
    }
    return generatorInstance;
}