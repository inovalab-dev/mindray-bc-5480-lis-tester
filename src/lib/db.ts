import mysql from 'mysql2/promise';
import { CodeMapping, WorklistItem, CommLogEntry, MindraySampleResult, EquipmentItem } from '../types';
import { INITIAL_DEFAULT_MAPPINGS } from './deParaService';

export const INITIAL_DEFAULT_EQUIPMENTS: EquipmentItem[] = [
  { id: 'eq-1', code: 'MINDRAY-BC5480', description: 'Analisador Hematológico Mindray BC-5480', createdAt: new Date().toISOString() },
  { id: 'eq-2', code: 'URIT-8021A', description: 'Analisador Bioquímico URIT-8021A', createdAt: new Date().toISOString() },
  { id: 'eq-3', code: 'MAXION-ISE', description: 'Analisador de Eletrólitos Maxion ISE', createdAt: new Date().toISOString() },
  { id: 'eq-4', code: 'MAXCOAG', description: 'Analisador de Coagulação MaxCoag', createdAt: new Date().toISOString() },
  { id: 'eq-5', code: 'WAMA-3000', description: 'Analisador de Uroanálise Wama', createdAt: new Date().toISOString() },
  { id: 'eq-6', code: 'FINECARE-FIA', description: 'Analisador POCT Finecare Wondfo', createdAt: new Date().toISOString() }
];

const DB_HOST = process.env.DB_HOST || '186.237.152.170';
const DB_USER = process.env.DB_USER || 'inovalab';
const DB_PASSWORD = process.env.DB_PASSWORD || 'inovalab';
const DB_NAME = process.env.DB_NAME || 'interface-db';
const DB_PORT = Number(process.env.DB_PORT || 3306);

console.log(`[MySQL DB] Conectando ao MySQL em ${DB_HOST}:${DB_PORT} / DB: ${DB_NAME}`);

export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 8000
});

