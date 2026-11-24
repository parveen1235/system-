import { GlassType } from '../types/upvc';

export interface GlassPreset {
  id: GlassType | string;
  name: string;
  nameHindi: string;
  shortName: string;
  thickness: string;
  category: 'clear' | 'tinted' | 'frosted' | 'dgu' | 'laminated' | 'special';
  badge?: string;
  colorPreview?: string;
}

export const MASTER_GLASS_PRESETS: GlassPreset[] = [
  {
    id: 'clear_6mm',
    name: '6mm Toughened Clear Glass',
    nameHindi: '6mm टफन साफ़ काँच',
    shortName: '6mm Toughened',
    thickness: '6mm',
    category: 'clear',
    badge: '★ डिफ़ॉल्ट (Recommended)',
    colorPreview: 'rgba(56, 189, 248, 0.22)',
  },
  {
    id: 'clear_5mm',
    name: '5mm Clear Float Glass',
    nameHindi: '5mm सादा काँच',
    shortName: '5mm Float',
    thickness: '5mm',
    category: 'clear',
    colorPreview: 'rgba(203, 213, 225, 0.20)',
  },
  {
    id: 'clear_8mm',
    name: '8mm Toughened Clear Glass',
    nameHindi: '8mm टफन साफ़ काँच',
    shortName: '8mm Toughened',
    thickness: '8mm',
    category: 'clear',
    colorPreview: 'rgba(56, 189, 248, 0.28)',
  },
  {
    id: 'clear_10mm',
    name: '10mm Heavy Toughened Glass',
    nameHindi: '10mm हैवी टफन काँच',
    shortName: '10mm Toughened',
    thickness: '10mm',
    category: 'clear',
    colorPreview: 'rgba(56, 189, 248, 0.35)',
  },
  {
    id: 'clear_12mm',
    name: '12mm Heavy Toughened Glass',
    nameHindi: '12mm हैवी टफन काँच',
    shortName: '12mm Toughened',
    thickness: '12mm',
    category: 'clear',
    colorPreview: 'rgba(56, 189, 248, 0.40)',
  },
  {
    id: 'tint_grey',
    name: '5 MM BLACK / TINTED GLASS',
    nameHindi: '5mm ब्लैक / टिंटेड काँच',
    shortName: '5mm Black Tint',
    thickness: '5mm',
    category: 'tinted',
    badge: 'Heat Block',
    colorPreview: 'rgba(30, 41, 59, 0.45)',
  },
  {
    id: 'tint_bronze',
    name: '5mm Tinted Bronze Glass',
    nameHindi: '5mm ब्राउज टिंटेड काँच',
    shortName: '5mm Bronze Tint',
    thickness: '5mm',
    category: 'tinted',
    colorPreview: 'rgba(180, 83, 9, 0.35)',
  },
  {
    id: 'tint_green',
    name: '5mm Tinted Green Glass',
    nameHindi: '5mm हरा टिंटेड काँच',
    shortName: '5mm Green Tint',
    thickness: '5mm',
    category: 'tinted',
    colorPreview: 'rgba(22, 101, 52, 0.35)',
  },
  {
    id: 'tint_blue',
    name: '5mm Tinted Blue Glass',
    nameHindi: '5mm नीला टिंटेड काँच',
    shortName: '5mm Blue Tint',
    thickness: '5mm',
    category: 'tinted',
    colorPreview: 'rgba(29, 78, 216, 0.35)',
  },
  {
    id: 'frosted',
    name: 'Frosted / Privacy Glass',
    nameHindi: 'धुंधला / प्राइवेसी काँच',
    shortName: 'Frosted Glass',
    thickness: '5mm / 6mm',
    category: 'frosted',
    badge: 'Privacy',
    colorPreview: 'rgba(241, 245, 249, 0.85)',
  },
  {
    id: 'dgu_5_12_5',
    name: 'DGU 22mm Double Glazed Unit',
    nameHindi: 'DGU 22mm इंसुलेटेड (5+12+5)',
    shortName: 'DGU 22mm (5+12+5)',
    thickness: '22mm',
    category: 'dgu',
    badge: 'Insulated',
    colorPreview: 'rgba(14, 165, 233, 0.35)',
  },
  {
    id: 'dgu_6_16_6',
    name: 'DGU 28mm Soundproof Glass',
    nameHindi: 'DGU 28mm साउंडप्रूफ (6+16+6)',
    shortName: 'DGU 28mm (6+16+6)',
    thickness: '28mm',
    category: 'dgu',
    badge: 'Soundproof',
    colorPreview: 'rgba(14, 165, 233, 0.45)',
  },
  {
    id: 'dgu_5_10_5',
    name: 'DGU 20mm Insulated Glass',
    nameHindi: 'DGU 20mm इंसुलेटेड (5+10+5)',
    shortName: 'DGU 20mm',
    thickness: '20mm',
    category: 'dgu',
    colorPreview: 'rgba(14, 165, 233, 0.30)',
  },
  {
    id: 'dgu_30mm',
    name: 'DGU 30mm Triple Glazed Glass',
    nameHindi: 'DGU 30mm ट्रिपल ग्लेज्ड',
    shortName: 'DGU 30mm Triple',
    thickness: '30mm',
    category: 'dgu',
    colorPreview: 'rgba(14, 165, 233, 0.50)',
  },
  {
    id: 'laminated_11_52',
    name: '11.52mm Laminated Safety Glass',
    nameHindi: '11.52mm लेमिनेटेड सेफ़्टी काँच',
    shortName: '11.52mm Laminated',
    thickness: '11.52mm',
    category: 'laminated',
    badge: 'Safety',
    colorPreview: 'rgba(79, 70, 229, 0.30)',
  },
  {
    id: 'laminated_13_52',
    name: '13.52mm Laminated Acoustic Glass',
    nameHindi: '13.52mm लेमिनेटेड साउंडप्रूफ काँच',
    shortName: '13.52mm Laminated',
    thickness: '13.52mm',
    category: 'laminated',
    badge: 'Security',
    colorPreview: 'rgba(79, 70, 229, 0.40)',
  },
  {
    id: 'reflective_mirror',
    name: '6mm One-Way Reflective Mirror Glass',
    nameHindi: 'वन-वे रिफ्लेक्टिव मिरर (6mm)',
    shortName: '6mm Reflective',
    thickness: '6mm',
    category: 'special',
    colorPreview: 'rgba(100, 116, 139, 0.60)',
  },
  {
    id: 'low_e',
    name: 'Low-E Solar Heat Reflector Glass',
    nameHindi: 'Low-E सोलर प्रोटेक्टेड काँच',
    shortName: 'Low-E Glass',
    thickness: '6mm',
    category: 'special',
    badge: 'Eco Solar',
    colorPreview: 'rgba(16, 185, 129, 0.25)',
  },
  {
    id: 'pinhead',
    name: 'Pinhead / Fluted Texture Glass',
    nameHindi: 'पिनहेड / फ्लूटेड डिज़ाइन काँच',
    shortName: 'Pinhead / Fluted',
    thickness: '5mm',
    category: 'special',
    colorPreview: 'rgba(226, 232, 240, 0.70)',
  },
];

