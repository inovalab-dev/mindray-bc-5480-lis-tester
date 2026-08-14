export type MaxionProtocol = 'RS232_ASCII' | 'HL7_MLLP' | 'ASTM_1381';

export interface MaxionParam {
  code: string;
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | '';
}

export interface MaxionSampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // "Maxion ISE"
  protocol: MaxionProtocol;
  rawMessage: string;
  parameters: Record<string, MaxionParam>;
  flags: string[];
}

export type MaxionProfile =
  | 'NORMAL'
  | 'HYPONATREMIA'
  | 'HYPERKALEMIA'
  | 'CRITICAL_ICU'
  | 'ACIDOSIS'
  | 'CUSTOM';

export interface MaxionSimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: MaxionProfile;
  protocol: MaxionProtocol;
  customValues?: Record<string, number>;
  selectedParameters?: string[];
}

export function stringToHexMaxion(str: string): string {
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

export function getMaxionProfileParameters(
  profile: MaxionProfile,
  customValues?: Record<string, number>,
  selectedParameters?: string[]
): Record<string, MaxionParam> {
  const defaults: Record<string, MaxionParam> = {
    NA: { code: 'NA', name: 'Sódio (Na+)', value: 140.0, unit: 'mmol/L', referenceRange: '135.0 - 145.0', flag: 'N' },
    K: { code: 'K', name: 'Potássio (K+)', value: 4.20, unit: 'mmol/L', referenceRange: '3.50 - 5.10', flag: 'N' },
    CL: { code: 'CL', name: 'Cloreto (Cl-)', value: 102.0, unit: 'mmol/L', referenceRange: '98.0 - 107.0', flag: 'N' },
    ICA: { code: 'ICA', name: 'Cálcio Iônico (iCa2+)', value: 1.22, unit: 'mmol/L', referenceRange: '1.12 - 1.32', flag: 'N' },
    TCA: { code: 'TCA', name: 'Cálcio Total Estimado', value: 9.50, unit: 'mg/dL', referenceRange: '8.50 - 10.20', flag: 'N' },
    PH: { code: 'PH', name: 'pH Sanguíneo', value: 7.41, unit: '', referenceRange: '7.35 - 7.45', flag: 'N' }
  };

  const params: Record<string, MaxionParam> = JSON.parse(JSON.stringify(defaults));

  if (profile === 'HYPONATREMIA') {
    params.NA.value = 122.0; params.NA.flag = 'L';
    params.K.value = 4.10; params.K.flag = 'N';
    params.CL.value = 90.0; params.CL.flag = 'L';
  } else if (profile === 'HYPERKALEMIA') {
    params.NA.value = 138.0; params.NA.flag = 'N';
    params.K.value = 6.40; params.K.flag = 'H';
    params.CL.value = 104.0; params.CL.flag = 'N';
  } else if (profile === 'CRITICAL_ICU') {
    params.NA.value = 154.0; params.NA.flag = 'H';
    params.K.value = 2.90; params.K.flag = 'L';
    params.CL.value = 118.0; params.CL.flag = 'H';
    params.ICA.value = 0.95; params.ICA.flag = 'L';
    params.PH.value = 7.18; params.PH.flag = 'L';
  } else if (profile === 'ACIDOSIS') {
    params.PH.value = 7.22; params.PH.flag = 'L';
    params.K.value = 5.60; params.K.flag = 'H';
    params.ICA.value = 1.38; params.ICA.flag = 'H';
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
    const filtered: Record<string, MaxionParam> = {};
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

// Generate Maxion Raw Message (Serial ASCII Text / HL7 / ASTM)
export function generateMaxionMessage(config: MaxionSimulationConfig): {
  raw: string;
  protocol: MaxionProtocol;
} {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const hl7DateStr = dateStr.replace(/-/g, '') + timeStr.replace(/:/g, '');

  const sid = config.sampleId || 'MAX-001';
  const pid = config.patientId || 'P-1001';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^Maxion';

  const params = getMaxionProfileParameters(config.profile, config.customValues, config.selectedParameters);

  if (config.protocol === 'HL7_MLLP') {
    const msgId = Math.floor(100000 + Math.random() * 900000).toString();
    const segments: string[] = [
      `MSH|^~\\&|MAXION-ISE|LAB|LIS|LAB|${hl7DateStr}||ORU^R01|${msgId}|P|2.3.1`,
      `PID|1||${pid}^^^LIS||${pname}||19880512|M`,
      `PV1|1|O`,
      `ORC|RE|${sid}|${sid}||IP|`,
      `OBR|1|${sid}|${sid}|ELET|Eletrólitos ISE^99MAX|||${hl7DateStr}|||||O`
    ];

    let obxIdx = 1;
    Object.values(params).forEach(p => {
      segments.push(
        `OBX|${obxIdx}|NM|${p.code}^${p.name}^99MAX||${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}|||F`
      );
      obxIdx++;
    });

    const rawHL7 = `\x0b${segments.join('\r')}\r\x1c\x0d`;
    return { raw: rawHL7, protocol: 'HL7_MLLP' };
  }

  if (config.protocol === 'ASTM_1381') {
    const lines: string[] = [
      `H|\\^&|||MAXION-ISE^1.0|||||||P|1|${hl7DateStr}`,
      `P|1||${pid}||${pname}`,
      `O|1|${sid}||^^^ELET|R||${hl7DateStr}||||N`
    ];

    let rIdx = 1;
    Object.values(params).forEach(p => {
      lines.push(`R|${rIdx}|^^^${p.code}^|${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}||F`);
      rIdx++;
    });
    lines.push('L|1|N');

    return { raw: lines.join('\r\n') + '\r\n', protocol: 'ASTM_1381' };
  }

  // Standard Maxion RS-232 Serial Printer Output (ASCII Text Frame)
  const asciiLines: string[] = [
    `========================================`,
    `      ANALISADOR DE ELETRÓLITOS MAXION  `,
    `========================================`,
    `DATA: ${dateStr}   HORA: ${timeStr}`,
    `AMOSTRA ID: ${sid}`,
    `PATIENT ID: ${pid}`,
    `PACIENTE:   ${pname.replace(/\^/g, ' ')}`,
    `----------------------------------------`,
    `PARAM.    RESULTADO     UNIDADE    REF. `,
    `----------------------------------------`,
    `Na+     : ${params.NA.value.toString().padStart(6)}      ${params.NA.unit}    135-145  ${params.NA.flag && params.NA.flag !== 'N' ? '[' + params.NA.flag + ']' : ''}`,
    `K+      : ${params.K.value.toString().padStart(6)}      ${params.K.unit}    3.5-5.1  ${params.K.flag && params.K.flag !== 'N' ? '[' + params.K.flag + ']' : ''}`,
    `Cl-     : ${params.CL.value.toString().padStart(6)}      ${params.CL.unit}    98-107   ${params.CL.flag && params.CL.flag !== 'N' ? '[' + params.CL.flag + ']' : ''}`,
    `iCa2+   : ${params.ICA.value.toString().padStart(6)}      ${params.ICA.unit}  1.12-1.32 ${params.ICA.flag && params.ICA.flag !== 'N' ? '[' + params.ICA.flag + ']' : ''}`,
    `tCa     : ${params.TCA.value.toString().padStart(6)}      ${params.TCA.unit}   8.5-10.2  ${params.TCA.flag && params.TCA.flag !== 'N' ? '[' + params.TCA.flag + ']' : ''}`,
    `pH      : ${params.PH.value.toString().padStart(6)}               7.35-7.45 ${params.PH.flag && params.PH.flag !== 'N' ? '[' + params.PH.flag + ']' : ''}`,
    `----------------------------------------`,
    `STATUS: OK / TEST COMPLETE`,
    `========================================\r\n`
  ];

  return { raw: asciiLines.join('\r\n'), protocol: 'RS232_ASCII' };
}

// Parser for Maxion Raw Output
export function parseMaxionRawMessage(rawText: string): {
  result?: MaxionSampleResult;
  error?: string;
} {
  try {
    if (!rawText || !rawText.trim()) {
      return { error: 'Mensagem Maxion vazia.' };
    }

    const cleanMsg = rawText.replace(/^\x0b/, '').replace(/\x1c\x0d$/, '');
    const lines = cleanMsg.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

    let sampleId = '';
    let patientId = '';
    let patientName = '';
    const parameters: Record<string, MaxionParam> = {};
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
          const valStr = fields[5] || '0';
          const unit = fields[6] || '';
          const refRange = fields[7] || '';
          const flagStr = (fields[8] || '').trim();

          const numVal = parseFloat(valStr);
          const val = isNaN(numVal) ? valStr : numVal;
          let flag: MaxionParam['flag'] = '';
          if (flagStr === 'H') flag = 'H';
          else if (flagStr === 'L') flag = 'L';

          if (flag) flags.push(`${code}: ${val} (${flag})`);

          parameters[code] = { code, name, value: val, unit, referenceRange: refRange, flag };
        }
      });
      if (!sampleId) sampleId = `MAX_${Date.now().toString().slice(-5)}`;

      return {
        result: {
          id: `MAX_RES_${Date.now()}`,
          sampleId,
          patientId,
          patientName,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          analyzerModel: 'Maxion ISE',
          protocol: 'HL7_MLLP',
          rawMessage: rawText,
          parameters,
          flags
        }
      };
    }

    // RS-232 ASCII Serial String Parsing
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
      } else if (line.startsWith('Na+') || line.startsWith('K+') || line.startsWith('Cl-') || line.startsWith('iCa2+') || line.startsWith('tCa') || line.startsWith('pH')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const codeRaw = parts[0].trim();
          const rest = parts[1].trim();
          const tokens = rest.split(/\s+/);
          const valStr = tokens[0] || '0';
          const unitStr = tokens[1] || '';
          const refStr = tokens[2] || '';
          const flagToken = tokens[3] || '';

          let code = 'NA';
          let name = 'Sódio (Na+)';
          if (codeRaw.includes('Na+')) { code = 'NA'; name = 'Sódio (Na+)'; }
          else if (codeRaw.includes('K+')) { code = 'K'; name = 'Potássio (K+)'; }
          else if (codeRaw.includes('Cl-')) { code = 'CL'; name = 'Cloreto (Cl-)'; }
          else if (codeRaw.includes('iCa')) { code = 'ICA'; name = 'Cálcio Iônico (iCa2+)'; }
          else if (codeRaw.includes('tCa')) { code = 'TCA'; name = 'Cálcio Total Estimado'; }
          else if (codeRaw.includes('pH')) { code = 'PH'; name = 'pH Sanguíneo'; }

          const numVal = parseFloat(valStr);
          const val = isNaN(numVal) ? valStr : numVal;
          let flag: MaxionParam['flag'] = '';
          if (flagToken.includes('[H]')) flag = 'H';
          if (flagToken.includes('[L]')) flag = 'L';

          if (flag) flags.push(`${code}: ${val} (${flag})`);

          parameters[code] = {
            code,
            name,
            value: val,
            unit: unitStr,
            referenceRange: refStr,
            flag
          };
        }
      }
    });

    if (!sampleId) sampleId = `MAX_${Date.now().toString().slice(-5)}`;

    return {
      result: {
        id: `MAX_RES_${Date.now()}`,
        sampleId,
        patientId,
        patientName,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        analyzerModel: 'Maxion ISE',
        protocol: 'RS232_ASCII',
        rawMessage: rawText,
        parameters,
        flags
      }
    };

  } catch (err: any) {
    return { error: `Erro ao decodificar resultado Maxion: ${err.message}` };
  }
}
