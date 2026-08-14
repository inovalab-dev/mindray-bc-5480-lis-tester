import { MindraySampleResult, MindrayParam, ProtocolType } from '../types';

// MLLP Control Characters
export const MLLP_START = '\x0B'; // VT (Vertical Tab - 0x0B)
export const MLLP_END = '\x1C\x0D'; // FS CR (0x1C 0x0D)

// Standard Mindray Parameter Dictionary
export const MINDRAY_PARAM_DEFS: Record<string, { name: string; unit: string; defaultRef: string }> = {
  'WBC': { name: 'Leucócitos Totais', unit: '10^9/L', defaultRef: '4.00 - 10.00' },
  'RBC': { name: 'Hemácias', unit: '10^12/L', defaultRef: '3.80 - 5.80' },
  'HGB': { name: 'Hemoglobina', unit: 'g/dL', defaultRef: '11.5 - 17.5' },
  'HCT': { name: 'Hematócrito', unit: '%', defaultRef: '35.0 - 50.0' },
  'MCV': { name: 'VCM', unit: 'fL', defaultRef: '82.0 - 100.0' },
  'MCH': { name: 'HCM', unit: 'pg', defaultRef: '27.0 - 34.0' },
  'MCHC': { name: 'CHCM', unit: 'g/dL', defaultRef: '31.6 - 35.4' },
  'RDW-CV': { name: 'RDW-CV', unit: '%', defaultRef: '11.0 - 16.0' },
  'RDW-SD': { name: 'RDW-SD', unit: 'fL', defaultRef: '35.0 - 56.0' },
  'PLT': { name: 'Plaquetas', unit: '10^9/L', defaultRef: '150 - 450' },
  'MPV': { name: 'VPM (Vol. Plaq. Médio)', unit: 'fL', defaultRef: '6.5 - 11.0' },
  'PDW': { name: 'PDW', unit: 'fL', defaultRef: '9.0 - 17.0' },
  'PCT': { name: 'Plaquetócrito', unit: '%', defaultRef: '0.108 - 0.282' },
  'P-LCC': { name: 'P-LCC', unit: '10^9/L', defaultRef: '30 - 90' },
  'P-LCR': { name: 'P-LCR', unit: '%', defaultRef: '11.0 - 45.0' },
  'NEU%': { name: 'Neutrófilos %', unit: '%', defaultRef: '40.0 - 70.0' },
  'LYM%': { name: 'Linfócitos %', unit: '%', defaultRef: '20.0 - 50.0' },
  'MON%': { name: 'Monócitos %', unit: '%', defaultRef: '3.0 - 10.0' },
  'EOS%': { name: 'Eosinófilos %', unit: '%', defaultRef: '0.5 - 5.0' },
  'BAS%': { name: 'Basófilos %', unit: '%', defaultRef: '0.0 - 1.0' },
  'NEU#': { name: 'Neutrófilos Abs.', unit: '10^9/L', defaultRef: '2.00 - 7.00' },
  'LYM#': { name: 'Linfócitos Abs.', unit: '10^9/L', defaultRef: '0.80 - 4.00' },
  'MON#': { name: 'Monócitos Abs.', unit: '10^9/L', defaultRef: '0.12 - 1.00' },
  'EOS#': { name: 'Eosinófilos Abs.', unit: '10^9/L', defaultRef: '0.02 - 0.50' },
  'BAS#': { name: 'Basófilos Abs.', unit: '10^9/L', defaultRef: '0.00 - 0.10' },
  'LIC%': { name: 'Cél. Imaturas Células %', unit: '%', defaultRef: '0.0 - 2.5' },
  'ALY%': { name: 'Linfócitos Atípicos %', unit: '%', defaultRef: '0.0 - 2.0' },
};

/**
 * Unwrap MLLP frame if present (or return raw text if plain HL7)
 */
