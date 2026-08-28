import { WebHIDManager } from './driver/hid-manager';
import { formatHex } from './protocol/packet';
import { Commands } from './protocol/commands';

const manager = new WebHIDManager();
(window as any).manager = manager;

const connectBtn = document.getElementById('connect-btn')!;
const disconnectBtn = document.getElementById('disconnect-btn')!;
const deviceNameEl = document.getElementById('device-name')!;
const batteryStatusEl = document.getElementById('battery-status')!;
const fwVersionEl = document.getElementById('fw-version')!;
const mainContent = document.getElementById('main-content')!;
const packetLog = document.getElementById('packet-log')!;

const pollingRateSel = document.getElementById('polling-rate') as HTMLSelectElement;
const sleepEnable = document.getElementById('sleep-enable') as HTMLInputElement;
const sleepSlider = document.getElementById('sleep-slider') as HTMLInputElement;
const sleepVal = document.getElementById('sleep-val') as HTMLSpanElement;
const debounceSlider = document.getElementById('debounce-slider') as HTMLInputElement;
const debounceVal = document.getElementById('debounce-val')!;
const lodRadios = document.getElementsByName('lod') as NodeListOf<HTMLInputElement>;
const angleSnap = document.getElementById('angle-snap') as HTMLInputElement;
const rippleControl = document.getElementById('ripple-control') as HTMLInputElement;
const motionSync = document.getElementById('motion-sync') as HTMLInputElement;
const competitiveMode = document.getElementById('competitive-mode') as HTMLInputElement;

const dpiStageCountSel = document.getElementById('dpi-stage-count') as HTMLSelectElement;
const activeDpiStageSel = document.getElementById('active-dpi-stage') as HTMLSelectElement;
const dpiStagesContainer = document.getElementById('dpi-stages-container')!;

// ... (existing inspector code)
manager.setPacketLogCallback((dir, data) => {
  const line = document.createElement('div');
  line.className = dir === 'TX' ? 'log-tx' : 'log-rx';
  line.textContent = `[${dir}] ${formatHex(data)}`;
  packetLog.appendChild(line);
  packetLog.scrollTop = packetLog.scrollHeight;
});

document.getElementById('clear-log-btn')?.addEventListener('click', () => {
  packetLog.innerHTML = '';
});

// Render DPI Stages
function renderDPIStages(state: any) {
  dpiStagesContainer.innerHTML = '';
  for (let i = 0; i < state.dpiStageCount; i++) {
    const stage = state.dpiStages[i] || {x: 1000, y: 1000};
    const row = document.createElement('div');
    row.className = `dpi-stage-row ${state.activeDpiStage === (i + 1) ? 'active' : ''}`;
    
    row.innerHTML = `
      <label style="width:60px; color: ${state.activeDpiStage === (i + 1) ? 'var(--accent)' : 'inherit'};">Stage ${i+1}</label>
      <input type="number" min="50" max="42000" step="50" value="${stage.x}" data-index="${i}">
    `;
    
    row.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT' && state.activeDpiStage !== (i + 1)) {
        manager['queue'].sendCommand(Commands.setActiveDPIStage(i + 1));
        manager.store.update({ activeDpiStage: i + 1 });
      }
    });

    const input = row.querySelector('input')!;
    input.addEventListener('change', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10) || 1000;
      const newStages = [...state.dpiStages];
      newStages[i] = { x: val, y: val };
      manager.store.update({ dpiStages: newStages });
      manager['queue'].sendCommand(Commands.setDPITable(state.dpiStageCount, newStages));
    });
    
    dpiStagesContainer.appendChild(row);
  }
}

