// src/atlas-metrics-collector.js
// Sistema de colectare și export metrici

class AtlasMetricsCollector extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            sessions: [],
            isCollecting: false,
            totalSessions: 0,
            startTime: null,
            currentBatch: null
        };

        this.db = null;
        this.render();
    }

    async connectedCallback() {
        await this.initDB();
        await this.loadStoredData();
        this.setupEventListeners();
    }

    // IndexedDB Setup
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ATLASMetrics', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                console.log('[MetricsCollector] IndexedDB initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionsStore = db.createObjectStore('sessions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    sessionsStore.createIndex('batchId', 'batchId', { unique: false });
                    sessionsStore.createIndex('layoutType', 'layoutType', { unique: false });
                }

                // Batches store (pentru gruparea sesiunilor)
                if (!db.objectStoreNames.contains('batches')) {
                    const batchesStore = db.createObjectStore('batches', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    batchesStore.createIndex('startTime', 'startTime', { unique: false });
                }
            };
        });
    }

    // Load stored data
    async loadStoredData() {
        if (!this.db) return;

        const transaction = this.db.transaction(['sessions'], 'readonly');
        const store = transaction.objectStore('sessions');
        const request = store.getAll();

        return new Promise((resolve) => {
            request.onsuccess = () => {
                this.state.sessions = request.result || [];
                this.state.totalSessions = this.state.sessions.length;
                console.log(`[MetricsCollector] Loaded ${this.state.totalSessions} sessions from storage`);
                this.render();
                resolve();
            };
        });
    }

    // Start collecting
    async startCollection() {
        this.state.isCollecting = true;
        this.state.startTime = Date.now();

        // Create new batch
        const batch = {
            startTime: this.state.startTime,
            endTime: null,
            sessionCount: 0,
            description: `Batch ${new Date().toLocaleString()}`
        };

        const transaction = this.db.transaction(['batches'], 'readwrite');
        const store = transaction.objectStore('batches');
        const request = store.add(batch);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                this.state.currentBatch = request.result;
                console.log('[MetricsCollector] Started collection, batch ID:', this.state.currentBatch);
                this.render();
                resolve();
            };
        });
    }

    // Stop collecting
    async stopCollection() {
        if (!this.state.currentBatch) return;

        const transaction = this.db.transaction(['batches'], 'readwrite');
        const store = transaction.objectStore('batches');
        const request = store.get(this.state.currentBatch);

        request.onsuccess = () => {
            const batch = request.result;
            batch.endTime = Date.now();
            batch.sessionCount = this.state.sessions.filter(s => s.batchId === this.state.currentBatch).length;
            store.put(batch);
        };

        this.state.isCollecting = false;
        this.state.currentBatch = null;
        this.render();
    }

    // Record session (called by simulator)
    async recordSession(data) {
        const session = {
            timestamp: Date.now(),
            batchId: this.state.currentBatch,
            ...data
        };

        // Store in IndexedDB
        const transaction = this.db.transaction(['sessions'], 'readwrite');
        const store = transaction.objectStore('sessions');
        const request = store.add(session);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                this.state.sessions.push({ ...session, id: request.result });
                this.state.totalSessions++;
                this.render();
                resolve();
            };
        });
    }

    // Export to CSV
    exportToCSV() {
        const headers = [
            'ID',
            'Timestamp',
            'Batch ID',
            'Layout Type',
            'Persona',
            'Intent Domain',
            'Intent Goal',
            'Intent Device',
            'Intent Density',
            'Clicked',
            'Engaged',
            'Converted',
            'Bounced',
            'Time to Action (ms)',
            'Engagement Score',
            'Affordance Score',
            'Component Matches'
        ];

        const rows = this.state.sessions.map(session => [
            session.id,
            new Date(session.timestamp).toISOString(),
            session.batchId || 'N/A',
            session.layoutType || 'N/A',
            session.persona || 'N/A',
            session.intent?.domain || 'N/A',
            session.intent?.goal || 'N/A',
            session.intent?.device || 'N/A',
            session.intent?.density || 'N/A',
            session.clicked ? 'Yes' : 'No',
            session.engaged ? 'Yes' : 'No',
            session.converted ? 'Yes' : 'No',
            session.bounced ? 'Yes' : 'No',
            session.timeToAction || 0,
            session.engagementScore?.toFixed(3) || '0',
            session.affordanceScore?.toFixed(3) || '0',
            session.componentMatches || 0
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        this.downloadFile(csv, 'atlas-metrics.csv', 'text/csv');
    }

    // Export to JSON
    exportToJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            totalSessions: this.state.totalSessions,
            sessions: this.state.sessions.map(session => ({
                id: session.id,
                timestamp: session.timestamp,
                timestampISO: new Date(session.timestamp).toISOString(),
                batchId: session.batchId,
                layoutType: session.layoutType,
                persona: session.persona,
                intent: session.intent,
                results: {
                    clicked: session.clicked,
                    engaged: session.engaged,
                    converted: session.converted,
                    bounced: session.bounced,
                    timeToAction: session.timeToAction,
                    engagementScore: session.engagementScore,
                    affordanceScore: session.affordanceScore,
                    componentMatches: session.componentMatches
                }
            }))
        };

        const json = JSON.stringify(data, null, 2);
        this.downloadFile(json, 'atlas-metrics.json', 'application/json');
    }

    // Export aggregated statistics
    exportStatistics() {
        const atlasData = this.state.sessions.filter(s => s.layoutType === 'atlas');
        const staticData = this.state.sessions.filter(s => s.layoutType === 'static');

        const calculateMetrics = (sessions) => {
            if (sessions.length === 0) return null;

            return {
                totalSessions: sessions.length,
                ctr: sessions.filter(s => s.clicked).length / sessions.length,
                engagementRate: sessions.filter(s => s.engaged).length / sessions.length,
                conversionRate: sessions.filter(s => s.converted).length / sessions.length,
                bounceRate: sessions.filter(s => s.bounced).length / sessions.length,
                avgTimeToAction: sessions.reduce((sum, s) => sum + (s.timeToAction || 0), 0) / sessions.length,
                avgEngagement: sessions.reduce((sum, s) => sum + (s.engagementScore || 0), 0) / sessions.length,
                avgAffordance: sessions.reduce((sum, s) => sum + (s.affordanceScore || 0), 0) / sessions.length
            };
        };

        const stats = {
            exportDate: new Date().toISOString(),
            period: {
                start: this.state.sessions[0]?.timestamp,
                end: this.state.sessions[this.state.sessions.length - 1]?.timestamp,
                duration: (this.state.sessions[this.state.sessions.length - 1]?.timestamp || 0) -
                    (this.state.sessions[0]?.timestamp || 0)
            },
            atlas: calculateMetrics(atlasData),
            static: calculateMetrics(staticData),
            comparison: atlasData.length > 0 && staticData.length > 0 ? {
                ctrImprovement: ((atlasData.filter(s => s.clicked).length / atlasData.length) /
                    (staticData.filter(s => s.clicked).length / staticData.length) - 1) * 100,
                conversionImprovement: ((atlasData.filter(s => s.converted).length / atlasData.length) /
                    (staticData.filter(s => s.converted).length / staticData.length) - 1) * 100,
                bounceReduction: (1 - (atlasData.filter(s => s.bounced).length / atlasData.length) /
                    (staticData.filter(s => s.bounced).length / staticData.length)) * 100
            } : null
        };

        const json = JSON.stringify(stats, null, 2);
        this.downloadFile(json, 'atlas-statistics.json', 'application/json');
    }

    // Helper: Download file
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`[MetricsCollector] Exported ${filename}`);
    }

    // Clear all data
    async clearData() {
        if (!confirm('Ștergi TOATE datele colectate? Această acțiune este ireversibilă!')) {
            return;
        }

        const transaction = this.db.transaction(['sessions', 'batches'], 'readwrite');
        transaction.objectStore('sessions').clear();
        transaction.objectStore('batches').clear();

        this.state.sessions = [];
        this.state.totalSessions = 0;
        this.state.currentBatch = null;

        this.render();
        console.log('[MetricsCollector] All data cleared');
    }

    // Get statistics
    getStatistics() {
        const atlas = this.state.sessions.filter(s => s.layoutType === 'atlas');
        const static_ = this.state.sessions.filter(s => s.layoutType === 'static');

        return {
            total: this.state.totalSessions,
            atlas: atlas.length,
            static: static_.length,
            collecting: this.state.isCollecting,
            duration: this.state.startTime ? Date.now() - this.state.startTime : 0
        };
    }

    // Setup event listeners
    setupEventListeners() {
        const startBtn = this.shadowRoot.querySelector('#start-btn');
        const stopBtn = this.shadowRoot.querySelector('#stop-btn');
        const csvBtn = this.shadowRoot.querySelector('#csv-btn');
        const jsonBtn = this.shadowRoot.querySelector('#json-btn');
        const statsBtn = this.shadowRoot.querySelector('#stats-btn');
        const clearBtn = this.shadowRoot.querySelector('#clear-btn');

        if (startBtn) startBtn.addEventListener('click', () => this.startCollection());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stopCollection());
        if (csvBtn) csvBtn.addEventListener('click', () => this.exportToCSV());
        if (jsonBtn) jsonBtn.addEventListener('click', () => this.exportToJSON());
        if (statsBtn) statsBtn.addEventListener('click', () => this.exportStatistics());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearData());
    }

    // Render
    render() {
        const stats = this.getStatistics();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: system-ui, -apple-system, sans-serif;
                }
                
                .container {
                    background: #0b0d12;
                    color: #dfe6ff;
                    padding: 24px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .header {
                    margin-bottom: 24px;
                }
                
                h1 {
                    font-size: 24px;
                    margin: 0 0 8px 0;
                    background: linear-gradient(135deg, #7aa2ff, #10b981);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                
                .subtitle {
                    color: #8e9ab3;
                    font-size: 14px;
                }
                
                .controls {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 12px;
                    margin-bottom: 24px;
                }
                
                button {
                    padding: 12px 20px;
                    border-radius: 10px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                
                button:hover {
                    transform: translateY(-2px);
                }
                
                .btn-start {
                    background: #10b981;
                    color: white;
                }
                
                .btn-stop {
                    background: #ef4444;
                    color: white;
                }
                
                .btn-export {
                    background: #7aa2ff;
                    color: white;
                }
                
                .btn-danger {
                    background: #991b1b;
                    color: white;
                }
                
                button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }
                
                .stat-card {
                    background: #151823;
                    padding: 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                }
                
                .stat-label {
                    font-size: 12px;
                    color: #8e9ab3;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #dfe6ff;
                }
                
                .stat-value.highlight {
                    color: #10b981;
                }
                
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-top: 16px;
                }
                
                .status-collecting {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: #10b981;
                }
                
                .status-idle {
                    background: rgba(142, 154, 179, 0.1);
                    border: 1px solid rgba(142, 154, 179, 0.3);
                    color: #8e9ab3;
                }
                
                .pulse {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: currentColor;
                    animation: pulse 2s ease-in-out infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                
                .info-panel {
                    background: #151823;
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.06);
                    margin-top: 24px;
                }
                
                .info-panel h3 {
                    font-size: 16px;
                    margin: 0 0 12px 0;
                    color: #dfe6ff;
                }
                
                .info-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    font-size: 13px;
                    color: #8e9ab3;
                }
                
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .info-item::before {
                    content: '→';
                    color: #7aa2ff;
                }
            </style>
            
            <div class="container">
                <div class="header">
                    <h1>📊 Metrics Collection System</h1>
                    <p class="subtitle">Colectare și export date din simulări ATLAS</p>
                    
                    <div class="status-badge ${stats.collecting ? 'status-collecting' : 'status-idle'}">
                        ${stats.collecting ? '<div class="pulse"></div>' : ''}
                        ${stats.collecting ? 'Collecting Data...' : 'Idle'}
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Total Sessions</div>
                        <div class="stat-value highlight">${stats.total}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">ATLAS Sessions</div>
                        <div class="stat-value">${stats.atlas}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Static Sessions</div>
                        <div class="stat-value">${stats.static}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Duration</div>
                        <div class="stat-value" style="font-size: 20px;">
                            ${stats.duration > 0 ? Math.floor(stats.duration / 1000) + 's' : '—'}
                        </div>
                    </div>
                </div>
                
                <div class="controls">
                    <button id="start-btn" class="btn-start" ${stats.collecting ? 'disabled' : ''}>
                        ▶ Start Collection
                    </button>
                    <button id="stop-btn" class="btn-stop" ${!stats.collecting ? 'disabled' : ''}>
                        ⏸ Stop Collection
                    </button>
                    <button id="csv-btn" class="btn-export" ${stats.total === 0 ? 'disabled' : ''}>
                        📥 Export CSV
                    </button>
                    <button id="json-btn" class="btn-export" ${stats.total === 0 ? 'disabled' : ''}>
                        📥 Export JSON
                    </button>
                    <button id="stats-btn" class="btn-export" ${stats.total === 0 ? 'disabled' : ''}>
                        📊 Export Statistics
                    </button>
                    <button id="clear-btn" class="btn-danger" ${stats.total === 0 ? 'disabled' : ''}>
                        🗑️ Clear Data
                    </button>
                </div>
                
                <div class="info-panel">
                    <h3>💡 Cum Funcționează</h3>
                    <div class="info-list">
                        <div class="info-item">Click "Start Collection" pentru a începe colectarea datelor</div>
                        <div class="info-item">Rulează simulări în ATLAS Simulation Engine</div>
                        <div class="info-item">Datele sunt salvate automat în IndexedDB</div>
                        <div class="info-item">Click "Stop Collection" când termini</div>
                        <div class="info-item">Exportă datele în CSV pentru Excel sau JSON pentru analiza programatică</div>
                        <div class="info-item">Export Statistics generează un raport agregat cu metrici comparative</div>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }
}

customElements.define('atlas-metrics-collector', AtlasMetricsCollector);

// Global API pentru simulator
window.atlasMetricsCollector = {
    recordSession: async (data) => {
        const collector = document.querySelector('atlas-metrics-collector');
        if (collector && collector.state.isCollecting) {
            await collector.recordSession(data);
        }
    }
};