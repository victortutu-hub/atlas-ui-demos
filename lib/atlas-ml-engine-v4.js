// src/atlas-ml-engine-v4.js
// 🚀 ATLAS ML Engine v4.0 - Deep Q-Learning with Multi-Context Bandits

/**
 * Experience Replay Buffer - Store and sample past experiences
 */
class ExperienceReplayBuffer {
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.position = 0;
    }

    /**
     * Add experience to buffer
     * @param {Object} experience - {state, action, reward, nextState, done}
     */
    add(experience) {
        if (this.buffer.length < this.maxSize) {
            this.buffer.push(experience);
        } else {
            this.buffer[this.position] = experience;
        }
        this.position = (this.position + 1) % this.maxSize;
    }

    /**
     * Sample random mini-batch
     * @param {number} batchSize - Number of samples
     * @returns {Array} Batch of experiences
     */
    sample(batchSize) {
        const batch = [];
        const indices = new Set();

        while (batch.length < Math.min(batchSize, this.buffer.length)) {
            const idx = Math.floor(Math.random() * this.buffer.length);
            if (!indices.has(idx)) {
                indices.add(idx);
                batch.push(this.buffer[idx]);
            }
        }

        return batch;
    }

    get size() {
        return this.buffer.length;
    }

    clear() {
        this.buffer = [];
        this.position = 0;
    }
}

/**
 * Upper Confidence Bound (UCB) Bandit
 */
class UCBBandit {
    constructor(nArms = 10, c = 2.0) {
        this.nArms = nArms;
        this.c = c; // Exploration parameter
        this.counts = new Array(nArms).fill(0);
        this.values = new Array(nArms).fill(0);
        this.totalCount = 0;
    }

    /**
     * Select arm using UCB formula
     */
    selectArm() {
        // Explore: try each arm once first
        for (let i = 0; i < this.nArms; i++) {
            if (this.counts[i] === 0) {
                return i;
            }
        }

        // Exploit with exploration bonus
        let bestArm = 0;
        let bestUCB = -Infinity;

        for (let i = 0; i < this.nArms; i++) {
            const avgReward = this.values[i];
            const exploration = Math.sqrt((2 * Math.log(this.totalCount)) / this.counts[i]);
            const ucb = avgReward + this.c * exploration;

            if (ucb > bestUCB) {
                bestUCB = ucb;
                bestArm = i;
            }
        }

        return bestArm;
    }

    /**
     * Update arm with reward
     */
    update(arm, reward) {
        this.counts[arm]++;
        this.totalCount++;

        // Incremental average
        const n = this.counts[arm];
        const oldValue = this.values[arm];
        this.values[arm] = oldValue + (reward - oldValue) / n;
    }

    getStats() {
        return {
            counts: [...this.counts],
            values: [...this.values],
            totalCount: this.totalCount
        };
    }
}

/**
 * Thompson Sampling Bandit
 */
class ThompsonSamplingBandit {
    constructor(nArms = 10) {
        this.nArms = nArms;
        this.alpha = new Array(nArms).fill(1); // Success counts
        this.beta = new Array(nArms).fill(1);  // Failure counts
    }

    /**
     * Sample from Beta distribution (approximation)
     */
    betaSample(alpha, beta) {
        // Simple approximation using mean + noise
        const mean = alpha / (alpha + beta);
        const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
        const noise = (Math.random() - 0.5) * Math.sqrt(variance) * 6;
        return Math.max(0, Math.min(1, mean + noise));
    }

    /**
     * Select arm by sampling from posterior
     */
    selectArm() {
        let bestArm = 0;
        let bestSample = -Infinity;

        for (let i = 0; i < this.nArms; i++) {
            const sample = this.betaSample(this.alpha[i], this.beta[i]);
            if (sample > bestSample) {
                bestSample = sample;
                bestArm = i;
            }
        }

        return bestArm;
    }

    /**
     * Update with binary reward (0 or 1)
     */
    update(arm, reward) {
        if (reward > 0.5) {
            this.alpha[arm] += 1;
        } else {
            this.beta[arm] += 1;
        }
    }

    getStats() {
        return {
            alpha: [...this.alpha],
            beta: [...this.beta],
            means: this.alpha.map((a, i) => a / (a + this.beta[i]))
        };
    }
}

/**
 * Epsilon-Greedy Bandit
 */
class EpsilonGreedyBandit {
    constructor(nArms = 10, epsilon = 0.1) {
        this.nArms = nArms;
        this.epsilon = epsilon;
        this.counts = new Array(nArms).fill(0);
        this.values = new Array(nArms).fill(0);
    }

