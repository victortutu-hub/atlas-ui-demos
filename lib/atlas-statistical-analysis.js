// src/atlas-statistical-analysis.js (FIXED)
// Statistical Analysis Engine pentru A/B testing - cu fix pentru metrics collector connection

class AtlasStatisticalAnalysis extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        this.state = {
            metricsCollector: null,
            analysisResults: null,
            isAnalyzing: false
        };

        this.checkInterval = null;
        this.render();
    }

    async connectedCallback() {
        await this.waitForAtlas();
        await this.waitForMetricsCollector();
        this.setupEventListeners();

        // Check periodic pentru metrics collector (fallback)
        this.checkInterval = setInterval(() => {
            if (!this.state.metricsCollector) {
                this.findMetricsCollector();
            }
        }, 2000);
    }

    disconnectedCallback() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    async waitForAtlas() {
        let attempts = 0;
        while (!window.__ATLAS_REGISTRY__ && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.__ATLAS_REGISTRY__) {
            this.registry = window.__ATLAS_REGISTRY__();
            console.log('[StatAnalysis] Connected to ATLAS Registry:', this.registry.getStats());
        }
    }

    async waitForMetricsCollector() {
        let attempts = 0;
        while (!this.state.metricsCollector && attempts < 50) {
            this.findMetricsCollector();
            if (!this.state.metricsCollector) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            attempts++;
        }

        if (this.state.metricsCollector) {
            console.log('[StatAnalysis] Successfully connected to Metrics Collector');
            this.render(); // Re-render pentru a activa butonul
        } else {
            console.warn('[StatAnalysis] Could not find Metrics Collector after 5 seconds. Will keep trying...');
        }
    }

    findMetricsCollector() {
        this.state.metricsCollector = document.querySelector('atlas-metrics-collector');
        if (this.state.metricsCollector) {
            console.log('[StatAnalysis] Connected to Metrics Collector');
            this.render(); // Re-render când găsim collector-ul
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        }
    }

    // Chi-Square Test for proportions (CTR, Conversion, Bounce)
    chiSquareTest(atlasSuccess, atlasTotal, staticSuccess, staticTotal) {
        const atlasFailure = atlasTotal - atlasSuccess;
        const staticFailure = staticTotal - staticSuccess;

        // Observed frequencies
        const observed = [
            [atlasSuccess, atlasFailure],
            [staticSuccess, staticFailure]
        ];

        // Expected frequencies
        const totalSuccess = atlasSuccess + staticSuccess;
        const totalFailure = atlasFailure + staticFailure;
        const total = atlasTotal + staticTotal;

        const expectedAtlasSuccess = (totalSuccess * atlasTotal) / total;
        const expectedAtlasFailure = (totalFailure * atlasTotal) / total;
        const expectedStaticSuccess = (totalSuccess * staticTotal) / total;
        const expectedStaticFailure = (totalFailure * staticTotal) / total;

        const expected = [
            [expectedAtlasSuccess, expectedAtlasFailure],
            [expectedStaticSuccess, expectedStaticFailure]
        ];

        // Chi-square statistic
        let chiSquare = 0;
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                const diff = observed[i][j] - expected[i][j];
                chiSquare += (diff * diff) / expected[i][j];
            }
        }

        // Degrees of freedom = (rows - 1) * (cols - 1) = 1
        const df = 1;

        // P-value (approximate using chi-square distribution)
        const pValue = this.chiSquarePValue(chiSquare, df);

        return {
            chiSquare: chiSquare,
            df: df,
            pValue: pValue,
            significant: pValue < 0.05
        };
    }

    // Approximate chi-square p-value (for df=1)
    chiSquarePValue(chiSquare, df) {
        if (df !== 1) return null;
        const z = Math.sqrt(chiSquare);
        return 2 * (1 - this.normalCDF(z));
    }

    // Standard normal CDF
    normalCDF(x) {
        const t = 1 / (1 + 0.2316419 * Math.abs(x));
        const d = 0.3989423 * Math.exp(-x * x / 2);
        const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        return x > 0 ? 1 - prob : prob;
    }

    // Two-sample T-test
    tTest(atlasValues, staticValues) {
        const n1 = atlasValues.length;
        const n2 = staticValues.length;

        if (n1 < 2 || n2 < 2) return null;

        const mean1 = atlasValues.reduce((a, b) => a + b, 0) / n1;
        const mean2 = staticValues.reduce((a, b) => a + b, 0) / n2;

        const var1 = atlasValues.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (n1 - 1);
        const var2 = staticValues.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (n2 - 1);

        const se = Math.sqrt(var1 / n1 + var2 / n2);
        const t = (mean1 - mean2) / se;
        const df = Math.pow(var1 / n1 + var2 / n2, 2) /
            (Math.pow(var1 / n1, 2) / (n1 - 1) + Math.pow(var2 / n2, 2) / (n2 - 1));

        const pValue = 2 * (1 - this.tCDF(Math.abs(t), df));

        return {
            t: t,
            df: df,
            mean1: mean1,
            mean2: mean2,
            pValue: pValue,
            significant: pValue < 0.05
        };
    }

    // Approximate T-distribution CDF
    tCDF(t, df) {
        if (df > 30) return this.normalCDF(t);
        const x = df / (df + t * t);
        return 1 - 0.5 * Math.pow(x, df / 2);
    }

    // Confidence Interval for proportion
    confidenceInterval(successes, total, confidence = 0.95) {
        const p = successes / total;
        const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.96;
        const se = Math.sqrt((p * (1 - p)) / total);
        const margin = z * se;

        return {
            lower: Math.max(0, p - margin),
            upper: Math.min(1, p + margin),
            point: p,
            margin: margin
        };
    }

    // Effect Size (Cohen's d)
    cohensD(mean1, mean2, sd1, sd2) {
        const pooledSD = Math.sqrt((sd1 * sd1 + sd2 * sd2) / 2);
        return (mean1 - mean2) / pooledSD;
    }

    // Sample Size Calculator
    calculateRequiredSampleSize(baselineRate, minDetectableEffect, alpha = 0.05, power = 0.8) {
        const p1 = baselineRate;
        const p2 = baselineRate * (1 + minDetectableEffect);

        const z_alpha = 1.96;
        const z_beta = 0.84;

        const pooledP = (p1 + p2) / 2;

        const n = Math.pow(z_alpha * Math.sqrt(2 * pooledP * (1 - pooledP)) +
            z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) /
            Math.pow(p1 - p2, 2);

        return Math.ceil(n);
    }

    // Main analysis function
    async runAnalysis() {
        // Re-check collector în caz că a apărut între timp
        if (!this.state.metricsCollector) {
            this.findMetricsCollector();
        }

        if (!this.state.metricsCollector) {
            alert('Metrics Collector not found!\n\nMake sure:\n1. <atlas-metrics-collector> is on the page\n2. You have collected some data\n3. The page has fully loaded');
            return;
        }

        this.state.isAnalyzing = true;
        this.render();

        const sessions = this.state.metricsCollector.state.sessions;

        if (sessions.length < 30) {
            alert('Not enough data! Collect at least 30 sessions for meaningful analysis.');
            this.state.isAnalyzing = false;
            this.render();
            return;
        }

        const atlasData = sessions.filter(s => s.layoutType === 'atlas');
        const staticData = sessions.filter(s => s.layoutType === 'static');

        if (atlasData.length < 15 || staticData.length < 15) {
            alert('Need at least 15 sessions per variant!');
            this.state.isAnalyzing = false;
            this.render();
            return;
        }

        // Calculate metrics
        const results = {
            timestamp: new Date().toISOString(),
            sampleSize: {
                atlas: atlasData.length,
                static: staticData.length,
                total: sessions.length
            },
            metrics: {}
        };

        // CTR Analysis
        const atlasCTR = atlasData.filter(s => s.clicked).length;
        const staticCTR = staticData.filter(s => s.clicked).length;

        const ctrTest = this.chiSquareTest(atlasCTR, atlasData.length, staticCTR, staticData.length);
        const ctrCI_atlas = this.confidenceInterval(atlasCTR, atlasData.length);
        const ctrCI_static = this.confidenceInterval(staticCTR, staticData.length);

        results.metrics.ctr = {
            atlas: {
                rate: atlasCTR / atlasData.length,
                count: atlasCTR,
                ci: ctrCI_atlas
            },
            static: {
                rate: staticCTR / staticData.length,
                count: staticCTR,
                ci: ctrCI_static
            },
            uplift: ((atlasCTR / atlasData.length) / (staticCTR / staticData.length) - 1) * 100,
            test: ctrTest,
            conclusion: this.interpretTest(ctrTest, 'CTR')
        };

        // Conversion Rate Analysis
        const atlasConv = atlasData.filter(s => s.converted).length;
        const staticConv = staticData.filter(s => s.converted).length;

        const convTest = this.chiSquareTest(atlasConv, atlasData.length, staticConv, staticData.length);
        const convCI_atlas = this.confidenceInterval(atlasConv, atlasData.length);
        const convCI_static = this.confidenceInterval(staticConv, staticData.length);

        results.metrics.conversion = {
            atlas: {
                rate: atlasConv / atlasData.length,
                count: atlasConv,
                ci: convCI_atlas
            },
            static: {
                rate: staticConv / staticData.length,
                count: staticConv,
                ci: convCI_static
            },
            uplift: ((atlasConv / atlasData.length) / (staticConv / staticData.length) - 1) * 100,
            test: convTest,
            conclusion: this.interpretTest(convTest, 'Conversion Rate')
        };

        // Bounce Rate Analysis
        const atlasBounce = atlasData.filter(s => s.bounced).length;
        const staticBounce = staticData.filter(s => s.bounced).length;

        const bounceTest = this.chiSquareTest(atlasBounce, atlasData.length, staticBounce, staticData.length);

        results.metrics.bounce = {
            atlas: {
                rate: atlasBounce / atlasData.length,
                count: atlasBounce
            },
            static: {
                rate: staticBounce / staticData.length,
                count: staticBounce
            },
            reduction: (1 - (atlasBounce / atlasData.length) / (staticBounce / staticData.length)) * 100,
            test: bounceTest,
            conclusion: this.interpretTest(bounceTest, 'Bounce Rate', true)
        };

        // Engagement Score Analysis
        const atlasEngagement = atlasData.map(s => s.engagementScore || 0);
        const staticEngagement = staticData.map(s => s.engagementScore || 0);

        const engagementTest = this.tTest(atlasEngagement, staticEngagement);

        if (engagementTest) {
            results.metrics.engagement = {
                atlas: {
                    mean: engagementTest.mean1,
                    values: atlasEngagement.length
                },
                static: {
                    mean: engagementTest.mean2,
                    values: staticEngagement.length
                },
                uplift: ((engagementTest.mean1 / engagementTest.mean2) - 1) * 100,
                test: engagementTest,
                conclusion: this.interpretTest(engagementTest, 'Engagement Score')
            };
        }

        // Overall Recommendation
        results.recommendation = this.generateRecommendation(results);

        // Sample size for future tests
        const baselineCTR = staticCTR / staticData.length;
        results.sampleSizeRecommendation = {
            for10percentLift: this.calculateRequiredSampleSize(baselineCTR, 0.10),
            for20percentLift: this.calculateRequiredSampleSize(baselineCTR, 0.20),
            for30percentLift: this.calculateRequiredSampleSize(baselineCTR, 0.30)
        };

        this.state.analysisResults = results;
        this.state.isAnalyzing = false;
        this.render();

        console.log('[StatAnalysis] Analysis complete:', results);
    }

    interpretTest(testResult, metricName, lowerIsBetter = false) {
        if (!testResult || testResult.pValue === null) {
            return 'Insufficient data for statistical test';
        }

        const significant = testResult.pValue < 0.05;
        const highlySignificant = testResult.pValue < 0.01;

        let interpretation = '';

        if (highlySignificant) {
            interpretation = `Highly significant difference detected (p = ${testResult.pValue.toFixed(4)}). `;
            interpretation += `ATLAS shows ${lowerIsBetter ? 'lower' : 'higher'} ${metricName} with very strong statistical evidence.`;
        } else if (significant) {
            interpretation = `Significant difference detected (p = ${testResult.pValue.toFixed(4)}). `;
            interpretation += `ATLAS shows ${lowerIsBetter ? 'lower' : 'higher'} ${metricName} with strong statistical evidence.`;
        } else {
            interpretation = `No significant difference detected (p = ${testResult.pValue.toFixed(4)}). `;
            interpretation += `More data needed to confirm difference in ${metricName}.`;
        }

        return interpretation;
    }

    generateRecommendation(results) {
        const significantMetrics = [];

        if (results.metrics.ctr?.test?.significant) significantMetrics.push('CTR');
        if (results.metrics.conversion?.test?.significant) significantMetrics.push('Conversion');
        if (results.metrics.bounce?.test?.significant) significantMetrics.push('Bounce Rate');
        if (results.metrics.engagement?.test?.significant) significantMetrics.push('Engagement');

        if (significantMetrics.length >= 3) {
            return {
                decision: 'IMPLEMENT ATLAS',
                confidence: 'High',
                reasoning: `Strong evidence across ${significantMetrics.length} metrics: ${significantMetrics.join(', ')}. ATLAS consistently outperforms static layouts with statistical significance.`
            };
        } else if (significantMetrics.length >= 2) {
            return {
                decision: 'IMPLEMENT ATLAS',
                confidence: 'Medium',
                reasoning: `Positive results in ${significantMetrics.length} metrics: ${significantMetrics.join(', ')}. Consider collecting more data for additional validation.`
            };
        } else if (significantMetrics.length === 1) {
            return {
                decision: 'COLLECT MORE DATA',
                confidence: 'Low',
                reasoning: `Only ${significantMetrics[0]} shows significant improvement. Recommend collecting 2-3x more data before final decision.`
            };
        } else {
            return {
                decision: 'COLLECT MORE DATA',
                confidence: 'Insufficient',
                reasoning: 'No metrics show statistical significance yet. Sample size may be too small or effect sizes too subtle. Recommend at least 500 sessions per variant.'
            };
        }
    }

    exportAnalysis() {
        if (!this.state.analysisResults) {
            alert('Run analysis first!');
            return;
        }

        const json = JSON.stringify(this.state.analysisResults, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'atlas-statistical-analysis.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    exportReport() {
        if (!this.state.analysisResults) {
            alert('Run analysis first!');
            return;
        }

        const r = this.state.analysisResults;

        let report = 'ATLAS vs Static Grid - Statistical Analysis Report\n';
        report += '='.repeat(60) + '\n\n';

        report += `Generated: ${new Date(r.timestamp).toLocaleString()}\n`;
        report += `Sample Size: ${r.sampleSize.atlas} ATLAS, ${r.sampleSize.static} Static (${r.sampleSize.total} total)\n\n`;

        report += 'KEY FINDINGS\n';
        report += '-'.repeat(60) + '\n\n';

        if (r.metrics.ctr) {
            const m = r.metrics.ctr;
            report += `Click-Through Rate:\n`;
            report += `  ATLAS:  ${(m.atlas.rate * 100).toFixed(2)}% (${m.atlas.count}/${r.sampleSize.atlas})\n`;
            report += `  Static: ${(m.static.rate * 100).toFixed(2)}% (${m.static.count}/${r.sampleSize.static})\n`;
            report += `  Uplift: +${m.uplift.toFixed(1)}%\n`;
            report += `  P-value: ${m.test.pValue.toFixed(4)} ${m.test.significant ? '✓ SIGNIFICANT' : '✗ Not significant'}\n`;
            report += `  95% CI ATLAS: [${(m.atlas.ci.lower * 100).toFixed(2)}%, ${(m.atlas.ci.upper * 100).toFixed(2)}%]\n\n`;
        }

        if (r.metrics.conversion) {
            const m = r.metrics.conversion;
            report += `Conversion Rate:\n`;
            report += `  ATLAS:  ${(m.atlas.rate * 100).toFixed(2)}% (${m.atlas.count}/${r.sampleSize.atlas})\n`;
            report += `  Static: ${(m.static.rate * 100).toFixed(2)}% (${m.static.count}/${r.sampleSize.static})\n`;
            report += `  Uplift: +${m.uplift.toFixed(1)}%\n`;
            report += `  P-value: ${m.test.pValue.toFixed(4)} ${m.test.significant ? '✓ SIGNIFICANT' : '✗ Not significant'}\n\n`;
        }

        if (r.metrics.bounce) {
            const m = r.metrics.bounce;
            report += `Bounce Rate:\n`;
            report += `  ATLAS:  ${(m.atlas.rate * 100).toFixed(2)}%\n`;
            report += `  Static: ${(m.static.rate * 100).toFixed(2)}%\n`;
            report += `  Reduction: -${m.reduction.toFixed(1)}%\n`;
            report += `  P-value: ${m.test.pValue.toFixed(4)} ${m.test.significant ? '✓ SIGNIFICANT' : '✗ Not significant'}\n\n`;
        }

        report += '\nRECOMMENDATION\n';
        report += '-'.repeat(60) + '\n';
        report += `Decision: ${r.recommendation.decision}\n`;
        report += `Confidence: ${r.recommendation.confidence}\n`;
        report += `Reasoning: ${r.recommendation.reasoning}\n\n`;

        report += '\nSAMPLE SIZE RECOMMENDATIONS\n';
        report += '-'.repeat(60) + '\n';
        report += `For 10% lift detection: ${r.sampleSizeRecommendation.for10percentLift} sessions per variant\n`;
        report += `For 20% lift detection: ${r.sampleSizeRecommendation.for20percentLift} sessions per variant\n`;
        report += `For 30% lift detection: ${r.sampleSizeRecommendation.for30percentLift} sessions per variant\n`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'atlas-analysis-report.txt';
        link.click();
        URL.revokeObjectURL(url);
    }

    setupEventListeners() {
        const runBtn = this.shadowRoot.querySelector('#run-analysis');
        const exportJsonBtn = this.shadowRoot.querySelector('#export-json');
        const exportReportBtn = this.shadowRoot.querySelector('#export-report');

        if (runBtn) runBtn.addEventListener('click', () => this.runAnalysis());
        if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => this.exportAnalysis());
        if (exportReportBtn) exportReportBtn.addEventListener('click', () => this.exportReport());
    }

    render() {
        const hasCollector = !!this.state.metricsCollector;
        const hasResults = !!this.state.analysisResults;
        const r = this.state.analysisResults;

        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; font-family: system-ui, sans-serif; }
                .container { background: #0b0d12; color: #dfe6ff; padding: 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
                .header { margin-bottom: 24px; }
                h1 { font-size: 24px; margin: 0 0 8px 0; background: linear-gradient(135deg, #7aa2ff, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .subtitle { color: #8e9ab3; font-size: 14px; }
                .status-badge { display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 12px; }
                .badge-success { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; }
                .badge-warning { background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; }
                .controls { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
                button { padding: 12px 24px; border-radius: 10px; border: none; font-weight: 600; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
                button:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-primary { background: linear-gradient(135deg, #7aa2ff, #a78bfa); color: white; }
                .btn-secondary { background: #1f2937; color: #dfe6ff; border: 1px solid rgba(255,255,255,0.1); }
                .results { display: grid; gap: 20px; }
                .metric-card { background: #151823; padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
                .metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
                .metric-title { font-size: 16px; font-weight: 700; color: #dfe6ff; }
                .significance-badge { padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }
                .sig-yes { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                .sig-no { background: rgba(142, 154, 179, 0.2); color: #8e9ab3; }
                .metric-comparison { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px; }
                .metric-value { text-align: center; }
                .value-label { font-size: 11px; color: #8e9ab3; margin-bottom: 4px; }
                .value-number { font-size: 24px; font-weight: 700; }
                .atlas-value { color: #7aa2ff; }
                .static-value { color: #6b7280; }
                .uplift-value { color: #10b981; }
                .metric-stats { font-size: 12px; color: #8e9ab3; line-height: 1.6; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; }
                .conclusion { margin-top: 12px; padding: 12px; background: rgba(122, 162, 255, 0.05); border-left: 3px solid #7aa2ff; border-radius: 6px; font-size: 13px; line-height: 1.5; }
                .recommendation { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px; color: white; }
                .rec-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
                .rec-decision { font-size: 32px; font-weight: 800; margin-bottom: 8px; }
                .rec-confidence { opacity: 0.9; margin-bottom: 12px; }
                .rec-reasoning { opacity: 0.95; line-height: 1.6; }
                .sample-size { background: #151823; padding: 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); }
                .sample-size h3 { font-size: 14px; margin: 0 0 12px 0; color: #dfe6ff; }
                .sample-list { display: grid; gap: 8px; font-size: 13px; color: #8e9ab3; }
                .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
                .loading { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 40px; }
                .spinner { width: 24px; height: 24px; border: 3px solid rgba(122, 162, 255, 0.3); border-top-color: #7aa2ff; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .warning-box { margin-top: 12px; padding: 12px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px; font-size: 13px; color: #fbbf24; line-height: 1.6; }
            </style>
            
            <div class="container">
                <div class="header">
                    <h1>📊 Statistical Analysis Engine</h1>
                    <p class="subtitle">Automated A/B testing with chi-square, t-tests, and confidence intervals</p>
                    
                    <div class="status-badge ${hasCollector ? 'badge-success' : 'badge-warning'}">
                        ${hasCollector ? '✓ Connected to Metrics Collector' : '⚠ Searching for Metrics Collector...'}
                    </div>
                    
                    ${!hasCollector ? `
                        <div class="warning-box">
                            <strong>⚠️ Metrics Collector not found yet.</strong><br>
                            Make sure the &lt;atlas-metrics-collector&gt; component is on the page above this component.<br>
                            The system will keep searching automatically every 2 seconds.
                        </div>
                    ` : ''}
                </div>
                
                <div class="controls">
                    <button id="run-analysis" class="btn-primary" ${!hasCollector || this.state.isAnalyzing ? 'disabled' : ''}>
                        ${this.state.isAnalyzing ? '⏳ Analyzing...' : '🔬 Run Statistical Analysis'}
                    </button>
                    <button id="export-json" class="btn-secondary" ${!hasResults ? 'disabled' : ''}>
                        📥 Export JSON
                    </button>
                    <button id="export-report" class="btn-secondary" ${!hasResults ? 'disabled' : ''}>
                        📄 Export Report
                    </button>
                </div>
                
                ${this.state.isAnalyzing ? `
                    <div class="loading">
                        <div class="spinner"></div>
                        <span>Running statistical tests...</span>
                    </div>
                ` : hasResults ? `
                    <div class="results">
                        ${r.metrics.ctr ? this.renderMetricCard('Click-Through Rate', r.metrics.ctr, '%') : ''}
                        ${r.metrics.conversion ? this.renderMetricCard('Conversion Rate', r.metrics.conversion, '%') : ''}
                        ${r.metrics.bounce ? this.renderMetricCard('Bounce Rate', r.metrics.bounce, '%', true) : ''}
                        ${r.metrics.engagement ? this.renderMetricCard('Engagement Score', r.metrics.engagement, '', false, true) : ''}
                        
                        <div class="recommendation">
                            <div class="rec-title">📋 Recommendation</div>
                            <div class="rec-decision">${r.recommendation.decision}</div>
                            <div class="rec-confidence">Confidence: ${r.recommendation.confidence}</div>
                            <div class="rec-reasoning">${r.recommendation.reasoning}</div>
                        </div>
                        
                        <div class="sample-size">
                            <h3>📏 Sample Size Recommendations for Future Tests</h3>
                            <div class="sample-list">
                                <div>For 10% lift detection: <strong>${r.sampleSizeRecommendation.for10percentLift}</strong> sessions per variant</div>
                                <div>For 20% lift detection: <strong>${r.sampleSizeRecommendation.for20percentLift}</strong> sessions per variant</div>
                                <div>For 30% lift detection: <strong>${r.sampleSizeRecommendation.for30percentLift}</strong> sessions per variant</div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div class="empty-state">
                        <p style="font-size: 48px; margin: 0 0 16px 0;">🔬</p>
                        <p style="font-size: 16px; margin: 0 0 8px 0;">No analysis yet</p>
                        <p>Collect data with Metrics Collector, then click "Run Statistical Analysis"</p>
                    </div>
                `}
            </div>
        `;

        this.setupEventListeners();
    }

    renderMetricCard(title, metric, unit, isInverse = false, isContinuous = false) {
        const atlasValue = isContinuous ? metric.atlas.mean : metric.atlas.rate;
        const staticValue = isContinuous ? metric.static.mean : metric.static.rate;
        const upliftValue = isInverse ? metric.reduction : metric.uplift;
        const upliftLabel = isInverse ? 'Reduction' : 'Uplift';

        return `
            <div class="metric-card">
                <div class="metric-header">
                    <div class="metric-title">${title}</div>
                    <div class="significance-badge ${metric.test.significant ? 'sig-yes' : 'sig-no'}">
                        ${metric.test.significant ? '✓ Significant' : '○ Not Significant'}
                    </div>
                </div>
                
                <div class="metric-comparison">
                    <div class="metric-value">
                        <div class="value-label">ATLAS</div>
                        <div class="value-number atlas-value">
                            ${isContinuous ? atlasValue.toFixed(3) : (atlasValue * 100).toFixed(1) + unit}
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="value-label">Static</div>
                        <div class="value-number static-value">
                            ${isContinuous ? staticValue.toFixed(3) : (staticValue * 100).toFixed(1) + unit}
                        </div>
                    </div>
                    <div class="metric-value">
                        <div class="value-label">${upliftLabel}</div>
                        <div class="value-number uplift-value">
                            ${upliftValue >= 0 ? '+' : ''}${upliftValue.toFixed(1)}%
                        </div>
                    </div>
                </div>
                
                <div class="metric-stats">
                    ${isContinuous ? `
                        <div>T-statistic: ${metric.test.t.toFixed(3)}</div>
                        <div>Degrees of freedom: ${metric.test.df.toFixed(1)}</div>
                    ` : `
                        <div>Chi-square: ${metric.test.chiSquare.toFixed(3)}</div>
                        ${metric.atlas.ci ? `<div>95% CI (ATLAS): [${(metric.atlas.ci.lower * 100).toFixed(2)}%, ${(metric.atlas.ci.upper * 100).toFixed(2)}%]</div>` : ''}
                    `}
                    <div>P-value: ${metric.test.pValue.toFixed(4)}</div>
                </div>
                
                <div class="conclusion">
                    ${metric.conclusion}
                </div>
            </div>
        `;
    }
}

customElements.define('atlas-statistical-analysis', AtlasStatisticalAnalysis);