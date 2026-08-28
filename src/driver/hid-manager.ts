import { VENDOR_ID, PID, RESP } from '../protocol/constants';
import { Commands } from '../protocol/commands';
import { TransactionQueue } from './transaction-queue';
import { Store } from './device-state';

export class WebHIDManager {
  private device: HIDDevice | null = null;
  private allDevices: HIDDevice[] = [];
  private queue = new TransactionQueue();
  public store = new Store();

  constructor() {
    this.autoReconnect();

    // Poll battery every 60 seconds
    setInterval(() => {
      if (this.device) this.fetchBattery();
    }, 60000);
  }

  setPacketLogCallback(cb: (dir: 'TX'|'RX', data: Uint8Array) => void) {
    this.queue.onPacketLog = cb;
  }

  async requestConnection() {
    try {
      const devices = await navigator.hid.requestDevice({
        filters: [{ vendorId: VENDOR_ID }]
      });
      
      if (devices && devices.length > 0) {
        await this.attachDevice(devices);
      }
    } catch (e) {
      console.error('Connection request failed:', e);
    }
  }

  private async autoReconnect() {
    if (!navigator.hid) return;
    const devices = await navigator.hid.getDevices();
    const targetDevices = devices.filter(d => d.vendorId === VENDOR_ID);
    if (targetDevices.length > 0) {
      await this.attachDevice(targetDevices);
    }
  }

  private async attachDevice(devices: HIDDevice[]) {
    this.allDevices = devices;
    let targetDevice = devices[0];
    
    for (const d of devices) {
      if (!d.opened) {
        try { await d.open(); } catch(e) {}
      }
      // VERY IMPORTANT: Listen to Input Reports on ALL sub-devices!
      // Many wireless dongles send writes via Feature Reports on one interface,
      // but send responses back as Input Reports on a completely different interface.
      d.addEventListener('inputreport', this.queue.handleInputReport);

      const hasVendorInterface = d.collections.some(c => 
        c.usagePage === 0xFFFF && c.featureReports && c.featureReports.length > 0
      );
      if (hasVendorInterface) {
        targetDevice = d;
      }
    }

    if (!targetDevice) {
      console.error('No compatible WebHID interface found on this device');
      return;
    }

    try {
      this.device = targetDevice;
      this.queue.setDevice(targetDevice);
      
      const isWireless = targetDevice.productId === PID.WIRELESS_24G;
      this.store.update({
        connected: true,
        isLoading: true,
        activeProfile: 1,
        deviceName: isWireless ? 'Attack Shark R6 (2.4G)' : 'Attack Shark R6 (Wired)',
        isWireless
      });

      // Give the device a moment to settle after opening before blasting it with reads.
      await new Promise(r => setTimeout(r, isWireless ? 1000 : 200));

      await this.performHandshake();
      await this.syncState();

    } catch (e) {
      console.error('Failed to attach device:', e);
      this.disconnect();
    }
  }

  public disconnect() {
    for (const d of this.allDevices) {
      d.removeEventListener('inputreport', this.queue.handleInputReport);
      if (d.opened) d.close().catch(() => {});
    }
    this.allDevices = [];
    this.device = null;
    this.queue.clear();
    this.store.reset();
  }

