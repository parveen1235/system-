export interface CasementSeriesOption {
  id: string;
  name: string;
  code: string;
  nameHi: string;
  depth: string;
  description: string;
  descriptionHi: string;
}

export interface CasementProfileItem {
  id: string;
  name: string;
  code: string;
  nameHi: string;
  dimensions: string;
  description: string;
  descriptionHi: string;
  category: 'frame' | 'sash';
  application?: 'window' | 'door' | 'both';
}

export const CASEMENT_SERIES_OPTIONS: CasementSeriesOption[] = [
  {
    id: 'casement_60',
    name: 'CWH 60MM CASEMENT SERIES',
    code: 'CWH-60',
    nameHi: 'CWH 60MM कैसमेंट सीरीज़',
    depth: '60 mm Depth',
    description: 'Standard 60mm system for casement windows and doors',
    descriptionHi: 'मानक 60mm सिस्टम — खिड़कियों और दरवाजों के लिए सबसे लोकप्रिय',
  },
  {
    id: 'casement_50',
    name: 'CWH 50MM SLIM CASEMENT SERIES',
    code: 'CWH-50',
    nameHi: 'CWH 50MM स्लिम कैसमेंट सीरीज़',
    depth: '50 mm Depth',
    description: 'Slim economy casement profile for light residential windows',
    descriptionHi: 'स्लिम और किफायती 50mm प्रोफाइल — संकरे फ्रेम के लिए',
  },
  {
    id: 'casement_65',
    name: 'CWH 65MM HEAVY COMMERCIAL SERIES',
    code: 'CWH-65',
    nameHi: 'CWH 65MM हैवी कमर्शियल सीरीज़',
    depth: '65 mm Depth',
    description: 'Heavy triple-chamber system for tall doors and high wind-load areas',
    descriptionHi: 'मजबूत 65mm ट्रिपल-चैंबर सिस्टम — बड़े दरवाजों और ऊंचे भवनों के लिए',
  },
  {
    id: 'casement_70',
    name: 'DURON 70MM PREMIUM THERMAL SERIES',
    code: 'DURON-70',
    nameHi: 'डयूरॉन 70MM प्रीमियम थर्मल सीरीज़',
    depth: '70 mm Depth',
    description: 'Architectural multi-chamber series with superior sound & thermal insulation',
    descriptionHi: 'आर्किटेक्चरल 70mm मल्टी-चैंबर सीरीज़ — उच्च ध्वनि व हीट इन्सुलेशन',
  },
];

