import { CodeMapping } from '../types';
import { translateLisToEquipmentCode } from './deParaService';

export type UritProtocol = 'HL7_MLLP' | 'ASTM_1381';

export interface UritParam {
  code: string;
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | '';
}

export interface UritSampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // "URIT-8021A"
  protocol: UritProtocol;
  rawMessage: string;
  ackMessage?: string;
  parameters: Record<string, UritParam>;
  flags: string[];
  profileName?: string;
}

export type UritProfile = 'CHECKUP_NORMAL' | 'DIABETES_LIPIDS' | 'HEPATIC' | 'RENAL' | 'CARDIAC' | 'CUSTOM';

export interface UritSimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: UritProfile;
  protocol: UritProtocol;
  customValues?: Record<string, number>;
  selectedParameters?: string[];
  sampleMode?: string;
}

// Convert string to HEX representation
export function stringToHex(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 0x0b) hex += '<VT> ';
    else if (code === 0x1c) hex += '<FS> ';
    else if (code === 0x0d) hex += '<CR> ';
    else if (code === 0x0a) hex += '<LF> ';
    else if (code === 0x05) hex += '<ENQ> ';
    else if (code === 0x06) hex += '<ACK> ';
    else if (code === 0x04) hex += '<EOT> ';
    else if (code === 0x02) hex += '<STX> ';
    else if (code === 0x03) hex += '<ETX> ';
    else {
      hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
  }
  return hex.trim();
}

// HL7 MLLP wrappers (\x0b + message + \x1c\x0d)
export function wrapMLLP(msg: string): string {
  return `\x0b${msg}\x1c\x0d`;
}

export function unwrapMLLP(msg: string): string {
  return msg.replace(/^\x0b/, '').replace(/\x1c\x0d$/, '').replace(/\x1c$/, '');
}

// ASTM 1394-97 frame checksum calculation
export function calculateAstmChecksum(frame: string): string {
  let sum = 0;
  for (let i = 0; i < frame.length; i++) {
    sum = (sum + frame.charCodeAt(i)) & 0xFF;
  }
  return sum.toString(16).padStart(2, '0').toUpperCase();
}

