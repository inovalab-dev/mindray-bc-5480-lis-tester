export type FinecareProtocol = 'HL7_MLLP' | 'ASTM_1381' | 'RS232_ASCII';

export interface FinecareParam {
  code: string;
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | '';
}

export interface FinecareSampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // "Wondfo Finecare FIA Meter (POCT)"
  protocol: FinecareProtocol;
  rawMessage: string;
  parameters: Record<string, FinecareParam>;
  flags: string[];
}

export type FinecareProfile =
  | 'CARDIAC_EMERGENCY'
  | 'SEPSIS_PCT_CRP'
  | 'DIABETES_HBA1C'
  | 'THYROID_TSH'
  | 'PREGNANCY_HCG'
  | 'CUSTOM';

export interface FinecareSimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: FinecareProfile;
  protocol: FinecareProtocol;
  customValues?: Record<string, number | string>;
  selectedParameters?: string[];
}

export function stringToHexFinecare(str: string): string {
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

export function getFinecareProfileParameters(
  profile: FinecareProfile,
  customValues?: Record<string, number | string>,
  selectedParameters?: string[]
): Record<string, FinecareParam> {
  let defaults: Record<string, FinecareParam> = {};

  if (profile === 'CARDIAC_EMERGENCY') {
    defaults = {
      CTNI: { code: 'CTNI', name: 'Troponina I (cTnI)', value: 2.85, unit: 'ng/mL', referenceRange: '< 0.04', flag: 'H' },
      DDIMER: { code: 'DDIMER', name: 'D-Dímero', value: 1.45, unit: 'mg/L FEU', referenceRange: '< 0.50', flag: 'H' },
      CKMB: { code: 'CKMB', name: 'CK-MB massa', value: 18.2, unit: 'ng/mL', referenceRange: '< 5.0', flag: 'H' },
      MYO: { code: 'MYO', name: 'Mioglobina', value: 142.0, unit: 'ng/mL', referenceRange: '< 70.0', flag: 'H' },
      NTPROBNP: { code: 'NTPROBNP', name: 'NT-proBNP', value: 850.0, unit: 'pg/mL', referenceRange: '< 125.0', flag: 'H' }
    };
  } else if (profile === 'SEPSIS_PCT_CRP') {
    defaults = {
      PCT: { code: 'PCT', name: 'Procalcitonina (PCT)', value: 4.80, unit: 'ng/mL', referenceRange: '< 0.50', flag: 'H' },
      CRP: { code: 'CRP', name: 'Proteína C-Reativa ultrassensível', value: 85.5, unit: 'mg/L', referenceRange: '< 6.0', flag: 'H' },
      SAA: { code: 'SAA', name: 'Amiloide A Sérico', value: 120.0, unit: 'mg/L', referenceRange: '< 10.0', flag: 'H' }
    };
  } else if (profile === 'DIABETES_HBA1C') {
    defaults = {
      HBA1C: { code: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)', value: 8.4, unit: '%', referenceRange: '4.0 - 5.6', flag: 'H' },
      EAG: { code: 'EAG', name: 'Glicose Média Estimada (eAG)', value: 194.0, unit: 'mg/dL', referenceRange: '< 117.0', flag: 'H' },
      MAU: { code: 'MAU', name: 'Microalbumina Urinária', value: 45.0, unit: 'mg/L', referenceRange: '< 20.0', flag: 'H' }
    };
  } else if (profile === 'THYROID_TSH') {
    defaults = {
      TSH: { code: 'TSH', name: 'Hormônio Tireoestimulante (TSH)', value: 6.85, unit: 'uIU/mL', referenceRange: '0.40 - 4.20', flag: 'H' },
      FT4: { code: 'FT4', name: 'T4 Livre', value: 0.72, unit: 'ng/dL', referenceRange: '0.89 - 1.76', flag: 'L' },
      T3: { code: 'T3', name: 'T3 Total', value: 1.10, unit: 'ng/mL', referenceRange: '0.80 - 2.00', flag: 'N' }
    };
  } else if (profile === 'PREGNANCY_HCG') {
    defaults = {
      BHCG: { code: 'BHCG', name: 'Beta-hCG Quantitativo', value: 12450.0, unit: 'mIU/mL', referenceRange: '< 5.0 (Não Grávida)', flag: 'H' },
      PROG: { code: 'PROG', name: 'Progesterona', value: 28.4, unit: 'ng/mL', referenceRange: '11.0 - 44.0 (1º Tri)', flag: 'N' }
    };
  } else {
    // CUSTOM
    defaults = {
      BHCG: { code: 'BHCG', name: 'Beta-hCG Quantitativo', value: 12450.0, unit: 'mIU/mL', referenceRange: '< 5.0', flag: 'H' },
      DDIMER: { code: 'DDIMER', name: 'D-Dímero', value: 1.45, unit: 'mg/L FEU', referenceRange: '< 0.50', flag: 'H' },
      CTNI: { code: 'CTNI', name: 'Troponina I (cTnI)', value: 0.02, unit: 'ng/mL', referenceRange: '< 0.04', flag: 'N' },
      CRP: { code: 'CRP', name: 'Proteína C-Reativa (PCR)', value: 3.2, unit: 'mg/L', referenceRange: '< 6.0', flag: 'N' },
      PCT: { code: 'PCT', name: 'Procalcitonina (PCT)', value: 0.05, unit: 'ng/mL', referenceRange: '< 0.50', flag: 'N' },
      HBA1C: { code: 'HBA1C', name: 'Hemoglobina Glicada (HbA1c)', value: 5.2, unit: '%', referenceRange: '4.0 - 5.6', flag: 'N' }
    };
  }

  const params: Record<string, FinecareParam> = JSON.parse(JSON.stringify(defaults));

  if (customValues) {
    Object.keys(customValues).forEach(key => {
      const upperKey = key.toUpperCase();
      if (params[upperKey]) {
        params[upperKey].value = customValues[key];
      }
    });
  }

  if (selectedParameters && selectedParameters.length > 0) {
    const filtered: Record<string, FinecareParam> = {};
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

export function generateFinecareMessage(config: FinecareSimulationConfig): {
  raw: string;
  protocol: FinecareProtocol;
} {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  const hl7DateStr = dateStr.replace(/-/g, '') + timeStr.replace(/:/g, '');

  const sid = config.sampleId || 'FIN-801';
  const pid = config.patientId || 'P-1092';
  const pname = config.patientName ? config.patientName.trim().replace(/\s+/g, '^') : 'Paciente^Finecare';

  const params = getFinecareProfileParameters(config.profile, config.customValues, config.selectedParameters);

  if (config.protocol === 'HL7_MLLP') {
    const msgId = Math.floor(100000 + Math.random() * 900000).toString();
    const segments: string[] = [
      `MSH|^~\\&|FINECARE_WONDFO|LAB|LIS|LAB|${hl7DateStr}||ORU^R01|${msgId}|P|2.3.1`,
      `PID|1||${pid}^^^LIS||${pname}||19880520|M`,
      `PV1|1|O`,
      `ORC|RE|${sid}|${sid}||IP|`,
      `OBR|1|${sid}|${sid}|POCT|Imunofluorescência^WONDFO|||${hl7DateStr}|||||O`
    ];

    let obxIdx = 1;
    Object.values(params).forEach(p => {
      segments.push(
        `OBX|${obxIdx}|NM|${p.code}^${p.name}^WONDFO||${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}|||F`
      );
      obxIdx++;
    });

    const rawHL7 = `\x0b${segments.join('\r')}\r\x1c\x0d`;
    return { raw: rawHL7, protocol: 'HL7_MLLP' };
  }

  if (config.protocol === 'ASTM_1381') {
    const lines: string[] = [
      `H|\\^&|||FINECARE-WONDFO^3.0|||||||P|1|${hl7DateStr}`,
      `P|1||${pid}||${pname}`,
      `O|1|${sid}||^^^POCT|R||${hl7DateStr}||||N`
    ];

    let rIdx = 1;
    Object.values(params).forEach(p => {
      lines.push(`R|${rIdx}|^^^${p.code}^|${p.value}|${p.unit}|${p.referenceRange || ''}|${p.flag || 'N'}||F`);
      rIdx++;
    });
    lines.push('L|1|N');

    return { raw: lines.join('\r\n') + '\r\n', protocol: 'ASTM_1381' };
  }

  // RS-232 / Print ASCII Output
  const asciiLines: string[] = [
    `========================================`,
    `      WONDFO FINECARE FIA METER (POCT)  `,
    `========================================`,
    `DATA: ${dateStr}   HORA: ${timeStr}`,
    `AMOSTRA ID: ${sid}`,
    `PATIENT ID: ${pid}`,
    `PACIENTE:   ${pname.replace(/\^/g, ' ')}`,
    `----------------------------------------`,
    `TESTE     RESULTADO     UNIDADE    FLAG `,
    `----------------------------------------`
  ];

  Object.values(params).forEach(p => {
    asciiLines.push(
      `${p.code.padEnd(8)}: ${p.value.toString().padStart(8)}      ${p.unit.padEnd(8)} ${p.flag && p.flag !== 'N' ? '[' + p.flag + ']' : ''}`
    );
  });

  asciiLines.push(
    `----------------------------------------`,
    `STATUS: LEITURA POCT CONCLUÍDA / LIS OK`,
    `========================================\r\n`
  );

  return { raw: asciiLines.join('\r\n'), protocol: 'RS232_ASCII' };
}

export function parseFinecareRawMessage(rawText: string): {
  result?: FinecareSampleResult;
  error?: string;
} {
  try {
    if (!rawText || !rawText.trim()) {
      return { error: 'Mensagem Finecare vazia.' };
    }

    const cleanMsg = rawText.replace(/^\x0b/, '').replace(/\x1c\x0d$/, '');
    const lines = cleanMsg.split(/\r\n|\r|\n/).map(l => l.trim()).filter(Boolean);

    let sampleId = '';
    let patientId = '';
    let patientName = '';
    const parameters: Record<string, FinecareParam> = {};
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
          let flag: FinecareParam['flag'] = '';
          if (flagStr === 'H') flag = 'H';
          else if (flagStr === 'L') flag = 'L';

          if (flag) flags.push(`${code}: ${val} (${flag})`);

          parameters[code] = { code, name, value: val, unit, referenceRange: refRange, flag };
        }
      });
      if (!sampleId) sampleId = `FIN_${Date.now().toString().slice(-5)}`;

      return {
        result: {
          id: `FIN_RES_${Date.now()}`,
          sampleId,
          patientId,
          patientName,
          timestamp: new Date().toLocaleTimeString('pt-BR'),
          analyzerModel: 'Wondfo Finecare FIA Meter (POCT)',
          protocol: 'HL7_MLLP',
          rawMessage: rawText,
          parameters,
          flags
        }
      };
    }

    // Parse RS232 / ASCII Serial format
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

        if (['CTNI', 'DDIMER', 'CKMB', 'MYO', 'NTPROBNP', 'PCT', 'CRP', 'SAA', 'HBA1C', 'EAG', 'MAU', 'TSH', 'FT4', 'T3', 'BHCG', 'PROG'].includes(codeRaw.toUpperCase())) {
          const tokens = rest.split(/\s+/);
          const valStr = tokens[0] || '0';
          const unitStr = tokens[1] || '';
          const flagToken = tokens[2] || '';

          const code = codeRaw.toUpperCase();
          const numVal = parseFloat(valStr);
          const val = isNaN(numVal) ? valStr : numVal;

          let flag: FinecareParam['flag'] = '';
          if (flagToken.includes('[H]')) flag = 'H';
          if (flagToken.includes('[L]')) flag = 'L';

          if (flag) flags.push(`${code}: ${val} (${flag})`);

          parameters[code] = {
            code,
            name: code,
            value: val,
            unit: unitStr,
            flag
          };
        }
      }
    });

    if (!sampleId) sampleId = `FIN_${Date.now().toString().slice(-5)}`;

    return {
      result: {
        id: `FIN_RES_${Date.now()}`,
        sampleId,
        patientId,
        patientName,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        analyzerModel: 'Wondfo Finecare FIA Meter (POCT)',
        protocol: 'RS232_ASCII',
        rawMessage: rawText,
        parameters,
        flags
      }
    };

  } catch (err: any) {
    return { error: `Erro ao decodificar resultado Finecare: ${err.message}` };
  }
}
