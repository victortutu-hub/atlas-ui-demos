// src/atlas-confusion-feedback.js
// 💬 Explicit Feedback Collection System

import { eventBus } from './atlas-event-bus.js';

/**
 * Feedback Collector
 * Colectează ground truth labels de la utilizatori
 */
export class ConfusionFeedbackCollector {
    constructor(config = {}) {
        this.config = {
            minScore: 0.7,           // Ask only at high confusion
            cooldown: 60000,         // 1 minute between prompts
            autoDismiss: 15000,      // Auto-dismiss after 15s
            detailed: false,         // Collect detailed feedback
            ...config
        };
        
        this.lastPromptTime = 0;
        this.feedbackData = [];
        this.maxFeedbackSize = 100;
        
        // Active prompt reference
        this.activePrompt = null;
        
        console.log('[FeedbackCollector] Initialized with config:', this.config);
    }
    
    /**
     * Show feedback prompt to user
     */
    showPrompt(confusionData) {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastPromptTime < this.config.cooldown) {
            console.log('[FeedbackCollector] Cooldown active, skipping prompt');
            return;
        }
        
        // Check minimum score
        if (confusionData.score < this.config.minScore) {
            return;
        }
        
        // Don't show if one already active
        if (this.activePrompt) {
            return;
        }
        
        this.lastPromptTime = now;
        
