export type WamaProtocol = 'RS232_ASCII' | 'HL7_MLLP' | 'ASTM_1381';

export interface WamaParam {
  code: string;
  name: string;
  value: string; // e.g. "Negative", "1+", "100 mg/dL", "6.5", "1.020"
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | '';
}

export interface WamaSampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // "Wama UriRead / Uroanálise"
  protocol: WamaProtocol;
  rawMessage: string;
  parameters: Record<string, WamaParam>;
  flags: string[];
}

export type WamaProfile =
  | 'NORMAL'
  | 'UTI_INFECTION'
  | 'DIABETIC_KETOACIDOSIS'
  | 'PROTEINURIA_RENAL'
  | 'CUSTOM';

export interface WamaSimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: WamaProfile;
  protocol: WamaProtocol;
  customValues?: Record<string, string>;
  selectedParameters?: string[];
}

export function stringToHexWama(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 0x0b) hex += '<VT> ';
    else if (code === 0x1c) hex += '<FS> ';
    else if (code === 0x0d) hex += '<CR> ';
    else if (code === 0x0a) hex += '<LF> ';
    else if (code === 0x02) hex += '<STX> ';
    else if (code === 0x03) hex += '<ETX> ';
    else {
      hex += code.toString(16).padStart(2, '0').toUpperCase() + ' ';
    }
  }
  return hex.trim();
}

export function getWamaProfileParameters(
  profile: WamaProfile,
  customValues?: Record<string, string>,
  selectedParameters?: string[]
): Record<string, WamaParam> {
  const defaults: Record<string, WamaParam> = {
    LEU: { code: 'LEU', name: 'Leucócitos (LEU)', value: 'Negativo', unit: 'cells/uL', referenceRange: 'Negativo', flag: 'N' },
    NIT: { code: 'NIT', name: 'Nitrito (NIT)', value: 'Negativo', unit: '', referenceRange: 'Negativo', flag: 'N' },
    URO: { code: 'URO', name: 'Urobilinogênio (URO)', value: 'Normal', unit: 'umol/L', referenceRange: 'Normal', flag: 'N' },
    PRO: { code: 'PRO', name: 'Proteínas (PRO)', value: 'Negativo', unit: 'mg/dL', referenceRange: 'Negativo', flag: 'N' },
    PH:  { code: 'PH',  name: 'pH Uro', value: '6.0', unit: '', referenceRange: '5.0 - 7.0', flag: 'N' },
    BLD: { code: 'BLD', name: 'Sangue / Hemoglobina (BLD)', value: 'Negativo', unit: 'Ery/uL', referenceRange: 'Negativo', flag: 'N' },
    SG:  { code: 'SG',  name: 'Densidade (SG)', value: '1.015', unit: '', referenceRange: '1.005 - 1.030', flag: 'N' },
    KET: { code: 'KET', name: 'Cetonas (KET)', value: 'Negativo', unit: 'mmol/L', referenceRange: 'Negativo', flag: 'N' },
    BIL: { code: 'BIL', name: 'Bilirrubina (BIL)', value: 'Negativo', unit: 'umol/L', referenceRange: 'Negativo', flag: 'N' },
    GLU: { code: 'GLU', name: 'Glicose (GLU)', value: 'Negativo', unit: 'mmol/L', referenceRange: 'Negativo', flag: 'N' },
    VC:  { code: 'VC',  name: 'Ácido Ascórbico (Vit C)', value: 'Negativo', unit: 'mmol/L', referenceRange: 'Negativo', flag: 'N' }
  };

  const params: Record<string, WamaParam> = JSON.parse(JSON.stringify(defaults));

  if (profile === 'UTI_INFECTION') {
    params.LEU.value = '3+ (500 leu/uL)'; params.LEU.flag = 'H';
    params.NIT.value = 'Positivo'; params.NIT.flag = 'H';
    params.BLD.value = '2+ (50 Ery/uL)'; params.BLD.flag = 'H';
    params.PRO.value = '1+ (30 mg/dL)'; params.PRO.flag = 'H';
    params.PH.value = '7.5'; params.PH.flag = 'H';
  } else if (profile === 'DIABETIC_KETOACIDOSIS') {
    params.GLU.value = '3+ (55 mmol/L)'; params.GLU.flag = 'H';
    params.KET.value = '3+ (8.0 mmol/L)'; params.KET.flag = 'H';
    params.SG.value = '1.035'; params.SG.flag = 'H';
    params.PH.value = '5.0'; params.PH.flag = 'L';
  } else if (profile === 'PROTEINURIA_RENAL') {
    params.PRO.value = '3+ (300 mg/dL)'; params.PRO.flag = 'H';
    params.BLD.value = '1+ (10 Ery/uL)'; params.BLD.flag = 'H';
    params.SG.value = '1.008'; params.SG.flag = 'L';
  }

  if (customValues) {
    Object.keys(customValues).forEach(key => {
      const upperKey = key.toUpperCase();
      if (params[upperKey]) {
        params[upperKey].value = customValues[key];
      }
    });
  }

  if (selectedParameters && selectedParameters.length > 0) {
    const filtered: Record<string, WamaParam> = {};
    const upperSel = new Set(selectedParameters.map(s => s.toUpperCase()));
    Object.keys(params).forEach(k => {
      if (upperSel.has(k.toUpperCase())) {
        filtered[k] = params[k];
      }
    });
    return filtered;
  }

  return params;
}

