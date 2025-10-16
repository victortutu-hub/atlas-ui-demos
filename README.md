# 🚀 ATLAS UI v4.0 - Live Demos

**Interactive showcases of an experimental ML-powered UI framework with action-controlled layout generation**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demos](https://img.shields.io/badge/Demos-Live-brightgreen)](https://victortutu-hub.github.io/atlas-ui-demos/)

---

## ⚡ QUICK START

### View Live Demos
Visit: **[https://victortutu-hub.github.io/atlas-ui-demos/](https://victortutu-hub.github.io/atlas-ui-demos/)**

### Run Locally
```bash
# Clone the repository
git clone https://github.com/victortutu-hub/atlas-ui-demos.git
cd atlas-ui-demos

# Start local server (Windows)
START.bat

# Or use Python
python -m http.server 8000

# Open in browser
# http://localhost:8000/
```

---

## 🎪 Live Demos

### [📊 Dashboard Demo](https://victortutu-hub.github.io/atlas-ui-demos/demos/1-dashboard.html)
Business analytics dashboard with ML-driven layout optimization
- **Features:** Dynamic KPI placement, experimental confusion detection, context-aware learning
- **Use case:** Data-heavy business applications

### [🛍️ E-commerce Demo](https://victortutu-hub.github.io/atlas-ui-demos/demos/2-ecommerce.html)
Product page with intent-based layout adaptation
- **Features:** Action-controlled parameters, adaptive grid configurations
- **Use case:** Online retail, product catalogs

### [📝 Blog/Content Demo](https://victortutu-hub.github.io/atlas-ui-demos/demos/3-blog.html)
Content site with reading-optimized layouts
- **Features:** ML-driven article placement, engagement-based learning
- **Use case:** Blogs, news sites, content platforms

---

## 🎯 What's This About?

### **Action-Controlled Generation**
An experimental approach where ML actions (0-9) directly map to layout parameters like grid columns, component counts, and density - eliminating the need for separate layout generators.

### **Hybrid ML Architecture**
- **DQN (Deep Q-Learning)** - Neural network for long-term optimization
- **Multi-Armed Bandits** - UCB, Thompson Sampling, and Epsilon-Greedy algorithms
- **Context-Aware Learning** - Separate models for dashboard, blog, and ecommerce domains

### **Real-time Adaptation**
- Instant layout updates based on user feedback (👍/👎 buttons)
- Experience replay buffer (1000 samples) for stable learning
- Experimental confusion detection based on interaction patterns

### **Live Training**
These aren't static demos - the ML actually learns from your interactions in real-time using TensorFlow.js.

---

## 📚 Technologies Used

- **ATLAS UI v4.0** - Custom ML-powered UI framework
- **TensorFlow.js** - Neural network training in the browser
- **Web Components** - Framework-agnostic custom elements
- **Vanilla JavaScript** - No heavy framework dependencies

---

## 📖 Technical Details

### ML Engine Architecture
```
Hybrid approach combining:
- DQN with 2-layer neural network (64→32→10 units)
- Experience replay buffer (1000 samples)
- Target network for stable learning
- Three bandit algorithms: UCB, Thompson Sampling, Epsilon-Greedy
```

### Action Space
```
10 actions (0-9) that control:
- KPI/product/article counts (2-12 items)
- Grid columns (1-4 columns)
- Component sizes (tiny/small/medium/large)
- Layout types (minimal/balanced/dense/etc.)
```

### Learning Process
```
1. User interacts with UI
2. ML selects action (0-9)
3. Action generates specific layout parameters
4. User provides feedback (👍 or 👎)
5. Experience stored in replay buffer
6. DQN trains on mini-batches
7. Process repeats
```

---

## 🎮 How to Use the Demos

1. **Open any demo** from the links above
2. **Interact naturally** - click, hover, scroll
3. **Provide feedback** using 👍/👎 buttons after each layout
4. **Watch the stats panel** - shows real-time ML metrics (epsilon, buffer size, action)
5. **Try different scenarios** - change intent, density, or device settings
6. **Check browser console (F12)** for detailed ML decision logs

---

## 💡 Tips for Exploration

- **Give consistent feedback** - helps ML learn your preferences
- **Try multiple sessions** - ML improves over repeated interactions
- **Compare behaviors** - see how different domains learn differently
- **Open DevTools** - observe the ML decision-making process
- **Test responsive behavior** - try different device settings

---

## 🔧 For Developers

### Project Structure
```
atlas-ui-demos/
├── demos/
│   ├── 1-dashboard.html     # Dashboard demo
│   ├── 2-ecommerce.html     # E-commerce demo
│   └── 3-blog.html          # Blog demo
├── lib/
│   ├── atlas-ui-v4.js       # Main UI component
│   ├── atlas-ml-engine-v4.js # ML engine (DQN + Bandits)
│   ├── atlas-layout-generator.js # Action-to-layout mapper
│   └── [other modules...]
├── index.html               # Landing page
├── README.md
└── LICENSE
```

### Key Components

**ML Engine** (`atlas-ml-engine-v4.js`):
- DQN implementation with TensorFlow.js
- Multi-Armed Bandit ensemble (UCB, Thompson, Epsilon-Greedy)
- Experience replay buffer
- Context-aware learning (separate per domain)

**Layout Generator** (`atlas-layout-generator.js`):
- Maps actions (0-9) to layout parameters
- Domain-specific variations
- Procedural layout generation

**Confusion Detector** (`atlas-confusion-detector.js`):
- Experimental feature
- Monitors: hesitation, error clicks, scroll patterns, rapid movements
- Provides negative feedback signal to ML

### Integration Example
```html
<!-- Include ATLAS UI -->
<script type="module">
  import { AtlasUIv4 } from './lib/atlas-ui-v4.js';
  
  // Create component
  const atlas = document.createElement('atlas-ui-v4');
  atlas.setAttribute('intent', JSON.stringify({
    domain: 'dashboard',
    goal: 'kpi-focus',
    density: 'medium',
    device: 'desktop'
  }));
  document.body.appendChild(atlas);
  
  // ML will learn from user feedback
</script>
```

---

## 🐛 Troubleshooting

**Demos not loading?**
- Check browser console (F12) for errors
- Verify all files in `/lib/` are present
- Try clearing browser cache
- Use Chrome/Firefox for best compatibility

**ML not learning?**
- Provide feedback with 👍/👎 buttons
- Check console for "ML Engine initialized" message
- Verify TensorFlow.js loaded successfully
- Give it time - learning improves with more interactions

**Stats panel not updating?**
- Refresh the page
- Verify ML Engine initialized (check console)
- Try different browser

---

## ⚠️ Experimental Notice

This is an experimental project exploring novel approaches to ML-driven UI adaptation. The techniques demonstrated here:

- Are research-oriented implementations
- May not be production-ready
- Serve as proof-of-concept for action-controlled generation
- Are provided as-is for educational and experimental purposes

Performance characteristics and learning efficiency may vary significantly based on:
- Amount of training data
- User interaction patterns
- Browser capabilities
- Network conditions

---

## 🤝 Contributing

Contributions, feedback, and suggestions are welcome! 

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

This project is provided as-is for educational and experimental purposes.

---

## 🔗 Links

- **Live Demos:** [victortutu-hub.github.io/atlas-ui-demos](https://victortutu-hub.github.io/atlas-ui-demos/)
- **GitHub Repository:** [github.com/victortutu-hub/atlas-ui-demos](https://github.com/victortutu-hub/atlas-ui-demos)
- **Report Issues:** [GitHub Issues](https://github.com/victortutu-hub/atlas-ui-demos/issues)

---

## 📊 Technical Specifications

**ML Engine:**
- Input size: 20 features (vectorized intent)
- Output size: 10 actions
- Hidden layers: 64 → 32 neurons
- Learning rate: 0.001
- Replay buffer: 1000 samples
- Batch size: 32
- Epsilon decay: 0.995 (min: 0.05)

**Supported Domains:**
- Dashboard (KPI-focused analytics)
- Blog (content-heavy reading)
- E-commerce (product browsing/purchasing)

**Action Space:**
- 10 discrete actions per domain
- Each action maps to specific parameter sets
- Context-specific variations

---

## 💬 Feedback

Questions, suggestions, or found a bug? 

[Open an issue](https://github.com/victortutu-hub/atlas-ui-demos/issues) or contribute to the project!

---

**Built with curiosity and code by [Victor Mihai](https://github.com/victortutu-hub)**

**Experimenting with the future of adaptive user interfaces** 🚀

---

> **Note:** This is an experimental research project. Results and performance may vary. Not recommended for production use without further testing and validation.