export function unwrapMLLP(rawInput: string): { payload: string; hasMllpWrapper: boolean } {
  let cleaned = rawInput;
  let hasMllpWrapper = false;

  if (cleaned.startsWith(MLLP_START)) {
    hasMllpWrapper = true;
    cleaned = cleaned.substring(1);
  }
  if (cleaned.endsWith(MLLP_END)) {
    hasMllpWrapper = true;
    cleaned = cleaned.substring(0, cleaned.length - MLLP_END.length);
  } else if (cleaned.endsWith('\x1C')) {
    hasMllpWrapper = true;
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }

  return { payload: cleaned.trim(), hasMllpWrapper };
}

/**
 * Wrap HL7 payload in MLLP envelope: VT + HL7 + FS CR
 */
export function wrapMLLP(hl7Message: string): string {
  return `${MLLP_START}${hl7Message}${MLLP_END}`;
}

/**
 * Convert string to Hex representation for log inspection
 */
export function stringToHex(str: string): string {
  return Array.from(str)
    .map(c => {
      const code = c.charCodeAt(0);
      if (code === 0x0B) return '[VT:0B]';
      if (code === 0x1C) return '[FS:1C]';
      if (code === 0x0D) return '[CR:0D]\n';
      if (code === 0x0A) return '[LF:0A]';
      return code.toString(16).padStart(2, '0').toUpperCase() + ' ';
    })
    .join('');
}

/**
 * Parse HL7 v2.3.1 / v2.5 message from Mindray BC-5480
 */
