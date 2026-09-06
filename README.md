# ARCHPLAN AI - Building Design Studio

An AI-powered 3D building design application with voice control, parametric CAD modeling, 2D plan sketching, and virtual structural testing.

![ARCHPLAN AI](public/favicon.svg)

## Features

### 🎙️ AI Orb Mode (Jarvis-like Interaction)
- Standalone full-screen voice mode with a reactive particle orb
- **Summon from anywhere**: tap-and-hold the screen (450 ms) anywhere in the app and ARCH charges up and materializes — no buttons needed
- The orb expands/contracts with your voice while listening and stays **black glass with a molten cyan core** while ARCH speaks
- When ARCH has something to show — a generated floor plan, a calculation, or web results — the orb flies to the corner and reveals it like a hologram
- Voice commands: "Build a 4 bedroom futuristic house", "Calculate a rocket launch", "Search the latest building codes", "Show me the 3D model"
- Text-to-speech responses so ARCH talks back
- API keys (Gemini + Exa) are entered in-app under Settings (⚙) — stored locally in your browser

### 📐 2D Plan Sketching Mode
- Grid-based canvas with snap-to-grid
- Drawing tools: Wall, Door, Window, Room, Dimension lines
- Smart room detection with automatic area calculation
- Blueprint-style rendering (cyan lines on dark background)
- Undo/redo with history stack

### 🏗️ 3D Parametric Modeling Mode
- Convert 2D plans to 3D models automatically
- Parametric controls: Wall height, thickness, material
- Real-time 3D preview with orbit controls
- Material palette: Concrete, Brick, Wood, Glass, Steel
- Lighting simulation with day/night cycle

### ⚡ Virtual Structural Testing
- Physics simulation using Rapier engine
- Stress analysis visualization (color gradient: green=safe, yellow=moderate, red=critical)
- Load testing simulation (gravity, wind forces)
- Structural integrity report with recommendations

### 🤖 AI Design Assistant
- Gemini-powered design suggestions with in-app key setup
- "Build a 3 bedroom modern house" generates a complete, editable plan — walls, rooms, doors and windows placed automatically
- Works offline too: a built-in generative engine produces era-styled plans (ancient, classic, modern, futuristic) without any API key
- "What materials would work best for this climate?" — grounded answers via Exa web search when configured

### 🧮 Real Engineering Calculations
- Beam bending & deflection (M = wL²/8, δ = 5wL⁴/384EI), Euler column buckling, wind loads
- Rocket physics (Tsiolkovsky Δv, thrust, burn time), free-fall impact analysis
- Material takeoff & cost estimates from the actual plan footprint
- Every number is computed from real formulas — shown with inputs, outputs and verdicts

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS with custom design tokens
- **3D Engine**: Three.js + React Three Fiber + React Three Drei
- **Physics**: Rapier (for stress testing)
- **State Management**: Zustand
- **AI Integration**: Google Gemini API + Exa web search
- **Animations**: Framer Motion + GSAP
- **Textures**: Procedural PBR canvas textures (concrete, brick, wood, steel)

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Google Gemini API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/archplan-ai.git

# Navigate to project directory
cd archplan-ai

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### API Keys

No backend, no accounts — keys live in your browser. Open **Settings (⚙)** in the app and paste:

- **Gemini API key** — voice intelligence & plan generation ([get one](https://aistudio.google.com/apikey))
- **Exa API key** — live web search with citations ([get one](https://dashboard.exa.ai/api-keys))

Without keys, ARCH still runs on its built-in engine: it can generate complete era-styled plans, run all real calculations, and every drawing tool works.

## Usage

### 2D Drawing Mode

1. Select a tool from the left sidebar (Wall, Room, Door, Window)
2. Click and drag on the canvas to draw
3. For rooms: Click corners, double-click to complete
4. Use keyboard shortcuts:
   - `V` - Select tool
   - `W` - Wall tool
   - `R` - Room tool
   - `D` - Door tool
   - `N` - Window tool
   - `M` - Dimension tool
   - `E` - Erase tool

### 3D Modeling Mode

1. Switch to 3D mode using the top navigation
2. Your 2D plan will automatically convert to 3D
3. Use orbit controls to rotate the view
4. Adjust wall height and thickness in the right sidebar
5. Select materials from the material palette

### Structural Testing

1. Switch to Test mode using the top navigation
2. Click "Run Analysis" to start the simulation
3. View stress results with color-coded visualization
4. Review recommendations for each element

### AI Orb Mode

**Tap-and-hold anywhere** in the app for half a second — the summon ring charges at your fingertip, then ARCH materializes. Or press `4` (mic button / spacebar) to enter the full-screen AI orb:

- Tap the orb (or mic button) and speak — it expands with your voice, then answers in its black-glass voice
- "Build a 4 bedroom futuristic house" — ARCH designs it, builds the actual walls/rooms/doors/windows, then slides the blueprint in from the corner
- "Calculate a rocket launch with 500kg wet mass" — real physics, real numbers
- "Search for the latest concrete prices" — live web results with citations (needs an Exa key)
- Open generated plans straight into 2D or 3D from the hologram panel

## Project Structure

```
src/
├── components/
│   ├── canvas/          # 2D drawing canvas
│   ├── viewport/        # 3D Three.js viewport
│   ├── ui/              # Reusable UI components
│   └── ai/              # Voice/AI components
├── hooks/               # Custom React hooks
├── stores/              # Zustand state stores
├── lib/                 # Utilities, Gemini config
├── types/               # TypeScript interfaces
└── styles/              # Global styles, Tailwind config
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `W` | Wall tool |
| `R` | Room tool |
| `D` | Door tool |
| `N` | Window tool |
| `M` | Dimension tool |
| `E` | Erase tool |
| `1` | Switch to 2D mode |
| `2` | Switch to 3D mode |
| `3` | Switch to Test mode |
| `4` | Enter AI orb mode |
| `Space` | Start voice listening |

## Performance

- Initial load: < 3 seconds
- 2D canvas: 60fps drawing
- 3D viewport: 60fps with 100k+ polygons
- Voice response: < 500ms latency
- Stress test: < 2 seconds for simulation

## Building the Android APK (GitHub Actions)

The repo ships with `.github/workflows/android-apk.yml`. After you push the project to GitHub:

1. Every push to `main` builds a debug APK automatically (Actions → Build Android APK).
2. Download it from the run's **Artifacts** section (`archplan-ai-debug-apk`).
3. Voice (mic) and internet permissions are patched in automatically via `scripts/patch-android-manifest.mjs`.
4. Keys entered in the app's Settings (⚙) travel with the app — BYOK for Gemini, OpenAI, Claude, Groq, OpenRouter, plus Exa/Tavily/Brave for web search.

To build locally instead:

```bash
npm run android:sync   # adds the Capacitor android platform + patches the manifest
npm run android:apk    # outputs android/app/build/outputs/apk/debug/app-debug.apk
```

## Browser Support

- Chrome 90+ (recommended for best voice recognition)
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT License - see [LICENSE](LICENSE) for details

## Acknowledgments

- Built with React Three Fiber for 3D rendering
- Voice recognition powered by Web Speech API
- AI assistance powered by Google Gemini
- Physics simulation by Rapier
