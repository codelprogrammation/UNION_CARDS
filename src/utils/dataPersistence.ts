import { Company, Employee, CardStatus, CardType } from '../types';
import { generateSecureToken } from './qrCodeHelper';

export interface DatabaseBackupEnvelope {
  app: string;
  version: string;
  exportDate: string;
  checksum: string;
  totalEmployees: number;
  company?: {
    id: string;
    name: string;
    industry?: string;
  };
  employees: Employee[];
}

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface JsonStructuralIssue {
  severity: IssueSeverity;
  recordIndex?: number;
  field?: string;
  employeeIdentifier?: string;
  message: string;
  autoRepaired?: boolean;
}

export interface CorruptedRecordDetail {
  index: number;
  identifier: string;
  reasons: string[];
  rawSnippet: string;
}

export interface JsonVerificationReport {
  success: boolean;
  canRestore: boolean;
  format: 'unincompany_envelope' | 'raw_employee_array' | 'unknown';
  totalRecordsFound: number;
  validRecordsCount: number;
  corruptedRecordsCount: number;
  repairedRecordsCount: number;
  checksumStatus: 'verified' | 'mismatch' | 'absent';
  expectedChecksum?: string;
  calculatedChecksum?: string;
  metadata?: {
    app?: string;
    version?: string;
    exportDate?: string;
    companyName?: string;
    companyId?: string;
  };
  employees?: Employee[];
  envelope?: DatabaseBackupEnvelope;
  corruptedRecords: CorruptedRecordDetail[];
  issues: JsonStructuralIssue[];
  error?: string;
}

/**
 * Generates a lightweight checksum for data integrity auditing.
 */
