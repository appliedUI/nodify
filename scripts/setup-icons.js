const { execSync } = require('child_process')
const os = require('os')

function setupIcons() {
  const platform = os.platform()

  try {
    switch (platform) {
      case 'win32':
        execSync('if not exist build\\icons mkdir build\\icons')
        break
      case 'darwin':
      case 'linux':
        execSync('mkdir -p build/icons')
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
    console.log('Icons directory setup complete')
  } catch (error) {
    console.error('Error setting up icons directory:', error)
    process.exit(1)
  }
}

setupIcons()
