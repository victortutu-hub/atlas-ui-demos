// src/atlas-confusion-detector.js
// 🧠 ATLAS Confusion Detection v1.0 - Micro-behavioral ML for User Confusion

/**
 * SPRINT 1: CONFUSION DETECTION
 * 
 * Detectează confuzia utilizatorului prin:
 * - Hesitation: mouse idle, hover fără click
 * - Error clicks: click-uri pe elemente inactive, click-uri repetate
 * - Scroll-back: scroll up repetat (căutare info)
 * - Abandonment: mouse la margine, inactivitate
 * 
 * ML Classification → Real-time UI Adaptation
 */

import { eventBus } from './atlas-event-bus.js';
import { sessionTracker } from './atlas-session-tracker.js';

/**
 * ⚡ PERFORMANCE UTILITIES - SPRINT 1
 * Throttle & Debounce pentru optimizarea evenimentelor
 */

/**
 * Throttle - Execută funcția maximum o dată per interval
 * Perfect pentru mousemove, scroll - evenimente care se repetă rapid
 * Reduce CPU usage cu 80-90%!
 * 
 * @param {Function} func - Funcția de executat
 * @param {Number} delay - Delay în ms între execuții
 * @returns {Function} Throttled function
 */
function throttle(func, delay) {
    let lastCall = 0;
    let timeoutId = null;
    
    return function throttled(...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;
        
        if (timeSinceLastCall >= delay) {
            // Enough time passed, execute immediately
            lastCall = now;
            return func.apply(this, args);
        } else {
            // Too soon, schedule for later (trailing edge)
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                func.apply(this, args);
            }, delay - timeSinceLastCall);
        }
    };
}

/**
 * Debounce - Așteaptă ca utilizatorul să termine acțiunea
 * Perfect pentru hover checking - execută doar după ce mouse-ul s-a oprit
 * 
 * @param {Function} func - Funcția de executat
 * @param {Number} delay - Delay în ms după ultima apelare
 * @returns {Function} Debounced function
 */