export function computeDataChecksum(dataStr: string): string {
  let hash = 0;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Exports the employee database to a structured, pretty JSON file download.
 */
export function exportEmployeeDatabaseToJson(
  company: Company,
  employees: Employee[]
): void {
  const payloadString = JSON.stringify(employees);
  const checksum = computeDataChecksum(payloadString);

  const envelope: DatabaseBackupEnvelope = {
    app: 'UNINCOMPANY ID Management Platform',
    version: '2.5.0',
    exportDate: new Date().toISOString(),
    checksum,
    totalEmployees: employees.length,
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
    },
    employees,
  };

  const jsonBlob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: 'application/json;charset=utf-8',
  });

  const url = URL.createObjectURL(jsonBlob);
  const link = document.createElement('a');
  link.href = url;
  const dateSlug = new Date().toISOString().split('T')[0];
  const companySlug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  link.download = `UNINCOMPANY_backup_${companySlug}_${dateSlug}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const VALID_CARD_STATUSES: CardStatus[] = [
  'draft',
  'active',
  'expired',
  'revoked',
  'replaced',
  'suspended',
];

const VALID_CARD_TYPES: CardType[] = [
  'professional',
  'service',
  'access',
  'member',
  'visitor',
  'consultant',
  'temporary',
  'intern',
  'custom',
];

function isValidDateString(dStr: unknown): boolean {
  if (typeof dStr !== 'string' || !dStr.trim()) return false;
  // Match YYYY-MM-DD or ISO formats
  const parsed = Date.parse(dStr);
  return !isNaN(parsed);
}

/**
 * Comprehensive JSON Structure & Schema Verification Engine.
 * Analyzes syntax, integrity envelope, checksum, field compliance, and repairs minor anomalies.
 */
export function validateAndParseBackupJson(
  jsonString: string,
  targetCompanyId?: string
): JsonVerificationReport {
  const issues: JsonStructuralIssue[] = [];
  const corruptedRecords: CorruptedRecordDetail[] = [];

  // 1. Text & Syntax checks
  const trimmed = (jsonString || '').trim();
  if (!trimmed) {
    return {
      success: false,
      canRestore: false,
      format: 'unknown',
      totalRecordsFound: 0,
      validRecordsCount: 0,
      corruptedRecordsCount: 0,
      repairedRecordsCount: 0,
      checksumStatus: 'absent',
      corruptedRecords: [],
      issues: [{ severity: 'error', message: 'Le contenu JSON est vide.' }],
      error: 'Le fichier ou le texte fourni est totalement vide.',
    };
  }

  let parsedRoot: any;
  try {
    parsedRoot = JSON.parse(trimmed);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur de syntaxe';
    return {
      success: false,
      canRestore: false,
      format: 'unknown',
      totalRecordsFound: 0,
      validRecordsCount: 0,
      corruptedRecordsCount: 0,
      repairedRecordsCount: 0,
      checksumStatus: 'absent',
      corruptedRecords: [],
      issues: [
        {
          severity: 'error',
          message: `Erreur de syntaxe JSON : ${errorMsg}. Le document est mal formé ou tronqué.`,
        },
      ],
      error: `Syntaxe JSON invalide : ${errorMsg}. Vérifiez la fermeture des accolades et des crochets.`,
    };
  }

  // 2. Structural Root Verification
  if (!parsedRoot || typeof parsedRoot !== 'object') {
    return {
      success: false,
      canRestore: false,
      format: 'unknown',
      totalRecordsFound: 0,
      validRecordsCount: 0,
      corruptedRecordsCount: 0,
      repairedRecordsCount: 0,
      checksumStatus: 'absent',
      corruptedRecords: [],
      issues: [
        {
          severity: 'error',
          message: 'La racine du fichier doit être un objet JSON valide ou un tableau de collaborateurs.',
        },
      ],
      error: 'Structure non reconnue : valeur primitive au lieu d’un objet ou tableau JSON.',
    };
  }

  let detectedFormat: 'unincompany_envelope' | 'raw_employee_array' | 'unknown' = 'unknown';
  let rawList: any[] = [];
  let envelopeMetadata: DatabaseBackupEnvelope | undefined;
  let checksumStatus: 'verified' | 'mismatch' | 'absent' = 'absent';
  let expectedChecksum: string | undefined;
  let calculatedChecksum: string | undefined;

  // Case A: UNINCOMPANY Official Backup Envelope
  if (!Array.isArray(parsedRoot) && parsedRoot.employees) {
    detectedFormat = 'unincompany_envelope';
    if (!Array.isArray(parsedRoot.employees)) {
      return {
        success: false,
        canRestore: false,
        format: 'unincompany_envelope',
        totalRecordsFound: 0,
        validRecordsCount: 0,
        corruptedRecordsCount: 0,
        repairedRecordsCount: 0,
        checksumStatus: 'absent',
        corruptedRecords: [],
        issues: [
          {
            severity: 'error',
            message: "La clé 'employees' de l'enveloppe de sauvegarde n'est pas un tableau valide.",
          },
        ],
        error: "Champ 'employees' corrompu : attendu un tableau de collaborateurs.",
      };
    }

    envelopeMetadata = parsedRoot as DatabaseBackupEnvelope;
    rawList = parsedRoot.employees;

    // Checksum verification
    if (parsedRoot.checksum && typeof parsedRoot.checksum === 'string') {
      expectedChecksum = parsedRoot.checksum;
      calculatedChecksum = computeDataChecksum(JSON.stringify(rawList));
      if (calculatedChecksum === expectedChecksum) {
        checksumStatus = 'verified';
        issues.push({
          severity: 'info',
          message: `Empreinte d'intégrité validée (${calculatedChecksum}). Aucune altération détectée.`,
        });
      } else {
        checksumStatus = 'mismatch';
        issues.push({
          severity: 'warning',
          message: `Somme de contrôle divergente : attendu ${expectedChecksum}, calculé ${calculatedChecksum}. Le fichier a pu être altéré après export.`,
        });
      }
    }

    // Declared count vs actual count
    if (
      typeof parsedRoot.totalEmployees === 'number' &&
      parsedRoot.totalEmployees !== rawList.length
    ) {
      issues.push({
        severity: 'warning',
        message: `Incohérence d'effectif : l'en-tête déclare ${parsedRoot.totalEmployees} fiches, mais ${rawList.length} sont présentes.`,
      });
    }
  } else if (Array.isArray(parsedRoot)) {
    // Case B: Direct Array of Employees
    detectedFormat = 'raw_employee_array';
    rawList = parsedRoot;
    issues.push({
      severity: 'info',
      message: 'Format détecté : liste directe de collaborateurs (sans enveloppe de métadonnées).',
    });
  } else {
    return {
      success: false,
      canRestore: false,
      format: 'unknown',
      totalRecordsFound: 0,
      validRecordsCount: 0,
      corruptedRecordsCount: 0,
      repairedRecordsCount: 0,
      checksumStatus: 'absent',
      corruptedRecords: [],
      issues: [
        {
          severity: 'error',
          message:
            "Format inconnu. Le fichier doit être une sauvegarde UNINCOMPANY ({ app, employees: [...] }) ou un tableau d'employés [...].",
        },
      ],
      error: 'Format non supporté : absence de la clé "employees" ou de tableau direct.',
    };
  }

  // Check empty list
  if (rawList.length === 0) {
    return {
      success: false,
      canRestore: false,
      format: detectedFormat,
      totalRecordsFound: 0,
      validRecordsCount: 0,
      corruptedRecordsCount: 0,
      repairedRecordsCount: 0,
      checksumStatus,
      expectedChecksum,
      calculatedChecksum,
      corruptedRecords: [],
      issues: [
        {
          severity: 'error',
          message: 'Le tableau des collaborateurs ne contient aucun enregistrement.',
        },
      ],
      error: 'La sauvegarde ne contient aucun collaborateur à restaurer.',
    };
  }

  // 3. Deep Record-by-Record Schema & Integrity Validation
  const validEmployees: Employee[] = [];
  let repairedCount = 0;
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();

  rawList.forEach((item, index) => {
    const itemNum = index + 1;

    // Must be a non-null object
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      corruptedRecords.push({
        index,
        identifier: `Ligne #${itemNum}`,
        reasons: ['Enregistrement non objet ou corrompu (valeur nulle ou primitive).'],
        rawSnippet: String(item),
      });
      issues.push({
        severity: 'error',
        recordIndex: index,
        message: `Fiche #${itemNum} invalide : type non objet. Fiche ignorée.`,
      });
      return;
    }

    const itemReasons: string[] = [];

    // Critical Identity Fields: firstName & lastName
    const rawFirst = typeof item.firstName === 'string' ? item.firstName.trim() : '';
    const rawLast = typeof item.lastName === 'string' ? item.lastName.trim() : '';

    if (!rawFirst) {
      itemReasons.push("Le prénom ('firstName') est absent ou vide.");
    }
    if (!rawLast) {
      itemReasons.push("Le nom ('lastName') est absent ou vide.");
    }

    // If critical identity is missing, the record is rejected
    if (itemReasons.length > 0) {
      const displayId =
        item.employeeNumber || item.id || `Fiche #${itemNum}`;
      corruptedRecords.push({
        index,
        identifier: `${displayId}`,
        reasons: itemReasons,
        rawSnippet: JSON.stringify(item).slice(0, 100),
      });
      issues.push({
        severity: 'error',
        recordIndex: index,
        employeeIdentifier: displayId,
        message: `Fiche #${itemNum} (${displayId}) rejetée : ${itemReasons.join(' ')}`,
      });
      return;
    }

    // Record has valid identity. Now check and repair optional/administrative fields safely.
    let wasRepaired = false;
    const identifier = `${rawFirst} ${rawLast}`;

    // ID Uniqueness & repair
    let cleanId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : '';
    if (!cleanId || seenIds.has(cleanId)) {
      cleanId = `emp-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'id',
        employeeIdentifier: identifier,
        message: `Identifiant unique ID manquant ou en double pour ${identifier}. Attribué : ${cleanId}`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }
    seenIds.add(cleanId);

    // Employee Number (Matricule)
    let cleanNumber =
      typeof item.employeeNumber === 'string' && item.employeeNumber.trim()
        ? item.employeeNumber.trim()
        : '';
    if (!cleanNumber) {
      cleanNumber = `MAT-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`;
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'employeeNumber',
        employeeIdentifier: identifier,
        message: `Matricule manquant pour ${identifier}. Généré automatiquement : ${cleanNumber}`,
        autoRepaired: true,
      });
      wasRepaired = true;
    } else if (seenNumbers.has(cleanNumber)) {
      const disambiguated = `${cleanNumber}-BIS`;
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'employeeNumber',
        employeeIdentifier: identifier,
        message: `Matricule en double (${cleanNumber}) détecté dans le fichier pour ${identifier}. Réassigné : ${disambiguated}`,
        autoRepaired: true,
      });
      cleanNumber = disambiguated;
      wasRepaired = true;
    }
    seenNumbers.add(cleanNumber);

    // Position & Department
    const cleanPosition =
      typeof item.position === 'string' && item.position.trim()
        ? item.position.trim()
        : 'Collaborateur';
    if (!item.position) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'position',
        employeeIdentifier: identifier,
        message: `Fonction manquante pour ${identifier} : valeur 'Collaborateur' par défaut assignée.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    const cleanDepartment =
      typeof item.department === 'string' && item.department.trim()
        ? item.department.trim()
        : 'Direction Générale';
    if (!item.department) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'department',
        employeeIdentifier: identifier,
        message: `Département manquant pour ${identifier} : valeur 'Direction Générale' assignée.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    // Status
    let cleanStatus: CardStatus = 'active';
    if (item.status && VALID_CARD_STATUSES.includes(item.status)) {
      cleanStatus = item.status;
    } else if (item.status) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'status',
        employeeIdentifier: identifier,
        message: `Statut '${item.status}' invalide pour ${identifier} : réinitialisé à 'active'.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    // Card Type
    let cleanCardType: CardType = 'professional';
    if (item.cardType && VALID_CARD_TYPES.includes(item.cardType)) {
      cleanCardType = item.cardType;
    }

    // Gender
    let cleanGender: 'M' | 'F' | 'Autre' = 'M';
    if (item.gender === 'F' || item.gender === 'Autre') {
      cleanGender = item.gender;
    } else if (item.gender && item.gender !== 'M') {
      cleanGender = 'Autre';
      wasRepaired = true;
    }

    // Dates validation & repair
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = `${new Date().getFullYear() + 3}-12-31`;

    let cleanIssueDate = isValidDateString(item.issueDate) ? item.issueDate : todayStr;
    if (!isValidDateString(item.issueDate)) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'issueDate',
        employeeIdentifier: identifier,
        message: `Date d'émission invalide pour ${identifier} : définie à ${cleanIssueDate}.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    let cleanExpiryDate = isValidDateString(item.expiryDate)
      ? item.expiryDate
      : defaultExpiry;
    if (!isValidDateString(item.expiryDate)) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'expiryDate',
        employeeIdentifier: identifier,
        message: `Date d'expiration invalide pour ${identifier} : prorogée à ${cleanExpiryDate}.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    // Photo URL
    const defaultPortrait =
      cleanGender === 'M'
        ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&h=400&q=80'
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&h=400&q=80';
    let cleanPhotoUrl =
      typeof item.photoUrl === 'string' && item.photoUrl.trim()
        ? item.photoUrl.trim()
        : defaultPortrait;
    if (!item.photoUrl) {
      wasRepaired = true;
    }

    // Security Token
    let cleanToken =
      typeof item.token === 'string' && item.token.length >= 8
        ? item.token
        : generateSecureToken();
    if (!item.token || item.token.length < 8) {
      issues.push({
        severity: 'warning',
        recordIndex: index,
        field: 'token',
        employeeIdentifier: identifier,
        message: `Jeton cryptographique manquant pour ${identifier} : un token d'authentification sécurisé a été généré.`,
        autoRepaired: true,
      });
      wasRepaired = true;
    }

    // Card Number
    let cleanCardNumber =
      typeof item.cardNumber === 'string' && item.cardNumber.trim()
        ? item.cardNumber.trim()
        : `ID-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Email
    const cleanEmail =
      typeof item.email === 'string' && item.email.includes('@')
        ? item.email.trim()
        : `${rawFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}.${rawLast
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')}@entreprise.cd`;

    const normalizedEmployee: Employee = {
      id: cleanId,
      companyId:
        targetCompanyId ||
        (typeof item.companyId === 'string' && item.companyId.trim()
          ? item.companyId.trim()
          : 'default-co'),
      cardType: cleanCardType,
      firstName: rawFirst,
      lastName: rawLast,
      middleName: typeof item.middleName === 'string' ? item.middleName : undefined,
      fullName: `${rawFirst} ${rawLast}`,
      birthDate: typeof item.birthDate === 'string' ? item.birthDate : undefined,
      birthPlace: typeof item.birthPlace === 'string' ? item.birthPlace : undefined,
      gender: cleanGender,
      nationality:
        typeof item.nationality === 'string' ? item.nationality : 'Congolaise (RDC)',
      photoUrl: cleanPhotoUrl,
      employeeSignatureUrl:
        typeof item.employeeSignatureUrl === 'string'
          ? item.employeeSignatureUrl
          : undefined,
      employeeNumber: cleanNumber,
      cardNumber: cleanCardNumber,
      position: cleanPosition,
      department: cleanDepartment,
      service: typeof item.service === 'string' ? item.service : undefined,
      unit: typeof item.unit === 'string' ? item.unit : undefined,
      category: typeof item.category === 'string' ? item.category : undefined,
      grade: typeof item.grade === 'string' ? item.grade : undefined,
      level: typeof item.level === 'string' ? item.level : undefined,
      workSite: typeof item.workSite === 'string' ? item.workSite : undefined,
      workLocation:
        typeof item.workLocation === 'string' ? item.workLocation : undefined,
      issueDate: cleanIssueDate,
      expiryDate: cleanExpiryDate,
      status: cleanStatus,
      contractType:
        typeof item.contractType === 'string' ? item.contractType : 'CDI',
      cardVersion: typeof item.cardVersion === 'number' ? item.cardVersion : 1,
      email: cleanEmail,
      phone: typeof item.phone === 'string' ? item.phone : '+243 81 000 0000',
      emergencyPhone:
        typeof item.emergencyPhone === 'string' ? item.emergencyPhone : undefined,
      bloodGroup:
        typeof item.bloodGroup === 'string' ? item.bloodGroup : undefined,
      address: typeof item.address === 'string' ? item.address : undefined,
      customFieldValues:
        item.customFieldValues && typeof item.customFieldValues === 'object'
          ? item.customFieldValues
          : undefined,
      token: cleanToken,
      securityClearance:
        typeof item.securityClearance === 'string'
          ? item.securityClearance
          : undefined,
    };

    if (wasRepaired) {
      repairedCount++;
    }

    validEmployees.push(normalizedEmployee);
  });

  const canRestore = validEmployees.length > 0;
  const totalFound = rawList.length;
  const validCount = validEmployees.length;
  const corruptedCount = corruptedRecords.length;

  let generalError: string | undefined;
  if (!canRestore) {
    generalError = `Tous les ${totalFound} enregistrements du fichier comportent des anomalies critiques (noms ou prénoms manquants). Impossible de restaurer.`;
  }

  return {
    success: canRestore,
    canRestore,
    format: detectedFormat,
    totalRecordsFound: totalFound,
    validRecordsCount: validCount,
    corruptedRecordsCount: corruptedCount,
    repairedRecordsCount: repairedCount,
    checksumStatus,
    expectedChecksum,
    calculatedChecksum,
    metadata: envelopeMetadata
      ? {
          app: envelopeMetadata.app,
          version: envelopeMetadata.version,
          exportDate: envelopeMetadata.exportDate,
          companyName: envelopeMetadata.company?.name,
          companyId: envelopeMetadata.company?.id,
        }
      : undefined,
    employees: validEmployees,
    envelope: envelopeMetadata,
    corruptedRecords,
    issues,
    error: generalError,
  };
}

/**
 * Merges or replaces employee records safely.
 */
export function mergeEmployeeDatabases(
  existingEmployees: Employee[],
  importedEmployees: Employee[],
  mode: 'replace' | 'merge'
): Employee[] {
  if (mode === 'replace') {
    return importedEmployees;
  }

  // Merge mode: match by employeeNumber or ID, otherwise append
  const map = new Map<string, Employee>();
  existingEmployees.forEach((emp) => {
    map.set(emp.employeeNumber || emp.id, emp);
  });

  importedEmployees.forEach((newEmp) => {
    const key = newEmp.employeeNumber || newEmp.id;
    map.set(key, {
      ...map.get(key),
      ...newEmp,
      // Ensure unique valid ID
      id:
        map.get(key)?.id ||
        newEmp.id ||
        `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    });
  });

  return Array.from(map.values());
}

