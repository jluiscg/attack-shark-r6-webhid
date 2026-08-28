import { PARAM } from './constants';
import { buildPacket } from './packet';

export const Commands = {
  // --- READ COMMANDS (MSB Set) ---
  
  readActiveProfile: () => 
    buildPacket(PARAM.PROFILE | 0x80, [0x00], 0x01, 0x00),

  readHandshake: () => 
    buildPacket(0x81, Array(16).fill(0), 0x02, 0x00),

  readFirmwareInfo: () => 
    buildPacket(PARAM.FW_INFO | 0x80, [0x02, 0x00], 0x01, 0x00),

  readBattery: () => 
    buildPacket(PARAM.BATTERY | 0x80, [0x00, 0x00], 0x02, 0x00),

  readPollingRate: (p = 1) => 
    buildPacket(PARAM.POLLING_RATE | 0x80, [p, 0x00], 0x02, 0x01),
    
  readSleepTime: (p = 1) => 
    buildPacket(PARAM.SLEEP_TIME | 0x80, [p, 0x00, 0x00], 0x02, 0x00),
    
  readDebounce: (p = 1) => 
    buildPacket(PARAM.DEBOUNCE_LOD | 0x80, [p, 0x00], 0x02, 0x00),
    
  readLOD: (p = 1) => 
    buildPacket(PARAM.DEBOUNCE_LOD | 0x80, [p, 0x00], 0x02, 0x01),
    
  readAngleSnap: (p = 1) => 
    buildPacket(PARAM.ANGLE_SNAP | 0x80, [p, 0x00], 0x02, 0x01),
    
  readRippleControl: (p = 1) => 
    buildPacket(PARAM.RIPPLE_CONTROL | 0x80, [p, 0x00], 0x02, 0x01),
    
  readMotionSync: (p = 1) => 
    buildPacket(PARAM.MOTION_SYNC | 0x80, [p, 0x00], 0x02, 0x01),
    
  readCompetitive: (p = 1) => 
    buildPacket(PARAM.COMPETITIVE | 0x80, [p, 0x00], 0x02, 0x01),

  readDPITable: (p = 1) => 
    buildPacket(PARAM.DPI_TABLE | 0x80, [p, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0x02, 0x01),

  readActiveDPI: (p = 1) => 
    buildPacket(PARAM.ACTIVE_DPI | 0x80, [p, 0x00], 0x02, 0x01),

  // --- WRITE COMMANDS (MSB Cleared) ---

  setActiveProfile: (profileId: number) => 
    buildPacket(PARAM.PROFILE, [profileId], 0x01, 0x00),

  setPollingRate: (code: number, p = 1) => 
    buildPacket(PARAM.POLLING_RATE, [p, code], 0x02, 0x01),
    
  setSleepTime: (seconds: number, p = 1) => {
    const high = (seconds >> 8) & 0xFF;
    const low = seconds & 0xFF;
    return buildPacket(PARAM.SLEEP_TIME, [p, high, low], 0x02, 0x00);
  },
  
  setDebounce: (ms: number, p = 1) => 
    buildPacket(PARAM.DEBOUNCE_LOD, [p, ms & 0x0F], 0x02, 0x00),
    
  setLOD: (index: number, p = 1) => 
    buildPacket(PARAM.DEBOUNCE_LOD, [p, index === 0 ? 0x87 : index], 0x02, 0x01),
    
  setAngleSnap: (enabled: boolean, p = 1) => 
    buildPacket(PARAM.ANGLE_SNAP, [p, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setRippleControl: (enabled: boolean, p = 1) => 
    buildPacket(PARAM.RIPPLE_CONTROL, [p, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setMotionSync: (enabled: boolean, p = 1) => 
    buildPacket(PARAM.MOTION_SYNC, [p, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setCompetitive: (enabled: boolean, p = 1) => 
    buildPacket(PARAM.COMPETITIVE, [p, enabled ? 0x01 : 0x00], 0x02, 0x01),
    
  setActiveDPIStage: (stageIndex: number, p = 1) => 
    // stageIndex is 1-based (1-6)
    buildPacket(PARAM.ACTIVE_DPI, [p, stageIndex], 0x02, 0x01),
    
  setDPITable: (stageCount: number, stages: {x: number, y: number}[], p = 1) => {
    // Requires exactly 6 stages in the array, padding with 0s if needed
    const payload = [p, stageCount];
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