function debounce(func, delay) {
    let timeoutId = null;
    
    return function debounced(...args) {
        // Clear previous timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        // Set new timeout - only executes after user stops
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Confusion Signal Detector
 * Monitorizează micro-comportamente individuale
 */
class ConfusionSignalDetector {
    constructor() {
        // Thresholds pentru detectare
        this.thresholds = {
            hesitationTime: 2000,      // 2s hover fără click = hesitation
            errorClickWindow: 3000,    // 3s window pentru error clicks
            scrollBackThreshold: 2,    // 2 scroll-back-uri în 5s
            mouseEdgeTime: 1500,       // 1.5s mouse la margine
            rapidClickInterval: 500,   // <500ms între clicks = rapid/confused
            inactivityWarning: 10000   // 10s inactivitate = potential abandonment
        };

        // State tracking
        this.state = {
            mousePosition: { x: 0, y: 0 },
            lastMouseMove: Date.now(),
            lastClick: null,
            hoverStart: null,
            hoveredElement: null,
            scrollDirection: null,
            lastScrollY: 0,
            scrollBackCount: 0,
            scrollBackWindow: 5000,
            lastScrollBackReset: Date.now(),
            errorClicks: [],
            clickHistory: [],
            isMouseAtEdge: false,
            edgeEnterTime: null,
            inactivityTimer: null
        };

        // Signals detected
        this.signals = {
            hesitation: 0,
            errorClicks: 0,
            scrollBack: 0,
            mouseEdge: 0,
            rapidClicks: 0,
            inactivity: 0
        };

        this.setupListeners();
        console.log('[ConfusionDetector] 🔍 Signal detector initialized');
    }

    setupListeners() {
        // ⚡ THROTTLED Mouse movement tracking (100ms = max 10 events/s)
        // Reduces CPU usage by 90%! Was 100+ events/s, now 10 events/s
        document.addEventListener('mousemove', throttle((e) => this.handleMouseMove(e), 100));
        
        // ✔️ Click tracking - NO throttle (important events!)
        document.addEventListener('click', (e) => this.handleClick(e));
        
        // ⚡ THROTTLED Scroll tracking (150ms = max 6-7 events/s)
        window.addEventListener('scroll', throttle(() => this.handleScroll(), 150));
        
        // 👁️ DEBOUNCED Hover tracking (200ms after mouse stops)
        // Only triggers after user stops moving mouse for 200ms
        document.addEventListener('mouseover', debounce((e) => this.handleMouseOver(e), 200));
        document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
        
        // Inactivity tracking
        this.startInactivityMonitor();
        
        console.log('[⚡ Performance] Throttle/Debounce applied to event listeners');
    }

    handleMouseMove(e) {
        const now = Date.now();
        this.state.lastMouseMove = now;
        this.state.mousePosition = { x: e.clientX, y: e.clientY };

        // Reset inactivity
        this.resetInactivityTimer();

        // Check if mouse is at edge (potential abandonment)
        this.checkMouseEdge(e);
    }

    handleClick(e) {
        const now = Date.now();
        const target = e.target;

        // Add to click history
        this.state.clickHistory.push({
            timestamp: now,
            target: target,
            x: e.clientX,
            y: e.clientY
        });

        // Keep only recent clicks
        this.state.clickHistory = this.state.clickHistory.filter(
            click => now - click.timestamp < this.thresholds.errorClickWindow
        );

        // Detect rapid clicks (confusion indicator)
        this.detectRapidClicks(now);

        // Detect error clicks (inactive elements, repeated same element)
        this.detectErrorClick(target);

        this.state.lastClick = { timestamp: now, target };
    }

    handleScroll() {
        const currentScrollY = window.scrollY;
        const now = Date.now();

        // Reset scroll-back counter after window expires
        if (now - this.state.lastScrollBackReset > this.state.scrollBackWindow) {
            this.state.scrollBackCount = 0;
            this.state.lastScrollBackReset = now;
        }

        // Detect scroll direction
        if (currentScrollY < this.state.lastScrollY) {
            // Scrolling up = potential confusion
            this.state.scrollDirection = 'up';
            this.state.scrollBackCount++;

            if (this.state.scrollBackCount >= this.thresholds.scrollBackThreshold) {
                this.signals.scrollBack++;
                this.emitSignal('scroll-back', {
                    count: this.state.scrollBackCount,
                    intensity: Math.min(this.state.scrollBackCount / 5, 1)
                });
            }
        } else {
            this.state.scrollDirection = 'down';
        }

        this.state.lastScrollY = currentScrollY;
    }

    handleMouseOver(e) {
        const target = e.target;
        
        // Skip disabled elements for hesitation detection
        const isDisabled = target.disabled || 
                          target.hasAttribute('disabled') ||
                          target.classList.contains('fake-btn');
        
        if (isDisabled) return;
        
        // Skip non-interactive elements for hesitation detection
        if (!this.isInteractiveElement(target)) return;

        this.state.hoverStart = Date.now();
        this.state.hoveredElement = target;

        // Start hesitation detection
        setTimeout(() => this.checkHesitation(), this.thresholds.hesitationTime);
    }

    handleMouseOut(e) {
        this.state.hoverStart = null;
        this.state.hoveredElement = null;
    }

    checkHesitation() {
        if (!this.state.hoverStart || !this.state.hoveredElement) return;

        const hoverDuration = Date.now() - this.state.hoverStart;

        // Still hovering after threshold without clicking?
        if (hoverDuration >= this.thresholds.hesitationTime) {
            this.signals.hesitation++;
            this.emitSignal('hesitation', {
                element: this.state.hoveredElement.tagName,
                duration: hoverDuration
            });
        }
    }

    detectRapidClicks(now) {
        const recentClicks = this.state.clickHistory.filter(
            click => now - click.timestamp < this.thresholds.rapidClickInterval * 2
        );

        if (recentClicks.length >= 3) {
            // 3+ clicks in short time = confusion
            this.signals.rapidClicks++;
            this.emitSignal('rapid-clicks', {
                count: recentClicks.length,
                interval: now - recentClicks[0].timestamp
            });
        }
    }

    detectErrorClick(target) {
        // Special case: Disabled buttons/inputs are error clicks!
        const isDisabled = target.disabled || 
                          target.hasAttribute('disabled') ||
                          target.classList.contains('fake-btn') ||
                          target.getAttribute('aria-disabled') === 'true';
        
        if (isDisabled) {
            this.signals.errorClicks++;
            this.emitSignal('error-click', {
                element: target.tagName,
                className: target.className,
                reason: 'disabled-element'
            });
        }
        // Error click = clicking on non-interactive element
        else if (!this.isInteractiveElement(target) && !this.isTextSelectionIntent(target)) {
            this.signals.errorClicks++;
            this.emitSignal('error-click', {
                element: target.tagName,
                className: target.className,
                reason: 'non-interactive'
            });
        }

        // Repeated clicks on same element (frustration)
        const recentSameElement = this.state.clickHistory.filter(
            click => click.target === target
        );

        if (recentSameElement.length >= 2) {
            this.emitSignal('repeated-click', {
                element: target.tagName,
                count: recentSameElement.length
            });
        }
    }

    checkMouseEdge(e) {
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const edgeMargin = 50; // pixels from edge

        const isAtEdge = 
            clientX < edgeMargin || 
            clientX > innerWidth - edgeMargin || 
            clientY < edgeMargin || 
            clientY > innerHeight - edgeMargin;

        if (isAtEdge && !this.state.isMouseAtEdge) {
            // Entered edge zone
            this.state.isMouseAtEdge = true;
            this.state.edgeEnterTime = Date.now();

            // Check after threshold
            setTimeout(() => this.checkPersistentEdge(), this.thresholds.mouseEdgeTime);
        } else if (!isAtEdge) {
            this.state.isMouseAtEdge = false;
            this.state.edgeEnterTime = null;
        }
    }

    checkPersistentEdge() {
        if (this.state.isMouseAtEdge && this.state.edgeEnterTime) {
            const duration = Date.now() - this.state.edgeEnterTime;
            
            if (duration >= this.thresholds.mouseEdgeTime) {
                this.signals.mouseEdge++;
                this.emitSignal('mouse-edge', { duration });
            }
        }
    }

    startInactivityMonitor() {
        this.resetInactivityTimer();
    }

    resetInactivityTimer() {
        if (this.state.inactivityTimer) {
            clearTimeout(this.state.inactivityTimer);
        }

        this.state.inactivityTimer = setTimeout(() => {
            this.signals.inactivity++;
            this.emitSignal('inactivity', {
                duration: this.thresholds.inactivityWarning
            });
        }, this.thresholds.inactivityWarning);
    }

    isInteractiveElement(element) {
        const interactive = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        return interactive.includes(element.tagName) || 
               element.onclick !== null ||
               element.classList.contains('clickable') ||
               element.hasAttribute('role');
    }

    isTextSelectionIntent(element) {
        // User might be selecting text, not confused
        return ['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'LI'].includes(element.tagName);
    }

    emitSignal(signalType, data) {
        eventBus.emit('confusion-signal', {
            signalType,
            timestamp: Date.now(),
            ...data
        });
    }

    getSignals() {
        return { ...this.signals };
    }

    reset() {
        Object.keys(this.signals).forEach(key => {
            this.signals[key] = 0;
        });
    }
}

/**
 * Confusion ML Classifier
 * Convertește signale în confusion score
 */
class ConfusionClassifier {
    constructor() {
        // Weights pentru fiecare signal type (ajustabile prin ML)
        this.weights = {
            hesitation: 0.25,
            errorClicks: 0.30,
            scrollBack: 0.20,
            mouseEdge: 0.10,
            rapidClicks: 0.10,
            inactivity: 0.05
        };

        // Historical data pentru ML training
        this.trainingData = [];
        this.maxTrainingSize = 500;

        // Confusion thresholds - adjusted for realistic detection
        this.thresholds = {
            low: 0.4,      // Increased from 0.3 - less sensitive
            medium: 0.7,   // Increased from 0.6 - less sensitive  
            high: 0.85     // Increased from 0.8 - only truly confused users
        };

        console.log('[ConfusionClassifier] 🧮 ML Classifier initialized');
    }

    /**
     * Compute confusion score from signals
     * @param {Object} signals - Signal counts
     * @param {Number} timeWindow - Time window in ms
     * @returns {Number} Confusion score 0-1
     */
    computeConfusionScore(signals, timeWindow = 30000) {
        // Normalize signals by time window (per 30s)
        const normalized = {};
        const factor = timeWindow / 30000;

        Object.keys(signals).forEach(key => {
            normalized[key] = signals[key] / factor;
        });

        // Weighted sum
        let score = 0;
        Object.keys(this.weights).forEach(key => {
            score += normalized[key] * this.weights[key];
        });

        // Sigmoid to bound 0-1
        score = 1 / (1 + Math.exp(-score));

        return Math.min(Math.max(score, 0), 1);
    }

    /**
     * Extract features for ML
     */
    extractFeatures(signals, context = {}) {
        return {
            // Raw signals
            ...signals,
            
            // Derived features
            totalSignals: Object.values(signals).reduce((a, b) => a + b, 0),
            
            // Ratios
            errorRate: signals.errorClicks / Math.max(signals.errorClicks + (context.successfulClicks || 1), 1),
            hesitationRate: signals.hesitation / Math.max(context.hoverCount || 1, 1),
            
            // Patterns
            hasScrollBackPattern: signals.scrollBack >= 2,
            hasRapidClickPattern: signals.rapidClicks >= 1,
            hasEdgePattern: signals.mouseEdge >= 1,
            
            // Timestamp
            timestamp: Date.now()
        };
    }

    /**
     * Classify confusion level
     */
    classify(confusionScore) {
        if (confusionScore < this.thresholds.low) {
            return { level: 'none', severity: 0, color: 'green' };
        } else if (confusionScore < this.thresholds.medium) {
            return { level: 'low', severity: 1, color: 'yellow' };
        } else if (confusionScore < this.thresholds.high) {
            return { level: 'medium', severity: 2, color: 'orange' };
        } else {
            return { level: 'high', severity: 3, color: 'red' };
        }
    }

    /**
     * Record training example
     */
    recordExample(features, actualConfusion) {
        this.trainingData.push({
            features,
            label: actualConfusion,
            timestamp: Date.now()
        });

        if (this.trainingData.length > this.maxTrainingSize) {
            this.trainingData.shift();
        }
    }

    /**
     * Simple online learning to adjust weights
     */
    updateWeights(features, actualConfusion, learningRate = 0.01) {
        const predicted = this.computeConfusionScore(features);
        const error = actualConfusion - predicted;

        // Gradient descent on weights
        Object.keys(this.weights).forEach(key => {
            if (features[key] !== undefined) {
                this.weights[key] += learningRate * error * features[key];
                // Keep weights positive and bounded
                this.weights[key] = Math.max(0, Math.min(1, this.weights[key]));
            }
        });

        // Normalize weights to sum to 1
        const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
        Object.keys(this.weights).forEach(key => {
            this.weights[key] /= sum;
        });
    }

    getWeights() {
        return { ...this.weights };
    }

    getTrainingData() {
        return [...this.trainingData];
    }
}

/**
 * Adaptive UI Controller
 * Aplică adaptări automate bazate pe confusion level
 */
class AdaptiveUIController {
    constructor() {
        this.activeAdaptations = new Set();
        this.adaptationHistory = [];
        
        // Cooldowns to prevent spam
        this.lastContextualHelp = 0;
        this.contextualHelpCooldown = 60000; // 1 minute
        
        console.log('[AdaptiveUI] 🎨 Adaptive UI Controller initialized');
    }

    /**
     * Apply UI adaptations based on confusion level
     */
    applyAdaptations(confusionLevel, context = {}) {
        switch (confusionLevel.level) {
            case 'none':
                this.removeAllAdaptations();
                break;
                
            case 'low':
                this.applySubtleHelp(context);
                break;
                
            case 'medium':
                this.applyModerateSimplification(context);
                break;
                
            case 'high':
                this.applyAggressiveSimplification(context);
                break;
        }

        // Log adaptation
        this.adaptationHistory.push({
            timestamp: Date.now(),
            level: confusionLevel.level,
            adaptations: Array.from(this.activeAdaptations)
        });
    }

    /**
     * Low confusion: subtle hints
     */
    applySubtleHelp(context) {
        // Highlight primary actions slightly
        this.highlightPrimaryActions(0.1);
        
        // Enable tooltips on hover
        this.enableTooltips();
        
        this.activeAdaptations.add('subtle-help');
        
        eventBus.emit('ui-adaptation', {
            type: 'subtle-help',
            message: 'Subtle guidance enabled'
        });
    }

    /**
     * Medium confusion: moderate simplification
     */
    applyModerateSimplification(context) {
        // Reduce opacity of secondary elements
        this.dimSecondaryElements(0.3);
        
        // Highlight primary actions more
        this.highlightPrimaryActions(0.3);
        
        // 🆕 SPRINT 1: Show subtle help icons next to confused elements
        this.showHelpIcons(2); // severity 2 = medium
        
        // Show contextual help
        this.showContextualHelp();
        
        this.activeAdaptations.add('moderate-simplification');
        
        eventBus.emit('ui-adaptation', {
            type: 'moderate-simplification',
            message: 'UI simplified to reduce confusion'
        });
    }

    /**
     * High confusion: aggressive simplification
     */
    applyAggressiveSimplification(context) {
        // Heavily dim or hide secondary elements
        this.dimSecondaryElements(0.6);
        
        // Strong highlight on primary actions
        this.highlightPrimaryActions(0.5);
        
        // 🆕 SPRINT 1: Show help icons for high confusion
        this.showHelpIcons(3); // severity 3 = high
        
        // Show contextual help (less intrusive)
        this.showContextualHelp();
        
        // Add visual cues
        this.addVisualCues();
        
        // NOTE: Guided tour disabled by default - too intrusive during testing
        // Enable manually if needed via: uiController.showGuidedTour()
        
        this.activeAdaptations.add('aggressive-simplification');
        
        eventBus.emit('ui-adaptation', {
            type: 'aggressive-simplification',
            message: 'Maximum simplification applied'
        });
    }

    highlightPrimaryActions(intensity) {
        const primaries = document.querySelectorAll('[data-primary-action], button.primary, .cta-button');
        
        primaries.forEach(el => {
            el.style.boxShadow = `0 0 ${10 + intensity * 30}px rgba(0, 123, 255, ${0.3 + intensity})`;
            el.style.transform = `scale(${1 + intensity * 0.05})`;
            el.style.transition = 'all 0.3s ease';
        });
    }

    dimSecondaryElements(intensity) {
        const secondaries = document.querySelectorAll('[data-secondary], .secondary, .optional');
        
        secondaries.forEach(el => {
            el.style.opacity = (1 - intensity).toString();
            el.style.transition = 'opacity 0.3s ease';
        });
    }

    enableTooltips() {
        // Add tooltip triggers to interactive elements
        document.querySelectorAll('button, a, [role="button"]').forEach(el => {
            if (!el.hasAttribute('title') && !el.hasAttribute('data-tooltip')) {
                // Generate helpful tooltip
                const text = el.textContent.trim() || el.getAttribute('aria-label') || 'Interactive element';
                el.setAttribute('title', text);
            }
        });
    }

    /**
     * 🆕 SPRINT 1 FEATURE: Show subtle help icons next to elements
     * Non-intrusive, user-controlled, provides explicit feedback
     * @param {Number} severity - Confusion severity level (2=medium, 3=high)
     */
    showHelpIcons(severity) {
        // Only show for medium+ confusion
        if (severity < 2) return;
        
        // Don't show if icons already exist
        if (document.querySelector('.atlas-help-icon')) return;
        
        // Find primary interactive elements that might be confusing
        const candidates = document.querySelectorAll(
            'button:not([disabled]), a, [role="button"], input, select, [data-primary-action]'
        );
        
        // Limit to top 3 most important elements
        const elementsToHelp = Array.from(candidates).slice(0, 3);
        
        elementsToHelp.forEach((element, index) => {
            // Skip if element already has help icon
            if (element.querySelector('.atlas-help-icon')) return;
            
            // Create subtle help icon
            const helpIcon = document.createElement('div');
            helpIcon.className = 'atlas-help-icon';
            
            // Choose icon based on severity
            const iconEmoji = severity === 3 ? '👥' : '💡'; // High: question, Medium: lightbulb
            
            helpIcon.innerHTML = iconEmoji;
            helpIcon.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                width: 22px;
                height: 22px;
                background: ${severity === 3 ? '#f44336' : '#2196f3'};
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 9999;
                animation: subtle-pulse 2s infinite;
                transition: transform 0.2s;
            `;
            
            // Hover effect
            helpIcon.addEventListener('mouseenter', () => {
                helpIcon.style.transform = 'scale(1.2)';
            });
            
            helpIcon.addEventListener('mouseleave', () => {
                helpIcon.style.transform = 'scale(1)';
            });
            
            // Click handler - shows contextual help
            helpIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // CRITICAL: Record explicit feedback!
                // User clicked = confirmed they need help
                if (window.ATLAS_CONFUSION_DETECTOR) {
                    window.ATLAS_CONFUSION_DETECTOR.provideFeedback(0.9);
                }
                
                // Show help specific to this element
                this.showElementHelp(element, helpIcon);
                
                // Remove icon after use
                helpIcon.remove();
                
                console.log('[🆕 Help Icon] User clicked for help on:', element);
            });
            
            // Auto-remove after 10 seconds if not clicked
            setTimeout(() => {
                if (helpIcon.parentElement) {
                    helpIcon.style.opacity = '0';
                    setTimeout(() => helpIcon.remove(), 300);
                }
            }, 10000);
            
            // Position element relative
            if (window.getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }
            
            element.appendChild(helpIcon);
        });
        
        // Add pulse animation if not exists
        if (!document.getElementById('atlas-subtle-pulse')) {
            const style = document.createElement('style');
            style.id = 'atlas-subtle-pulse';
            style.textContent = `
                @keyframes subtle-pulse {
                    0%, 100% { 
                        opacity: 1; 
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    }
                    50% { 
                        opacity: 0.7;
                        box-shadow: 0 2px 12px rgba(33,150,243,0.4);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log(`[🆕 Help Icons] Showed ${elementsToHelp.length} help icons (severity: ${severity})`);
    }

    /**
     * Show contextual help for specific element
     */
    showElementHelp(element, icon) {
        const elementType = element.tagName.toLowerCase();
        const elementText = element.textContent.trim() || element.getAttribute('aria-label') || 'this element';
        
        // Create help tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'atlas-element-help';
        tooltip.innerHTML = `
            <div style="
                position: fixed;
                background: white;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                max-width: 280px;
                z-index: 10000;
                font-size: 13px;
                line-height: 1.5;
                animation: fadeIn 0.3s;
            ">
                <div style="font-weight: 600; margin-bottom: 8px; color: #333;">
                    ℹ️ Help for "${elementText}"
                </div>
                <div style="color: #666; margin-bottom: 12px;">
                    This ${elementType} allows you to perform an action. Click it to continue.
                </div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #2196f3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                    font-weight: 600;
                ">Got it!</button>
            </div>
        `;
        
        // Position near the element
        const rect = element.getBoundingClientRect();
        const tooltipDiv = tooltip.firstElementChild;
        
        // Position below element
        tooltipDiv.style.top = (rect.bottom + 10) + 'px';
        tooltipDiv.style.left = Math.max(20, rect.left) + 'px';
        
        // Add fade animation
        if (!document.getElementById('atlas-fade-in')) {
            const style = document.createElement('style');
            style.id = 'atlas-fade-in';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(tooltip);
        
        // Auto-remove after 15s
        setTimeout(() => {
            if (tooltip.parentElement) {
                tooltip.remove();
            }
        }, 15000);
    }

    showContextualHelp() {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastContextualHelp < this.contextualHelpCooldown) {
            // Still in cooldown, skip
            return;
        }
        
        // Create floating help indicator
        if (document.getElementById('atlas-contextual-help')) return;

        const help = document.createElement('div');
        help.id = 'atlas-contextual-help';
        help.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                font-size: 14px;
                cursor: pointer;
            ">
                💡 Need help? Click here
            </div>
        `;
        
        help.addEventListener('click', () => {
            help.remove();
            alert('Contextual help would appear here based on current page context');
        });
        
        document.body.appendChild(help);
        this.lastContextualHelp = now;
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (help.parentElement) {
                help.remove();
            }
        }, 10000);
    }

    showGuidedTour() {
        // Create step-by-step overlay
        if (document.getElementById('atlas-guided-tour')) return;

        const tour = document.createElement('div');
        tour.id = 'atlas-guided-tour';
        tour.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 400px;
            ">
                <h3 style="margin: 0 0 15px 0;">🎯 Let us help you</h3>
                <p style="margin: 0 0 20px 0; color: #666;">
                    We noticed you might need assistance. Would you like a guided tour?
                </p>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-right: 10px;
                ">Start Tour</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 6px;
                    cursor: pointer;
                ">No Thanks</button>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            " onclick="this.parentElement.remove()"></div>
        `;
        
        document.body.appendChild(tour);
    }

    addVisualCues() {
        // Add arrows or spotlights to primary actions
        const primaries = document.querySelectorAll('[data-primary-action], button.primary');
        
        primaries.forEach(el => {
            if (el.querySelector('.visual-cue')) return;
            
            const cue = document.createElement('span');
            cue.className = 'visual-cue';
            cue.innerHTML = '👉';
            cue.style.cssText = `
                position: absolute;
                left: -30px;
                animation: pulse 1s infinite;
            `;
            
            el.style.position = 'relative';
            el.appendChild(cue);
        });

        // Add pulse animation if not exists
        if (!document.getElementById('atlas-pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'atlas-pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    removeAllAdaptations() {
        // Reset all applied adaptations
        document.querySelectorAll('[style*="box-shadow"], [style*="opacity"], [style*="transform"]').forEach(el => {
            el.style.boxShadow = '';
            el.style.opacity = '';
            el.style.transform = '';
        });

        // Remove helper elements
        const helpers = ['atlas-contextual-help', 'atlas-guided-tour'];
        helpers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Remove visual cues
        document.querySelectorAll('.visual-cue').forEach(el => el.remove());

        // 🆕 SPRINT 1: Remove help icons and tooltips
        document.querySelectorAll('.atlas-help-icon').forEach(el => el.remove());
        document.querySelectorAll('.atlas-element-help').forEach(el => el.remove());

        this.activeAdaptations.clear();
    }

    getActiveAdaptations() {
        return Array.from(this.activeAdaptations);
    }
}

/**
 * Main Confusion Detector
 * Orchestrator pentru toate componentele
 */
export class ATLASConfusionDetector {
    constructor(config = {}) {
        this.config = {
            updateInterval: 5000,        // Check confusion every 5s
            signalResetInterval: 30000,  // Reset signal counters every 30s
            autoAdapt: true,             // Automatically adapt UI
            ...config
        };

        // Components
        this.signalDetector = new ConfusionSignalDetector();
        this.classifier = new ConfusionClassifier();
        this.uiController = new AdaptiveUIController();

        // State
        this.currentConfusion = {
            score: 0,
            level: { level: 'none', severity: 0 },
            signals: {},
            timestamp: Date.now()
        };

        // Monitoring
        this.monitoringActive = false;
        this.updateTimer = null;
        this.resetTimer = null;

        this.setupEventListeners();
        console.log('[ConfusionDetector] 🧠 Main detector initialized');
    }

    /**
     * Start confusion detection
     */
    start() {
        if (this.monitoringActive) return;

        this.monitoringActive = true;

        // Periodic confusion check
        this.updateTimer = setInterval(() => {
            this.updateConfusion();
        }, this.config.updateInterval);

        // Periodic signal reset
        this.resetTimer = setInterval(() => {
            this.signalDetector.reset();
        }, this.config.signalResetInterval);

        console.log('[ConfusionDetector] ▶️ Monitoring started');
        
        eventBus.emit('confusion-monitoring', {
            status: 'started',
            config: this.config
        });
    }

    /**
     * Stop confusion detection
     */
    stop() {
        if (!this.monitoringActive) return;

        this.monitoringActive = false;

        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        if (this.resetTimer) {
            clearInterval(this.resetTimer);
            this.resetTimer = null;
        }

        // Remove adaptations
        this.uiController.removeAllAdaptations();

        console.log('[ConfusionDetector] ⏸️ Monitoring stopped');
        
        eventBus.emit('confusion-monitoring', {
            status: 'stopped'
        });
    }

    /**
     * Update confusion assessment
     */
    updateConfusion() {
        // Get current signals
        const signals = this.signalDetector.getSignals();

        // Compute confusion score
        const confusionScore = this.classifier.computeConfusionScore(
            signals,
            this.config.signalResetInterval
        );

        // Classify level
        const confusionLevel = this.classifier.classify(confusionScore);

        // Update state
        this.currentConfusion = {
            score: confusionScore,
            level: confusionLevel,
            signals: { ...signals },
            timestamp: Date.now()
        };

        // Apply UI adaptations if enabled
        if (this.config.autoAdapt) {
            this.uiController.applyAdaptations(confusionLevel);
        }

        // Emit event
        eventBus.emit('confusion-detected', this.currentConfusion);

        // Track in session
        sessionTracker.trackMLAction({
            type: 'confusion-detection',
            confusionScore,
            confusionLevel: confusionLevel.level,
            signals
        });

        // Log if significant confusion
        if (confusionLevel.severity >= 2) {
            console.warn('[ConfusionDetector] ⚠️ Significant confusion detected:', {
                score: confusionScore.toFixed(2),
                level: confusionLevel.level,
                signals
            });
        }
    }

    setupEventListeners() {
        // Listen to confusion signals
        eventBus.on('confusion-signal', (data) => {
            // Could do immediate actions here if needed
        });
    }

    /**
     * Get current confusion state
     */
    getConfusion() {
        return { ...this.currentConfusion };
    }

    /**
     * Check if monitoring is active
     */
    isRunning() {
        return this.monitoringActive;
    }

    /**
     * Get detection statistics
     */
    getStats() {
        return {
            monitoring: this.monitoringActive,
            currentConfusion: this.currentConfusion,
            signals: this.signalDetector.getSignals(),
            weights: this.classifier.getWeights(),
            activeAdaptations: this.uiController.getActiveAdaptations(),
            trainingExamples: this.classifier.getTrainingData().length
        };
    }

    /**
     * Reset all detection state
     */
    reset() {
        this.signalDetector.reset();
        this.currentConfusion = {
            score: 0,
            level: { level: 'none', severity: 0 },
            signals: {},
            timestamp: Date.now()
        };
        this.uiController.removeAllAdaptations();
        console.log('[ConfusionDetector] 🔄 State reset');
    }

    /**
     * Provide feedback for ML learning
     */
    provideFeedback(actualConfusion) {
        const features = this.signalDetector.getSignals();
        this.classifier.recordExample(features, actualConfusion);
        this.classifier.updateWeights(features, actualConfusion);

        console.log('[ConfusionDetector] 📚 Learning from feedback');
    }

    /**
     * Export data for analysis
     */
    export() {
        return {
            config: this.config,
            currentState: this.currentConfusion,
            trainingData: this.classifier.getTrainingData(),
            weights: this.classifier.getWeights(),
            adaptationHistory: this.uiController.adaptationHistory
        };
    }
}

// Create global singleton
if (typeof window !== 'undefined') {
    if (!window.ATLAS_CONFUSION_DETECTOR) {
        window.ATLAS_CONFUSION_DETECTOR = new ATLASConfusionDetector();
        console.log('[ConfusionDetector] ✅ Global detector created: window.ATLAS_CONFUSION_DETECTOR');
    }
}

export const confusionDetector = typeof window !== 'undefined' 
    ? window.ATLAS_CONFUSION_DETECTOR 
    : new ATLASConfusionDetector();

export default ATLASConfusionDetector;
