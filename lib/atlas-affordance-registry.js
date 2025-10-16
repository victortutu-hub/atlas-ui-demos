// src/atlas-affordance-registry.js
// Registru global de componente cu affordances

/**
 * Affordance Registry - înregistrează și indexează toate componentele
 * Permite căutare și matching bazat pe capabilities, context, goals
 */
export class AffordanceRegistry {
    constructor() {
        this.registry = new Map();
        this.capabilityIndex = new Map(); // index pentru search rapid după capabilities
        this.contextIndex = new Map();    // index pentru search după context
        this.goalIndex = new Map();       // index pentru search după goals
    }

    /**
     * Înregistrează o componentă în registry
     * @param {string} tagName - numele tag-ului (ex: 'atlas-kpi')
     * @param {Class} component - clasa componentei
     */
    register(tagName, component) {
        if (!component.affordance) {
            console.warn(`Component ${tagName} doesn't have affordance() method`);
            return false;
        }

        const affordance = component.affordance();
        const styleTokens = component.styleTokens?.() || [];

        const entry = {
            tagName,
            component,
            affordance,
            styleTokens
        };

        // Adaugă în registry principal
        this.registry.set(tagName, entry);

        // Indexează pentru search rapid
        this._indexByCapabilities(tagName, affordance.capabilities || []);
        this._indexByContexts(tagName, affordance.contexts || []);
        this._indexByGoals(tagName, affordance.goals || []);

        return true;
    }

    /**
     * Caută componente după capability
     */
    findByCapability(capability) {
        return this.capabilityIndex.get(capability) || [];
    }

    /**
     * Caută componente după context
     */
    findByContext(context) {
        return this.contextIndex.get(context) || [];
    }

    /**
     * Caută componente după goal
     */
    findByGoal(goal) {
        return this.goalIndex.get(goal) || [];
    }

    /**
     * Găsește cea mai bună componentă pentru un slot și intent
     * (Folosit de ComponentComposer)
     */
    findBestMatch(slotName, intent) {
        // Colectează candidați din multiple surse
        const candidates = new Set();

        // 1. Candidați după context
        const contextMatches = this.findByContext(intent.domain);
        contextMatches.forEach(tag => candidates.add(tag));

        // 2. Candidați după goal
        const goalMatches = this.findByGoal(intent.goal);
        goalMatches.forEach(tag => candidates.add(tag));

        // 3. Candidați cu capabilities relevante (inferăm din numele slot-ului)
        const inferredCaps = this._inferCapabilitiesFromSlotName(slotName);
        inferredCaps.forEach(cap => {
            const matches = this.findByCapability(cap);
            matches.forEach(tag => candidates.add(tag));
        });

        // Dacă nu avem candidați, returnăm atlas-card ca fallback
        if (candidates.size === 0) {
            return 'atlas-card';
        }

        // Scoruim fiecare candidat
        let bestTag = null;
        let bestScore = -1;

        for (const tag of candidates) {
            const score = this._scoreCandidate(tag, slotName, intent);
            if (score > bestScore) {
                bestScore = score;
                bestTag = tag;
            }
        }

        return bestTag || 'atlas-card';
    }

    /**
     * Scoruiește un candidat pentru matching
     */
    _scoreCandidate(tagName, slotName, intent) {
        const entry = this.registry.get(tagName);
        if (!entry) return 0;

        const aff = entry.affordance;
        let score = 0;

        // Strip numbering din slot name pentru comparație
        const baseSlot = slotName.toLowerCase().replace(/-\d+$/, '');
        const tagLower = tagName.toLowerCase();

        // Context match
        if (aff.contexts && aff.contexts.includes(intent.domain)) {
            score += 30;
        }

        // Goal match
        if (aff.goals && aff.goals.includes(intent.goal)) {
            score += 25;
        }

        // Slot name match (fără număr)
        // Exact match pentru "products" → "atlas-product-grid"
        if (baseSlot === 'products' && tagLower.includes('product-grid')) {
            score += 40; // Bonus mare pentru match perfect
        } else if (baseSlot === 'feed' && tagLower.includes('grid')) {
            score += 35;
        } else if (tagLower.includes(baseSlot.replace(/[-_]/g, ''))) {
            score += 20;
        }

        // Priority boost
        score += (aff.priority || 5);

        return score;
    }

