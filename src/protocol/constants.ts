export const PACKET_SIZE = 64;
export const REPORT_ID = 0;
export const VENDOR_ID = 0x373e;

export const PID = {
  WIRED: 0x0021,
  WIRELESS_24G: 0x0022,
} as const;

// The protocol uses MSB (0x80) to distinguish READ vs WRITE commands
// CMD_ID = ParamID (Write), CMD_ID | 0x80 = ParamID (Read)
export const PARAM = {
  POLLING_RATE: 0x00,
  DPI_TABLE: 0x01,
  ACTIVE_DPI: 0x02,
  BATTERY: 0x03,       // Read-only (0x83)
  ANGLE_SNAP: 0x04,
  PROFILE: 0x05,
  SLEEP_TIME: 0x07,
  DEBOUNCE_LOD: 0x08,  // b[4]=00 for Debounce, b[4]=01 for LOD
  MOTION_SYNC: 0x09,
  RIPPLE_CONTROL: 0x0A,
  FW_INFO: 0x0B,       // Read-only (0x8B)
  COMPETITIVE: 0x13,
} as const;

export const RESP = {
  ACK: 0xA0,
  DATA: 0xA1,
} as const;

export const POLLING_RATES_WIRED = [125, 250, 500, 1000] as const;
export const POLLING_RATES_WIRELESS = [125, 250, 500, 1000, 2000, 4000, 8000] as const;

export const DPI_MIN = 50;
export const DPI_MAX = 42000;
export const DPI_STEP = 50;
export const MAX_DPI_STAGES = 6;
export const MAX_PROFILES = 3;