export const CASEMENT_FRAME_PROFILES: CasementProfileItem[] = [
  {
    id: 'CWH 60-01',
    name: 'CASEMENT OUTER FRAME 60MM',
    code: 'CWH 60-01',
    nameHi: 'कैसमेंट आउटर फ्रेम 60MM (CWH 60-01)',
    dimensions: '60mm × 58mm',
    description: 'Standard 4-side mitered outer frame with double EPDM gasket channel',
    descriptionHi: 'मानक 45° माइटर कट आउटर फ्रेम — डबल EPDM गैस्केट सपोर्ट',
    category: 'frame',
    application: 'both',
  },
  {
    id: 'CWH 60-02',
    name: 'CASEMENT LARGE OUTER FRAME WITH FIN',
    code: 'CWH 60-02',
    nameHi: 'कैसमेंट लार्ज फ्रेम विथ फिन (CWH 60-02)',
    dimensions: '60mm with Architrave Fin',
    description: 'Integrated architrave fin frame covering wall plaster gap seamlessly',
    descriptionHi: 'प्लास्टर गैप छुपाने के लिए इनबिल्ट फिन / आर्कित्रेव युक्त फ्रेम',
    category: 'frame',
    application: 'both',
  },
  {
    id: 'CWH 60-08',
    name: 'CASEMENT DOOR LOW SILL / THRESHOLD',
    code: 'CWH 60-08',
    nameHi: 'कैसमेंट डोर लो-सिल थ्रेशोल्ड (CWH 60-08)',
    dimensions: 'Low Step Sill (20mm step)',
    description: 'Low step-over barrier-free bottom threshold profile for doors',
    descriptionHi: 'दरवाजों के नीचे पैर न टकराने वाला लो-सिल थ्रेशोल्ड प्रोफाइल',
    category: 'frame',
    application: 'door',
  },
  {
    id: 'CWH 50-01',
    name: 'SLIMLINE CASEMENT FRAME 50MM',
    code: 'CWH 50-01',
    nameHi: 'स्लिमलाइन कैसमेंट फ्रेम 50MM (CWH 50-01)',
    dimensions: '50mm × 50mm',
    description: 'Narrow sightline slim frame maximizing glass daylight area',
    descriptionHi: 'पतली साइड वाला फ्रेम — ज्यादा काँच व प्राकृतिक रोशनी के लिए',
    category: 'frame',
    application: 'window',
  },
  {
    id: 'CWH 65-01',
    name: 'HEAVY COMMERCIAL FRAME 65MM',
    code: 'CWH 65-01',
    nameHi: 'हैवी कमर्शियल फ्रेम 65MM (CWH 65-01)',
    dimensions: '65mm × 68mm',
    description: 'Heavy duty thick-wall chamber frame for tall doors & heavy traffic',
    descriptionHi: 'अति मजबूत मोटी दीवार वाला कमर्शियल फ्रेम',
    category: 'frame',
    application: 'door',
  },
];

export const CASEMENT_WINDOW_SASH_PROFILES: CasementProfileItem[] = [
  {
    id: 'CWH 60-03',
    name: 'CMT OUTWARD SASH 60MM X 78MM',
    code: 'CWH 60-03',
    nameHi: 'CMT आउटवर्ड सैश 60MM X 78MM (CWH 60-03)',
    dimensions: '60mm × 78mm (Thickness : 2.2mm)',
    description: 'CMT OUTWARD SASH 60MM X 78MM • Thickness : 2.2mm',
    descriptionHi: 'CMT आउटवर्ड सैश 60mm × 78mm (मोटाई: 2.2mm)',
    category: 'sash',
    application: 'window',
  },
  {
    id: 'CWH 60-04',
    name: 'CMT INWARD SASH 60MM X 71MM',
    code: 'CWH 60-04',
    nameHi: 'CMT इनवर्ड सैश 60MM X 71MM (CWH 60-04)',
    dimensions: '60mm × 71mm (Thickness : 2.2mm)',
    description: 'CMT INWARD SASH 60MM X 71MM • Thickness : 2.2mm',
    descriptionHi: 'CMT इनवर्ड सैश 60mm × 71mm (मोटाई: 2.2mm)',
    category: 'sash',
    application: 'window',
  },
  {
    id: 'CWH 60-12',
    name: 'SLIM CASEMENT SASH 58MM',
    code: 'CWH 60-12',
    nameHi: 'स्लिम कैसमेंट सैश 58MM (CWH 60-12)',
    dimensions: '58mm × 50mm (Thickness : 2.0mm)',
    description: 'Lightweight slim casement sash for residential openable windows',
    descriptionHi: 'हल्का स्लिम विंडो सैश — छोटे व मध्यम पल्लों के लिए',
    category: 'sash',
    application: 'window',
  },
];

