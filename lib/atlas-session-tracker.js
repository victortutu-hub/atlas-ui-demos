// src/atlas-session-tracker.js
// 🎯 Session Tracking for Real Users v4.3 - WITH LOCALSTORAGE PERSISTENCE!

/**
 * Session Tracker pentru utilizatori reali
 * Gestionează sesiuni, acțiuni utilizator, și metrici
 * ⭐ NEW: Auto-save în localStorage pentru persistență între refresh-uri!
 */
class ATLASSessionTracker {
    constructor() {
        this.currentSession = null;
        this.sessions = [];
        this.maxSessions = 100;
        this.storageKey = 'atlas-session-tracker-data';
        
        // ⭐ NEW: Load existing data from localStorage
        this.loadFromStorage();
        
        // ⭐ NEW: Initialize or resume session
        this.initSession();
        
        console.log('[SessionTracker] 🎯 Session tracking initialized with persistence');
    }

    /**
     * ⭐ NEW: Load sessions from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.sessions = data.sessions || [];
                
                // ⭐ FIX: Normalize old sessions to ensure all arrays exist
                this.sessions = this.sessions.map(session => ({
                    ...session,
                    interactions: session.interactions || [],
                    feedbacks: session.feedbacks || [],
                    layouts: session.layouts || [],
                    actions: session.actions || []
                }));
                
                // Limit stored sessions
                if (this.sessions.length > this.maxSessions) {
                    this.sessions = this.sessions.slice(-this.maxSessions);
                }
                
                console.log('[SessionTracker] 📦 Loaded', this.sessions.length, 'sessions from storage');
            }
        } catch (e) {
            console.warn('[SessionTracker] Could not load from storage:', e);
            this.sessions = [];
        }
    }

    /**
     * ⭐ NEW: Save sessions to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                sessions: this.sessions,
                lastUpdated: Date.now()
            };
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            console.log('[SessionTracker] 💾 Saved to localStorage');
        } catch (e) {
            console.warn('[SessionTracker] Could not save to storage:', e);
        }
    }

    /**
     * Initialize a new session
     */
    initSession() {
        // Check if we have a session in sessionStorage (for same browser session)
        const sessionId = sessionStorage.getItem('atlas-current-session-id');
        
        if (sessionId) {
            // Try to resume existing session
            const existing = this.sessions.find(s => s.id === sessionId && !s.endTime);
            if (existing) {
                this.currentSession = existing;
                console.log('[SessionTracker] 📝 Resumed session:', sessionId);
                return;
            }
        }

        // Create new session
        this.currentSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            endTime: null,
            interactions: [],
            feedbacks: [],
            layouts: [],
            actions: [],
            metadata: {
                userAgent: navigator.userAgent,
                screenSize: `${window.innerWidth}x${window.innerHeight}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
        };

        // Store in sessions array
        this.sessions.push(this.currentSession);
        
        // Limit sessions
        if (this.sessions.length > this.maxSessions) {
            this.sessions.shift();
        }

        // Save session ID in sessionStorage
        sessionStorage.setItem('atlas-current-session-id', this.currentSession.id);

        // ⭐ Save to localStorage
        this.saveToStorage();

        console.log('[SessionTracker] 📝 New session started:', this.currentSession.id);
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get or create session ID
     */
    getSessionId() {
        if (!this.currentSession) {
            this.initSession();
        }
        return this.currentSession.id;
    }

    /**
     * Track user feedback
     */
    trackFeedback(data) {
        if (!this.currentSession) {
            this.initSession();
        }

        // ⭐ FIX: Ensure arrays exist (for old sessions loaded from storage)
        if (!this.currentSession.feedbacks) this.currentSession.feedbacks = [];
        if (!this.currentSession.interactions) this.currentSession.interactions = [];

        const feedback = {
            timestamp: Date.now(),
            type: 'feedback',
            ...data
        };

        this.currentSession.feedbacks.push(feedback);
        this.currentSession.interactions.push(feedback);

        // ⭐ Auto-save to localStorage
        this.saveToStorage();

        console.log('[SessionTracker] 👍/👎 Feedback tracked:', {
            action: data.action,
            reward: data.reward
        });
    }

    /**
     * Track layout view
     */
    trackLayoutView(layoutData) {
        if (!this.currentSession) {
            this.initSession();
        }

        // ⭐ FIX: Ensure arrays exist (for old sessions loaded from storage)
        if (!this.currentSession.layouts) this.currentSession.layouts = [];
        if (!this.currentSession.interactions) this.currentSession.interactions = [];

        const layout = {
            timestamp: Date.now(),
            type: 'layout-view',
            ...layoutData
        };

        this.currentSession.layouts.push(layout);
        this.currentSession.interactions.push(layout);

        // ⭐ Auto-save to localStorage
        this.saveToStorage();
    }

    /**
     * Track ML action
     */
    trackMLAction(actionData) {
        if (!this.currentSession) {
            this.initSession();
        }

        // ⭐ FIX: Ensure arrays exist (for old sessions loaded from storage)
        if (!this.currentSession.actions) this.currentSession.actions = [];
        if (!this.currentSession.interactions) this.currentSession.interactions = [];

        const action = {
            timestamp: Date.now(),
            type: 'ml-action',
            ...actionData
        };

        this.currentSession.actions.push(action);
        this.currentSession.interactions.push(action);

        // ⭐ Auto-save to localStorage
        this.saveToStorage();
    }

    /**
     * End current session
     */
    endSession() {
        if (!this.currentSession) return;

        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        console.log('[SessionTracker] ✅ Session ended:', {
            id: this.currentSession.id,
            duration: this.currentSession.duration + 'ms',
            interactions: this.currentSession.interactions.length
        });

        // ⭐ Save to localStorage
        this.saveToStorage();

        // Remove from sessionStorage
        sessionStorage.removeItem('atlas-current-session-id');

        // Start new session
        this.initSession();
    }

    /**
     * Get current session
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * Get all sessions
     */
    getAllSessions() {
        return this.sessions;
    }

    /**
     * Get session statistics
     */
    getStats() {
        const allSessions = [...this.sessions];

        const totalFeedbacks = allSessions.reduce((sum, s) => sum + (s.feedbacks?.length || 0), 0);
        const positiveFeedbacks = allSessions.reduce((sum, s) => 
            sum + (s.feedbacks?.filter(f => f.reward === 1).length || 0), 0
        );

        return {
            totalSessions: allSessions.length,
            currentSessionId: this.currentSession?.id,
            totalInteractions: allSessions.reduce((sum, s) => sum + (s.interactions?.length || 0), 0),
            totalFeedbacks: totalFeedbacks,
            positiveFeedbacks: positiveFeedbacks,
            negativeFeedbacks: totalFeedbacks - positiveFeedbacks,
            satisfactionRate: totalFeedbacks > 0 ? positiveFeedbacks / totalFeedbacks : 0,
            avgSessionDuration: allSessions.filter(s => s.duration).length > 0 
                ? allSessions.filter(s => s.duration).reduce((sum, s) => sum + (s.duration || 0), 0) / allSessions.filter(s => s.duration).length
                : 0
        };
    }

    /**
     * Export sessions as JSON
     */
    exportSessions() {
        return JSON.stringify({
            sessions: this.sessions,
            currentSession: this.currentSession,
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Clear all sessions (from memory AND localStorage)
     */
    clearSessions() {
        this.sessions = [];
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem('atlas-current-session-id');
        this.initSession();
        console.log('[SessionTracker] 🗑️ All sessions cleared (memory + localStorage)');
    }
}

// Create global singleton
if (typeof window !== 'undefined') {
    if (!window.ATLAS_SESSION_TRACKER) {
        window.ATLAS_SESSION_TRACKER = new ATLASSessionTracker();
        console.log('[SessionTracker] ✅ Global tracker created: window.ATLAS_SESSION_TRACKER');
    }
}

export const sessionTracker = typeof window !== 'undefined' 
    ? window.ATLAS_SESSION_TRACKER 
    : new ATLASSessionTracker();

export default ATLASSessionTracker;
