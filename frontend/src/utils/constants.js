export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
export const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://127.0.0.1:8000/ws/live';

export const URGENCY_TIERS = {
  T1: {
    label: 'Tier 1 - Critical (Immediate)',
    color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    badge: 'bg-rose-500 text-white',
    sla: '< 20 mins'
  },
  T2: {
    label: 'Tier 2 - Urgent (Moderate)',
    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    badge: 'bg-amber-500 text-white',
    sla: '< 45 mins'
  },
  T3: {
    label: 'Tier 3 - Standard (Stable)',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    badge: 'bg-emerald-500 text-white',
    sla: '< 90 mins'
  }
};

export const SPECIALTIES = [
  'Cardiology',
  'Trauma',
  'Neurology',
  'Pediatrics',
  'General',
  'Obstetrics',
  'Orthopedic'
];

export const MEDICINES = [
  'Heparin',
  'Anti-venom',
  'Epinephrine',
  'Blood_O_Neg',
  'Insulin',
  'Atropine'
];
