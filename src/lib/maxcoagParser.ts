export type MaxcoagProtocol = 'RS232_ASCII' | 'HL7_MLLP' | 'ASTM_1381';

export interface MaxcoagParam {
  code: string;
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | '';
}

export interface MaxcoagSampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // "MaxCoag Coagulometer"
  protocol: MaxcoagProtocol;
  rawMessage: string;
  parameters: Record<string, MaxcoagParam>;
  flags: string[];
}

export type MaxcoagProfile =
  | 'NORMAL'
  | 'WARFARIN_HIGH_INR'
  | 'HEPARIN_HIGH_AETPA'
  | 'HYPOFIBRINOGENEMIA'
  | 'CUSTOM';

export interface MaxcoagSimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: MaxcoagProfile;
  protocol: MaxcoagProtocol;
  customValues?: Record<string, number>;
  selectedParameters?: string[];
}

export function stringToHexMaxcoag(str: string): string {
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

export function getMaxcoagProfileParameters(
  profile: MaxcoagProfile,
  customValues?: Record<string, number>,
  selectedParameters?: string[]
): Record<string, MaxcoagParam> {
  const defaults: Record<string, MaxcoagParam> = {
    TP: { code: 'TP', name: 'Tempo de Protrombina (TP)', value: 12.2, unit: 's', referenceRange: '10.0 - 14.0', flag: 'N' },
    INR: { code: 'INR', name: 'R.N.I. (INR)', value: 1.05, unit: '', referenceRange: '0.80 - 1.20', flag: 'N' },
    TTPA: { code: 'TTPA', name: 'Tempo de Tromboplastina (aPTT)', value: 31.5, unit: 's', referenceRange: '25.0 - 35.0', flag: 'N' },
    RATIO_TTPA: { code: 'RATIO_TTPA', name: 'Razão TTPA / R', value: 0.98, unit: '', referenceRange: '0.80 - 1.20', flag: 'N' },
    FIB: { code: 'FIB', name: 'Fibrinogênio', value: 285.0, unit: 'mg/dL', referenceRange: '200.0 - 400.0', flag: 'N' },
    TT: { code: 'TT', name: 'Tempo de Trombina (TT)', value: 16.4, unit: 's', referenceRange: '14.0 - 20.0', flag: 'N' }
  };

  const params: Record<string, MaxcoagParam> = JSON.parse(JSON.stringify(defaults));

  if (profile === 'WARFARIN_HIGH_INR') {
    params.TP.value = 32.8; params.TP.flag = 'H';
    params.INR.value = 3.25; params.INR.flag = 'H';
    params.TTPA.value = 38.0; params.TTPA.flag = 'H';
    params.RATIO_TTPA.value = 1.18; params.RATIO_TTPA.flag = 'N';
  } else if (profile === 'HEPARIN_HIGH_AETPA') {
    params.TTPA.value = 78.5; params.TTPA.flag = 'H';
    params.RATIO_TTPA.value = 2.45; params.RATIO_TTPA.flag = 'H';
    params.TT.value = 28.2; params.TT.flag = 'H';
  } else if (profile === 'HYPOFIBRINOGENEMIA') {
    params.FIB.value = 85.0; params.FIB.flag = 'L';
    params.TP.value = 18.5; params.TP.flag = 'H';
    params.INR.value = 1.62; params.INR.flag = 'H';
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
    const filtered: Record<string, MaxcoagParam> = {};
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

export function generateMaxcoagMessage(config: MaxcoagSimulationConfig): {
  raw: string;
  protocol: MaxcoagProtocol;
} {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const hl7DateStr = dateStr.replace(/-/g, '') + timeStr.replace(/:/g, '');

  const sid = config.sampleId || 'COG-501';
  const pid = config.patientId || 'P-4011';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^MaxCoag';

  const params = getMaxcoagProfileParameters(config.profile, config.customValues, config.selectedParameters);

  if (config.protocol === 'HL7_MLLP') {
    const msgId = Math.floor(100000 + Math.random() * 900000).toString();
    const segments: string[] = [
      `MSH|^~\\&|MAXCOAG|LAB|LIS|LAB|${hl7DateStr}||ORU^R01|${msgId}|P|2.3.1`,
      `PID|1||${pid}^^^LIS||${pname}||19791104|F`,
      `PV1|1|O`,
      `ORC|RE|${sid}|${sid}||IP|`,
      `OBR|1|${sid}|${sid}|COAG|Coagulograma^99COG|||${hl7DateStr}|||||O`
    ];

    let obxIdx = 1;
    Object.values(params).forEach(p => {
      segments.push(
        `OBX|${obxIdx}|NM|${p.code}^${p.name}^99COG||${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}|||F`
      );
      obxIdx++;
    });

    const rawHL7 = `\x0b${segments.join('\r')}\r\x1c\x0d`;
    return { raw: rawHL7, protocol: 'HL7_MLLP' };
  }

  if (config.protocol === 'ASTM_1381') {
    const lines: string[] = [
      `H|\\^&|||MAXCOAG^2.1|||||||P|1|${hl7DateStr}`,
      `P|1||${pid}||${pname}`,
      `O|1|${sid}||^^^COAG|R||${hl7DateStr}||||N`
    ];

    let rIdx = 1;
    Object.values(params).forEach(p => {
      lines.push(`R|${rIdx}|^^^${p.code}^|${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}||F`);
      rIdx++;
    });
    lines.push('L|1|N');

    return { raw: lines.join('\r\n') + '\r\n', protocol: 'ASTM_1381' };
  }

  // RS-232 ASCII Printer / Serial Output Format
  const asciiLines: string[] = [
    `========================================`,
    `      ANALISADOR DE COAGULAÇÃO MAXCOAG  `,
    `========================================`,
    `DATA: ${dateStr}   HORA: ${timeStr}`,
    `AMOSTRA ID: ${sid}`,
    `PATIENT ID: ${pid}`,
    `PACIENTE:   ${pname.replace(/\^/g, ' ')}`,
    `----------------------------------------`,
    `TESTE     RESULTADO     UNIDADE    REF. `,
    `----------------------------------------`,
    `TP (PT) : ${params.TP.value.toString().padStart(6)}      ${params.TP.unit}      10.0-14.0 ${params.TP.flag && params.TP.flag !== 'N' ? '[' + params.TP.flag + ']' : ''}`,
    `I.N.R.  : ${params.INR.value.toString().padStart(6)}               0.80-1.20 ${params.INR.flag && params.INR.flag !== 'N' ? '[' + params.INR.flag + ']' : ''}`,
    `TTPA    : ${params.TTPA.value.toString().padStart(6)}      ${params.TTPA.unit}      25.0-35.0 ${params.TTPA.flag && params.TTPA.flag !== 'N' ? '[' + params.TTPA.flag + ']' : ''}`,
    `R (TTPA): ${params.RATIO_TTPA.value.toString().padStart(6)}               0.80-1.20 ${params.RATIO_TTPA.flag && params.RATIO_TTPA.flag !== 'N' ? '[' + params.RATIO_TTPA.flag + ']' : ''}`,
    `FIB.    : ${params.FIB.value.toString().padStart(6)}      ${params.FIB.unit}  200-400   ${params.FIB.flag && params.FIB.flag !== 'N' ? '[' + params.FIB.flag + ']' : ''}`,
    `TT      : ${params.TT.value.toString().padStart(6)}      ${params.TT.unit}      14.0-20.0 ${params.TT.flag && params.TT.flag !== 'N' ? '[' + params.TT.flag + ']' : ''}`,
    `----------------------------------------`,
    `STATUS: ENSAIO CONCLUÍDO / LIS SENT`,
    `========================================\r\n`
  ];

  return { raw: asciiLines.join('\r\n'), protocol: 'RS232_ASCII' };
}

export function parseMaxcoagRawMessage(rawText: string): {
  result?: MaxcoagSampleResult;
  error?: string;
} {
  try {
    if (!rawText || !rawText.trim()) {
      return { error: 'Mensagem MaxCoag vazia.' };
    }

    const cleanMsg = rawText.replace(/^\x0b/, '').replace(/\x1c\x0d$/, '');
    const lines = cleanMsg.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

    let sampleId = '';
    let patientId = '';
    let patientName = '';
    const parameters: Record<string, MaxcoagParam> = {};
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
          let flag: MaxcoagParam['flag'] = '';
          if (flagStr === 'H') flag = 'H';
          else if (flagStr === 'L') flag = 'L';

          if (flag) flags.push(`${code}: ${val} (${flag})`);

          parameters[code] = { code, name, value: val, unit, referenceRange: refRange, flag };
        }
      });
      if (!sampleId) sampleId = `COG_${Date.now().toString().slice(-5)}`;

      return {
        result: {
          id: `COG_RES_${Date.now()}`,
          sampleId,
          patientId,
          patientName,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          analyzerModel: 'MaxCoag Coagulometer',
          protocol: 'HL7_MLLP',
          rawMessage: rawText,
          parameters,
          flags
        }
      };
    }

    // Parse RS232 ASCII / Print format
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
      } else if (line.startsWith('TP') || line.startsWith('I.N.R.') || line.startsWith('TTPA') || line.startsWith('R (TTPA)') || line.startsWith('FIB') || line.startsWith('TT')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const codeRaw = parts[0].trim();
          const rest = parts[1].trim();
          const tokens = rest.split(/\s+/);
          const valStr = tokens[0] || '0';
          const unitStr = tokens[1] || '';
          const refStr = tokens[2] || '';
          const flagToken = tokens[3] || '';

          let code = 'TP';
          let name = 'Tempo de Protrombina (TP)';
          if (codeRaw.startsWith('TP')) { code = 'TP'; name = 'Tempo de Protrombina (TP)'; }
          else if (codeRaw.includes('I.N.R.')) { code = 'INR'; name = 'R.N.I. (INR)'; }
          else if (codeRaw.startsWith('TTPA')) { code = 'TTPA'; name = 'Tempo de Tromboplastina (aPTT)'; }
          else if (codeRaw.includes('R (TTPA)')) { code = 'RATIO_TTPA'; name = 'Razão TTPA / R'; }
          else if (codeRaw.startsWith('FIB')) { code = 'FIB'; name = 'Fibrinogênio'; }
          else if (codeRaw.startsWith('TT')) { code = 'TT'; name = 'Tempo de Trombina (TT)'; }

          const numVal = parseFloat(valStr);
          const val = isNaN(numVal) ? valStr : numVal;
          let flag: MaxcoagParam['flag'] = '';
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

    if (!sampleId) sampleId = `COG_${Date.now().toString().slice(-5)}`;

    return {
      result: {
        id: `COG_RES_${Date.now()}`,
        sampleId,
        patientId,
        patientName,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        analyzerModel: 'MaxCoag Coagulometer',
        protocol: 'RS232_ASCII',
        rawMessage: rawText,
        parameters,
        flags
      }
    };

  } catch (err: any) {
    return { error: `Erro ao decodificar resultado MaxCoag: ${err.message}` };
  }
}
