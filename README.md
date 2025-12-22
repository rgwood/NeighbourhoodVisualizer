# Neighbourhood Visualizer

A tool to quickly estimate the effects of land use policy and road width on neighbourhood density and layout.

Originally built with Angular, now rebuilt with Svelte 5 + TypeScript + Vite + TailwindCSS.

## Features

- Interactive visualization of neighbourhood layouts with customizable parameters
- Real-time statistics calculation for:
  - Floor space and building density
  - Floor Area Ratio (FAR)
  - Land use percentages (yards, roads, sidewalks, buildings)
  - Number of homes per square kilometer
- URL state persistence - share your configurations via URL
- Responsive canvas-based visualization

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Technology Stack

- **Svelte 5**: Modern reactive UI framework with runes
- **TypeScript**: Type-safe code
- **Vite**: Fast build tool and dev server
- **TailwindCSS v4**: Utility-first CSS framework
- **HTML5 Canvas**: For neighbourhood visualization

## Project Structure

```
src/
├── App.svelte                          # Main application component
├── lib/
│   ├── components/
│   │   ├── OptionsPanel.svelte        # Input controls
│   │   └── ResultsPanel.svelte        # Canvas and statistics display
│   ├── models/
│   │   └── VisualizerParameters.ts    # Data model
│   └── utils/
│       ├── canvasRenderer.ts          # Canvas drawing logic
│       ├── statisticsCalculator.ts    # Calculations
│       ├── urlStateManager.ts         # URL persistence
│       ├── validators.ts              # Input validation
│       └── formatters.ts              # Number formatting
```

## License

MIT
