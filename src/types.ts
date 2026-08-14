export type ProtocolType = 'HL7_MLLP' | 'ASTM_1381';

export interface MindrayParam {
  code: string;
  name: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  flag?: 'H' | 'L' | 'N' | 'A' | ''; // High, Low, Normal, Abnormal
}

export interface MindraySampleResult {
  id: string;
  sampleId: string;
  patientId?: string;
  patientName?: string;
  timestamp: string;
  analyzerModel: string; // e.g. "BC-5480"
  serialNumber?: string;
  protocol: ProtocolType;
  rawMessage: string;
  ackMessage?: string;
  parameters: Record<string, MindrayParam>;
  flags: string[];
  histogramDataAvailable?: boolean;
}

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'RAW_IN' | 'RAW_OUT';

export interface CommLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: 'Analyzer (Mindray BC-5480)' | 'Analyzer (URIT-8021A)' | 'Simulator (URIT-8021A)' | 'LIS Server' | 'Simulator' | 'System' | string;
  message: string;
  rawHex?: string;
  parsedResult?: MindraySampleResult;
}

export interface ServerStatus {
  online: boolean;
  tcpPort: number;
  httpPort: number;
  protocol: ProtocolType;
  totalReceived: number;
  lastReceivedAt?: string;
  ipAddresses: string[];
}

export interface WorklistItem {
  sampleId: string;
  patientId: string;
  patientName: string;
  gender?: 'M' | 'F' | 'O';
  age?: string;
  dob?: string;
  tests?: string[];
  testCode?: string; // OBR-4 Universal Service Identifier (e.g. 00002^CBC+DIFF^99MRC)
  sampleMode?: string; // OBR-15 Specimen Source / Blood Mode (e.g. WB^Whole Blood)
  orcCode?: string; // ORC-1 Order Control (e.g. OK, AF, NW, SC)
  msgTypeResponse?: string; // MSH-9 Response Message Type (e.g. ORR^O02, ORM^O01)
  useBarcodeAsPatientId?: boolean;
  includePv1?: boolean;
  placerIdMode?: 'EMPTY' | 'SAME';
  includeDatesInObr?: boolean;
  dobMode?: 'YYYYMMDD' | 'EMPTY';
  includeModeObx?: boolean;
  takeMode?: string; // OBX 08001^Take Mode^99MRC (e.g., CT, AL, OV)
  bloodMode?: string; // OBX 08002^Blood Mode^99MRC (e.g., W, WB, PD)
  testModeObx?: string; // OBX 08003^Test Mode^99MRC (e.g., CBC+DIFF, CBC)
  analyzerModel?: string; // e.g. "URIT-8021A", "Mindray BC-5480"
  createdAt: string;
  status: 'PENDING' | 'PROCESSING' | 'PARTIAL' | 'COMPLETED';
  completedAt?: string;
  result?: MindraySampleResult;
}

export interface EquipmentItem {
  id: string;
  code: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CodeMapping {
  id: string;
  equipmentFamily: 'ALL' | 'MINDRAY' | 'URIT' | 'MAXION' | 'MAXCOAG' | 'WAMA' | 'FINECARE' | string;
  lisCode: string;          // Ex: "00002", "CREAT", "GLI", "HEM"
  lisName: string;          // Ex: "Hemograma Completo", "Creatinina Sérica"
  equipmentCode: string;   // Ex: "CBC+DIFF", "110", "001", "BD", "BT"
  equipmentName?: string;  // Ex: "CBC + Diferencial", "Bilirrubina Direta"
  direction: 'BIDIRECTIONAL' | 'LIS_TO_EQUIPMENT' | 'EQUIPMENT_TO_LIS';
  unit?: string;           // Ex: "mg/dL", "10^9/L", "s"
  referenceRange?: string; // Ex: "0.7-1.2"
  enabled: boolean;
  notes?: string;
  parentCode?: string;     // Ex: "BILI" ou "LIPIDOGRAMA" (Código Pai do perfil)
  updatedAt?: string;
}

export interface TranslationResult {
  originalCode: string;
  translatedCode: string;
  translatedCodes?: string[];
  mappingApplied?: CodeMapping;
  mappingsApplied?: CodeMapping[];
  source: 'LIS' | 'EQUIPMENT';
  target: 'EQUIPMENT' | 'LIS';
}

export interface SimulationConfig {
  sampleId: string;
  patientId: string;
  patientName: string;
  profile: 'NORMAL' | 'ANEMIA' | 'LEUKOCYTOSIS' | 'THROMBOCYTOPENIA' | 'INFECTION_5PART' | 'CUSTOM';
  includeFlags: boolean;
  protocol: ProtocolType;
  targetMode?: 'INTERNAL' | 'SOCKET_TCP';
  targetHost?: string;
  targetPort?: number;
  customValues?: {
    wbc?: number;
    rbc?: number;
    hgb?: number;
    hct?: number;
    mcv?: number;
    plt?: number;
  };
}
