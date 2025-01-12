# Nodify

Nodify is an AI-powered note-taking and knowledge graph application that helps users create visual representations of concepts and their relationships from audio recordings, transcripts, and text. Perfect for quick summaries of meeting notes, and YouTube videos as well as PDFs.

## Features

- Audio recording and transcription using OpenAI Whisper
- Automated knowledge graph generation
- Real-time visualization of concept relationships
- YouTube video integration
- Multi-workspace support
- Cross-platform compatibility (Mac, Windows & Linux)
- PDF summaries and PDF generation of custom notes
- Note generation from summaries written in markdown

## Installation

### Prerequisites

- Node.js 16+
- npm or yarn
- FFmpeg (automatically installed during setup)
- OpenAI API key (developer account needed)

## Development

### macOS

```bash
# Install dependencies
npm install

# Prepare FFmpeg
npm run prepare-ffmpeg

# Run in development mode
npm run electron:dev
```

### Windows

```bash
# Install dependencies
npm install

# Prepare FFmpeg for Windows
npm run prepare-ffmpeg:win

# Run in development mode
npm run electron:dev:win
```

### Linux

```bash
# Install dependencies
npm install

# Install FFmpeg
sudo apt-get install ffmpeg
npm run prepare-ffmpeg:linux

# Run in development mode
npm run electron:dev:linux
```

## Building for Production

### macOS Build

```bash
# Build for Apple Silicon (M1/M2)
npm run electron:build:mac
```

### Windows Build

```bash
# Build for Windows
npm run electron:build:win
```

### Linux Build

```bash
# Build for Linux
npm run electron:build:linux
```

### All Platforms Build

```bash
# Build for all platforms
npm run electron:build:all
```

## Development Notes

- The development server will start both the Vue frontend and Electron process
- Hot reload is enabled for the Vue components
- The Electron process will automatically restart when main process files change
- Logs can be found in the DevTools console (View > Toggle Developer Tools)

## Contributing

We welcome contributions to Nodify! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

3. Set up your development environment:

- Install Vue DevTools for debugging
- Configure ESLint and Prettier in your IDE

### Project Structure

```
nodify/
├── electron/         # Electron main process code
├── src/
│   ├── assets/      # Static assets and global styles
│   ├── atoms/       # Atomic components
│   ├── db/          # Database models and configuration
│   ├── layouts/     # Layout components
│   ├── models/      # Data models
│   ├── modules/     # Feature modules
│   ├── stores/      # Pinia stores
│   └── views/       # Vue views
├── scripts/         # Build and utility scripts
└── public/          # Public static files
```

### Key Technologies

- Vue 3 with Composition API
- Electron
- Tailwind CSS with DaisyUI
- Pinia for state management
- IndexedDB (Dexie.js) for local storage
- FFmpeg for audio processing
- OpenAI API integration

### Coding Standards

1. **Component Structure**

   - Use Composition API with `<script setup>`
   - Keep components focused and single-responsibility
   - Follow Vue style guide naming conventions

2. **State Management**

   - Use Pinia stores for global state
   - Keep component state local when possible
   - Document store actions and mutations

3. **Styling**
   - Use Tailwind utility classes
   - Create custom components for repeated patterns
   - Follow DaisyUI theme structure

### Documentation

- Update inline documentation
- Keep the README.md up to date
- Document any new environment variables
- Add examples for new features

### Common Development Tasks

1. **Adding a New Feature**

   - Create feature branch
   - Implement in relevant module
   - Update documentation
   - Create PR

2. **Fixing Bugs**

   - Create bug fix branch
   - Fix issue
   - Create PR

3. **Adding Dependencies**
   - Evaluate package size and maintenance
   - Add to package.json
   - Update documentation
   - Test in all supported environments

### Getting Help

- Check existing issues
- Join our Discord community
- Read the documentation
- Ask in the discussions section

## License

MIT License - see LICENSE.md

## Support

For support, please create an issue or join our Discord community.