    selectArm() {
        if (Math.random() < this.epsilon) {
            // Explore: random arm
            return Math.floor(Math.random() * this.nArms);
        } else {
            // Exploit: best arm
            let bestArm = 0;
            let bestValue = this.values[0];

            for (let i = 1; i < this.nArms; i++) {
                if (this.values[i] > bestValue) {
                    bestValue = this.values[i];
                    bestArm = i;
                }
            }

            return bestArm;
        }
    }

    update(arm, reward) {
        this.counts[arm]++;
        const n = this.counts[arm];
        const oldValue = this.values[arm];
        this.values[arm] = oldValue + (reward - oldValue) / n;
    }

    getStats() {
        return {
            counts: [...this.counts],
            values: [...this.values],
            epsilon: this.epsilon
        };
    }
}

/**
 * Multi-Context Bandit Ensemble
 * Separate bandits for each context (dashboard/blog/ecommerce)
 */
class MultiContextBanditEnsemble {
    constructor(contexts = ['dashboard', 'blog', 'ecommerce'], nArms = 10) {
        this.contexts = contexts;
        this.nArms = nArms;

        // Create bandits for each context
        this.bandits = {};

        contexts.forEach(context => {
            this.bandits[context] = {
                ucb: new UCBBandit(nArms, 2.0),
                thompson: new ThompsonSamplingBandit(nArms),
                epsilonGreedy: new EpsilonGreedyBandit(nArms, 0.1)
            };
        });

        // Track which bandit to use (can be adaptive)
        this.activeBanditType = 'thompson'; // 'ucb', 'thompson', or 'epsilonGreedy'
    }

    /**
     * Select arm for given context
     */
    selectArm(context) {
        if (!this.bandits[context]) {
            console.warn(`[BanditEnsemble] Unknown context: ${context}, using dashboard`);
            context = 'dashboard';
        }

        const bandit = this.bandits[context][this.activeBanditType];
        return bandit.selectArm();
    }

    /**
     * Update bandit with reward
     */
    update(context, arm, reward) {
        if (!this.bandits[context]) {
            console.warn(`[BanditEnsemble] Unknown context: ${context}`);
            return;
        }

        // Update all bandit types for this context
        Object.values(this.bandits[context]).forEach(bandit => {
            bandit.update(arm, reward);
        });
    }

    /**
     * Switch active bandit type
     */
    setActiveBandit(type) {
        if (['ucb', 'thompson', 'epsilonGreedy'].includes(type)) {
            this.activeBanditType = type;
            console.log(`[BanditEnsemble] Switched to ${type}`);
        }
    }

    /**
     * Get statistics for all contexts
     */
    getStats() {
        const stats = {};

        this.contexts.forEach(context => {
            stats[context] = {};
            Object.entries(this.bandits[context]).forEach(([type, bandit]) => {
                stats[context][type] = bandit.getStats();
            });
        });

        return {
            activeBandit: this.activeBanditType,
            contexts: stats
        };
    }
}

/**
 * Deep Q-Network (DQN) - Main ML Model
 */
class DQNAgent {
    constructor(tf, inputSize, outputSize, learningRate = 0.001) {
        this.tf = tf;
        this.inputSize = inputSize;
        this.outputSize = outputSize;
        this.learningRate = learningRate;

        // Main Q-Network
        this.qNetwork = this.buildNetwork();

        // Target Network (for stable learning)
        this.targetNetwork = this.buildNetwork();
        this.updateTargetNetwork();

        // Hyperparameters
        this.gamma = 0.95; // Discount factor
        this.updateTargetEvery = 100; // Update target network frequency
        this.trainingSteps = 0;

        console.log('[DQN] Initialized with input:', inputSize, 'output:', outputSize);
    }

    /**
     * Build neural network
     */
    buildNetwork() {
        const model = this.tf.sequential();

        // Input layer + first hidden layer
        model.add(this.tf.layers.dense({
            units: 64,
            activation: 'relu',
            inputShape: [this.inputSize],
            kernelInitializer: 'heNormal'
        }));

        // Second hidden layer
        model.add(this.tf.layers.dense({
            units: 32,
            activation: 'relu',
            kernelInitializer: 'heNormal'
        }));

        // Output layer (Q-values for each action/layout)
        model.add(this.tf.layers.dense({
            units: this.outputSize,
            activation: 'linear',
            kernelInitializer: 'heNormal'
        }));

        model.compile({
            optimizer: this.tf.train.adam(this.learningRate),
            loss: 'meanSquaredError'
        });

        return model;
    }

    /**
     * Predict Q-values for a state
     */
    predict(state) {
        return this.tf.tidy(() => {
            const stateTensor = this.tf.tensor2d([state], [1, this.inputSize]);
            const qValues = this.qNetwork.predict(stateTensor);
            return qValues.arraySync()[0];
        });
    }