// Generator for URIT biochemistry & hematology parameters based on clinical profile
export function getUritProfileParameters(
  profile: UritProfile,
  customValues?: Record<string, number>,
  selectedParameters?: string[]
): Record<string, UritParam> {
  const defaults: Record<string, UritParam> = {
    // Exames do Sistema URIT-8021A Hypervisor (Bioquímica)
    AUR: { code: 'AUR', name: 'Ácido Úrico', value: 5.1, unit: 'mg/dL', referenceRange: '2.5 - 7.0', flag: 'N' },
    ALB: { code: 'ALB', name: 'Albumina', value: 4.3, unit: 'g/dL', referenceRange: '3.5 - 5.2', flag: 'N' },
    'TGP/ALT': { code: 'TGP/ALT', name: 'TGP / ALT', value: 24.0, unit: 'U/L', referenceRange: '0.0 - 41.0', flag: 'N' },
    ALT: { code: 'TGP/ALT', name: 'TGP / ALT', value: 24.0, unit: 'U/L', referenceRange: '0.0 - 41.0', flag: 'N' },
    AMIL: { code: 'AMIL', name: 'Amilase', value: 62.0, unit: 'U/L', referenceRange: '28.0 - 100.0', flag: 'N' },
    FR: { code: 'FR', name: 'Fator Reumatoide', value: 12.0, unit: 'IU/mL', referenceRange: '0.0 - 20.0', flag: 'N' },
    ASLO: { code: 'ASLO', name: 'Antiestreptolisina O', value: 110.0, unit: 'IU/mL', referenceRange: '0.0 - 200.0', flag: 'N' },
    'TGO/AST': { code: 'TGO/AST', name: 'TGO / AST', value: 22.0, unit: 'U/L', referenceRange: '0.0 - 37.0', flag: 'N' },
    AST: { code: 'TGO/AST', name: 'TGO / AST', value: 22.0, unit: 'U/L', referenceRange: '0.0 - 37.0', flag: 'N' },
    BD: { code: 'BD', name: 'Bilirrubina Direta', value: 0.18, unit: 'mg/dL', referenceRange: '0.00 - 0.30', flag: 'N' },
    BT: { code: 'BT', name: 'Bilirrubina Total', value: 0.65, unit: 'mg/dL', referenceRange: '0.20 - 1.20', flag: 'N' },
    CKNAC117: { code: 'CKNAC117', name: 'CK-NAC (1:17)', value: 115.0, unit: 'U/L', referenceRange: '24.0 - 195.0', flag: 'N' },
    CKNAC: { code: 'CKNAC', name: 'CK-NAC Total', value: 115.0, unit: 'U/L', referenceRange: '24.0 - 195.0', flag: 'N' },
    CKMB: { code: 'CKMB', name: 'CK-MB', value: 14.0, unit: 'U/L', referenceRange: '< 25.0', flag: 'N' },
    'CALC.ARS': { code: 'CALC.ARS', name: 'Cálcio Arsenazo', value: 9.6, unit: 'mg/dL', referenceRange: '8.5 - 10.2', flag: 'N' },
    COL: { code: 'COL', name: 'Colesterol Total', value: 172.0, unit: 'mg/dL', referenceRange: '< 200.0', flag: 'N' },
    CREAT110: { code: 'CREAT110', name: 'Creatinina (1:10)', value: 0.92, unit: 'mg/dL', referenceRange: '0.60 - 1.20', flag: 'N' },
    CREA: { code: 'CREAT110', name: 'Creatinina (1:10)', value: 0.92, unit: 'mg/dL', referenceRange: '0.60 - 1.20', flag: 'N' },
    GLI: { code: 'GLI', name: 'Glicose', value: 88.5, unit: 'mg/dL', referenceRange: '70.0 - 99.0', flag: 'N' },
    GLU: { code: 'GLI', name: 'Glicose', value: 88.5, unit: 'mg/dL', referenceRange: '70.0 - 99.0', flag: 'N' },
    FERRO: { code: 'FERRO', name: 'Ferro Sérico', value: 95.0, unit: 'ug/dL', referenceRange: '50.0 - 170.0', flag: 'N' },
    FAL: { code: 'FAL', name: 'Fosfatase Alcalina', value: 72.0, unit: 'U/L', referenceRange: '40.0 - 129.0', flag: 'N' },
    FIT: { code: 'FIT', name: 'Fator Fit', value: 1.05, unit: 'ratio', referenceRange: '0.80 - 1.20', flag: 'N' },
    FOSF: { code: 'FOSF', name: 'Fósforo', value: 3.4, unit: 'mg/dL', referenceRange: '2.5 - 4.5', flag: 'N' },
    GGT: { code: 'GGT', name: 'Gama GT', value: 26.0, unit: 'U/L', referenceRange: '8.0 - 61.0', flag: 'N' },
    HDL: { code: 'HDL', name: 'HDL Colesterol', value: 54.0, unit: 'mg/dL', referenceRange: '> 40.0', flag: 'N' },
    LDH: { code: 'LDH', name: 'Desidrogenase Lática', value: 185.0, unit: 'U/L', referenceRange: '120.0 - 246.0', flag: 'N' },
    LIPASE: { code: 'LIPASE', name: 'Lipase', value: 32.0, unit: 'U/L', referenceRange: '13.0 - 60.0', flag: 'N' },
    MAG: { code: 'MAG', name: 'Magnésio', value: 2.1, unit: 'mg/dL', referenceRange: '1.7 - 2.5', flag: 'N' },
    PCR: { code: 'PCR', name: 'Proteína C-Reativa', value: 1.8, unit: 'mg/L', referenceRange: '0.0 - 5.0', flag: 'N' },
    PTT: { code: 'PTT', name: 'Proteínas Totais', value: 7.2, unit: 'g/dL', referenceRange: '6.4 - 8.3', flag: 'N' },
    TRI: { code: 'TRI', name: 'Triglicérides', value: 118.0, unit: 'mg/dL', referenceRange: '< 150.0', flag: 'N' },
    UREIA: { code: 'UREIA', name: 'Ureia', value: 32.0, unit: 'mg/dL', referenceRange: '15.0 - 45.0', flag: 'N' },
    NA: { code: 'NA', name: 'Sódio (Na+)', value: 141.0, unit: 'mEq/L', referenceRange: '135.0 - 145.0', flag: 'N' },
    K: { code: 'K', name: 'Potássio (K+)', value: 4.25, unit: 'mEq/L', referenceRange: '3.50 - 5.10', flag: 'N' },
    CL: { code: 'CL', name: 'Cloreto (Cl-)', value: 101.0, unit: 'mEq/L', referenceRange: '98.0 - 107.0', flag: 'N' }
  };

  const params: Record<string, UritParam> = JSON.parse(JSON.stringify(defaults));

  if (profile === 'DIABETES_LIPIDS') {
    params.GLI.value = 215.0; params.GLI.flag = 'H';
    params.TRI.value = 345.0; params.TRI.flag = 'H';
    params.COL.value = 248.0; params.COL.flag = 'H';
    params.HDL.value = 31.0; params.HDL.flag = 'L';
    params.AUR.value = 8.2; params.AUR.flag = 'H';
  } else if (profile === 'HEPATIC') {
    params['TGP/ALT'].value = 285.0; params['TGP/ALT'].flag = 'H';
    params['TGO/AST'].value = 310.0; params['TGO/AST'].flag = 'H';
    params.GGT.value = 245.0; params.GGT.flag = 'H';
    params.FAL.value = 220.0; params.FAL.flag = 'H';
    params.BT.value = 3.9; params.BT.flag = 'H';
    params.BD.value = 2.2; params.BD.flag = 'H';
    params.ALB.value = 2.7; params.ALB.flag = 'L';
  } else if (profile === 'RENAL') {
    params.CREAT110.value = 4.85; params.CREAT110.flag = 'H';
    params.UREIA.value = 148.0; params.UREIA.flag = 'H';
    params.AUR.value = 11.4; params.AUR.flag = 'H';
    params.K.value = 5.85; params.K.flag = 'H';
    params.NA.value = 131.0; params.NA.flag = 'L';
    params['CALC.ARS'].value = 7.8; params['CALC.ARS'].flag = 'L';
  } else if (profile === 'CARDIAC') {
    params.CKNAC.value = 480.0; params.CKNAC.flag = 'H';
    params.CKMB.value = 62.0; params.CKMB.flag = 'H';
    params['TGO/AST'].value = 88.0; params['TGO/AST'].flag = 'H';
  }

  if (customValues) {
    Object.keys(customValues).forEach(key => {
      const upperKey = key.toUpperCase();
      if (params[upperKey]) {
        params[upperKey].value = customValues[key];
      }
    });
  }

  // Filter if selectedParameters array is provided and not empty
  if (selectedParameters && selectedParameters.length > 0) {
    const filtered: Record<string, UritParam> = {};
    const uppercaseSelected = new Set(selectedParameters.map(s => s.toUpperCase()));
    
    // Add alias checks for common variations
    Object.keys(params).forEach(key => {
      const upperKey = key.toUpperCase();
      let matched = uppercaseSelected.has(upperKey);
      if (!matched) {
        // Alias maps
        if (upperKey === 'TGP/ALT' && uppercaseSelected.has('ALT')) matched = true;
        if (upperKey === 'TGO/AST' && uppercaseSelected.has('AST')) matched = true;
        if (upperKey === 'GLI' && uppercaseSelected.has('GLU')) matched = true;
        if (upperKey === 'CREAT110' && uppercaseSelected.has('CREA')) matched = true;
        if (upperKey === 'CALC.ARS' && uppercaseSelected.has('CA')) matched = true;
        if (upperKey === 'PTT' && uppercaseSelected.has('TP')) matched = true;
        if (upperKey === 'AUR' && uppercaseSelected.has('UA')) matched = true;
      }
      if (matched && !filtered[key]) {
        filtered[key] = params[key];
      }
    });
    return filtered;
  }

  return params;
}