        // Create prompt UI
        if (this.config.detailed) {
            this.showDetailedPrompt(confusionData);
        } else {
            this.showSimplePrompt(confusionData);
        }
    }
    
    /**
     * Simple Yes/No prompt
     */
    showSimplePrompt(confusionData) {
        const promptId = 'confusion-feedback-prompt-' + Date.now();
        
        const prompt = document.createElement('div');
        prompt.id = promptId;
        prompt.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 320px;
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            ">
                <style>
                    @keyframes slideIn {
                        from { transform: translateX(400px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: start;
                    margin-bottom: 12px;
                ">
                    <div style="
                        font-size: 14px;
                        font-weight: 600;
                        color: #333;
                    ">Quick Question 💭</div>
                    <button onclick="window.__dismissConfusionPrompt__('${promptId}')" style="
                        background: transparent;
                        border: none;
                        font-size: 20px;
                        line-height: 1;
                        color: #999;
                        cursor: pointer;
                        padding: 0;
                        margin: -4px -4px 0 0;
                    ">×</button>
                </div>
                
                <div style="
                    font-size: 13px;
                    color: #666;
                    margin-bottom: 14px;
                    line-height: 1.5;
                ">
                    Are you finding it difficult to complete your task on this page?
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.__submitConfusionFeedback__('${promptId}', 'yes', ${confusionData.score})" style="
                        flex: 1;
                        padding: 10px 16px;
                        background: #f44336;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#d32f2f'" onmouseout="this.style.background='#f44336'">
                        😕 Yes, I'm confused
                    </button>
                    
                    <button onclick="window.__submitConfusionFeedback__('${promptId}', 'no', ${confusionData.score})" style="
                        flex: 1;
                        padding: 10px 16px;
                        background: #4caf50;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 13px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#388e3c'" onmouseout="this.style.background='#4caf50'">
                        ✓ No, I'm fine
                    </button>
                </div>
                
                <div style="
                    font-size: 11px;
                    color: #999;
                    margin-top: 10px;
                    text-align: center;
                ">
                    This helps us improve your experience
                </div>
            </div>
        `;
        
        document.body.appendChild(prompt);
        this.activePrompt = promptId;
        
        // Setup global handlers
        window.__submitConfusionFeedback__ = (id, answer, detectedScore) => {
            this.handleFeedback(id, answer, detectedScore, confusionData);
        };
        
        window.__dismissConfusionPrompt__ = (id) => {
            this.dismissPrompt(id);
        };
        
        // Auto-dismiss
        setTimeout(() => {
            if (document.getElementById(promptId)) {
                this.dismissPrompt(promptId);
            }
        }, this.config.autoDismiss);
    }
    
    /**
     * Detailed feedback with rating
     */
    showDetailedPrompt(confusionData) {
        const promptId = 'confusion-feedback-detailed-' + Date.now();
        
        const prompt = document.createElement('div');
        prompt.id = promptId;
        prompt.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 400px;
                z-index: 10001;
            ">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #333;">
                    Help Us Improve 🎯
                </h3>
                
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #666; line-height: 1.6;">
                    How would you rate your experience on this page?
                </p>
                
                <div id="${promptId}-rating" style="margin-bottom: 20px;">
                    <div style="margin-bottom: 8px; font-size: 13px; color: #666;">
                        Level of confusion:
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        ${[1,2,3,4,5].map(n => `
                            <button onclick="window.__selectRating__('${promptId}', ${n})" 
                                    id="${promptId}-rating-${n}"
                                    style="
                                width: 48px;
                                height: 48px;
                                border: 2px solid #e0e0e0;
                                background: white;
                                border-radius: 8px;
                                font-size: 20px;
                                cursor: pointer;
                                transition: all 0.2s;
                            ">${['😊','🙂','😐','😕','😰'][n-1]}</button>
                        `).join('')}
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #999;">
                        <span>Clear</span>
                        <span>Very Confused</span>
                    </div>
                </div>
                
                <textarea id="${promptId}-comment" placeholder="What was confusing? (optional)" style="
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 13px;
                    font-family: inherit;
                    resize: vertical;
                    min-height: 60px;
                    margin-bottom: 16px;
                "></textarea>
                
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.__submitDetailedFeedback__('${promptId}', ${confusionData.score})" style="
                        flex: 1;
                        padding: 12px;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Submit</button>
                    
                    <button onclick="window.__dismissConfusionPrompt__('${promptId}')" style="
                        padding: 12px 20px;
                        background: transparent;
                        color: #666;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                    ">Skip</button>
                </div>
            </div>
            
            <!-- Backdrop -->
            <div onclick="window.__dismissConfusionPrompt__('${promptId}')" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.4);
                z-index: 10000;
            "></div>
        `;
        
        document.body.appendChild(prompt);
        this.activePrompt = promptId;
        
        // Setup handlers
        let selectedRating = null;
        
        window.__selectRating__ = (id, rating) => {
            selectedRating = rating;
            // Visual feedback
            for (let i = 1; i <= 5; i++) {
                const btn = document.getElementById(`${id}-rating-${i}`);
                if (btn) {
                    btn.style.borderColor = i === rating ? '#667eea' : '#e0e0e0';
                    btn.style.background = i === rating ? '#f0f4ff' : 'white';
                }
            }
        };
        
        window.__submitDetailedFeedback__ = (id, detectedScore) => {
            if (!selectedRating) {
                alert('Please select a rating');
                return;
            }
            
            const comment = document.getElementById(`${id}-comment`)?.value || '';
            
            this.handleDetailedFeedback(id, {
                rating: selectedRating,
                comment,
                detectedScore,
                confusionData
            });
        };
    }
    
    /**
     * Handle simple feedback
     */
    handleFeedback(promptId, answer, detectedScore, confusionData) {
        const actualConfusion = answer === 'yes' ? 0.9 : 0.1;
        
        // Store feedback
        const feedback = {
            timestamp: Date.now(),
            type: 'simple',
            answer,
            detectedScore,
            actualConfusion,
            signals: confusionData.signals,
            level: confusionData.level.level,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.recordFeedback(feedback);
        
        // Emit event
        eventBus.emit('confusion-feedback', feedback);
        
        // Show thank you
        this.showThankYou(promptId, answer);
        
        console.log('[FeedbackCollector] Feedback recorded:', feedback);
    }
    
    /**
     * Handle detailed feedback
     */
    handleDetailedFeedback(promptId, data) {
        const actualConfusion = data.rating / 5;  // Normalize 1-5 to 0-1
        
        const feedback = {
            timestamp: Date.now(),
            type: 'detailed',
            rating: data.rating,
            comment: data.comment,
            detectedScore: data.detectedScore,
            actualConfusion,
            signals: data.confusionData.signals,
            level: data.confusionData.level.level,
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        this.recordFeedback(feedback);
        
        // Emit event
        eventBus.emit('confusion-feedback', feedback);
        
        // Show thank you
        this.showThankYou(promptId, 'detailed');
        
        console.log('[FeedbackCollector] Detailed feedback recorded:', feedback);
    }
    
    /**
     * Show thank you message
     */
    showThankYou(promptId, answer) {
        const prompt = document.getElementById(promptId);
        if (!prompt) return;
        
        const message = answer === 'yes' 
            ? 'Thank you! We\'ll work on making this clearer.' 
            : answer === 'no'
            ? 'Great! Glad you\'re finding your way around.'
            : 'Thank you for your feedback!';
        
        prompt.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4caf50;
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 320px;
                z-index: 10000;
                text-align: center;
            ">
                <div style="font-size: 24px; margin-bottom: 8px;">✓</div>
                <div style="font-size: 14px; font-weight: 600;">${message}</div>
            </div>
        `;
        
        // Fade out and remove
        setTimeout(() => {
            if (prompt) {
                prompt.style.transition = 'opacity 0.3s';
                prompt.style.opacity = '0';
                setTimeout(() => prompt.remove(), 300);
            }
        }, 2000);
        
        this.activePrompt = null;
    }
    
    /**
     * Dismiss prompt
     */
    dismissPrompt(promptId) {
        const prompt = document.getElementById(promptId);
        if (prompt) {
            prompt.style.transition = 'opacity 0.3s';
            prompt.style.opacity = '0';
            setTimeout(() => prompt.remove(), 300);
        }
        this.activePrompt = null;
    }
    
    /**
     * Record feedback in memory
     */
    recordFeedback(feedback) {
        this.feedbackData.push(feedback);
        
        // Limit size
        if (this.feedbackData.length > this.maxFeedbackSize) {
            this.feedbackData.shift();
        }
        
        // Also save to localStorage
        try {
            const stored = JSON.parse(localStorage.getItem('atlas-confusion-feedback') || '[]');
            stored.push(feedback);
            
            // Keep last 100
            const toStore = stored.slice(-100);
            localStorage.setItem('atlas-confusion-feedback', JSON.stringify(toStore));
        } catch (e) {
            console.warn('[FeedbackCollector] Could not save to localStorage:', e);
        }
    }
    
    /**
     * Get all feedback
     */
    getFeedback() {
        return [...this.feedbackData];
    }
    
    /**
     * Get feedback statistics
     */
    getStats() {
        const total = this.feedbackData.length;
        if (total === 0) return null;
        
        const simple = this.feedbackData.filter(f => f.type === 'simple');
        const detailed = this.feedbackData.filter(f => f.type === 'detailed');
        
        const confused = this.feedbackData.filter(f => 
            f.type === 'simple' ? f.answer === 'yes' : f.rating >= 4
        );
        
        const notConfused = this.feedbackData.filter(f => 
            f.type === 'simple' ? f.answer === 'no' : f.rating <= 2
        );
        
        return {
            total,
            simple: simple.length,
            detailed: detailed.length,
            confused: confused.length,
            notConfused: notConfused.length,
            confusionRate: confused.length / total,
            avgDetectedScore: this.feedbackData.reduce((sum, f) => sum + f.detectedScore, 0) / total,
            avgActualConfusion: this.feedbackData.reduce((sum, f) => sum + f.actualConfusion, 0) / total
        };
    }
    
    /**
     * Export feedback as JSON
     */
    export() {
        return {
            feedbackData: this.feedbackData,
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        };
    }
    
    /**
     * Clear all feedback
     */
    clear() {
        this.feedbackData = [];
        localStorage.removeItem('atlas-confusion-feedback');
        console.log('[FeedbackCollector] Feedback cleared');
    }
}

// Create global singleton
if (typeof window !== 'undefined') {
    if (!window.ATLAS_FEEDBACK_COLLECTOR) {
        window.ATLAS_FEEDBACK_COLLECTOR = new ConfusionFeedbackCollector();
    }
}

export const feedbackCollector = typeof window !== 'undefined'
    ? window.ATLAS_FEEDBACK_COLLECTOR
    : new ConfusionFeedbackCollector();

export default ConfusionFeedbackCollector;
