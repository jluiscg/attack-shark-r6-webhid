import { PARAM } from './constants';
import { buildPacket } from './packet';

export const Commands = {
  // --- READ COMMANDS (MSB Set) ---
  
  readHandshake: () => 
    buildPacket(0x81, Array(16).fill(0), 0x02, 0x00),

  readFirmwareInfo: () => 
    buildPacket(PARAM.FW_INFO | 0x80, [0x02, 0x00], 0x01, 0x00),

  readBattery: () => 
    buildPacket(PARAM.BATTERY | 0x80, [0x01, 0x00], 0x02, 0x01),

  readPollingRate: () => 
    buildPacket(PARAM.POLLING_RATE | 0x80, [0x01, 0x00], 0x02, 0x01),
    
  readSleepTime: () => 
    buildPacket(PARAM.SLEEP_TIME | 0x80, [0x01, 0x00, 0x00], 0x02, 0x00),
    
  readDebounce: () => 
    buildPacket(PARAM.DEBOUNCE_LOD | 0x80, [0x01, 0x00], 0x02, 0x00),
    
  readLOD: () => 
    buildPacket(PARAM.DEBOUNCE_LOD | 0x80, [0x01, 0x00], 0x02, 0x01),
    
  readAngleSnap: () => 
    buildPacket(PARAM.ANGLE_SNAP | 0x80, [0x01, 0x00], 0x02, 0x01),
    
  readRippleControl: () => 
    buildPacket(PARAM.RIPPLE_CONTROL | 0x80, [0x01, 0x00], 0x02, 0x01),
    
  readMotionSync: () => 
    buildPacket(PARAM.MOTION_SYNC | 0x80, [0x01, 0x00], 0x02, 0x01),
    
  readCompetitive: () => 
    buildPacket(PARAM.COMPETITIVE | 0x80, [0x01, 0x00], 0x02, 0x01),

  readDPITable: () => 
    buildPacket(PARAM.DPI_TABLE | 0x80, [0x01, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0x02, 0x01),

  readActiveDPI: () => 
    buildPacket(PARAM.ACTIVE_DPI | 0x80, [0x01, 0x00], 0x02, 0x01),

  // --- WRITE COMMANDS (MSB Cleared) ---

  setPollingRate: (code: number) => 
    buildPacket(PARAM.POLLING_RATE, [0x01, code], 0x02, 0x01),
    
  setSleepTime: (seconds: number) => {
    const high = (seconds >> 8) & 0xFF;
    const low = seconds & 0xFF;
    return buildPacket(PARAM.SLEEP_TIME, [0x01, high, low], 0x02, 0x00);
  },
  
  setDebounce: (ms: number) => 
    buildPacket(PARAM.DEBOUNCE_LOD, [0x01, ms & 0x0F], 0x02, 0x00),
    
  setLOD: (index: number) => 
    buildPacket(PARAM.DEBOUNCE_LOD, [0x01, index === 0 ? 0x87 : index], 0x02, 0x01),
    
  setAngleSnap: (enabled: boolean) => 
    buildPacket(PARAM.ANGLE_SNAP, [0x01, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setRippleControl: (enabled: boolean) => 
    buildPacket(PARAM.RIPPLE_CONTROL, [0x01, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setMotionSync: (enabled: boolean) => 
    buildPacket(PARAM.MOTION_SYNC, [0x01, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setCompetitive: (enabled: boolean) => 
    buildPacket(PARAM.COMPETITIVE, [0x01, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setActiveDPIStage: (stageIndex: number) => 
    // stageIndex is 1-based (1-6)
    buildPacket(PARAM.ACTIVE_DPI, [0x01, stageIndex], 0x02, 0x01),
    
  setDPITable: (stageCount: number, stages: {x: number, y: number}[]) => {
    // Requires exactly 6 stages in the array, padding with 0s if needed
    const payload = [0x01, stageCount];
    for (let i = 0; i < 6; i++) {
      const stage = stages[i] || { x: 1000, y: 1000 };
      payload.push((stage.x >> 8) & 0xFF);
      payload.push(stage.x & 0xFF);
      payload.push((stage.y >> 8) & 0xFF);
      payload.push(stage.y & 0xFF);
    }
    return buildPacket(PARAM.DPI_TABLE, payload, 0x02, 0x01);
  },
};
