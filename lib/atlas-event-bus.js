// src/atlas-event-bus.js
// 🔥 ATLAS Event Bus v4.2 - Central event system for tracking

/**
 * Central Event Bus for ATLAS
 * Handles all events: real user feedback, simulations, ML actions, etc.
 */
class ATLASEventBus {
    constructor() {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistory = 1000;
        
        console.log('[EventBus] 🚀 ATLAS Event Bus v4.2 initialized');
    }

    /**
     * Emit an event to all listeners
     * @param {string} eventType - Type of event
     * @param {object} data - Event data
     */
    emit(eventType, data) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            data: { ...data }
        };

        // Store in history
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistory) {
            this.eventHistory.shift();
        }

        // Notify listeners
        const listeners = this.listeners.get(eventType) || [];
        listeners.forEach(callback => {
            try {
                callback(event.data, event);
            } catch (error) {
                console.error(`[EventBus] Error in listener for ${eventType}:`, error);
            }
        });

        // Debug logging
        if (eventType === 'user-feedback') {
            console.log(`[EventBus] 👤 Real user feedback:`, {
                action: data.action,
                reward: data.reward,
                component: data.componentId
            });
        }
    }

    /**
     * Subscribe to an event
     * @param {string} eventType - Type of event to listen for
     * @param {function} callback - Callback function
     * @returns {function} Unsubscribe function
     */
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        this.listeners.get(eventType).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(eventType) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Subscribe to an event only once
     * @param {string} eventType - Type of event
     * @param {function} callback - Callback function
     */
    once(eventType, callback) {
        const unsubscribe = this.on(eventType, (data, event) => {
            callback(data, event);
            unsubscribe();
        });
    }

    /**
     * Remove all listeners for an event type
     * @param {string} eventType - Type of event
     */
    off(eventType) {
        this.listeners.delete(eventType);
    }

    /**
     * Get event history
     * @param {string} eventType - Optional filter by type
     * @param {number} limit - Maximum number of events
     * @returns {Array} Event history
     */
    getHistory(eventType = null, limit = 100) {
        let history = this.eventHistory;

        if (eventType) {
            history = history.filter(e => e.type === eventType);
        }

        return history.slice(-limit);
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        console.log('[EventBus] History cleared');
    }

    /**
     * Get statistics about events
     * @returns {object} Event statistics
     */
    getStats() {
        const stats = {
            totalEvents: this.eventHistory.length,
            eventTypes: {},
            listeners: {}
        };

        // Count by type
        this.eventHistory.forEach(event => {
            stats.eventTypes[event.type] = (stats.eventTypes[event.type] || 0) + 1;
        });

        // Count listeners
        this.listeners.forEach((callbacks, type) => {
            stats.listeners[type] = callbacks.length;
        });

        return stats;
    }
}

// Create global singleton
if (typeof window !== 'undefined') {
    if (!window.ATLAS_EVENTS) {
        window.ATLAS_EVENTS = new ATLASEventBus();
        console.log('[EventBus] ✅ Global event bus created: window.ATLAS_EVENTS');
    }
}

// Export for modules
export const eventBus = typeof window !== 'undefined' ? window.ATLAS_EVENTS : new ATLASEventBus();
export default ATLASEventBus;
