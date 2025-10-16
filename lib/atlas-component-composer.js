// src/atlas-component-composer.js
// Compune componente dinamice bazate pe layout generat și affordances

/**
 * Component Composer - face matching între slots și componente
 * Folosește scoring pentru a găsi cea mai bună componentă pentru fiecare slot
 */
export class ComponentComposer {
    constructor(affordanceRegistry) {
        this.registry = affordanceRegistry;
    }

    /**
     * Compune un set complet de componente pentru un layout generat
     * @param {Object} layout - layout generat de LayoutGenerator
     * @param {Object} intent - intent-ul utilizatorului
     * @returns {Array} componente instanțiate cu props
     */
    compose(layout, intent) {
        const composition = [];

        for (const slot of layout.slots) {
            const component = this._findBestComponent(slot, intent);
            const props = this._deriveProps(slot, component, intent, layout);

            composition.push({
                slot: slot.name,
                component: component.tagName,
                props,
                priority: slot.priority,
                metadata: {
                    score: component.score,
                    capabilities: component.capabilities,
                    reasoning: component.reasoning,
                    slotMetadata: slot.metadata || {}
                }
            });
        }

        // Sortează după prioritate pentru rendering
        composition.sort((a, b) => b.priority - a.priority);

        return composition;
    }

    /**
     * Găsește cea mai bună componentă pentru un slot
     * Folosește scoring multi-criteria
     */
    _findBestComponent(slot, intent) {
        // Override explicit pentru slots cunoscute (mai rapid și mai sigur)
        const explicitMatches = {
            'products': 'atlas-product-grid',
            'feed': 'atlas-grid',
            'filters': 'atlas-filter-panel',
            'navbar': 'atlas-navbar',
            'hero': 'atlas-hero',
            'header': 'atlas-header'
        };

        // Check explicit matches first
        const slotBase = slot.name.toLowerCase().replace(/-\d+$/, '');
        if (explicitMatches[slotBase]) {
            const tagName = explicitMatches[slotBase];
            const entry = this.registry.registry.get(tagName);
            if (entry) {
                return {
                    tagName,
                    score: 100,
                    affordance: entry.affordance,
                    capabilities: entry.affordance.capabilities || [],
                    reasoning: `Explicit match for slot '${slot.name}'`
                };
            }
        }

        // Fallback la scoring normal
        const candidates = [];

        // Iterează prin toate componentele înregistrate
        for (const [tagName, entry] of this.registry.registry) {
            const score = this._scoreComponent(slot, entry, intent);

            if (score > 0) {
                candidates.push({
                    tagName,
                    score,
                    affordance: entry.affordance,
                    capabilities: entry.affordance.capabilities || [],
                    reasoning: this._explainScore(slot, entry, intent, score)
                });
            }
        }

        // Sortează și returnează best match
        candidates.sort((a, b) => b.score - a.score);

        return candidates[0] || {
            tagName: 'atlas-card',
            score: 1,
            capabilities: [],
            reasoning: 'Fallback to default card'
        };
    }

