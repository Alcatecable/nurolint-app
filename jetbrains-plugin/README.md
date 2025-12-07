# NeuroLint JetBrains Plugin

AI-powered code analysis plugin for IntelliJ IDEA, WebStorm, and other JetBrains IDEs.

## Features

- **7-Layer Deep Analysis**: Comprehensive code analysis covering configuration, content standardization, component intelligence, hydration mastery, App Router optimization, and quality enforcement.
- **One-Click Fixes**: Apply automated fixes directly from your IDE.
- **Real-time Feedback**: Get instant analysis results in the NeuroLint tool window.
- **Enterprise Support**: Team-based configurations, API key authentication, and custom rule sets.

## Installation

### From JetBrains Marketplace

1. Open your JetBrains IDE
2. Go to **Settings/Preferences > Plugins**
3. Search for "NeuroLint"
4. Click **Install**

### Manual Installation

1. Download the latest `.zip` from the releases page
2. Go to **Settings/Preferences > Plugins > ⚙️ > Install Plugin from Disk**
3. Select the downloaded `.zip` file

## Configuration

1. Go to **Settings/Preferences > Tools > NeuroLint**
2. Enter your API Key (get one at [neurolint.io](https://neurolint.io))
3. (Optional) Configure your Team ID for enterprise features
4. Adjust analysis preferences as needed

## Usage

### Analyze Current File
- Press `Ctrl+Alt+N` (Windows/Linux) or `Cmd+Alt+N` (macOS)
- Or right-click in the editor and select **Analyze with NeuroLint**
- Or go to **Tools > NeuroLint > Analyze Current File**

### Analyze Entire Project
- Go to **Tools > NeuroLint > Analyze Project**

### Apply Fixes
- After analysis, go to **Tools > NeuroLint > Apply All Fixes**

## Supported File Types

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

## Building from Source

### Prerequisites
- JDK 17 or later
- Gradle 8.0 or later

### Build
```bash
./gradlew build
```

### Run in Development
```bash
./gradlew runIde
```

### Create Distribution
```bash
./gradlew buildPlugin
```

The plugin ZIP will be in `build/distributions/`.

## Enterprise Features

With an Enterprise API key, you get access to:
- Team-based rule configurations
- Custom policy enforcement
- Advanced analytics and reporting
- Priority support

## License

Proprietary - See LICENSE file for details.

## Support

- Documentation: [docs.neurolint.io](https://docs.neurolint.io)
- Issues: [github.com/neurolint/jetbrains-plugin/issues](https://github.com/neurolint/jetbrains-plugin/issues)
- Email: support@neurolint.io
