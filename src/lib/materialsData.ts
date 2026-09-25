export interface CommonMaterial {
  id: string;
  name: string;
  category: 'KNX' | 'DALI' | 'Sensors' | 'Power' | 'Wiring';
}

export const COMMON_MATERIALS: CommonMaterial[] = [
  // KNX & Sensors
  { id: 'mdt-sensor', name: 'MDT SCN-P360D4.03 Presence Sensor', category: 'Sensors' },
  { id: 'eyezen-sensor', name: 'Zennio EyeZen KNX Motion Sensor', category: 'Sensors' },
  { id: 'knx-dali-gw', name: 'KNX/DALI Gateway Tunable White', category: 'DALI' },
  { id: 'knx-ps-640', name: 'KNX Power Supply 640mA with Choke', category: 'Power' },
  { id: 'knx-ps-1280', name: 'KNX Power Supply 1280mA with Diagnostics', category: 'Power' },
  { id: 'dali-driver-24v', name: 'DALI 24V PWM Dimming LED Driver 4-CH', category: 'DALI' },
  { id: 'knx-act-4ch', name: 'KNX 4-Channel 16A Switch Actuator', category: 'KNX' },
  { id: 'knx-act-8ch', name: 'KNX 8-Channel Universal Actuator', category: 'KNX' },
  { id: 'knx-coupler', name: 'KNX Line Coupler / Area Coupler', category: 'KNX' },
  { id: 'knx-cable', name: 'KNX Bus Cable 2x2x0.8 Shielded (Green)', category: 'Wiring' },
  { id: 'pwr-24v-din', name: 'Mean Well 24V DC DIN Rail Power Supply', category: 'Power' },
  { id: 'rj45-cat6', name: 'Patch Cord RJ45 Cat6 UTP 1.5m', category: 'Wiring' },
  { id: 'wago-terminals', name: 'WAGO 221 Lever Connectors & DIN Adapters', category: 'Wiring' },
];
