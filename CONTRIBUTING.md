# Contributing to ATLAS UI Demos

Thank you for your interest in contributing! 🎉

## How to Contribute

### 1. Reporting Bugs
- Check existing issues first
- Include browser/OS info
- Provide reproduction steps
- Share console errors if any

### 2. Suggesting Features
- Open an issue with `[FEATURE]` prefix
- Describe the use case clearly
- Explain why it would be valuable

### 3. Improving Demos
- Fork the repository
- Create a feature branch: `git checkout -b feature/your-feature`
- Make your changes
- Test thoroughly across browsers
- Submit a pull request

### 4. Adding New Demos
If you want to add a new demo:
1. Create `demos/X-your-demo.html`
2. Follow existing demo structure
3. Import from `../../atlas-ui-kit-v4.0_ML_Engine/src/`
4. Add entry to `index.html`
5. Update README.md

## Development Setup

```bash
# Clone the repo
git clone https://github.com/victortutu-hub/atlas-ui-v4.git
cd atlas-ui-v4/atlas-ui-kit-v4.0_ML_Engine-Demo

# Start local server
python -m http.server 8000
# or
./START.bat  # Windows
```

## Code Style
- Use ES6+ features
- Comment complex ML logic
- Keep demos simple and focused
- Mobile-responsive design

## Testing
Before submitting:
- ✅ Test in Chrome/Firefox/Safari
- ✅ Test on mobile devices
- ✅ Verify ML learning works
- ✅ Check console for errors

## Questions?
Open an issue or discussion on GitHub!

---

**Thank you for contributing! 🚀**