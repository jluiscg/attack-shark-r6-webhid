export class TransactionQueue {
  private queue: Array<{ cmd: Uint8Array, resolve: (v: Uint8Array) => void, reject: (e: any) => void }> = [];
  private isProcessing = false;
  private device: HIDDevice | null = null;
  private timeoutMs = 1000;
  private pendingResolve: ((data: Uint8Array) => void) | null = null;
  
  public onPacketLog?: (dir: 'TX'|'RX', data: Uint8Array) => void;

  setDevice(device: HIDDevice) {
    this.device = device;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
    this.device = null;
    this.pendingResolve = null;
  }

  handleInputReport = (e: HIDInputReportEvent) => {
    if (this.pendingResolve) {
      const data = new Uint8Array(e.data.buffer);
      if (this.onPacketLog) this.onPacketLog('RX', data);
      this.pendingResolve(data);
      this.pendingResolve = null;
    }
  }

  sendCommand(cmd: Uint8Array): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      this.queue.push({ cmd, resolve, reject });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0 || !this.device) return;
    this.isProcessing = true;

    const { cmd, resolve, reject } = this.queue.shift()!;

    try {
      if (this.onPacketLog) this.onPacketLog('TX', cmd);
      
      // Send the command
      await this.device.sendFeatureReport(0, cmd as any);
      
      const recvPromise = new Promise<Uint8Array>((res) => {
        this.pendingResolve = res;
        
        // 0x81 is used for BOTH Handshake (subDevice 0x00, length 0x10) and DPI Table (subDevice 0x01, length 0x0A).
        // Handshake legitimately returns 0xA0 (ACK) and doesn't send a follow-up 0xA1.
        // DPI Table requires polling for 0xA1.
        const isHandshake = cmd[5] === 0x81 && cmd[4] === 0x00 && cmd[3] === 0x10;
        const isReadCmd = (cmd[5] & 0x80) !== 0 && !isHandshake;
        
        const pollFeatureReport = async () => {
          if (!this.pendingResolve) return;
          try {
            const dataView = await this.device!.receiveFeatureReport(0);
            const data = new Uint8Array(dataView.buffer);
            
            // If it's a read command and we got an ACK (0xA0) with empty data, poll again
            if (isReadCmd && data[0] === 0xA0) {
              setTimeout(pollFeatureReport, 10);
              return;
            }
            
            if (this.pendingResolve) {
              if (this.onPacketLog) this.onPacketLog('RX', data);
              this.pendingResolve(data);
              this.pendingResolve = null;
            }
          } catch (e) {
            // Ignore normal busy errors or log them
          }
        };
        
        pollFeatureReport();
      });
      
      const timeoutPromise = new Promise<Uint8Array>((_, rej) => 
        setTimeout(() => {
          this.pendingResolve = null;
          rej(new Error('Timeout waiting for response'));
        }, this.timeoutMs)
      );

      const response = await Promise.race([recvPromise, timeoutPromise]);
      
      // Delay briefly between packets to not overwhelm the MCU
      await new Promise(r => setTimeout(r, 50));
      
      resolve(response);
    } catch (e) {
      reject(e);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}