  private async performHandshake(): Promise<boolean> {
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await this.queue.sendCommand(Commands.readHandshake());
        if (resp[0] === RESP.ACK) {
          return true;
        }
      } catch (e) {
        console.warn(`Handshake attempt ${i + 1} failed...`);
      }
      await new Promise(r => setTimeout(r, 100)); // wait before retry
    }
    return false;
  }

  private async safeRead(command: Uint8Array, callback: (data: Uint8Array) => void) {
    try {
      const data = await this.queue.sendCommand(command);
      if (data[0] === RESP.DATA || data[0] === 0xA3) {
        callback(data);
      }
    } catch (e) {
      console.warn(`Read failed for command 0x${command[5].toString(16)}`, e);
    }
  }

  public async changeProfile(profileId: number) {
    if (!this.device) return;
    try {
      // Send the hardware switch command
      await this.safeWrite(Commands.setActiveProfile(profileId));
    } catch(e) {
      console.warn("Failed to set active hardware profile", e);
    }
    this.store.update({ activeProfile: profileId });
    await this.syncState();
  }

  private async syncState() {
    this.store.update({ isLoading: true });
    try {
      await this.fetchFirmware();
      await this.fetchActiveProfile();
      await this.fetchBattery();
      await this.fetchPerformance();
      await this.fetchDPI();
    } finally {
      this.store.update({ isLoading: false });
    }
  }

  private async fetchActiveProfile() {
    await this.safeRead(Commands.readActiveProfile(), data => {
      const p = data[6];
      if (p >= 1 && p <= 3) {
        this.store.update({ activeProfile: p });
      }
    });
  }

  private async fetchPerformance() {
    await this.safeRead(Commands.readPollingRate(this.store.state.activeProfile || 1), rate => {
      const code = rate[7];
      let hz = 1000;
      if (code === 0x08) hz = 125;
      if (code === 0x04) hz = 250;
      if (code === 0x02) hz = 500;
      if (code === 0x01) hz = 1000;
      if (code === 0x20) hz = 2000;
      if (code === 0x40) hz = 4000;
      if (code === 0x80) hz = 8000;
      this.store.update({ pollingRate: hz });
    });

    await this.safeRead(Commands.readSleepTime(this.store.state.activeProfile || 1), s => this.store.update({ sleepTime: (s[7] << 8) | s[8] }));
    await this.safeRead(Commands.readDebounce(this.store.state.activeProfile || 1), d => this.store.update({ debounceTime: d[7] }));
    await this.safeRead(Commands.readLOD(this.store.state.activeProfile || 1), l => this.store.update({ lodIndex: l[7] === 0x87 ? 0 : l[7] }));
    await this.safeRead(Commands.readAngleSnap(this.store.state.activeProfile || 1), a => this.store.update({ angleSnap: a[7] === 0x01 }));
    await this.safeRead(Commands.readRippleControl(this.store.state.activeProfile || 1), r => this.store.update({ rippleControl: r[7] === 0x01 }));
    await this.safeRead(Commands.readMotionSync(this.store.state.activeProfile || 1), m => this.store.update({ motionSync: m[7] === 0x01 }));
    await this.safeRead(Commands.readCompetitive(this.store.state.activeProfile || 1), c => this.store.update({ competitiveMode: c[7] === 0x01 }));
  }

  private async fetchDPI() {
    await this.safeRead(Commands.readActiveDPI(this.store.state.activeProfile || 1), active => {
      this.store.update({ activeDpiStage: active[7] });
    });

    await this.safeRead(Commands.readDPITable(this.store.state.activeProfile || 1), table => {
      const count = table[7];
      const stages = [];
      for (let i = 0; i < 6; i++) {
        // We will just log the table here for now so the user can show us what it returns
        console.log(`DPI Table RX bytes:`, Array.from(table).map(b => b.toString(16).padStart(2, '0')).join(' '));
        const offset = 8 + (i * 4);
        const x = (table[offset] << 8) | table[offset+1];
        const y = (table[offset+2] << 8) | table[offset+3];
        stages.push({ x, y });
      }
      this.store.update({ dpiStageCount: count, dpiStages: stages });
    });
  }

  private async fetchFirmware() {
    // We intentionally don't update the UI with this generic bootloader version,
    // but the MCU requires this command to fully wake up the read queue for DPI tables.
    await this.safeRead(Commands.readFirmwareInfo(), () => {});
  }

  private async fetchBattery() {
    await this.safeRead(Commands.readBattery(), data => {
      this.store.update({
        isCharging: false,
        batteryLevel: data[7]
      });
    });
  }
}
