// src/atlas-confusion-config.js
// 🛡️ Configuration Modes pentru Confusion Detection

/**
 * Predefined configuration modes
 * Permite control precis asupra comportamentului sistemului
 */

export const CONFUSION_MODES = {
    /**
     * SAFE MODE - Recommended pentru PRODUCTION
     * - No automatic UI changes
     * - Only collect data + feedback
     * - Higher thresholds (less sensitive)
     * - Non-intrusive
     */
    safe: {
        // Core settings
        mode: 'safe',
        autoAdapt: false,  // No automatic UI changes!
        
        // Feature flags
        features: {
            signalDetection: true,      // Still detect signals
            mlClassification: true,      // Still classify confusion
            uiAdaptation: false,         // BUT don't auto-adapt UI
            feedbackCollection: true,    // Collect user feedback
            dataLogging: true           // Log for analysis
        },
        
        // Higher thresholds (less sensitive, fewer false positives)
        thresholds: {
            hesitationTime: 3000,        // 3s instead of 2s
            errorClickWindow: 4000,      // 4s instead of 3s
            scrollBackThreshold: 3,      // 3 instead of 2
            mouseEdgeTime: 2000,         // 2s instead of 1.5s
            rapidClickInterval: 400,     // 400ms instead of 500ms
            inactivityWarning: 15000     // 15s instead of 10s
        },
        
        // Confusion level thresholds (higher = less trigger)
        confusionThresholds: {
            low: 0.4,      // 0.4 instead of 0.3
            medium: 0.7,   // 0.7 instead of 0.6
            high: 0.85     // 0.85 instead of 0.8
        },
        
        // Update intervals
        updateInterval: 10000,       // 10s instead of 5s
        signalResetInterval: 40000,  // 40s instead of 30s
        
        // Feedback settings
        feedbackPrompt: {
            enabled: true,
            minScore: 0.7,           // Only ask at high confusion
            cooldown: 60000,         // Don't ask more than once per minute
            autoDismiss: 15000       // Auto-dismiss after 15s
        }
    },
    
    /**
     * BALANCED MODE - Current Sprint 1 behavior
     * - Moderate UI adaptations
     * - Standard thresholds
     * - Good for testing
     */
    balanced: {
        mode: 'balanced',
        autoAdapt: true,
        
        features: {
            signalDetection: true,
            mlClassification: true,
            uiAdaptation: true,
            feedbackCollection: true,
            dataLogging: true
        },
        
        thresholds: {
            hesitationTime: 2000,
            errorClickWindow: 3000,
            scrollBackThreshold: 2,
            mouseEdgeTime: 1500,
            rapidClickInterval: 500,
            inactivityWarning: 10000
        },
        
        confusionThresholds: {
            low: 0.3,
            medium: 0.6,
            high: 0.8
        },
        
        updateInterval: 5000,
        signalResetInterval: 30000,
        
        // Adaptation levels
        adaptations: {
            subtleHelp: true,              // Low confusion
            moderateSimplification: true,  // Medium confusion
            aggressiveSimplification: false // High confusion - DISABLED
        },
        
        feedbackPrompt: {
            enabled: true,
            minScore: 0.6,
            cooldown: 45000,
            autoDismiss: 12000
        }
    },
    
    /**
     * AGGRESSIVE MODE - Full adaptation (use with caution!)
     * - All UI adaptations enabled
     * - Lower thresholds (more sensitive)
     * - May be intrusive
     */
    aggressive: {
        mode: 'aggressive',
        autoAdapt: true,
        
        features: {
            signalDetection: true,
            mlClassification: true,
            uiAdaptation: true,
            feedbackCollection: true,
            dataLogging: true
        },
        
        thresholds: {
            hesitationTime: 1500,        // More sensitive
            errorClickWindow: 2500,
            scrollBackThreshold: 2,
            mouseEdgeTime: 1000,
            rapidClickInterval: 600,
            inactivityWarning: 8000
        },
        
        confusionThresholds: {
            low: 0.25,     // Lower thresholds
            medium: 0.5,
            high: 0.75
        },
        
        updateInterval: 3000,         // More frequent checks
        signalResetInterval: 20000,
        
        adaptations: {
            subtleHelp: true,
            moderateSimplification: true,
            aggressiveSimplification: true  // All levels enabled
        },
        
        feedbackPrompt: {
            enabled: true,
            minScore: 0.5,
            cooldown: 30000,
            autoDismiss: 10000
        }
    },
    
    /**
     * RESEARCH MODE - Maximum data collection, no UI changes
     * Perfect pentru user testing
     */
    research: {
        mode: 'research',
        autoAdapt: false,  // No UI changes
        
        features: {
            signalDetection: true,
            mlClassification: true,
            uiAdaptation: false,      // Disabled
            feedbackCollection: true,  // Enabled
            dataLogging: true,         // Full logging
            verboseLogging: true       // Extra detailed logs
        },
        
        // Standard thresholds
        thresholds: {
            hesitationTime: 2000,
            errorClickWindow: 3000,
            scrollBackThreshold: 2,
            mouseEdgeTime: 1500,
            rapidClickInterval: 500,
            inactivityWarning: 10000
        },
        
        confusionThresholds: {
            low: 0.3,
            medium: 0.6,
            high: 0.8
        },
        
        updateInterval: 5000,
        signalResetInterval: 30000,
        
        feedbackPrompt: {
            enabled: true,
            minScore: 0.4,       // Ask more frequently
            cooldown: 20000,     // More often
            autoDismiss: 20000,  // Longer visible
            detailed: true       // Collect detailed feedback
        }
    }
};

/**
 * Get configuration by mode name
 */
export function getConfig(modeName = 'safe') {
    const config = CONFUSION_MODES[modeName];
    
    if (!config) {
        console.warn(`[Config] Unknown mode: ${modeName}, using 'safe' mode`);
        return CONFUSION_MODES.safe;
    }
    
    return { ...config };  // Clone to prevent mutations
}

/**
 * Merge custom config with mode defaults
 */
export function mergeConfig(modeName = 'safe', customConfig = {}) {
    const baseConfig = getConfig(modeName);
    
    // Deep merge
    return {
        ...baseConfig,
        ...customConfig,
        features: {
            ...baseConfig.features,
            ...(customConfig.features || {})
        },
        thresholds: {
            ...baseConfig.thresholds,
            ...(customConfig.thresholds || {})
        },
        confusionThresholds: {
            ...baseConfig.confusionThresholds,
            ...(customConfig.confusionThresholds || {})
        },
        feedbackPrompt: {
            ...baseConfig.feedbackPrompt,
            ...(customConfig.feedbackPrompt || {})
        }
    };
}

/**
 * Validate configuration
 */
export function validateConfig(config) {
    const errors = [];
    
    // Required fields
    if (!config.mode) errors.push('mode is required');
    if (config.autoAdapt === undefined) errors.push('autoAdapt is required');
    
    // Threshold validation
    if (config.thresholds) {
        const t = config.thresholds;
        if (t.hesitationTime < 500) errors.push('hesitationTime too low (<500ms)');
        if (t.inactivityWarning < 5000) errors.push('inactivityWarning too low (<5s)');
    }
    
    // Confusion thresholds
    if (config.confusionThresholds) {
        const ct = config.confusionThresholds;
        if (ct.low >= ct.medium) errors.push('low threshold must be < medium');
        if (ct.medium >= ct.high) errors.push('medium threshold must be < high');
    }
    
    if (errors.length > 0) {
        console.error('[Config] Validation errors:', errors);
        return false;
    }
    
    return true;
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.CONFUSION_MODES = CONFUSION_MODES;
}