    /**
     * Select action using epsilon-greedy
     */
    selectAction(state, epsilon = 0.1) {
        if (Math.random() < epsilon) {
            // Explore: random action
            return Math.floor(Math.random() * this.outputSize);
        } else {
            // Exploit: best action
            const qValues = this.predict(state);
            return qValues.indexOf(Math.max(...qValues));
        }
    }

    /**
     * Train on a mini-batch from replay buffer
     */
    async trainOnBatch(batch) {
        if (batch.length === 0) return;

        const batchSize = batch.length;

        // Prepare training data
        const states = batch.map(exp => exp.state);
        const actions = batch.map(exp => exp.action);
        const rewards = batch.map(exp => exp.reward);
        const nextStates = batch.map(exp => exp.nextState);
        const dones = batch.map(exp => exp.done);

        // Compute target Q-values
        const targets = await this.tf.tidy(() => {
            // Current Q-values
            const statesTensor = this.tf.tensor2d(states, [batchSize, this.inputSize]);
            const currentQs = this.qNetwork.predict(statesTensor);

            // Next Q-values from target network
            const nextStatesTensor = this.tf.tensor2d(nextStates, [batchSize, this.inputSize]);
            const nextQs = this.targetNetwork.predict(nextStatesTensor);
            const maxNextQs = nextQs.max(1);

            // Compute TD-target: r + γ * max(Q(s', a'))
            const targetQs = currentQs.arraySync();

            for (let i = 0; i < batchSize; i++) {
                const maxNextQ = maxNextQs.arraySync()[i];
                const tdTarget = dones[i] ? rewards[i] : rewards[i] + this.gamma * maxNextQ;
                targetQs[i][actions[i]] = tdTarget;
            }

            return this.tf.tensor2d(targetQs, [batchSize, this.outputSize]);
        });

        // Train the network
        const statesTensor = this.tf.tensor2d(states, [batchSize, this.inputSize]);

        await this.qNetwork.fit(statesTensor, targets, {
            epochs: 1,
            verbose: 0,
            batchSize: batchSize
        });

        // Cleanup
        statesTensor.dispose();
        targets.dispose();

        this.trainingSteps++;

        // Update target network periodically
        if (this.trainingSteps % this.updateTargetEvery === 0) {
            this.updateTargetNetwork();
            console.log('[DQN] Target network updated at step', this.trainingSteps);
        }
    }

    /**
     * Copy weights from Q-network to target network
     */
    updateTargetNetwork() {
        const weights = this.qNetwork.getWeights();
        const weightCopies = weights.map(w => w.clone());
        this.targetNetwork.setWeights(weightCopies);
    }

    /**
     * Save model to localStorage
     */
    async save(path) {
        await this.qNetwork.save(path);
        console.log('[DQN] Model saved to', path);
    }

    /**
     * Load model from localStorage
     */
    async load(path) {
        try {
            this.qNetwork = await this.tf.loadLayersModel(path);
            this.qNetwork.compile({
                optimizer: this.tf.train.adam(this.learningRate),
                loss: 'meanSquaredError'
            });
            this.updateTargetNetwork();
            console.log('[DQN] Model loaded from', path);
            return true;
        } catch (e) {
            console.warn('[DQN] Could not load model:', e.message);
            return false;
        }
    }

    dispose() {
        this.qNetwork.dispose();
        this.targetNetwork.dispose();
    }
}

/**
 * ML Engine v4 - Main orchestrator
 */
export class MLEngineV4 {
    constructor(tf, inputSize, config = {}) {
        this.tf = tf;
        this.inputSize = inputSize;

        // Configuration
        this.config = {
            nArms: config.nArms || 10,
            replayBufferSize: config.replayBufferSize || 1000,
            batchSize: config.batchSize || 32,
            learningRate: config.learningRate || 0.001,
            epsilon: config.epsilon || 0.1,
            epsilonDecay: config.epsilonDecay || 0.995,
            epsilonMin: config.epsilonMin || 0.01,
            trainEvery: config.trainEvery || 4,
            ...config
        };

        // Components
        this.banditEnsemble = new MultiContextBanditEnsemble(
            ['dashboard', 'blog', 'ecommerce'],
            this.config.nArms
        );

        this.dqn = new DQNAgent(
            tf,
            inputSize,
            this.config.nArms,
            this.config.learningRate
        );

        this.replayBuffer = new ExperienceReplayBuffer(this.config.replayBufferSize);

        // State
        this.currentEpsilon = this.config.epsilon;
        this.stepCount = 0;
        this.episodeCount = 0;

        // Stats
        this.stats = {
            totalRewards: 0,
            avgReward: 0,
            episodeRewards: [],
            banditStats: null,
            dqnStats: {
                trainingSteps: 0,
                bufferSize: 0
            }
        };

        console.log('[MLEngine v4] Initialized with config:', this.config);
    }