export function generateWamaMessage(config: WamaSimulationConfig): {
  raw: string;
  protocol: WamaProtocol;
} {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const hl7DateStr = dateStr.replace(/-/g, '') + timeStr.replace(/:/g, '');

  const sid = config.sampleId || 'URI-701';
  const pid = config.patientId || 'P-9011';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^WamaUro';

  const params = getWamaProfileParameters(config.profile, config.customValues, config.selectedParameters);

  if (config.protocol === 'HL7_MLLP') {
    const msgId = Math.floor(100000 + Math.random() * 900000).toString();
    const segments: string[] = [
      `MSH|^~\\&|WAMA-URIREAD|LAB|LIS|LAB|${hl7DateStr}||ORU^R01|${msgId}|P|2.3.1`,
      `PID|1||${pid}^^^LIS||${pname}||19920815|F`,
      `PV1|1|O`,
      `ORC|RE|${sid}|${sid}||IP|`,
      `OBR|1|${sid}|${sid}|URO|Uroanálise Fita^99WAM|||${hl7DateStr}|||||O`
    ];

    let obxIdx = 1;
    Object.values(params).forEach(p => {
      segments.push(
        `OBX|${obxIdx}|ST|${p.code}^${p.name}^99WAM||${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}|||F`
      );
      obxIdx++;
    });

    const rawHL7 = `\x0b${segments.join('\r')}\r\x1c\x0d`;
    return { raw: rawHL7, protocol: 'HL7_MLLP' };
  }

  if (config.protocol === 'ASTM_1381') {
    const lines: string[] = [
      `H|\\^&|||WAMA-URIREAD^1.5|||||||P|1|${hl7DateStr}`,
      `P|1||${pid}||${pname}`,
      `O|1|${sid}||^^^URO|R||${hl7DateStr}||||N`
    ];

    let rIdx = 1;
    Object.values(params).forEach(p => {
      lines.push(`R|${rIdx}|^^^${p.code}^|${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}||F`);
      rIdx++;
    });
    lines.push('L|1|N');

    return { raw: lines.join('\r\n') + '\r\n', protocol: 'ASTM_1381' };
  }

  // Wama RS-232 Printer / Serial Output Format
  const asciiLines: string[] = [
    `========================================`,
    `      LEITOR DE UROANÁLISE WAMA DIAG.   `,
    `========================================`,
    `DATA: ${dateStr}   HORA: ${timeStr}`,
    `AMOSTRA ID: ${sid}`,
    `PATIENT ID: ${pid}`,
    `PACIENTE:   ${pname.replace(/\^/g, ' ')}`,
    `----------------------------------------`,
    `PARAM.     RESULTADO            FLAG    `,
    `----------------------------------------`,
    `LEU     : ${params.LEU.value.padEnd(20)} ${params.LEU.flag && params.LEU.flag !== 'N' ? '[' + params.LEU.flag + ']' : ''}`,
    `NIT     : ${params.NIT.value.padEnd(20)} ${params.NIT.flag && params.NIT.flag !== 'N' ? '[' + params.NIT.flag + ']' : ''}`,
    `URO     : ${params.URO.value.padEnd(20)} ${params.URO.flag && params.URO.flag !== 'N' ? '[' + params.URO.flag + ']' : ''}`,
    `PRO     : ${params.PRO.value.padEnd(20)} ${params.PRO.flag && params.PRO.flag !== 'N' ? '[' + params.PRO.flag + ']' : ''}`,
    `pH      : ${params.PH.value.padEnd(20)} ${params.PH.flag && params.PH.flag !== 'N' ? '[' + params.PH.flag + ']' : ''}`,
    `BLD     : ${params.BLD.value.padEnd(20)} ${params.BLD.flag && params.BLD.flag !== 'N' ? '[' + params.BLD.flag + ']' : ''}`,
    `SG      : ${params.SG.value.padEnd(20)} ${params.SG.flag && params.SG.flag !== 'N' ? '[' + params.SG.flag + ']' : ''}`,
    `KET     : ${params.KET.value.padEnd(20)} ${params.KET.flag && params.KET.flag !== 'N' ? '[' + params.KET.flag + ']' : ''}`,
    `BIL     : ${params.BIL.value.padEnd(20)} ${params.BIL.flag && params.BIL.flag !== 'N' ? '[' + params.BIL.flag + ']' : ''}`,
    `GLU     : ${params.GLU.value.padEnd(20)} ${params.GLU.flag && params.GLU.flag !== 'N' ? '[' + params.GLU.flag + ']' : ''}`,
    `VC      : ${params.VC.value.padEnd(20)} ${params.VC.flag && params.VC.flag !== 'N' ? '[' + params.VC.flag + ']' : ''}`,
    `----------------------------------------`,
    `STATUS: LEITURA CONCLUÍDA / FITA OK`,
    `========================================\r\n`
  ];

  return { raw: asciiLines.join('\r\n'), protocol: 'RS232_ASCII' };
}