    /**
     * Inferă capabilities din numele slot-ului
     */
    _inferCapabilitiesFromSlotName(slotName) {
        const capabilities = [];
        const lower = slotName.toLowerCase();

        // Strip numbering (kpi-1 → kpi, product-2 → product)
        const baseSlot = lower.replace(/-\d+$/, '');

        if (baseSlot.includes('kpi') || baseSlot.includes('metric')) {
            capabilities.push('display-metric', 'kpi');
        }

        if (baseSlot.includes('product') || baseSlot.includes('compare-item')) {
            capabilities.push('display-product', 'product-info', 'product-collection');
        }

        if (baseSlot.includes('filter')) {
            capabilities.push('filter-data', 'form-controls');
        }

        if (baseSlot.includes('hero') || baseSlot.includes('header')) {
            capabilities.push('display-headline', 'hero-image');
        }

        if (baseSlot.includes('nav')) {
            capabilities.push('navigation', 'menu');
        }

        if (baseSlot.includes('grid') || baseSlot.includes('gallery')) {
            capabilities.push('grid-layout', 'multi-item');
        }

        if (baseSlot.includes('article') || baseSlot.includes('content') || baseSlot.includes('preview')) {
            capabilities.push('display-content', 'typography');
        }

        if (baseSlot.includes('feed')) {
            capabilities.push('grid-layout', 'multi-item', 'container');
        }

        if (baseSlot.includes('comment')) {
            capabilities.push('display-content', 'user-generated');
        }

        if (baseSlot.includes('form') || baseSlot.includes('shipping') || baseSlot.includes('payment')) {
            capabilities.push('form-input', 'validation');
        }

        if (baseSlot.includes('summary') || baseSlot.includes('details')) {
            capabilities.push('display-content', 'container');
        }

        return capabilities;
    }

    /**
     * Indexare internă
     */
    _indexByCapabilities(tagName, capabilities) {
        capabilities.forEach(cap => {
            if (!this.capabilityIndex.has(cap)) {
                this.capabilityIndex.set(cap, []);
            }
            this.capabilityIndex.get(cap).push(tagName);
        });
    }

    _indexByContexts(tagName, contexts) {
        contexts.forEach(ctx => {
            if (!this.contextIndex.has(ctx)) {
                this.contextIndex.set(ctx, []);
            }
            this.contextIndex.get(ctx).push(tagName);
        });
    }

    _indexByGoals(tagName, goals) {
        goals.forEach(goal => {
            if (!this.goalIndex.has(goal)) {
                this.goalIndex.set(goal, []);
            }
            this.goalIndex.get(goal).push(tagName);
        });
    }

    /**
     * Auto-înregistrare pentru toate componentele
     * Trebuie apelată DUPĂ ce componentele sunt importate
     */
    autoRegister(components) {
        // Dacă primim componente direct, le înregistrăm
        if (components) {
            for (const [tagName, component] of Object.entries(components)) {
                this.register(tagName, component);
            }
            console.log(`[AffordanceRegistry] Registered ${this.registry.size} components (direct)`);
            return;
        }

        // Altfel, încearcă să le găsească în customElements registry
        const tagNames = [
            'atlas-header',
            'atlas-navbar',
            'atlas-card',
            'atlas-kpi',
            'atlas-grid',
            'atlas-hero',
            'atlas-filter-panel',
            'atlas-product-tile',
            'atlas-product-grid'
        ];

        // Înregistrare din customElements registry
        for (const tagName of tagNames) {
            try {
                const el = document.createElement(tagName);
                const component = el.constructor;

                if (component && component !== HTMLElement && component.affordance) {
                    this.register(tagName, component);
                }
            } catch (e) {
                console.warn(`Could not register ${tagName}:`, e);
            }
        }

        console.log(`[AffordanceRegistry] Registered ${this.registry.size} components`);
    }

    /**
     * Stats pentru debugging
     */
    getStats() {
        return {
            totalComponents: this.registry.size,
            capabilities: this.capabilityIndex.size,
            contexts: this.contextIndex.size,
            goals: this.goalIndex.size,
            components: Array.from(this.registry.keys())
        };
    }

    /**
     * Debug info pentru o componentă
     */
    inspect(tagName) {
        const entry = this.registry.get(tagName);
        if (!entry) {
            return { error: 'Component not found' };
        }

        return {
            tagName,
            affordance: entry.affordance,
            styleTokens: entry.styleTokens
        };
    }
}

// Singleton instance
let registryInstance = null;

export function getAffordanceRegistry() {
    if (!registryInstance) {
        registryInstance = new AffordanceRegistry();
    }
    return registryInstance;
}

// Export registrul pentru utilizare globală
if (typeof window !== 'undefined') {
    window.__ATLAS_REGISTRY__ = getAffordanceRegistry;
}