// Generate URIT 8021A HL7 Message (ORU^R01)
export function generateUritHL7Message(config: UritSimulationConfig): { raw: string; mllpWrapped: string } {
  const now = new Date();
  const formatHL7Date = (d: Date) => {
    return d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, '0') +
      d.getDate().toString().padStart(2, '0') +
      d.getHours().toString().padStart(2, '0') +
      d.getMinutes().toString().padStart(2, '0') +
      d.getSeconds().toString().padStart(2, '0');
  };

  const timeStr = formatHL7Date(now);
  const msgId = Math.floor(100000 + Math.random() * 900000).toString();
  const sid = config.sampleId || '10001';
  const pid = config.patientId || 'P-1001';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^Teste';
  const modeStr = config.sampleMode || 'AL-WB';

  const params = getUritProfileParameters(config.profile, config.customValues, config.selectedParameters);

  const segments: string[] = [
    `MSH|^~\\&|URIT-8021A|URIT|LIS|LAB|${timeStr}||ORU^R01|${msgId}|P|2.3.1||||||UNICODE`,
    `PID|1||${pid}^^^LIS||${pname}||19900101|F|||^^^^^^BR`,
    `PV1|1|O`,
    `ORC|RE|${sid}|${sid}||IP|`,
    `OBR|1|${sid}|${sid}|${modeStr}^CBC+DIFF^99URT|||${timeStr}|||||O|||${timeStr}|||||||||BIOQ|`
  ];

  let obxIdx = 1;
  Object.values(params).forEach(p => {
    segments.push(
      `OBX|${obxIdx}|NM|${p.code}^${p.name}^99URT||${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}|||F`
    );
    obxIdx++;
  });

  const raw = segments.join('\r') + '\r';
  const mllpWrapped = wrapMLLP(raw);

  return { raw, mllpWrapped };
}

