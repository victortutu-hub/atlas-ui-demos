# 🚀 ATLAS UI v4.0 - Live Demos

**Interactive showcases of ATLAS UI's ML-powered adaptive layouts**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Demos](https://img.shields.io/badge/Demos-Live-brightgreen)](https://victortutu-hub.github.io/atlas-ui-demos/)

---

## ⚡ QUICK START

### Option 1: GitHub Pages (Recommended)
Visit the live demos: **[https://victortutu-hub.github.io/atlas-ui-demos/](https://victortutu-hub.github.io/atlas-ui-demos/)**

### Option 2: Local Server
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

### [📊 Dashboard Demo](demos/1-dashboard.html)
Business analytics dashboard with real-time ML optimization
- **Features:** KPI adaptation, confusion detection, multi-context learning
- **Use case:** Data-heavy business applications

### [🛍️ E-commerce Demo](demos/2-ecommerce.html)
Product page that optimizes for conversion
- **Features:** Intent-based layouts, shopping behavior analysis
- **Use case:** Online retail, product catalogs

### [📝 Blog/Content Demo](demos/3-blog.html)
Content-heavy site optimized for readability
- **Features:** Reading pattern analysis, engagement optimization
- **Use case:** Blogs, news sites, content platforms

---

## 🎯 What Makes These Demos Special?

### **Action-Controlled Generation**
ML actions (0-9) directly control layout parameters - no separate generator needed!

### **Hybrid ML Engine**
- DQN (Deep Q-Learning) for long-term optimization
- Multi-Armed Bandits for exploration
- Context-aware learning (dashboard/blog/ecommerce)

### **Real-time Adaptation**
- Instant layout updates based on user feedback (👍/👎)
- Confusion detection and UI adaptation
- Experience replay for stable learning

### **Live Training**
These aren't static demos - the ML actually learns from your interactions!

---

## 📚 Technologies Used

- **ATLAS UI v4.0** - Core ML-powered UI framework
- **TensorFlow.js** - Neural network training (DQN)
- **Web Components** - Modern, framework-agnostic components
- **Vanilla JavaScript** - No heavy frameworks, pure performance

---

## 📖 Documentation

**Main Library Repository:**
[https://github.com/victortutu-hub/atlas-ui-v4](https://github.com/victortutu-hub/atlas-ui-v4)

**Documentation:**
- [Getting Started Guide](https://github.com/victortutu-hub/atlas-ui-v4#getting-started)
- [API Reference](https://github.com/victortutu-hub/atlas-ui-v4/blob/main/docs/API-REFERENCE.md)
- [Architecture Deep Dive](https://github.com/victortutu-hub/atlas-ui-v4/blob/main/docs/ARCHITECTURE.md)

---

## 🎮 How to Use the Demos

1. **Open any demo** from the links above
2. **Interact naturally** - click, hover, scroll
3. **Provide feedback** using 👍/👎 buttons
4. **Watch the ML learn** - stats panel shows real-time learning
5. **Try different scenarios** - change intent/density/device settings
6. **Check the console (F12)** for detailed ML insights

---

## 💡 Tips for Best Experience

- **Use feedback buttons** - they train the ML in real-time
- **Try multiple sessions** - ML improves over time
- **Compare behaviors** across different demos
- **Open DevTools** to see ML decision-making process
- **Test on different devices** - responsive ML adaptation

---

## 🔧 For Developers

### Project Structure
```
atlas-ui-demos/
├── demos/
│   ├── 1-dashboard.html
│   ├── 2-ecommerce.html
│   └── 3-blog.html
├── lib/
│   ├── atlas-ui-v4.js
│   ├── atlas-ml-engine-v4.js
│   └── [other modules...]
├── index.html          # Landing page
├── README.md
└── LICENSE
```

### Local Development
```bash
# Edit demos
nano demos/1-dashboard.html

# Test changes
python -m http.server 8000
# or
START.bat
```

### Integration in Your Project
```html
<!-- Include ATLAS UI -->
<script type="module">
  import { AtlasUIv4 } from './lib/atlas-ui-v4.js';
  
  // Create component
  const atlas = document.createElement('atlas-ui-v4');
  atlas.setAttribute('intent', JSON.stringify({
    domain: 'dashboard',
    goal: 'kpi-focus',
    density: 'medium'
  }));
  document.body.appendChild(atlas);
</script>
```

See [full integration guide](https://github.com/victortutu-hub/atlas-ui-v4#integration) for more.

---

## 🐛 Troubleshooting

**Demo not loading?**
- Check browser console (F12) for errors
- Make sure all files in `/lib/` are present
- Try clearing browser cache

**ML not learning?**
- Click 👍/👎 buttons to provide training data
- Check console for "ML Engine initialized" message
- Verify TensorFlow.js loaded successfully

**Stats panel not updating?**
- Refresh the page
- Check if ML Engine is initialized (console)
- Try different browsers (Chrome recommended)

---

## 🤝 Contributing

Want to improve the demos? Contributions welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Main Library:** [github.com/victortutu-hub/atlas-ui-v4](https://github.com/victortutu-hub/atlas-ui-v4)
- **Live Demos:** [victortutu-hub.github.io/atlas-ui-demos](https://victortutu-hub.github.io/atlas-ui-demos/)
- **Documentation:** [Atlas UI Docs](https://github.com/victortutu-hub/atlas-ui-v4/tree/main/docs)
- **NPM Package:** Coming soon!

---

## ⭐ Show Your Support

If you like these demos, please:
- ⭐ **Star the repository**
- 🐦 **Share on social media**
- 🐛 **Report bugs** or suggest improvements
- 💡 **Contribute** new demo ideas

---

**Built with ❤️ using ATLAS UI v4.0 - The Future of Intelligent UI Adaptation**

---

> `Mihai Victor`