manager.store.subscribe((state) => {
  if (state.connected) {
    // ... connect code ...
    connectBtn.classList.add('hidden');
    disconnectBtn.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    
    deviceNameEl.textContent = state.deviceName;
    batteryStatusEl.textContent = `🔋 ${state.batteryLevel}%`;
    batteryStatusEl.classList.remove('hidden');
    
    if (pollingRateSel.value !== String(state.pollingRate)) pollingRateSel.value = String(state.pollingRate);
        if (state.sleepTime !== undefined) {
      if (state.sleepTime === 0) {
        if (sleepEnable.checked) sleepEnable.checked = false;
        sleepSlider.disabled = true;
        sleepVal.style.opacity = '0.5';
      } else {
        if (!sleepEnable.checked) sleepEnable.checked = true;
        sleepSlider.disabled = false;
        sleepVal.style.opacity = '1';
        
        const idx = String(sleepSecondsToIndex(state.sleepTime));
        if (sleepSlider.value !== idx) {
          sleepSlider.value = idx;
        }
        updateSleepDisplay(state.sleepTime);
      }
    }
    if (debounceSlider.value !== String(state.debounceTime)) {
      debounceSlider.value = String(state.debounceTime);
      debounceVal.textContent = String(state.debounceTime);
    }
    
    const lodSelected = document.querySelector(`input[name="lod"][value="${state.lodIndex}"]`) as HTMLInputElement;
    if (lodSelected && !lodSelected.checked) lodSelected.checked = true;
    
    if (angleSnap.checked !== state.angleSnap) angleSnap.checked = state.angleSnap;
    if (rippleControl.checked !== state.rippleControl) rippleControl.checked = state.rippleControl;
    if (motionSync.checked !== state.motionSync) motionSync.checked = state.motionSync;
    if (competitiveMode.checked !== state.competitiveMode) competitiveMode.checked = state.competitiveMode;
    
    if (dpiStageCountSel.value !== String(state.dpiStageCount)) dpiStageCountSel.value = String(state.dpiStageCount);
    if (activeDpiStageSel.value !== String(state.activeDpiStage)) activeDpiStageSel.value = String(state.activeDpiStage);
    
    renderDPIStages(state);
    
  } else {
    connectBtn.classList.remove('hidden');
    disconnectBtn.classList.add('hidden');
    mainContent.classList.add('hidden');
    deviceNameEl.textContent = 'Disconnected';
    batteryStatusEl.classList.add('hidden');
    fwVersionEl.classList.add('hidden');
  }
});

connectBtn.addEventListener('click', () => manager.requestConnection());
disconnectBtn.addEventListener('click', () => manager.disconnect());

const q = (cmd: Uint8Array) => manager['queue'].sendCommand(cmd);

pollingRateSel.addEventListener('change', (e) => {
  const val = parseInt((e.target as HTMLSelectElement).value, 10);
  let code = 0x01; // default 1000
  if (val === 125) code = 0x08;
  if (val === 250) code = 0x04;
  if (val === 500) code = 0x02;
  if (val === 1000) code = 0x01;
  if (val === 2000) code = 0x20;
  if (val === 4000) code = 0x40;
  if (val === 8000) code = 0x80;

  q(Commands.setPollingRate(code));
});

function sleepIndexToSeconds(idx: number): number {
  return idx === 0 ? 15 : idx * 60;
}
function sleepSecondsToIndex(sec: number): number {
  return sec <= 15 ? 0 : Math.round(sec / 60);
}
function updateSleepDisplay(sec: number) {
  sleepVal.textContent = sec === 15 ? '15s' : `${sec / 60} min`;
}

sleepEnable.addEventListener('change', () => {
  const enabled = sleepEnable.checked;
  sleepSlider.disabled = !enabled;
  sleepVal.style.opacity = enabled ? '1' : '0.5';
  const seconds = enabled ? sleepIndexToSeconds(parseInt(sleepSlider.value, 10)) : 0;
  q(Commands.setSleepTime(seconds));
  manager.store.update({ sleepTime: seconds });
});

sleepSlider.addEventListener('input', () => {
  updateSleepDisplay(sleepIndexToSeconds(parseInt(sleepSlider.value, 10)));
});

sleepSlider.addEventListener('change', () => {
  const seconds = sleepIndexToSeconds(parseInt(sleepSlider.value, 10));
  q(Commands.setSleepTime(seconds));
  manager.store.update({ sleepTime: seconds });
});

debounceSlider.addEventListener('input', (e) => {
  debounceVal.textContent = (e.target as HTMLInputElement).value;
});
debounceSlider.addEventListener('change', (e) => {
  q(Commands.setDebounce(parseInt((e.target as HTMLInputElement).value, 10)));
});

lodRadios.forEach(r => r.addEventListener('change', (e) => {
  q(Commands.setLOD(parseInt((e.target as HTMLInputElement).value, 10)));
}));

angleSnap.addEventListener('change', (e) => q(Commands.setAngleSnap((e.target as HTMLInputElement).checked)));
rippleControl.addEventListener('change', (e) => q(Commands.setRippleControl((e.target as HTMLInputElement).checked)));
motionSync.addEventListener('change', (e) => q(Commands.setMotionSync((e.target as HTMLInputElement).checked)));
competitiveMode.addEventListener('change', (e) => q(Commands.setCompetitive((e.target as HTMLInputElement).checked)));

activeDpiStageSel.addEventListener('change', (e) => {
  const stage = parseInt((e.target as HTMLSelectElement).value, 10);
  q(Commands.setActiveDPIStage(stage));
  manager.store.update({ activeDpiStage: stage });
});

dpiStageCountSel.addEventListener('change', (e) => {
  const count = parseInt((e.target as HTMLSelectElement).value, 10);
  manager.store.update({ dpiStageCount: count });
  q(Commands.setDPITable(count, manager.store.state.dpiStages));
});
