# Live Search LLM

A privacy-focused Tauri desktop app that allows users to download and use Large Language Models (LLMs) locally, with integrated live search capabilities using DuckDuckGo Instant Answers and Wikipedia APIs.

## Features

- **Zero Login**: Launch directly into the chat interface
- **Auto Setup**: Automatically installs Ollama and pulls "gemma3:1b" model
- **Local LLM Integration**: Download and run any LLM supported by Ollama
- **Custom Models**: Create models from Hugging Face GGUF files via Modelfile
- **Live Search Context**: Enhance prompts with real-time search results from DuckDuckGo and Wikipedia
- **Modern UI**: Glass morphism design with animated spinners and smooth transitions
- **Privacy Focused**: All data and interactions remain on your machine
- **Cross-Platform**: Built with Tauri for Windows, macOS, and Linux

## Prerequisites

- **Ollama**: Install Ollama from [ollama.com](https://ollama.com/download). This is required to download and run models locally.
- **Node.js** (v18 or later)
- **Rust** (latest stable)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/live-search-llm.git
   cd live-search-llm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build and run:
   ```bash
   npm run tauri dev
   ```

## Usage

1. **Launch the app**: Run the installed Live Search LLM app (installer available via `npm run tauri build`)
2. **Auto-install Ollama**: If Ollama is not detected, click "Install Ollama" - it uses winget on Windows to install automatically
3. **Pull a model**: In the "Model to pull" input, enter a model name like `llama3.2:1b` and click "Pull Model", or click "Browse Models" to visit ollama.com/library
   - Or create custom models using Modelfile syntax to pull from Hugging Face (e.g., `FROM hf.co/microsoft/DialoGPT-medium`)
4. **Select model**: Choose from available models in the dropdown
5. **Enable search**: Check "Enable Live Search" to include DuckDuckGo IA and Wikipedia context
6. **Chat**: Enter your prompt and press Enter to generate responses

## Building from Source

```bash
# Prerequisites: Node.js, Rust, Tauri CLI

# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build installer
npm run tauri build
```

## APIs Used

- **DuckDuckGo Instant Answers**: Free API for instant search results
- **Wikipedia REST API**: Free access to page summaries and data

## Architecture

- **Frontend**: React + TypeScript
- **Backend**: Rust (Tauri) with async reqwest for API calls
- **LLM Engine**: Ollama (localhost:11434)
- **Packaging**: Tauri bundles for native desktop apps

## Development

### Building for production

```bash
npm run tauri build
```

### Testing APIs separately

The app includes DuckDuckGo and Wikipedia search integrations that can be tested independently.

## Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## License

MIT - Free to use with attribution. Give credit where possible!

## Attribution

Inspired by OpenWebUI. Built with Tauri, React, and Ollama.