    /**
     * Select layout action for given state and context
     */
    selectAction(state, context = 'dashboard') {
        // Hybrid approach: use both bandit and DQN

        // 50% of time: use context-specific bandit
        if (Math.random() < 0.5) {
            return this.banditEnsemble.selectArm(context);
        }

        // 50% of time: use DQN with epsilon-greedy
        return this.dqn.selectAction(state, this.currentEpsilon);
    }

    /**
     * Record experience and learn
     */
    async recordExperience(state, action, reward, nextState, done, context = 'dashboard') {
        // Store in replay buffer
        this.replayBuffer.add({
            state,
            action,
            reward,
            nextState,
            done
        });

        // Update bandits
        this.banditEnsemble.update(context, action, reward);

        // Update stats
        this.stats.totalRewards += reward;
        this.stepCount++;

        // Train DQN periodically
        if (this.stepCount % this.config.trainEvery === 0 && this.replayBuffer.size >= this.config.batchSize) {
            await this.trainDQN();
        }

        // Decay epsilon
        if (this.currentEpsilon > this.config.epsilonMin) {
            this.currentEpsilon *= this.config.epsilonDecay;
        }

        // Update stats
        this.updateStats();
    }

    /**
     * Train DQN on mini-batch
     */
    async trainDQN() {
        const batch = this.replayBuffer.sample(this.config.batchSize);
        await this.dqn.trainOnBatch(batch);
    }

    /**
     * Update statistics
     */
    updateStats() {
        this.stats.avgReward = this.stepCount > 0 ? this.stats.totalRewards / this.stepCount : 0;
        this.stats.banditStats = this.banditEnsemble.getStats();
        this.stats.dqnStats = {
            trainingSteps: this.dqn.trainingSteps,
            bufferSize: this.replayBuffer.size,
            epsilon: this.currentEpsilon
        };
    }

    /**
     * Get current statistics
     */
    getStats() {
        this.updateStats();
        return { ...this.stats };
    }

    /**
     * Switch bandit algorithm
     */
    setBanditAlgorithm(algorithm) {
        this.banditEnsemble.setActiveBandit(algorithm);
    }

    /**
     * Save entire engine state
     */
    async save(basePath = 'localstorage://atlas-ml-v4') {
        // Save DQN model
        await this.dqn.save(basePath);

        // Save other state
        const state = {
            config: this.config,
            epsilon: this.currentEpsilon,
            stepCount: this.stepCount,
            episodeCount: this.episodeCount,
            stats: this.stats,
            banditStats: this.banditEnsemble.getStats()
        };

        localStorage.setItem('atlas-ml-v4-state', JSON.stringify(state));
        console.log('[MLEngine v4] State saved');
    }

    /**
     * Load entire engine state
     */
    async load(basePath = 'localstorage://atlas-ml-v4') {
        // Load DQN model
        const loaded = await this.dqn.load(basePath);

        if (loaded) {
            // Load other state
            try {
                const stateStr = localStorage.getItem('atlas-ml-v4-state');
                if (stateStr) {
                    const state = JSON.parse(stateStr);
                    this.currentEpsilon = state.epsilon || this.config.epsilon;
                    this.stepCount = state.stepCount || 0;
                    this.episodeCount = state.episodeCount || 0;
                    this.stats = state.stats || this.stats;
                    console.log('[MLEngine v4] State loaded');
                }
            } catch (e) {
                console.warn('[MLEngine v4] Could not load state:', e.message);
            }
        }

        return loaded;
    }

    /**
     * Reset learning
     */
    reset() {
        this.replayBuffer.clear();
        this.currentEpsilon = this.config.epsilon;
        this.stepCount = 0;
        this.episodeCount = 0;
        this.stats = {
            totalRewards: 0,
            avgReward: 0,
            episodeRewards: [],
            banditStats: null,
            dqnStats: {
                trainingSteps: 0,
                bufferSize: 0
            }
        };
        console.log('[MLEngine v4] Reset complete');
    }

    /**
     * Cleanup resources
     */
    dispose() {
        this.dqn.dispose();
        console.log('[MLEngine v4] Disposed');
    }
}

// Export singleton getter
let engineInstance = null;

export async function getMLEngine(tf, inputSize, config) {
    if (!engineInstance && tf && inputSize) {
        engineInstance = new MLEngineV4(tf, inputSize, config);

        // Try to load saved state
        await engineInstance.load();
    }
    return engineInstance;
}

// Export for debugging
if (typeof window !== 'undefined') {
    window.__ATLAS_ML_V4__ = {
        getMLEngine,
        MLEngineV4,
        DQNAgent,
        MultiContextBanditEnsemble,
        ExperienceReplayBuffer
    };
}