// Generate URIT 8021A ASTM 1394-97 Message Frames
export function generateUritAstmMessage(config: UritSimulationConfig): { raw: string; frames: string[] } {
  const now = new Date();
  const formatAstmDate = (d: Date) => {
    return d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, '0') +
      d.getDate().toString().padStart(2, '0') +
      d.getHours().toString().padStart(2, '0') +
      d.getMinutes().toString().padStart(2, '0') +
      d.getSeconds().toString().padStart(2, '0');
  };

  const timeStr = formatAstmDate(now);
  const sid = config.sampleId || '10001';
  const pid = config.patientId || 'P-1001';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^Teste';
  const modeStr = config.sampleMode || 'AL-WB';

  const params = getUritProfileParameters(config.profile, config.customValues, config.selectedParameters);

  const lines: string[] = [
    `H|\\^&|||URIT-8021A^1.0.0|||||||P|1|${timeStr}`,
    `P|1||${pid}||${pname}||19900101|F`,
    `O|1|${sid}||^^^${modeStr}|R||${timeStr}||||N||||||||||||O`
  ];

  let rIdx = 1;
  Object.values(params).forEach(p => {
    lines.push(`R|${rIdx}|^^^${p.code}^|${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}||F||||${timeStr}`);
    rIdx++;
  });

  lines.push('L|1|N');

  const raw = lines.join('\r') + '\r';

  // Format as ASTM frames with STX, frame num, payload, ETX/ETB, checksum, CR LF
  const frames: string[] = [];
  lines.forEach((line, idx) => {
    const frameNum = ((idx + 1) % 8).toString();
    const payload = `${frameNum}${line}\r\x03`;
    const checksum = calculateAstmChecksum(payload);
    frames.push(`\x02${payload}${checksum}\r\n`);
  });

  return { raw, frames };
}

// Parse URIT HL7 or ASTM Message
export function parseUritRawMessage(
  rawText: string,
  getWorklistFn?: (sampleId: string) => any,
  customDsrTemplate?: string,
  codeMappings?: CodeMapping[]
): {
  result?: UritSampleResult;
  error?: string;
  ackMessage?: string;
  qckMessage?: string;
  msgType?: string;
  msgControlId?: string;
} {
  try {
    const cleanMsg = unwrapMLLP(rawText);
    const lines = cleanMsg.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      return { error: 'Mensagem vazia recebida.' };
    }

    const firstLine = lines[0];

    // Detect if HL7 or ASTM
    if (firstLine.startsWith('MSH')) {
      return parseUritHL7(lines, rawText, getWorklistFn, customDsrTemplate, codeMappings);
    } else if (firstLine.startsWith('H|') || firstLine.includes('URIT') || firstLine.startsWith('\x021H|') || firstLine.startsWith('Q|')) {
      return parseUritASTM(lines, rawText, getWorklistFn);
    } else {
      // Fallback try HL7 parser
      return parseUritHL7(lines, rawText, getWorklistFn, customDsrTemplate, codeMappings);
    }
  } catch (err: any) {
    return { error: `Erro ao decodificar mensagem URIT-8021A: ${err.message}` };
  }
}