export function parseMindrayHL7(
  rawInput: string,
  getWorklistFn?: (sampleId: string) => {
    sampleId?: string;
    patientId?: string;
    patientName?: string;
    gender?: string;
    age?: string;
    testCode?: string;
    sampleMode?: string;
    orcCode?: string;
    msgTypeResponse?: string;
    useBarcodeAsPatientId?: boolean;
    includePv1?: boolean;
    placerIdMode?: 'EMPTY' | 'SAME';
    includeDatesInObr?: boolean;
    dobMode?: 'YYYYMMDD' | 'EMPTY';
    includeModeObx?: boolean;
    takeMode?: string;
    bloodMode?: string;
    testModeObx?: string;
  } | undefined
): {
  result?: MindraySampleResult;
  ackMessage: string;
  msgControlId: string;
  msgType: string;
  error?: string;
} {
  const { payload } = unwrapMLLP(rawInput);
  
  if (!payload) {
    return {
      ackMessage: '',
      msgControlId: '',
      msgType: '',
      error: 'Mensagem vazia ou sem conteúdo HL7 válido.'
    };
  }

  // Split lines by CR or LF
  const lines = payload.split(/[\r\n]+/).filter(l => l.trim().length > 0);
  
  if (lines.length === 0 || !lines[0].startsWith('MSH')) {
    return {
      ackMessage: '',
      msgControlId: '',
      msgType: '',
      error: 'Cabeçalho MSH ausente ou formato inválido.'
    };
  }

  // Extract delimiters from MSH
  const msh = lines[0];
  const fieldDelim = msh.charAt(3) || '|';
  const compDelim = msh.charAt(4) || '^';

  const mshFields = msh.split(fieldDelim);
  const sendingApp = mshFields[2] || 'BC-5480';
  const sendingFacility = mshFields[3] || 'MINDRAY';
  const receivingApp = mshFields[4] || 'LIS';
  const receivingFacility = mshFields[5] || 'LAB';
  const timestampStr = mshFields[6] || new Date().toISOString();

  let msgType = '';
  let msgControlId = '';

  for (let i = 2; i < mshFields.length; i++) {
    const f = mshFields[i].trim().toUpperCase();
    if (
      f.includes('QRY') || f.includes('Q02') || 
      f.includes('ORM') || f.includes('O01') || 
      f.includes('ORU') || f.includes('R01') || 
      f.includes('ACK')
    ) {
      msgType = mshFields[i].trim();
      for (let j = i + 1; j < mshFields.length; j++) {
        const candidate = mshFields[j].trim();
        if (candidate && candidate !== 'P' && candidate !== 'D' && candidate !== 'T' && candidate !== '2.3.1' && candidate !== '2.5' && candidate !== 'UNICODE') {
          msgControlId = candidate;
          break;
        }
      }
      break;
    }
  }

  if (!msgType) {
    if (payload.toUpperCase().includes('QRY') || payload.toUpperCase().includes('Q02') || payload.includes('QRD|')) {
      msgType = 'QRY^Q02';
    } else if (payload.toUpperCase().includes('ORM') || payload.toUpperCase().includes('O01') || payload.includes('ORC|')) {
      msgType = 'ORM^O01';
    } else {
      msgType = mshFields[8] || mshFields[7] || 'ORU^R01';
    }
  }
  if (!msgControlId) {
    msgControlId = mshFields[9] || mshFields[8] || `MSG_${Date.now()}`;
  }

  const nowHL7 = formatIsoToHL7Timestamp(new Date());

  // Do NOT reply to incoming ACK messages from equipment (ACK^R01, ACK^Q03, ACK^O02, etc.)
  const isAck = msgType.toUpperCase().startsWith('ACK') || msgType.toUpperCase().includes('ACK') || payload.includes('ACK^');
  if (isAck) {
    return {
      msgControlId,
      msgType,
      ackMessage: undefined
    };
  }

  const isOrmQuery = 
    msgType.toUpperCase().includes('ORM') || 
    msgType.toUpperCase().includes('O01') || 
    payload.toUpperCase().includes('ORM^O01') || 
    payload.includes('ORC|RF') ||
    payload.includes('ORC|');

  const isQryQuery = 
    msgType.toUpperCase().includes('QRY') || 
    msgType.toUpperCase().includes('Q02') || 
    payload.toUpperCase().includes('QRY^Q02') || 
    payload.includes('QRD|');

  const isWorklistQuery = isOrmQuery || isQryQuery;

  // Handle Worklist Queries (ORM^O01 or QRY^Q02 from Mindray to LIS)
  if (isWorklistQuery) {
    let queriedSampleId = '';
    let incomingQrdLine = `QRD|${nowHL7}|R|I|${msgControlId}|||1^RD|548001|DEM|||`;
    let incomingQrfLine = `QRF|${sendingApp || 'BC-5480'}|||||`;

    for (const line of lines) {
      if (line.startsWith('ORC')) {
        const orcFields = line.split(fieldDelim);
        for (let idx = 1; idx < orcFields.length; idx++) {
          const val = orcFields[idx].split(compDelim)[0].trim();
          if (val && val !== 'RF' && val !== 'AF' && val !== 'IP' && val !== 'OK' && val !== 'DEM' && val !== '1' && !val.includes('^')) {
            queriedSampleId = val;
            break;
          }
        }
      } else if (line.startsWith('OBR')) {
        const obrFields = line.split(fieldDelim);
        for (let idx = 2; idx < obrFields.length; idx++) {
          const val = obrFields[idx].split(compDelim)[0].trim();
          if (val && val !== '1' && val !== 'HM' && !val.includes('^')) {
            if (!queriedSampleId) queriedSampleId = val;
            break;
          }
        }
      } else if (line.startsWith('QRD')) {
        incomingQrdLine = line;
        const qrdFields = line.split(fieldDelim);
        if (qrdFields[8]) {
          const cand = qrdFields[8].split(compDelim)[0].trim();
          if (cand && cand !== 'DEM' && cand !== 'OTH' && cand !== 'ALL' && cand !== '1') {
            queriedSampleId = cand;
          }
        }
        if (!queriedSampleId) {
          for (let idx = 7; idx < qrdFields.length; idx++) {
            const rawVal = qrdFields[idx].trim();
            const val = rawVal.split(compDelim)[0].trim();
            if (val && val !== 'DEM' && val !== 'OTH' && val !== 'ALL' && val !== '1' && val !== 'RD' && val !== '1^RD' && !rawVal.includes('^RD')) {
              queriedSampleId = val;
              break;
            }
          }
        }
      } else if (line.startsWith('QRF')) {
        incomingQrfLine = line;
      }
    }

    if (!queriedSampleId) {
      queriedSampleId = '548001';
    }

    const worklist = getWorklistFn ? getWorklistFn(queriedSampleId) : undefined;
    const sid = worklist?.sampleId || queriedSampleId;
    const pId = worklist?.patientId || `P-${sid}`;
    
    // Format patient name safely for Mindray HL7 (Sobrenome^Nome, ASCII clean)
    let rawName = worklist?.patientName || `Amostra ${sid}`;
    rawName = rawName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s^]/g, '').trim();
    let pName = rawName;
    if (!pName.includes('^')) {
      const parts = pName.split(/\s+/);
      if (parts.length >= 2) {
        pName = `${parts[0]}^${parts.slice(1).join(' ')}`;
      } else {
        pName = `Amostra^${pName || sid}`;
      }
    }

    const pGender = (worklist?.gender || 'F').toUpperCase().startsWith('M') ? 'M' : 'F';

    const testCode = worklist?.testCode || '00002^CBC+DIFF^99MRC';
    let rawSampleMode = worklist?.sampleMode;
    if (rawSampleMode === 'BLANK' || rawSampleMode === 'EMPTY' || rawSampleMode === 'VAZIO') {
      rawSampleMode = '';
    }
    const sampleMode = rawSampleMode !== undefined ? rawSampleMode : ''; // Leave OBR-15 blank when OBX modes are included
    const orcCode = worklist?.orcCode || 'AF'; // Default to 'AF' (Order Refilled / Worklist Ack)
    const respMsgType = worklist?.msgTypeResponse || 'ORR^O02'; // Default to ORR^O02
    const pIdFormatted = worklist?.useBarcodeAsPatientId ? sid : pId;
    const includePv1 = worklist?.includePv1 ?? true; // Default to true (PV1 required by Mindray)
    const placerId = worklist?.placerIdMode === 'EMPTY' ? '' : sid; // Default to sid (Placer ID)
    const dob = worklist?.dobMode === 'EMPTY' ? '' : '19900101';
    const reqDate = worklist?.includeDatesInObr ? nowHL7 : nowHL7;
    const rcvDate = worklist?.includeDatesInObr ? nowHL7 : nowHL7;

    const includeModeObx = worklist?.includeModeObx ?? true; // Default to true (Include OBX Take/Blood/Test Mode)
    const takeModeVal = worklist?.takeMode || 'CT'; // CT = Closed Tube, AL = Autoloader, OV = Open Vial
    const bloodModeVal = worklist?.bloodMode || 'W'; // W = Whole Blood (Sangue Total), P = Prediluted
    const testModeObxVal = worklist?.testModeObx || 'CBC+DIFF'; // CBC+DIFF or CBC

    if (isOrmQuery) {
      // Format Mindray Order Response Message (ORR^O02 or ORM^O01)
      // Format Patient ID and Name for Mindray standard
      // PID|1||548002^^^LIS||Jose^Carlos^Pereira||19611220|M|||^^^^^^BR
      const pid3 = pIdFormatted ? (pIdFormatted.includes('^') ? pIdFormatted : `${pIdFormatted}^^^LIS`) : '';
      
      // Patient Name formatting (Convert spaces to '^' if no components exist, e.g. "Jose Carlos Pereira" -> "Jose^Carlos^Pereira")
      let pNameFormatted = pName;
      if (pNameFormatted && !pNameFormatted.includes('^')) {
        pNameFormatted = pNameFormatted.trim().replace(/\s+/g, '^');
      }

      const orrSegments = [
        `MSH|^~\\&|${receivingApp || 'LIS'}|${receivingFacility || 'LAB'}|${sendingApp || 'BC-5480'}|${sendingFacility || 'MINDRAY'}|${nowHL7}||${respMsgType}|${msgControlId}|P|2.3.1||||||UNICODE`,
        `MSA|AA|${msgControlId}|Success|`,
        `PID|1||${pid3}||${pNameFormatted}||${dob}|${pGender}|||^^^^^^BR`
      ];

      if (includePv1) {
        orrSegments.push(`PV1|1|O`);
      }

      // If OBX mode segments (08001/08002/08003) are included, OBR-15 MUST be empty so it doesn't conflict
      const finalSampleMode = includeModeObx ? '' : sampleMode;

      orrSegments.push(`ORC|${orcCode}|${placerId}|${sid}||IP|`);
      orrSegments.push(`OBR|1|${placerId}|${sid}|${testCode}|||${reqDate}|||||O|||${rcvDate}|${finalSampleMode}||||||||HM|`);

      if (includeModeObx) {
        orrSegments.push(`OBX|1|IS|08001^Take Mode^99MRC||${takeModeVal}||||||F`);
        orrSegments.push(`OBX|2|IS|08002^Blood Mode^99MRC||${bloodModeVal}||||||F`);
        orrSegments.push(`OBX|3|IS|08003^Test Mode^99MRC||${testModeObxVal}||||||F`);
      }

      const orrRaw = orrSegments.join('\r') + '\r';
      const ackWrapped = wrapMLLP(orrRaw);

      return {
        ackMessage: ackWrapped,
        msgControlId,
        msgType: respMsgType,
        error: undefined
      };
    }

    // Format Mindray BC-5480 DSR^Q03 Worklist Response with QAK segment
    const dsrSegments = [
      `MSH|^~\\&|${receivingApp || 'LIS'}|${receivingFacility || 'LAB'}|${sendingApp || 'BC-5480'}|${sendingFacility || 'MINDRAY'}|${nowHL7}||DSR^Q03|${msgControlId}|P|2.3.1|`,
      `MSA|AA|${msgControlId}|Success|`,
      `QAK|${msgControlId}|OK|`,
      incomingQrdLine,
      incomingQrfLine,
      `DSP|1||1|||`,
      `DSP|2||${pId}|||`,
      `DSP|3||${pName}|||`,
      `DSP|4||19900101|||`,
      `DSP|5||${pGender}|||`,
      `DSP|6|||||`,
      `DSP|7||${pId}|||`,
      `DSP|8|||||`,
      `DSP|9|||||`,
      `DSP|10|||||`,
      `DSP|11||${sid}|||`,
      `DSP|12||${sampleMode}|||`,
      `DSP|13||${testCode.split('^')[0] || 'CBC+DIFF'}|||`,
      `DSP|14|||||`,
      `DSP|15||0|||`,
      `DSP|16|||||`,
      `DSP|17|||||`,
      `DSP|18|||||`,
      `DSP|19|||||`,
      `DSP|20|||||`,
      `DSP|21|||||`,
      `DSP|22|||||`,
      `DSP|23|||||`,
      `DSP|24|||||`,
      `DSP|25|||||`,
      `DSP|26|||||`,
      `DSP|27|||||`,
      `DSP|28|||||`,
      `DSP|29|||||`
    ];

    const dsrRaw = dsrSegments.join('\r') + '\r';
    const ackWrapped = wrapMLLP(dsrRaw);

    return {
      ackMessage: ackWrapped,
      msgControlId,
      msgType: 'DSR^Q03',
      error: undefined
    };
  }

  // Handle ORU^R01 (Sample result from Mindray to LIS)
  let sampleId = 'SAMP_' + Math.floor(1000 + Math.random() * 9000);
  let patientId = '';
  let patientName = '';
  let serialNumber = 'BC5480-1001';
  const parameters: Record<string, MindrayParam> = {};
  const flags: string[] = [];

  for (const line of lines) {
    const fields = line.split(fieldDelim);
    const segType = fields[0];

    if (segType === 'PID') {
      patientId = fields[2] || fields[3] || '';
      const nameParts = (fields[5] || '').split(compDelim);
      patientName = nameParts.filter(Boolean).join(' ') || 'Paciente Desconhecido';
    } else if (segType === 'OBR') {
      // Sample ID is in OBR-2 or OBR-3
      const obr2 = fields[2] || '';
      const obr3 = fields[3] || '';
      if (obr2 || obr3) {
        sampleId = obr2.split(compDelim)[0] || obr3.split(compDelim)[0] || sampleId;
      }
    } else if (segType === 'OBX') {
      const testCodeRaw = fields[3] || '';
      const valueRaw = fields[5] || '';
      const unitRaw = fields[6] || '';
      const refRangeRaw = fields[7] || '';
      const flagRaw = fields[8] || '';

      let code = testCodeRaw;
      if (testCodeRaw.includes(compDelim)) {
        const parts = testCodeRaw.split(compDelim);
        code = parts[1] || parts[0];
      }

      code = code.trim().toUpperCase();

      if (code && valueRaw !== '') {
        const numericVal = parseFloat(valueRaw);
        const valToStore = isNaN(numericVal) ? valueRaw : numericVal;
        
        const def = MINDRAY_PARAM_DEFS[code] || {
          name: code,
          unit: unitRaw || '',
          defaultRef: refRangeRaw || ''
        };

        let flag: 'H' | 'L' | 'N' | 'A' | '' = '';
        if (flagRaw === 'H' || flagRaw === 'HIGH') flag = 'H';
        else if (flagRaw === 'L' || flagRaw === 'LOW') flag = 'L';
        else if (flagRaw === 'A' || flagRaw === 'ABNORMAL') flag = 'A';
        else if (flagRaw === 'N' || flagRaw === 'NORMAL') flag = 'N';

        if (flag) {
          flags.push(`${code}: ${flag}`);
        }

        parameters[code] = {
          code,
          name: def.name,
          value: valToStore,
          unit: unitRaw || def.unit,
          referenceRange: refRangeRaw || def.defaultRef,
          flag
        };
      }
    }
  }

  const result: MindraySampleResult = {
    id: `RES_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    sampleId,
    patientId: patientId || undefined,
    patientName: patientName || undefined,
    timestamp: formatHL7TimestampToIso(timestampStr),
    analyzerModel: 'BC-5480',
    serialNumber,
    protocol: 'HL7_MLLP',
    rawMessage: payload,
    parameters,
    flags: Array.from(new Set(flags)),
    histogramDataAvailable: payload.includes('EDD') || payload.includes('HISTOGRAM')
  };

  // Generate standard HL7 ACK message with CR on every line
  const hl7Ack = [
    `MSH|^~\\&|${receivingApp || 'LIS'}|${receivingFacility || 'LAB'}|${sendingApp || 'BC-5480'}|${sendingFacility || 'MINDRAY'}|${nowHL7}||ACK^R01|${msgControlId}|P|2.3.1|`,
    `MSA|AA|${msgControlId}|Message received successfully|`
  ].join('\r') + '\r';

  const ackWrapped = wrapMLLP(hl7Ack);
  result.ackMessage = hl7Ack;

  return {
    result,
    ackMessage: ackWrapped,
    msgControlId,
    msgType
  };
}

/**
 * Format HL7 YYYYMMDDHHMMSS timestamp to readable ISO string
 */
function formatHL7TimestampToIso(hl7Ts: string): string {
  if (!hl7Ts || hl7Ts.length < 8) return new Date().toISOString();
  const yr = hl7Ts.substring(0, 4);
  const mo = hl7Ts.substring(4, 6);
  const dy = hl7Ts.substring(6, 8);
  const hr = hl7Ts.length >= 10 ? hl7Ts.substring(8, 10) : '00';
  const mn = hl7Ts.length >= 12 ? hl7Ts.substring(10, 12) : '00';
  const sc = hl7Ts.length >= 14 ? hl7Ts.substring(12, 14) : '00';
  return `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}.000Z`;
}

function formatIsoToHL7Timestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yr = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const dy = pad(date.getDate());
  const hr = pad(date.getHours());
  const mn = pad(date.getMinutes());
  const sc = pad(date.getSeconds());
  return `${yr}${mo}${dy}${hr}${mn}${sc}`;
}

/**
 * Generate simulated HL7 ORU^R01 sample result from Mindray BC-5480
 */
export function generateSimulatedMindrayHL7(
  sampleId: string = '548001',
  patientId: string = 'P-9874',
  patientName: string = 'Silva^Maria',
  profile: 'NORMAL' | 'ANEMIA' | 'LEUKOCYTOSIS' | 'THROMBOCYTOPENIA' | 'INFECTION_5PART' | 'CUSTOM' = 'NORMAL',
  customValues?: {
    wbc?: number;
    rbc?: number;
    hgb?: number;
    hct?: number;
    mcv?: number;
    plt?: number;
  }
): string {
  const now = new Date();
  const ts = formatIsoToHL7Timestamp(now);
  const msgCtrlId = 'MDR_' + Math.floor(100000 + Math.random() * 900000);

  // Default profile multiplier values
  let wbc = customValues?.wbc ?? 7.2;
  let rbc = customValues?.rbc ?? 4.65;
  let hgb = customValues?.hgb ?? 13.8;
  let hct = customValues?.hct ?? 41.2;
  let mcv = customValues?.mcv ?? 88.6;
  let mch = 29.7;
  let mchc = 33.5;
  let plt = customValues?.plt ?? 245;

  let neuP = 58.5;
  let lymP = 31.2;
  let monP = 6.8;
  let eosP = 2.8;
  let basP = 0.7;

  if (profile === 'ANEMIA') {
    rbc = customValues?.rbc ?? 3.12;
    hgb = customValues?.hgb ?? 8.5;
    hct = customValues?.hct ?? 26.4;
    mcv = customValues?.mcv ?? 74.5;
    mch = 24.1;
    mchc = 30.2;
  } else if (profile === 'LEUKOCYTOSIS' || profile === 'INFECTION_5PART') {
    wbc = customValues?.wbc ?? 18.5;
    neuP = 82.0;
    lymP = 11.2;
    monP = 4.5;
    eosP = 1.8;
    basP = 0.5;
    plt = customValues?.plt ?? 380;
  } else if (profile === 'THROMBOCYTOPENIA') {
    plt = customValues?.plt ?? 42;
  }

  const neuA = Number(((wbc * neuP) / 100).toFixed(2));
  const lymA = Number(((wbc * lymP) / 100).toFixed(2));
  const monA = Number(((wbc * monP) / 100).toFixed(2));
  const eosA = Number(((wbc * eosP) / 100).toFixed(2));
  const basA = Number(((wbc * basP) / 100).toFixed(2));

  const rdwCv = 12.8;
  const rdwSd = 42.1;
  const mpv = 8.9;
  const pdw = 14.5;
  const pct = Number(((plt * mpv) / 10000).toFixed(3));

  const hl7Segments = [
    `MSH|^~\\&|BC-5480|MINDRAY|LIS|LAB|${ts}||ORU^R01|${msgCtrlId}|P|2.3.1|`,
    `PID|1||${patientId}||${patientName}||19880514|F|||Rua do Laboratorio 100^^Sao Paulo^SP||01199999999|||||||||`,
    `PV1|1|O|LAB1||||||||||||||||||||||||||||||||||||||||||`,
    `OBR|1|${sampleId}|${sampleId}|00001^Hemograma Completo 5-Diff^MINDRAY|||${ts}|||||||||||||||${ts}|||F||||||`,
    `OBX|1|NM|6690-2^WBC^LN|1|${wbc}|10^9/L|4.00-10.00|${wbc > 10 ? 'H' : wbc < 4 ? 'L' : 'N'}|||F|||${ts}|`,
    `OBX|2|NM|789-8^RBC^LN|2|${rbc}|10^12/L|3.80-5.80|${rbc < 3.8 ? 'L' : rbc > 5.8 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|3|NM|718-7^HGB^LN|3|${hgb}|g/dL|11.5-17.5|${hgb < 11.5 ? 'L' : hgb > 17.5 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|4|NM|4544-3^HCT^LN|4|${hct}|%|35.0-50.0|${hct < 35 ? 'L' : hct > 50 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|5|NM|787-2^MCV^LN|5|${mcv}|fL|82.0-100.0|${mcv < 82 ? 'L' : mcv > 100 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|6|NM|785-6^MCH^LN|6|${mch}|pg|27.0-34.0|${mch < 27 ? 'L' : mch > 34 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|7|NM|786-4^MCHC^LN|7|${mchc}|g/dL|31.6-35.4|${mchc < 31.6 ? 'L' : mchc > 35.4 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|8|NM|770-8^NEU%^LN|8|${neuP}|%|40.0-70.0|${neuP > 70 ? 'H' : neuP < 40 ? 'L' : 'N'}|||F|||${ts}|`,
    `OBX|9|NM|736-9^LYM%^LN|9|${lymP}|%|20.0-50.0|${lymP > 50 ? 'H' : lymP < 20 ? 'L' : 'N'}|||F|||${ts}|`,
    `OBX|10|NM|5905-5^MON%^LN|10|${monP}|%|3.0-10.0|N|||F|||${ts}|`,
    `OBX|11|NM|713-8^EOS%^LN|11|${eosP}|%|0.5-5.0|N|||F|||${ts}|`,
    `OBX|12|NM|706-2^BAS%^LN|12|${basP}|%|0.0-1.0|N|||F|||${ts}|`,
    `OBX|13|NM|751-8^NEU#^LN|13|${neuA}|10^9/L|2.00-7.00|N|||F|||${ts}|`,
    `OBX|14|NM|731-0^LYM#^LN|14|${lymA}|10^9/L|0.80-4.00|N|||F|||${ts}|`,
    `OBX|15|NM|742-7^MON#^LN|15|${monA}|10^9/L|0.12-1.00|N|||F|||${ts}|`,
    `OBX|16|NM|711-2^EOS#^LN|16|${eosA}|10^9/L|0.02-0.50|N|||F|||${ts}|`,
    `OBX|17|NM|704-7^BAS#^LN|17|${basA}|10^9/L|0.00-0.10|N|||F|||${ts}|`,
    `OBX|18|NM|777-3^PLT^LN|18|${plt}|10^9/L|150-450|${plt < 150 ? 'L' : plt > 450 ? 'H' : 'N'}|||F|||${ts}|`,
    `OBX|19|NM|32623-1^RDW-CV^LN|19|${rdwCv}|%|11.0-16.0|N|||F|||${ts}|`,
    `OBX|20|NM|21000-5^RDW-SD^LN|20|${rdwSd}|fL|35.0-56.0|N|||F|||${ts}|`,
    `OBX|21|NM|32623-2^MPV^LN|21|${mpv}|fL|6.5-11.0|N|||F|||${ts}|`,
    `OBX|22|NM|32623-3^PDW^LN|22|${pdw}|fL|9.0-17.0|N|||F|||${ts}|`,
    `OBX|23|NM|32623-4^PCT^LN|23|${pct}|%|0.108-0.282|N|||F|||${ts}|`
  ];

  const hl7Raw = hl7Segments.join('\r');
  return wrapMLLP(hl7Raw);
}