/**
 * Returns the exact, authoritative human-readable glass name shown in Properties.
 * If a custom glass name was entered in Properties, it returns that exact name.
 * If a standard glassType ID is provided, it returns its full official name.
 */
export function getGlassDisplayName(
  glassTypeOrName?: string,
  customName?: string,
  lang?: 'hi' | 'en'
): string {
  // 1. If explicit custom name is present and not empty, use it
  if (customName && customName.trim() !== '') {
    return customName.trim();
  }

  if (!glassTypeOrName) {
    return lang === 'hi' ? '6mm टफन साफ़ काँच' : '6mm Toughened Clear Glass';
  }

  const raw = glassTypeOrName.trim();

  // 2. Direct match against presets by ID
  const matchedById = MASTER_GLASS_PRESETS.find((p) => p.id === raw);
  if (matchedById) {
    return lang === 'hi' ? matchedById.nameHindi || matchedById.name : matchedById.name;
  }

  // 3. Match against presets by name (case-insensitive)
  const lower = raw.toLowerCase();
  const matchedByName = MASTER_GLASS_PRESETS.find(
    (p) =>
      p.name.toLowerCase() === lower ||
      p.shortName.toLowerCase() === lower ||
      p.nameHindi.toLowerCase().includes(lower)
  );
  if (matchedByName) {
    return lang === 'hi' ? matchedByName.nameHindi || matchedByName.name : matchedByName.name;
  }

  // 4. Common legacy aliases
  if (lower.includes('black') || lower.includes('tint_grey')) {
    return '5 MM BLACK / TINTED GLASS';
  }
  if (lower.includes('6mm') && (lower.includes('tough') || lower.includes('clear'))) {
    return '6mm Toughened Clear Glass';
  }
  if (lower.includes('5mm') && (lower.includes('float') || lower.includes('clear'))) {
    return '5mm Clear Float Glass';
  }
  if (lower.includes('frosted')) {
    return 'Frosted / Privacy Glass';
  }
  if (lower.includes('28mm') || lower.includes('6_16_6')) {
    return 'DGU 28mm Soundproof Glass';
  }
  if (lower.includes('22mm') || lower.includes('5_12_5')) {
    return 'DGU 22mm Double Glazed Unit';
  }

  // 5. If it contains underscores (like 'clear_8mm'), format it cleanly
  if (raw.includes('_')) {
    return raw
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') + ' Glass';
  }

  // 6. Already human-readable text
  return raw;
}

/**
 * Returns a short, compact glass title suitable for small badges or drawings.
 */
export function getGlassShortBadge(
  glassTypeOrName?: string,
  customName?: string
): string {
  if (customName && customName.trim() !== '') {
    const words = customName.trim().split(' ');
    return words.length > 3 ? words.slice(0, 3).join(' ') : customName.trim();
  }
  const fullName = getGlassDisplayName(glassTypeOrName);
  const matched = MASTER_GLASS_PRESETS.find((p) => p.name === fullName || p.id === glassTypeOrName);
  return matched ? matched.shortName : fullName;
}