function parseUritHL7(
  lines: string[], 
  rawText: string,
  getWorklistFn?: (sampleId: string) => any,
  customDsrTemplate?: string,
  codeMappings?: CodeMapping[]
): {
  result?: UritSampleResult;
  error?: string;
  ackMessage?: string;
  qckMessage?: string;
  msgType?: string;
  msgControlId?: string;
} {
  let sampleId = '';
  let patientId = '';
  let patientName = '';
  let msgControlId = '1';
  let sendingApp = 'urit';
  let sendingFacility = '8030';
  let msgType = 'ORU^R01';

  const parameters: Record<string, UritParam> = {};
  const flags: string[] = [];

  // Delimiters
  const msh = lines[0] || '';
  const fieldDelim = msh.charAt(3) || '|';
  const compDelim = msh.charAt(4) || '^';

  let queryTag = 'Q101';
  let qrdDateTime = '';
  let qrdPriority = 'I';
  let qrdQuantity = '1^RD';
  let qrdFilter = 'DEM';

  lines.forEach(line => {
    const fields = line.split(fieldDelim);
    const segType = fields[0];

    if (segType === 'MSH') {
      sendingApp = fields[2] || 'URIT-8021A';
      sendingFacility = fields[3] || 'URIT';
      msgType = fields[8] || fields[7] || 'ORU^R01';
      msgControlId = fields[9] || fields[8] || 'Q101';
    } else if (segType === 'PID') {
      patientId = fields[3] ? fields[3].split(compDelim)[0] : '';
      if (fields[5]) {
        patientName = fields[5].replace(/\^/g, ' ').trim();
      }
    } else if (segType === 'OBR') {
      sampleId = fields[2] || fields[3] || sampleId;
    } else if (segType === 'QRD') {
      // HL7 Query segment: QRD|datetime|format|priority|id|...|quantity|sampleId|filter|...
      if (fields[1]) {
        qrdDateTime = fields[1].trim();
      }
      if (fields[3]) {
        qrdPriority = fields[3].trim();
      }
      if (fields[4]) {
        queryTag = fields[4].trim();
      }
      if (fields[7]) {
        qrdQuantity = fields[7].trim();
      }
      if (fields[9]) {
        qrdFilter = fields[9].trim();
      }
      // Check field 8 first (where URIT sends sample ID or barcode filter)
      if (fields[8]) {
        const candidate = fields[8].split(compDelim)[0].trim();
        if (candidate && candidate !== 'DEM' && candidate !== 'OTH' && candidate !== 'ALL' && candidate !== '1') {
          sampleId = candidate;
        }
      }
      // Fallback check remaining fields
      if (!sampleId) {
        for (let idx = 7; idx < fields.length; idx++) {
          const rawVal = fields[idx].trim();
          const val = rawVal.split(compDelim)[0].trim();
          if (val && val !== 'DEM' && val !== 'OTH' && val !== 'ALL' && val !== '1' && val !== 'RD' && val !== '1^RD' && !rawVal.includes('^RD')) {
            sampleId = val;
            break;
          }
        }
      }
    } else if (segType === 'ORC') {
      for (let idx = 1; idx < fields.length; idx++) {
        const val = fields[idx].split(compDelim)[0].trim();
        if (val && val !== 'RF' && val !== 'AF' && val !== 'IP' && val !== 'OK' && !val.includes('^')) {
          if (!sampleId) sampleId = val;
          break;
        }
      }
    } else if (segType === 'OBX') {
      const testComp = fields[3] ? fields[3].split(compDelim) : [];
      const code = testComp[0] || `PARAM_${fields[1]}`;
      const name = testComp[1] || code;
      const valStr = fields[5] || '0';
      const unit = fields[6] || '';
      const refRange = fields[7] || '';
      const flagStr = (fields[8] || '').trim();

      const numVal = parseFloat(valStr);
      const val = isNaN(numVal) ? valStr : numVal;

      let flag: UritParam['flag'] = '';
      if (flagStr === 'H' || flagStr === 'HH') flag = 'H';
      else if (flagStr === 'L' || flagStr === 'LL') flag = 'L';
      else if (flagStr === 'A') flag = 'A';
      else if (flagStr === 'N') flag = 'N';

      if (flag === 'H' || flag === 'L' || flag === 'A') {
        flags.push(`${code}: ${val} ${unit} (${flagStr})`);
      }

      parameters[code] = {
        code,
        name,
        value: val,
        unit,
        referenceRange: refRange,
        flag
      };
    }
  });

  // Do NOT reply to incoming ACK messages from equipment (ACK^Q03, ACK^R01, etc.)
  const isAck = msgType.toUpperCase().startsWith('ACK') || msgType.toUpperCase().includes('ACK') || rawText.includes('ACK^');
  if (isAck) {
    return {
      msgType,
      msgControlId,
      ackMessage: undefined
    };
  }

  const isQuery = 
    msgType.toUpperCase().includes('QRY') || 
    msgType.toUpperCase().includes('Q02') || 
    rawText.toUpperCase().includes('QRY^Q02') || 
    lines.some(l => l.startsWith('QRD'));

  if (isQuery) {
    if (!sampleId) sampleId = '8021002';
    const wl = getWorklistFn ? getWorklistFn(sampleId) : undefined;
    const finalSid = wl?.sampleId || sampleId;
    const finalPid = wl?.sampleId || finalSid;
    let finalPName = wl?.patientName || `Amostra ${finalSid}`;
    finalPName = finalPName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s^]/g, '').trim();
    if (!finalPName.includes('^')) {
      const parts = finalPName.split(/\s+/);
      if (parts.length >= 2) {
        finalPName = parts.join('^');
      } else {
        finalPName = `Amostra^${finalPName || finalSid}`;
      }
    }

    const uritTestNames: Record<string, string> = {
      'GLI': 'GLICOSE',
      'GLU': 'GLICOSE',
      'UREIA': 'UREIA',
      'UREA': 'UREIA',
      'CREAT110': 'CREATININA',
      'CREAT': 'CREATININA',
      'CREA': 'CREATININA',
      'AUR': 'ÁCIDO ÚRICO',
      'TGP/ALT': 'TGP/ALT',
      'TGP': 'TGP/ALT',
      'ALT': 'TGP/ALT',
      'TGO/AST': 'TGO/AST',
      'TGO': 'TGO/AST',
      'AST': 'TGO/AST',
      'COL': 'COLESTEROL',
      'CHOL': 'COLESTEROL',
      'TRI': 'TRIGLICÉRIDES',
      'TRIG': 'TRIGLICÉRIDES',
      'HDL': 'HDL',
      'NA': 'SÓDIO',
      'K': 'POTÁSSIO',
      'CL': 'CLORETO',
      'ALB': 'ALBUMINA',
      'AMIL': 'AMILASE',
      'FR': 'FATOR REUMATOIDE',
      'ASLO': 'ANTIESTREPTOLISINA O',
      'BD': 'BILIRRUBINA DIRETA',
      'BT': 'BILIRRUBINA TOTAL',
      'CKNAC117': 'CK-NAC 1:17',
      'CKNAC': 'CK-NAC TOTAL',
      'CKMB': 'CK-MB',
      'CALC.ARS': 'CÁLCIO ARSENAZO',
      'FERRO': 'FERRO SÉRICO',
      'FAL': 'FOSFATASE ALCALINA',
      'FIT': 'FATOR FIT',
      'FOSF': 'FÓSFORO',
      'GGT': 'GAMA GT',
      'LDH': 'DESIDROGENASE LÁTICA',
      'LIPASE': 'LIPASE',
      'MAG': 'MAGNÉSIO',
      'PCR': 'PROTEÍNA C-REATIVA',
      'PTT': 'PROTEÍNAS TOTAIS'
    };

    const rawTestCode = wl?.testCode || 'GLI^GLICOSE^L';
    let rawTestList = rawTestCode
      .split(/[,+^~]+/)
      .map(s => s.trim())
      .filter(p => p && p !== '99URT' && p !== '99MRC' && p !== 'Bioquímica Completa' && p !== 'BIOQ' && p !== 'L');

    if (rawTestList.length === 0 && wl?.tests && Array.isArray(wl.tests) && wl.tests.length > 0) {
      rawTestList = wl.tests.map((t: any) => typeof t === 'string' ? t.trim() : (t.codigo || t.code || '')).filter(Boolean);
    }

    if (rawTestList.length === 0) {
      rawTestList = ['GLI'];
    }

    const expandedDspLines: { orderIndex: number; equipmentCode: string }[] = [];

    rawTestList.forEach((test, idx) => {
      const orderIndex = idx + 1;
      const translation = translateLisToEquipmentCode(test, 'URIT', codeMappings);
      if (translation.translatedCodes && translation.translatedCodes.length > 0) {
        translation.translatedCodes.forEach(code => {
          expandedDspLines.push({ orderIndex, equipmentCode: code });
        });
      } else {
        const code = translation.translatedCode || test;
        expandedDspLines.push({ orderIndex, equipmentCode: code });
      }
    });

    if (expandedDspLines.length === 0) {
      expandedDspLines.push({ orderIndex: 1, equipmentCode: 'GLI' });
    }

    const shortTestCode = expandedDspLines[0].equipmentCode;
    let formattedObr4 = expandedDspLines.map(item => `${item.equipmentCode}^${uritTestNames[item.equipmentCode.toUpperCase()] || item.equipmentCode}^L`).join('~');

    const nowHL7 = new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14);
    const todayStr = nowHL7.slice(0, 8);
    const todayStart = `${todayStr}000000`;
    const todayEnd = `${todayStr}235959`;
    const queryTime = qrdDateTime || msgControlId || nowHL7;
    const dateFormatted = `${nowHL7.slice(0,4)}-${nowHL7.slice(4,6)}-${nowHL7.slice(6,8)}`;

    const patientNameSpace = finalPName.replace(/\^/g, ' ');

    let dsrHL7 = '';

    const dspTestLinesArray = expandedDspLines.map((item, idx) => `DSP|${18 + idx}||${item.orderIndex}^${item.equipmentCode}^^^^|||`);
    const dspTestLinesStr = dspTestLinesArray.join('\r');

    if (customDsrTemplate && customDsrTemplate.trim().length > 10) {
      let rendered = customDsrTemplate
        .replace(/\\r/g, '\r')
        .replace(/\{nowHL7\}/g, nowHL7)
        .replace(/\{todayStart\}/g, todayStart)
        .replace(/\{todayEnd\}/g, todayEnd)
        .replace(/\{queryTime\}/g, queryTime)
        .replace(/\{queryTag\}/g, queryTag)
        .replace(/\{msgControlId\}/g, msgControlId)
        .replace(/\{qrdPriority\}/g, qrdPriority)
        .replace(/\{qrdQuantity\}/g, qrdQuantity)
        .replace(/\{qrdFilter\}/g, qrdFilter)
        .replace(/\{sampleId\}/g, finalSid)
        .replace(/\{patientId\}/g, finalPid)
        .replace(/\{patientNameSpace\}/g, patientNameSpace)
        .replace(/\{patientName\}/g, finalPName)
        .replace(/\{testCode\}/g, formattedObr4)
        .replace(/\{shortTestCode\}/g, shortTestCode)
        .replace(/\{sendingApp\}/g, sendingApp)
        .replace(/\{sendingFacility\}/g, sendingFacility)
        .replace(/\{dateFormatted\}/g, dateFormatted)
        .replace(/\{numTests\}/g, String(expandedDspLines.length))
        .replace(/\{dspTestLines\}/g, dspTestLinesStr);

      const cleanLines = rendered.split(/\r\n|\n|\r/).map(s => s.trim()).filter(Boolean);
      dsrHL7 = cleanLines.join('\r') + '\r';
    } else {
      const dsrLines = [
        `MSH|^~\\&|${sendingApp || 'urit'}|${sendingFacility || '8030'}|||${nowHL7}||DSR^Q03|${msgControlId}|P|2.3.1|${finalSid}||0||ASCII|||`,
        `MSA|AA|${msgControlId}|Message accepted|||0|`,
        `ERR|0|`,
        `QAK|SR|OK|`,
        `QRD|${queryTime}|R|D|-1|||RD|${finalSid}|OTH|||T|`,
        `QRF|${sendingFacility || '8030'}|${todayStart}|${todayEnd}|||RCT|COR|ALL||`,
        `DSP|1||${finalSid}|||`,
        `DSP|2||${finalSid}|||`,
        `DSP|3||serum|||`,
        `DSP|4||${patientNameSpace}|||`,
        `DSP|5||F|||`,
        `DSP|6|||||`,
        `DSP|7|||||`,
        `DSP|8|||||`,
        `DSP|9|||||`,
        `DSP|10|||||`,
        `DSP|11|||||`,
        `DSP|12|||||`,
        `DSP|13|||||`,
        `DSP|14|||||`,
        `DSP|15||${dateFormatted}|||`,
        `DSP|16||N|||`,
        `DSP|17||${expandedDspLines.length}|||`,
        ...dspTestLinesArray,
        `DSC|-1|`
      ];
      dsrHL7 = dsrLines.join('\r') + '\r';
    }

    const qckLines = [
      `MSH|^~\\&|LIS|LAB|${sendingApp}|${sendingFacility}|${nowHL7}||QCK^Q02|${msgControlId}|P|2.3.1`,
      `MSA|AA|${msgControlId}|Query Successful`,
      `QAK|${queryTag}|OK|`
    ];
    const qckHL7 = qckLines.join('\r') + '\r';

    return {
      msgType: 'DSR^Q03',
      msgControlId,
      qckMessage: wrapMLLP(qckHL7),
      ackMessage: wrapMLLP(dsrHL7)
    };
  }

  // Matching with worklist if patient details missing
  if (sampleId && (!patientName || patientName === 'N/I')) {
    const wl = getWorklistFn ? getWorklistFn(sampleId) : undefined;
    if (wl) {
      if (wl.patientName) patientName = wl.patientName;
      if (wl.patientId) patientId = wl.patientId;
    }
  }

  if (!sampleId) {
    sampleId = `URIT_${Date.now().toString().slice(-6)}`;
  }

  const result: UritSampleResult = {
    id: `URIT_RES_${Date.now()}`,
    sampleId,
    patientId,
    patientName,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    analyzerModel: sendingApp.includes('URIT') ? sendingApp : 'URIT-8021A',
    protocol: 'HL7_MLLP',
    rawMessage: rawText,
    parameters,
    flags
  };

  const ackRaw = `MSH|^~\\&|LIS|LAB|${sendingApp}|URIT|${new Date().toISOString().replace(/[-T:]/g, '').slice(0, 14)}||ACK^R01|${msgControlId}|P|2.3.1\rMSA|AA|${msgControlId}|Message Accepted\r`;
  const ackMessage = wrapMLLP(ackRaw);

  return { result, ackMessage, msgType, msgControlId };
}