    /**
     * Scoring algorithm pentru component matching
     * Returnează scor 0-100
     */
    _scoreComponent(slot, entry, intent) {
        let score = 0;
        const aff = entry.affordance;

        // 1. Capability matching (40 puncte max)
        const requiredCaps = slot.capabilities || [];
        const componentCaps = aff.capabilities || [];

        const matchingCaps = requiredCaps.filter(cap => componentCaps.includes(cap));
        const capScore = requiredCaps.length > 0
            ? (matchingCaps.length / requiredCaps.length) * 40
            : 20; // dacă nu sunt required caps, dă scor mediu

        score += capScore;

        // 2. Context matching (25 puncte max)
        if (aff.contexts && aff.contexts.includes(intent.domain)) {
            score += 25;
        } else if (!aff.contexts) {
            score += 10; // generic component
        }

        // 3. Goal matching (20 puncte max)
        if (aff.goals && aff.goals.includes(intent.goal)) {
            score += 20;
        } else if (!aff.goals) {
            score += 8;
        }

        // 4. Priority boost (15 puncte max)
        const priorityBoost = Math.min((aff.priority || 5), 15);
        score += priorityBoost;

        // 5. Slot name heuristics (bonus/penalty)
        score += this._slotNameBonus(slot.name, entry.component?.name || '');

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Bonus/penalty bazat pe naming conventions
     */
    /**
     * Bonus/penalty bazat pe naming conventions (normalizat + sinonime)
     * - Normalizează componentName (CamelCase → kebab, strip 'atlas-')
     * - Normalizează slotName (strip indexare, singularize)
     * - Oferă bonus pe overlap de token-uri + sinonime semantice
     */
    _slotNameBonus(slotName, componentName) {
        // Normalize slot (kebab, fără sufixe numerice)
        const slotBase = String(slotName || '').toLowerCase().replace(/-\d+$/, '');

        // Helpers
        const singularMap = {
            products: 'product', items: 'item', tiles: 'tile', cards: 'card', kpis: 'kpi',
            metrics: 'kpi', articles: 'article', contents: 'content', heroes: 'hero',
            nav: 'navbar', menus: 'navbar'
        };
        const stem = t => singularMap[t] || t;

        const toTokens = (str) => {
            if (!str) return [];
            // CamelCase → kebab, lower, strip non-alphanum, strip atlas prefix
            let s = String(str)
                .replace(/([a-z])([A-Z])/g, '$1-$2')
                .toLowerCase()
                .replace(/^atlas-?/, '')
                .replace(/[^a-z0-9]+/g, '-');
            return s.split('-').filter(Boolean).map(stem);
        };

        const slotTokens = toTokens(slotBase);
        const compTokens = toTokens(componentName);

        // Cazuri „aurite” (match-uri foarte probabile)
        if (slotBase === 'products' && compTokens.includes('product') && compTokens.includes('grid')) {
            return 22;
        }
        if (slotBase === 'feed' && (compTokens.includes('grid') || compTokens.includes('masonry'))) {
            return 18;
        }

        // Overlap direct de token-uri (max 15)
        const overlap = slotTokens.filter(t => compTokens.includes(t));
        let bonus = Math.min(5 * overlap.length, 15);

        // Sinonime semantice (bonus moderat)
        const semanticMap = {
            kpi: ['kpi', 'metric', 'stat', 'score'],
            product: ['product', 'tile', 'card', 'catalog', 'listing'],
            filter: ['filter', 'panel', 'sidebar', 'refine'],
            hero: ['hero', 'banner', 'header', 'cover'],
            grid: ['grid', 'gallery', 'masonry', 'feed', 'list'],
            navbar: ['nav', 'menu', 'header', 'navbar'],
            article: ['article', 'content', 'post', 'preview'],
            compare: ['compare', 'comparison', 'side', 'versus']
        };

        for (const [key, synonyms] of Object.entries(semanticMap)) {
            if (slotBase.includes(key)) {
                if (synonyms.some(s => compTokens.includes(stem(s)))) {
                    bonus += 8;
                    break;
                }
            }
        }

        // Clamp
        return Math.max(0, Math.min(25, bonus));
    }


    /**
     * Explică de ce a fost ales acest component (pentru debugging)
     */
    _explainScore(slot, entry, intent, score) {
        const reasons = [];

        const aff = entry.affordance;
        const requiredCaps = slot.capabilities || [];
        const componentCaps = aff.capabilities || [];
        const matchingCaps = requiredCaps.filter(cap => componentCaps.includes(cap));

        if (matchingCaps.length > 0) {
            reasons.push(`Matches ${matchingCaps.length}/${requiredCaps.length} required capabilities`);
        }

        if (aff.contexts && aff.contexts.includes(intent.domain)) {
            reasons.push(`Perfect context match: ${intent.domain}`);
        }

        if (aff.goals && aff.goals.includes(intent.goal)) {
            reasons.push(`Goal alignment: ${intent.goal}`);
        }

        reasons.push(`Total score: ${score.toFixed(1)}/100`);

        return reasons.join('; ');
    }

    /**
     * Derivă props pentru componentă bazat pe slot și intent
     */
    _deriveProps(slot, component, intent, layout) {
        const props = {};

        // Grid columns pentru grid/product components
        if (component.tagName.includes('grid')) {
            props.cols = layout.grid.cols;

            // Dacă avem metadata despre număr de items, o transmitem
            if (slot.metadata?.itemCount) {
                props['data-item-count'] = slot.metadata.itemCount;
            }
        }

        // KPI props
        if (component.tagName.includes('kpi')) {
            props.value = this._generateMockKPI();
            props.label = this._generateKPILabel(slot.name);
        }

        // Product props
        if (component.tagName.includes('product')) {
            props.cols = layout.grid.cols;
            // Atlas-product-grid va folosi implicit 6 produse, 
            // dar poate fi customizat via data-item-count
            if (slot.metadata?.itemCount) {
                props['data-item-count'] = slot.metadata.itemCount;
            }
        }

        // Size hints
        if (slot.size) {
            props['data-size'] = slot.size;
        }

        // Priority hints pentru optimizare
        if (slot.priority) {
            props['data-priority'] = slot.priority;
        }

        return props;
    }

    // Helper methods
    _generateMockKPI() {
        return Math.floor(Math.random() * 100);
    }

    _generateKPILabel(slotName) {
        // Labels variabile pentru KPI-uri dinamice
        const kpiLabels = [
            'Revenue', 'Users', 'Conversions', 'Engagement',
            'Growth', 'Retention', 'Churn', 'Sessions',
            'Bounce Rate', 'Avg. Order', 'CTR', 'ROI'
        ];

        // Dacă e kpi-1, kpi-2, etc.
        const match = slotName.match(/kpi-(\d+)/);
        if (match) {
            const index = parseInt(match[1]) - 1;
            return kpiLabels[index % kpiLabels.length];
        }

        // Fallback pentru nume vechi
        const labels = {
            'kpi-primary': 'Revenue',
            'kpi-secondary': 'Users',
            'metric': 'Performance',
            'stat': 'Conversions',
            'header': 'Overview'
        };

        return labels[slotName] || 'Metric';
    }
}

/**
 * Composition Result - structura returnată de composer
 */
export class CompositionResult {
    constructor(components, layout, metadata) {
        this.components = components;
        this.layout = layout;
        this.metadata = {
            ...metadata,
            generatedAt: new Date().toISOString(),
            totalComponents: components.length
        };
    }

    /**
     * Serializează pentru debugging
     */
    toJSON() {
        return {
            components: this.components,
            layout: {
                id: this.layout.id,
                structure: this.layout.structure,
                grid: this.layout.grid
            },
            metadata: this.metadata
        };
    }

    /**
     * Validează că toate slot-urile au componente
     */
    validate() {
        const missingSlots = this.layout.slots.filter(
            slot => !this.components.find(c => c.slot === slot.name)
        );

        if (missingSlots.length > 0) {
            console.warn('Missing components for slots:', missingSlots.map(s => s.name));
            return false;
        }

        return true;
    }
}