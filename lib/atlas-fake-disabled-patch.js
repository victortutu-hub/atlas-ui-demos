// src/atlas-fake-disabled-patch.js
// 🔧 PATCH pentru detectarea butoanelor fake-disabled

/**
 * Acest patch adaugă suport pentru data-fake-disabled
 * Butoanele cu acest atribut vor fi detectate ca error clicks
 */

console.log('[FakeDisabledPatch] 🔧 Loading patch...');

// Wait for detector to be available
let patchInterval = setInterval(() => {
    if (window.detector && window.detector.signalDetector) {
        clearInterval(patchInterval);
        
        console.log('[FakeDisabledPatch] ✅ Detector found! Installing patch...');
        
        // Add click listener specifically for fake-disabled
        document.addEventListener('click', function(e) {
            const target = e.target;
            
            // Check for data-fake-disabled attribute
            if (target.hasAttribute && target.hasAttribute('data-fake-disabled')) {
                console.log('[FakeDisabledPatch] 🎯 Click on fake-disabled button detected!');
                
                // Manually trigger error click
                window.detector.signalDetector.signals.errorClicks++;
                window.detector.signalDetector.emitSignal('error-click', {
                    element: target.tagName,
                    className: target.className,
                    reason: 'fake-disabled-button'
                });
                
                console.log('[FakeDisabledPatch] ✅ Error click registered! Count:', 
                    window.detector.signalDetector.signals.errorClicks);
            }
        }, true); // Use capture phase to catch it early
        
        console.log('[FakeDisabledPatch] ✅ Patch installed successfully!');
    }
}, 100);

// Safety timeout
setTimeout(() => {
    if (patchInterval) {
        clearInterval(patchInterval);
        console.warn('[FakeDisabledPatch] ⚠️ Timeout waiting for detector');
    }
}, 5000);

// Export something to make it a valid ES6 module
export const fakeDisabledPatchActive = true;