export const CASEMENT_DOOR_SASH_PROFILES: CasementProfileItem[] = [
  {
    id: 'CWH 60-06',
    name: 'CMT OUTWARD SASH 60MM X 104MM',
    code: 'CWH 60-06',
    nameHi: 'CMT आउटवर्ड सैश 60MM X 104MM (CWH 60-06)',
    dimensions: '60mm × 104mm (Thickness : 1.9mm)',
    description: 'CMT OUTWARD SASH 60MM X 104MM • Thickness : 1.9mm',
    descriptionHi: 'CMT आउटवर्ड डोर सैश 60mm × 104mm (मोटाई: 1.9mm)',
    category: 'sash',
    application: 'door',
  },
  {
    id: 'CWH 60-07',
    name: 'CMT INWARD SASH 60MM X 104MM',
    code: 'CWH 60-07',
    nameHi: 'CMT इनवर्ड सैश 60MM X 104MM (CWH 60-07)',
    dimensions: '60mm × 104mm (Thickness : 2.2mm)',
    description: 'CMT INWARD SASH 60MM X 104MM • Thickness : 2.2mm',
    descriptionHi: 'CMT इनवर्ड डोर सैश 60mm × 104mm (मोटाई: 2.2mm)',
    category: 'sash',
    application: 'door',
  },
  {
    id: 'CWH 65-06',
    name: 'CASEMENT COMMERCIAL ENTRANCE SASH 115MM',
    code: 'CWH 65-06',
    nameHi: 'कमर्शियल एंट्रेंस डोर सैश 115MM (CWH 65-06)',
    dimensions: '115mm × 65mm (Thickness : 2.5mm)',
    description: 'Extra heavy 115mm stile for public entrances and heavy double doors',
    descriptionHi: '115mm एक्स्ट्रा हैवी डोर स्टिल — कमर्शियल व मुख्य प्रवेश द्वारों के लिए',
    category: 'sash',
    application: 'door',
  },
];

export const SLIDING_SASH_PROFILES: CasementProfileItem[] = [
  {
    id: 'SWH 60-03',
    name: 'SLD SASH 42MM X 57MM (SWH 60-03)',
    code: 'SWH 60-03',
    nameHi: 'स्लाइडिंग विंडो सैश 57MM (SWH 60-03)',
    dimensions: '42mm × 57mm (Thickness : 1.9mm)',
    description: 'Standard 57mm sliding sash for 2-track and 3-track sliding windows',
    descriptionHi: 'मानक 57mm स्लाइडिंग विंडो सैश — 2-ट्रैक व 3-ट्रैक खिड़कियों के लिए',
    category: 'sash',
    application: 'window',
  },
  {
    id: 'SWH 60-04',
    name: 'SLD SASH 42MM X 66MM (SWH 60-04)',
    code: 'SWH 60-04',
    nameHi: 'स्लाइडिंग हैवी सैश 66MM (SWH 60-04)',
    dimensions: '42mm × 66mm (Thickness : 2.2mm)',
    description: 'Heavy duty 66mm sliding sash for large window panels',
    descriptionHi: 'हैवी ड्यूटी 66mm स्लाइडिंग सैश — बड़े विंडो पल्लों के लिए',
    category: 'sash',
    application: 'both',
  },
  {
    id: 'SWH 60-05',
    name: 'SLD SASH 42MM X 75MM (SWH 60-05)',
    code: 'SWH 60-05',
    nameHi: 'स्लाइडिंग डोर सैश 75MM (SWH 60-05)',
    dimensions: '42mm × 75mm (Thickness : 2.1mm)',
    description: 'Heavy 75mm sliding door shutter for balconies and high wind loads',
    descriptionHi: '75mm स्लाइडिंग डोर सैश — बॉलकनी दरवाजों व अधिक हवा के दबाव के लिए',
    category: 'sash',
    application: 'door',
  },
  {
    id: 'SWH 60-06',
    name: 'SLD SASH 42MM X 88MM (SWH 60-06)',
    code: 'SWH 60-06',
    nameHi: 'सुपर हैवी स्लाइडिंग डोर सैश 88MM (SWH 60-06)',
    dimensions: '42mm × 88mm (Thickness : 1.9mm)',
    description: 'Extra heavy 88mm sliding door sash for architectural glass installations',
    descriptionHi: '88mm सुपर हैवी स्लाइडिंग डोर सैश — बड़े ग्लास पैनल्स के लिए',
    category: 'sash',
    application: 'door',
  },
];