export async function initDatabase(): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('[MySQL DB] Conexão estabelecida com sucesso!');

    // 1. Criar tabela de Mapeamentos De/Para
    await connection.query(`
      CREATE TABLE IF NOT EXISTS code_mappings (
        id VARCHAR(100) PRIMARY KEY,
        equipment_family VARCHAR(50) NOT NULL,
        lis_code VARCHAR(100) NOT NULL,
        lis_name VARCHAR(255),
        equipment_code VARCHAR(100) NOT NULL,
        equipment_name VARCHAR(255),
        direction VARCHAR(50) DEFAULT 'BIDIRECTIONAL',
        unit VARCHAR(50),
        reference_range VARCHAR(100),
        enabled TINYINT(1) DEFAULT 1,
        notes TEXT,
        parent_code VARCHAR(100),
        updated_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure parent_code column exists if table was created previously
    try {
      await connection.query(`ALTER TABLE code_mappings ADD COLUMN parent_code VARCHAR(100);`);
    } catch (_) {
      // Column might already exist
    }

    // 2. Criar tabela de Ordens de Trabalho (Worklist)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS worklist_items (
        sample_id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(100),
        patient_name VARCHAR(255),
        gender VARCHAR(20),
        age VARCHAR(20),
        tests JSON,
        test_code VARCHAR(255),
        sample_mode VARCHAR(100),
        orc_code VARCHAR(50),
        msg_type_response VARCHAR(50),
        analyzer_model VARCHAR(255),
        status VARCHAR(50),
        result JSON,
        created_at VARCHAR(100),
        completed_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. Criar tabela de Logs de Comunicação
    await connection.query(`
      CREATE TABLE IF NOT EXISTS comm_logs (
        id VARCHAR(100) PRIMARY KEY,
        timestamp VARCHAR(100),
        level VARCHAR(50),
        source VARCHAR(100),
        message TEXT,
        raw_hex LONGTEXT,
        parsed_result JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 4. Criar tabela de Amostras Processadas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS processed_samples (
        sample_id VARCHAR(100) PRIMARY KEY,
        patient_id VARCHAR(100),
        patient_name VARCHAR(255),
        analyzer_model VARCHAR(255),
        timestamp VARCHAR(100),
        parameters JSON,
        raw_message LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. Criar tabela de Equipamentos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipments (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        created_at VARCHAR(100),
        updated_at VARCHAR(100)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Sincronizar mapeamentos padrão iniciais no MySQL caso a tabela esteja vazia
    const [rows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM code_mappings');
    const count = rows[0]?.count || 0;
    if (count === 0) {
      console.log(`[MySQL DB] Tabela code_mappings vazia. Inserindo ${INITIAL_DEFAULT_MAPPINGS.length} mapeamentos De/Para padrão no MySQL...`);
      for (const m of INITIAL_DEFAULT_MAPPINGS) {
        await connection.query(`
          INSERT INTO code_mappings (id, equipment_family, lis_code, lis_name, equipment_code, equipment_name, direction, unit, reference_range, enabled, notes, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          m.id,
          m.equipmentFamily || 'ALL',
          m.lisCode,
          m.lisName || m.lisCode,
          m.equipmentCode,
          m.equipmentName || m.equipmentCode,
          m.direction || 'BIDIRECTIONAL',
          m.unit || '',
          m.referenceRange || '',
          m.enabled ? 1 : 0,
          m.notes || '',
          m.updatedAt || new Date().toISOString()
        ]);
      }
      console.log('[MySQL DB] Mapeamentos De/Para inseridos com sucesso no MySQL!');
    } else {
      console.log(`[MySQL DB] ${count} mapeamentos De/Para já cadastrados no MySQL.`);
    }

    // Sincronizar equipamentos padrão no MySQL caso a tabela esteja vazia
    const [eqRows] = await connection.query<any[]>('SELECT COUNT(*) as count FROM equipments');
    const eqCount = eqRows[0]?.count || 0;
    if (eqCount === 0) {
      console.log(`[MySQL DB] Tabela equipments vazia. Inserindo ${INITIAL_DEFAULT_EQUIPMENTS.length} equipamentos padrão no MySQL...`);
      for (const eq of INITIAL_DEFAULT_EQUIPMENTS) {
        await connection.query(`
          INSERT INTO equipments (id, code, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `, [
          eq.id,
          eq.code,
          eq.description,
          eq.createdAt || new Date().toISOString(),
          eq.updatedAt || new Date().toISOString()
        ]);
      }
      console.log('[MySQL DB] Equipamentos padrão inseridos com sucesso no MySQL!');
    } else {
      console.log(`[MySQL DB] ${eqCount} equipamentos já cadastrados no MySQL.`);
    }

    connection.release();
    return true;
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao inicializar banco MySQL:', err.message);
    return false;
  }
}

// --- FUNÇÕES DE/PARA (CODE MAPPINGS) NO MYSQL ---

export async function getDbCodeMappings(): Promise<CodeMapping[]> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM code_mappings ORDER BY equipment_family, lis_code');
    return rows.map((r) => ({
      id: r.id,
      equipmentFamily: r.equipment_family,
      lisCode: r.lis_code,
      lisName: r.lis_name,
      equipmentCode: r.equipment_code,
      equipmentName: r.equipment_name,
      direction: r.direction,
      unit: r.unit,
      referenceRange: r.reference_range,
      enabled: Boolean(r.enabled),
      notes: r.notes,
      parentCode: r.parent_code || undefined,
      updatedAt: r.updated_at
    }));
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao buscar mapeamentos De/Para:', err.message);
    return [];
  }
}

export async function insertDbCodeMapping(mapping: CodeMapping): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO code_mappings (id, equipment_family, lis_code, lis_name, equipment_code, equipment_name, direction, unit, reference_range, enabled, notes, parent_code, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      mapping.id,
      mapping.equipmentFamily || 'ALL',
      mapping.lisCode,
      mapping.lisName || mapping.lisCode,
      mapping.equipmentCode,
      mapping.equipmentName || mapping.equipmentCode,
      mapping.direction || 'BIDIRECTIONAL',
      mapping.unit || '',
      mapping.referenceRange || '',
      mapping.enabled ? 1 : 0,
      mapping.notes || '',
      mapping.parentCode || null,
      mapping.updatedAt || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao inserir mapeamento De/Para:', err.message);
    throw err;
  }
}

export async function updateDbCodeMapping(id: string, mapping: Partial<CodeMapping>): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (mapping.equipmentFamily !== undefined) { fields.push('equipment_family = ?'); values.push(mapping.equipmentFamily); }
    if (mapping.lisCode !== undefined) { fields.push('lis_code = ?'); values.push(mapping.lisCode); }
    if (mapping.lisName !== undefined) { fields.push('lis_name = ?'); values.push(mapping.lisName); }
    if (mapping.equipmentCode !== undefined) { fields.push('equipment_code = ?'); values.push(mapping.equipmentCode); }
    if (mapping.equipmentName !== undefined) { fields.push('equipment_name = ?'); values.push(mapping.equipmentName); }
    if (mapping.direction !== undefined) { fields.push('direction = ?'); values.push(mapping.direction); }
    if (mapping.unit !== undefined) { fields.push('unit = ?'); values.push(mapping.unit); }
    if (mapping.referenceRange !== undefined) { fields.push('reference_range = ?'); values.push(mapping.referenceRange); }
    if (mapping.enabled !== undefined) { fields.push('enabled = ?'); values.push(mapping.enabled ? 1 : 0); }
    if (mapping.notes !== undefined) { fields.push('notes = ?'); values.push(mapping.notes); }
    if (mapping.parentCode !== undefined) { fields.push('parent_code = ?'); values.push(mapping.parentCode || null); }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(id);

    await pool.query(`UPDATE code_mappings SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao atualizar mapeamento De/Para:', err.message);
    throw err;
  }
}

export async function deleteDbCodeMapping(id: string): Promise<void> {
  try {
    await pool.query('DELETE FROM code_mappings WHERE id = ?', [id]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao deletar mapeamento De/Para:', err.message);
    throw err;
  }
}

export async function resetDbCodeMappings(defaults: CodeMapping[]): Promise<void> {
  try {
    await pool.query('DELETE FROM code_mappings');
    for (const m of defaults) {
      await insertDbCodeMapping(m);
    }
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao restaurar mapeamentos De/Para:', err.message);
    throw err;
  }
}

// --- FUNÇÕES WORKLIST NO MYSQL ---

export async function getDbWorklists(): Promise<WorklistItem[]> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM worklist_items');
    return rows.map((r) => ({
      sampleId: r.sample_id,
      patientId: r.patient_id,
      patientName: r.patient_name,
      gender: r.gender,
      age: r.age,
      tests: typeof r.tests === 'string' ? JSON.parse(r.tests) : (r.tests || []),
      testCode: r.test_code,
      sampleMode: r.sample_mode,
      orcCode: r.orc_code,
      msgTypeResponse: r.msg_type_response,
      analyzerModel: r.analyzer_model,
      status: r.status,
      result: typeof r.result === 'string' ? JSON.parse(r.result) : r.result,
      createdAt: r.created_at,
      completedAt: r.completed_at
    }));
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao buscar worklists do MySQL:', err.message);
    return [];
  }
}

export async function saveDbWorklistItem(item: WorklistItem): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO worklist_items (sample_id, patient_id, patient_name, gender, age, tests, test_code, sample_mode, orc_code, msg_type_response, analyzer_model, status, result, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        patient_id = VALUES(patient_id),
        patient_name = VALUES(patient_name),
        gender = VALUES(gender),
        age = VALUES(age),
        tests = VALUES(tests),
        test_code = VALUES(test_code),
        sample_mode = VALUES(sample_mode),
        orc_code = VALUES(orc_code),
        msg_type_response = VALUES(msg_type_response),
        analyzer_model = VALUES(analyzer_model),
        status = VALUES(status),
        result = VALUES(result),
        completed_at = VALUES(completed_at)
    `, [
      item.sampleId,
      item.patientId,
      item.patientName,
      item.gender || 'F',
      item.age || '',
      JSON.stringify(item.tests || []),
      item.testCode || '',
      item.sampleMode || '',
      item.orcCode || '',
      item.msgTypeResponse || '',
      item.analyzerModel || '',
      item.status || 'PENDING',
      item.result ? JSON.stringify(item.result) : null,
      item.createdAt || new Date().toLocaleTimeString('pt-BR'),
      item.completedAt || null
    ]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao salvar worklist no MySQL:', err.message);
  }
}

export async function deleteDbWorklistItem(sampleId: string): Promise<void> {
  try {
    await pool.query('DELETE FROM worklist_items WHERE sample_id = ?', [sampleId]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao deletar worklist do MySQL:', err.message);
  }
}

// --- FUNÇÕES DE LOGS NO MYSQL ---

export async function saveDbLog(log: CommLogEntry): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO comm_logs (id, timestamp, level, source, message, raw_hex, parsed_result)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      log.id,
      log.timestamp,
      log.level,
      log.source,
      log.message,
      log.rawHex || null,
      log.parsedResult ? JSON.stringify(log.parsedResult) : null
    ]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao salvar log no MySQL:', err.message);
  }
}

export async function getDbLogs(): Promise<CommLogEntry[]> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM comm_logs ORDER BY created_at DESC LIMIT 200');
    return rows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      level: r.level,
      source: r.source,
      message: r.message,
      rawHex: r.raw_hex,
      parsedResult: typeof r.parsed_result === 'string' ? JSON.parse(r.parsed_result) : r.parsed_result
    }));
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao buscar logs do MySQL:', err.message);
    return [];
  }
}

export async function clearDbLogs(): Promise<void> {
  try {
    await pool.query('DELETE FROM comm_logs');
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao limpar logs do MySQL:', err.message);
  }
}

// --- FUNÇÕES DE AMOSTRAS PROCESSADAS NO MYSQL ---

export async function saveDbProcessedSample(sample: MindraySampleResult): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO processed_samples (sample_id, patient_id, patient_name, analyzer_model, timestamp, parameters, raw_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        patient_id = VALUES(patient_id),
        patient_name = VALUES(patient_name),
        analyzer_model = VALUES(analyzer_model),
        timestamp = VALUES(timestamp),
        parameters = VALUES(parameters),
        raw_message = VALUES(raw_message)
    `, [
      sample.sampleId,
      sample.patientId || null,
      sample.patientName || null,
      sample.analyzerModel || null,
      sample.timestamp || new Date().toLocaleTimeString('pt-BR'),
      JSON.stringify(sample.parameters || {}),
      sample.rawMessage || ''
    ]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao salvar amostra no MySQL:', err.message);
  }
}

export async function getDbProcessedSamples(): Promise<Map<string, MindraySampleResult>> {
  const map = new Map<string, MindraySampleResult>();
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM processed_samples');
    for (const r of rows) {
      map.set(r.sample_id, {
        id: r.sample_id,
        sampleId: r.sample_id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        analyzerModel: r.analyzer_model,
        timestamp: r.timestamp,
        protocol: 'HL7_MLLP',
        rawMessage: r.raw_message || '',
        parameters: typeof r.parameters === 'string' ? JSON.parse(r.parameters) : (r.parameters || {}),
        flags: []
      });
    }
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao buscar amostras do MySQL:', err.message);
  }
  return map;
}

// --- FUNÇÕES DE EQUIPAMENTOS NO MYSQL ---

export async function getDbEquipments(): Promise<EquipmentItem[]> {
  try {
    const [rows] = await pool.query<any[]>('SELECT * FROM equipments ORDER BY code ASC');
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      description: r.description,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao buscar equipamentos do MySQL:', err.message);
    return [];
  }
}

export async function insertDbEquipment(item: EquipmentItem): Promise<void> {
  try {
    await pool.query(`
      INSERT INTO equipments (id, code, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      item.id,
      item.code,
      item.description,
      item.createdAt || new Date().toISOString(),
      item.updatedAt || new Date().toISOString()
    ]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao inserir equipamento no MySQL:', err.message);
    throw err;
  }
}

export async function updateDbEquipment(id: string, item: Partial<EquipmentItem>): Promise<void> {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    if (item.code !== undefined) { fields.push('code = ?'); values.push(item.code); }
    if (item.description !== undefined) { fields.push('description = ?'); values.push(item.description); }
    fields.push('updated_at = ?'); values.push(new Date().toISOString());

    values.push(id);

    await pool.query(`UPDATE equipments SET ${fields.join(', ')} WHERE id = ?`, values);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao atualizar equipamento no MySQL:', err.message);
    throw err;
  }
}

export async function deleteDbEquipment(id: string): Promise<void> {
  try {
    await pool.query('DELETE FROM equipments WHERE id = ?', [id]);
  } catch (err: any) {
    console.error('[MySQL DB] Erro ao deletar equipamento do MySQL:', err.message);
    throw err;
  }
}