function parseUritASTM(
  lines: string[], 
  rawText: string,
  getWorklistFn?: (sampleId: string) => any
): {
  result?: UritSampleResult;
  error?: string;
  ackMessage?: string;
  msgType?: string;
  msgControlId?: string;
} {
  let sampleId = '';
  let patientId = '';
  let patientName = '';
  let isQuery = false;

  const parameters: Record<string, UritParam> = {};
  const flags: string[] = [];

  lines.forEach(rawLine => {
    // Clean STX, ETX, ETB, frame numbers, checksums if present
    const line = rawLine.replace(/^[\x02\x03\x04\x05\x06\d]+/, '').replace(/[\x03\x0d\x0a\x1c]+.*$/, '');
    const fields = line.split('|');
    const recType = fields[0];

    if (recType === 'Q') {
      isQuery = true;
      // Q|1|^1234||ALL
      const qComp = fields[2] ? fields[2].split('^') : [];
      sampleId = qComp[1] || qComp[0] || fields[2] || '1234';
    } else if (recType === 'P') {
      patientId = fields[2] || '';
      patientName = fields[4] ? fields[4].replace(/\^/g, ' ').trim() : '';
    } else if (recType === 'O') {
      sampleId = fields[2] || fields[3] || sampleId;
    } else if (recType === 'R') {
      const codeComp = fields[2] ? fields[2].split('^') : [];
      const code = codeComp[3] || codeComp[0] || `PARAM_${fields[1]}`;
      const name = codeComp[4] || code;
      const valStr = fields[3] || '0';
      const unit = fields[4] || '';
      const refRange = fields[5] || '';
      const flagStr = (fields[8] || fields[6] || '').trim();

      const numVal = parseFloat(valStr);
      const val = isNaN(numVal) ? valStr : numVal;

      let flag: UritParam['flag'] = '';
      if (flagStr === 'H' || flagStr === 'HH') flag = 'H';
      else if (flagStr === 'L' || flagStr === 'LL') flag = 'L';
      else if (flagStr === 'A') flag = 'A';
      else if (flagStr === 'N') flag = 'N';

      if (flag === 'H' || flag === 'L' || flag === 'A') {
        flags.push(`${code}: ${val} ${unit} (${flagStr})`);
      }

      parameters[code] = {
        code,
        name,
        value: val,
        unit,
        referenceRange: refRange,
        flag
      };
    }
  });

  if (isQuery) {
    if (!sampleId) sampleId = '1234';
    const wl = getWorklistFn ? getWorklistFn(sampleId) : undefined;
    const finalSid = wl?.sampleId || sampleId;
    const finalPid = wl?.patientId || `P-${finalSid}`;
    const finalPName = wl?.patientName || 'Paciente N/I';

    const astmResp = 
      `H|\\^&|||LIS^1||||||P|1|20260725\r` +
      `P|1|${finalPid}|||${finalPName.replace(/\s+/g, '^')}||||||||||\r` +
      `O|1|${finalSid}||^^^BIOQ|||||||N||||||||||||||Q\r` +
      `L|1|N\r`;

    return {
      msgType: 'ASTM_QUERY_RESPONSE',
      msgControlId: '1',
      ackMessage: astmResp
    };
  }

  if (sampleId && (!patientName || patientName === 'N/I')) {
    const wl = getWorklistFn ? getWorklistFn(sampleId) : undefined;
    if (wl) {
      if (wl.patientName) patientName = wl.patientName;
      if (wl.patientId) patientId = wl.patientId;
    }
  }

  if (!sampleId) {
    sampleId = `URIT_${Date.now().toString().slice(-6)}`;
  }

  const result: UritSampleResult = {
    id: `URIT_RES_${Date.now()}`,
    sampleId,
    patientId,
    patientName,
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    analyzerModel: 'URIT-8021A',
    protocol: 'ASTM_1381',
    rawMessage: rawText,
    parameters,
    flags
  };

  const ackMessage = '\x06'; // ACK byte for ASTM

  return { result, ackMessage, msgType: 'ASTM_RESULT', msgControlId: '1' };
}
