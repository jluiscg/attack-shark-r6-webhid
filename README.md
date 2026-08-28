# Attack Shark R6 WebHID Configurator

A driverless, cross-platform WebHID configurator for the Attack Shark R6 wireless mouse. This project allows you to fully configure your mouse directly from your browser without needing the official Windows driver.

## Features
- **Driverless Web Interface:** No installation required, works directly via Chrome/Edge WebHID.
- **Hardware Multi-Profile Switching:** Query, edit, and switch between the 3 on-board physical memory profiles.
- **Cross-Platform:** Works on Windows, macOS, and Linux.
- **Wired & 2.4G Wireless Support:** Fully handles the strict protocol requirements of the 2.4G dongle.
- **Performance Settings:** Configure Polling Rate, Lift-Off Distance (LOD), Debounce Time, and Sleep Time.
- **DPI Management:** Full read/write access to the 6-stage DPI table, with intelligent stage count clamping and defaults.
- **Toggles:** Toggle Angle Snapping, Ripple Control, Motion Sync, and Competitive Mode.
- **Live Battery:** Real-time battery percentage polling.

## Getting Started

### Prerequisites
- Node.js (v16+)
- A WebHID-compatible browser (Google Chrome, Microsoft Edge, Opera, etc.)

### Installation & Running
1. Install the dependencies:
   ```bash
   npm install
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open the provided `localhost` URL in your browser.
4. Click **Connect R6 Mouse** and select the "Attack Shark R6" device from the browser popup.

## Project Structure
- `src/main.ts`: Main entry point and UI data binding logic.
- `src/driver/hid-manager.ts`: Core WebHID connection manager and state store.
- `src/driver/transaction-queue.ts`: Handles the complex polling required for read/write handshakes over 2.4G.
- `src/protocol/commands.ts`: The byte-level payload builders mapping to the R6 protocol.

## Protocol & Reverse Engineering
The mouse uses a generic Telink/BYK901 protocol heavily modified with strict endpoint routing via a "subDevice" architecture. For a deep dive into the packet structure, please see [PROTOCOL.md](./PROTOCOL.md).