export function parseWamaRawMessage(rawText: string): {
  result?: WamaSampleResult;
  error?: string;
} {
  try {
    if (!rawText || !rawText.trim()) {
      return { error: 'Mensagem Wama vazia.' };
    }

    const cleanMsg = rawText.replace(/^\x0b/, '').replace(/\x1c\x0d$/, '');
    const lines = cleanMsg.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

    let sampleId = '';
    let patientId = '';
    let patientName = '';
    const parameters: Record<string, WamaParam> = {};
    const flags: string[] = [];

    // Detect HL7
    if (cleanMsg.includes('MSH') || cleanMsg.includes('OBX')) {
      lines.forEach(line => {
        const fields = line.split('|');
        if (fields[0] === 'PID') {
          patientId = fields[3] ? fields[3].split('^')[0] : '';
          patientName = fields[5] ? fields[5].replace(/\^/g, ' ') : '';
        } else if (fields[0] === 'OBR') {
          sampleId = fields[2] || fields[3] || '';
        } else if (fields[0] === 'OBX') {
          const codeComp = fields[3] ? fields[3].split('^') : [];
          const code = codeComp[0] || `P_${fields[1]}`;
          const name = codeComp[1] || code;
          const valStr = fields[5] || 'Negativo';
          const unit = fields[6] || '';
          const refRange = fields[7] || '';
          const flagStr = (fields[8] || '').trim();

          let flag: WamaParam['flag'] = '';
          if (flagStr === 'H') flag = 'H';
          else if (flagStr === 'L') flag = 'L';

          if (flag) flags.push(`${code}: ${valStr} (${flag})`);

          parameters[code] = { code, name, value: valStr, unit, referenceRange: refRange, flag };
        }
      });
      if (!sampleId) sampleId = `URI_${Date.now().toString().slice(-5)}`;

      return {
        result: {
          id: `URI_RES_${Date.now()}`,
          sampleId,
          patientId,
          patientName,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          analyzerModel: 'Wama UriRead / Uroanálise',
          protocol: 'HL7_MLLP',
          rawMessage: rawText,
          parameters,
          flags
        }
      };
    }

    // Parse RS232 ASCII Serial / Print format
    lines.forEach(line => {
      if (line.includes('AMOSTRA ID:') || line.includes('SAMPLE ID:')) {
        const parts = line.split(':');
        if (parts[1]) sampleId = parts[1].trim();
      } else if (line.includes('PATIENT ID:') || line.includes('PRONTUARIO:')) {
        const parts = line.split(':');
        if (parts[1]) patientId = parts[1].trim();
      } else if (line.includes('PACIENTE:')) {
        const parts = line.split(':');
        if (parts[1]) patientName = parts[1].trim();
      } else if (line.includes(':')) {
        const parts = line.split(':');
        const codeRaw = parts[0].trim();
        const rest = parts[1].trim();

        if (['LEU', 'NIT', 'URO', 'PRO', 'pH', 'BLD', 'SG', 'KET', 'BIL', 'GLU', 'VC'].includes(codeRaw)) {
          const tokens = rest.split(/\s+/);
          const valStr = tokens.slice(0, tokens.length > 1 && tokens[tokens.length - 1].startsWith('[') ? -1 : tokens.length).join(' ');
          const lastToken = tokens[tokens.length - 1] || '';

          let code = codeRaw.toUpperCase();
          if (code === 'PH') code = 'PH';

          let flag: WamaParam['flag'] = '';
          if (lastToken.includes('[H]')) flag = 'H';
          if (lastToken.includes('[L]')) flag = 'L';

          if (flag) flags.push(`${code}: ${valStr} (${flag})`);

          parameters[code] = {
            code,
            name: code,
            value: valStr || 'Negativo',
            unit: '',
            flag
          };
        }
      }
    });

    if (!sampleId) sampleId = `URI_${Date.now().toString().slice(-5)}`;

    return {
      result: {
        id: `URI_RES_${Date.now()}`,
        sampleId,
        patientId,
        patientName,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        analyzerModel: 'Wama UriRead / Uroanálise',
        protocol: 'RS232_ASCII',
        rawMessage: rawText,
        parameters,
        flags
      }
    };

  } catch (err: any) {
    return { error: `Erro ao decodificar resultado Wama: ${err.message}` };
  }
}
