import { PACKET_SIZE } from './constants';

/**
 * Builds a 64-byte HID feature report for the R6 mouse.
 * Byte 0, 1: 0x00
 * Byte 2: Category (usually 0x02)
 * Byte 3: Payload length (automatically calculated)
 * Byte 4: SubDevice (usually 0x01 or 0x00)
 * Byte 5: Command ID (Write = ID, Read = ID | 0x80)
 * Byte 6+: Payload
 */
export function buildPacket(
  cmdId: number, 
  payload: number[],
  category: number = 0x02, 
  subDevice: number = 0x01
): Uint8Array {
  const packet = new Uint8Array(PACKET_SIZE);
  packet[0] = 0x00;
  packet[1] = 0x00;
  packet[2] = category;
  packet[3] = payload.length;
  packet[4] = subDevice;
  packet[5] = cmdId;
  
  for (let i = 0; i < payload.length; i++) {
    packet[6 + i] = payload[i];
  }
  
  return packet;
}

export function formatHex(bytes: Uint8Array | number[]): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}
