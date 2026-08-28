export type DeviceState = {
  connected: boolean;
  isWireless: boolean;
  deviceName: string;
  firmwareVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  
  // Performance toggles
  pollingRate: number; // 125, 250, 500, 1000, 2000, 4000, 8000
  sleepTime: number;   // seconds
  debounceTime: number; // ms
  lodIndex: number;    // 0=0.7mm, 1=1mm, 2=2mm
  angleSnap: boolean;
  rippleControl: boolean;
  motionSync: boolean;
  competitiveMode: boolean;
  
  // DPI Settings
  activeDpiStage: number; // 1-6
  dpiStageCount: number;  // 1-6
  dpiStages: {x: number, y: number}[]; // array of 6
};

type Listener = (state: DeviceState) => void;

export class Store {
  public state: DeviceState;
  private listeners: Listener[] = [];

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): DeviceState {
    return {
      connected: false,
      isWireless: false,
      deviceName: 'Disconnected',
      firmwareVersion: '-',
      batteryLevel: 0,
      isCharging: false,
      
      pollingRate: 1000,
      sleepTime: 60,
      debounceTime: 3,
      lodIndex: 1,
      angleSnap: false,
      rippleControl: false,
      motionSync: false,
      competitiveMode: false,
      
      activeDpiStage: 1,
      dpiStageCount: 6,
      dpiStages: Array(6).fill({x: 1000, y: 1000}),
    };
  }

  update(partial: Partial<DeviceState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  reset() {
    this.state = this.getInitialState();
    this.notify();
  }

  subscribe(listener: Listener) {
    this.listeners.push(listener);
    // Send initial state immediately
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
