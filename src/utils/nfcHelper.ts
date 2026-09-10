import { Employee, Company } from '../types';
import { getVerificationUrl, generateCryptoHash } from './qrCodeHelper';

export interface NfcPayloadOptions {
  includeUrl: boolean;
  includeTextSummary: boolean;
  includeJsonAccessData: boolean;
  includeVCard: boolean;
  includeCryptoHash: boolean;
  lockTagAfterWrite?: boolean;
}

export interface NfcEncodedData {
  url: string;
  textSummary: string;
  jsonData: Record<string, unknown>;
  vCardString: string;
  cryptoHash: string;
  totalEstimatedBytes: number;
}

/**
 * Builds standard vCard 4.0 string for contactless business card sharing
 */
export function buildEmployeeVCard(employee: Employee, company: Company): string {
  const cleanPhone = employee.phone || company.phone || '';
  const cleanEmail = employee.email || company.email || '';
  const verificationUrl = getVerificationUrl(employee.token, company.verificationBaseUrl);

  const lines = [
    'BEGIN:VCARD',
    'VERSION:4.0',
    `N:${employee.lastName};${employee.firstName};;;`,
    `FN:${employee.firstName} ${employee.lastName}`,
    `ORG:${company.name}${employee.department ? `;${employee.department}` : ''}`,
    `TITLE:${employee.position}`,
    `ROLE:${employee.position}`,
  ];

  if (cleanEmail) {
    lines.push(`EMAIL;type=INTERNET,WORK:${cleanEmail}`);
  }
  if (cleanPhone) {
    lines.push(`TEL;type=CELL,VOICE:${cleanPhone}`);
  }
  if (employee.workSite || company.address) {
    lines.push(`ADR;type=WORK:;;${employee.workSite || company.address};;;;`);
  }
  if (company.website) {
    lines.push(`URL;type=WORK:${company.website}`);
  }
  lines.push(`URL;type=VERIFICATION:${verificationUrl}`);
  lines.push(`NOTE:Matricule: ${employee.employeeNumber} | Statut: ${employee.status.toUpperCase()} | Carte: ${employee.cardNumber || employee.id}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

/**
 * Builds structured JSON object for NFC access control gates & badge readers
 */
export function buildNfcAccessJson(employee: Employee, company: Company): Record<string, unknown> {
  const verificationUrl = getVerificationUrl(employee.token, company.verificationBaseUrl);
  const cryptoHash = generateCryptoHash(employee.id, employee.token);

  return {
    standard: 'ISO-7810-ID1-NFC',
    app: 'UNIONCOMPANY_ID_STUDIO',
    version: '2.0',
    timestamp: new Date().toISOString(),
    employee: {
      id: employee.id,
      matricule: employee.employeeNumber,
      cardNumber: employee.cardNumber,
      name: `${employee.firstName} ${employee.lastName}`,
      department: employee.department,
      position: employee.position,
      accessLevel: employee.accessLevel || 'Standard',
      workSite: employee.workSite || 'Siège Principal',
      status: employee.status,
      issueDate: employee.issueDate,
      expiryDate: employee.expiryDate,
      bloodGroup: employee.bloodGroup || 'N/A',
      emergencyPhone: employee.emergencyPhone || company.emergencyPhone || 'N/A',
    },
    company: {
      id: company.id,
      name: company.name,
      contact: company.phone,
    },
    security: {
      token: employee.token,
      cryptoHash,
      verificationUrl,
    },
  };
}

/**
 * Builds human-readable compact text summary for generic NFC readers
 */
export function buildNfcTextSummary(employee: Employee, company: Company): string {
  return [
    `BADGE OFFICIEL: ${company.name}`,
    `EMPLOYÉ: ${employee.firstName} ${employee.lastName}`,
    `MATRICULE: ${employee.employeeNumber}`,
    `POSTE: ${employee.position} [${employee.department}]`,
    `STATUT: ${employee.status.toUpperCase()}`,
    `VALIDE JUSQU'AU: ${employee.expiryDate}`,
    employee.bloodGroup ? `GS: ${employee.bloodGroup}` : '',
    employee.emergencyPhone ? `URGENCE: ${employee.emergencyPhone}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Compiles all selected NFC payloads and calculates estimated byte sizes
 */
export function compileNfcData(
  employee: Employee,
  company: Company,
  options: NfcPayloadOptions
): NfcEncodedData {
  const url = getVerificationUrl(employee.token, company.verificationBaseUrl);
  const textSummary = buildNfcTextSummary(employee, company);
  const jsonData = buildNfcAccessJson(employee, company);
  const vCardString = buildEmployeeVCard(employee, company);
  const cryptoHash = generateCryptoHash(employee.id, employee.token);

  let totalBytes = 0;

  // NDEF header overhead is roughly 5-10 bytes per record
  if (options.includeUrl) {
    totalBytes += new TextEncoder().encode(url).length + 8;
  }
  if (options.includeTextSummary) {
    totalBytes += new TextEncoder().encode(textSummary).length + 10;
  }
  if (options.includeJsonAccessData) {
    const jsonStr = JSON.stringify(jsonData);
    totalBytes += new TextEncoder().encode(jsonStr).length + 32; // mime type overhead
  }
  if (options.includeVCard) {
    totalBytes += new TextEncoder().encode(vCardString).length + 28;
  }

  return {
    url,
    textSummary,
    jsonData,
    vCardString,
    cryptoHash,
    totalEstimatedBytes: totalBytes,
  };
}

/**
 * Common NFC IC Chip Capacities (usable NDEF user memory)
 */
export const NFC_CHIP_SPECS = [
  { name: 'NTAG213', totalMemory: 180, usableNdef: 144, description: 'Format standard léger (URL ou texte court)' },
  { name: 'NTAG215', totalMemory: 540, usableNdef: 504, description: 'Format standard polyvalent (URL + JSON ou vCard)' },
  { name: 'NTAG216', totalMemory: 924, usableNdef: 888, description: 'Haute capacité (Tous les enregistrements combinés)' },
  { name: 'MIFARE Classic 1K / DESFire', totalMemory: 1024, usableNdef: 752, description: 'Puces professionnelles sécurisées entreprise' },
];

/**
 * Checks if the Web NFC API is supported in the current runtime
 */
export function isWebNfcSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'NDEFReader' in window;
}
