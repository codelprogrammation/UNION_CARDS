export type CardOrientation = 'horizontal' | 'vertical';

export type CardStatus = 'draft' | 'active' | 'expired' | 'revoked' | 'replaced' | 'suspended';

export type CardType =
  | 'professional' // Carte professionnelle d'entreprise
  | 'service'      // Carte de service / agent
  | 'access'       // Carte de contrôle d'accès
  | 'member'       // Carte de membre / association
  | 'visitor'      // Carte visiteur temporaire
  | 'consultant'   // Carte consultant / prestataire
  | 'temporary'    // Carte temporaire à expiration stricte
  | 'intern'       // Carte stagiaire / étudiant
  | 'custom';      // Carte personnalisée

export type PhotoShape =
  | 'round'
  | 'square'
  | 'rounded'
  | 'hexagon'
  | 'vertical_portrait'
  | 'framed';

export type WatermarkType =
  | 'none'
  | 'center_transparent'
  | 'pattern_discreet'
  | 'giant_right'
  | 'watermark_subtle'
  | 'micro_logos'
  | 'geometric_blend'
  | 'diagonal_faint'
  | 'vertical_stripe'
  | 'back_watermark'
  | 'behind_photo';

export type WatermarkOpacity = 0 | 0.03 | 0.05 | 0.08 | 0.1 | 0.12 | 0.15 | 0.2 | 0.25 | 0.3 | number;

export type QrPosition =
  | 'bottom_right'
  | 'back_center'
  | 'top_right'
  | 'vertical_stripe'
  | 'verification_box';

export type BackDesignMode =
  | 'standard'
  | 'qr_centered'
  | 'badge_split'
  | 'corporate_rules'
  | 'minimalist'
  | 'full_contact';

export interface Company {
  id: string;
  name: string;
  legalName?: string;
  slogan: string;
  logoUrl: string;
  secondaryLogoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor?: string;
  textColor?: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  emergencyPhone: string;
  managerName: string;
  managerTitle: string;
  managerSignatureUrl: string;
  legalNotice: string;
  customTerms: string;
  industry: string;
  verificationBaseUrl?: string;
  isDisclaimerEnabled?: boolean;
  disclaimerText?: string;
}

export interface Employee {
  id: string;
  companyId: string;
  cardType?: CardType;
  // Identité
  firstName: string;
  lastName: string;
  middleName?: string;
  fullName?: string;
  birthDate?: string;
  birthPlace?: string;
  gender?: 'M' | 'F' | 'Autre';
  nationality?: string;
  photoUrl: string;
  employeeSignatureUrl?: string;

  // Identification professionnelle
  employeeNumber: string; // Matricule dans l'organisation
  cardNumber: string;     // Numéro unique de la carte physique (ex: ID-2026-000042)
  position: string;
  title?: string;
  department: string;
  service?: string;
  unit?: string;
  category?: string;
  grade?: string;
  level?: string;
  workSite?: string;
  workLocation?: string;

  // Données spécifiques par type de carte
  visitedPerson?: string;       // Visiteur
  visitDate?: string;           // Visiteur
  visitTime?: string;           // Visiteur
  internshipInstitution?: string; // Stagiaire
  internshipSupervisor?: string;  // Stagiaire
  internshipPeriod?: string;      // Stagiaire
  consultantCompany?: string;    // Consultant
  consultantProject?: string;    // Consultant
  accessLevel?: string;          // 'Niveau 1' | 'Niveau 2' | 'Niveau 3' | 'Niveau 4' | 'Zone Sécurisée'
  authorizedZones?: string[];    // Accès

  // Informations administratives
  hireDate?: string;
  issueDate: string;
  expiryDate: string;
  status: CardStatus;
  contractType?: string;
  internalId?: string;
  supervisor?: string;
  cardVersion: number;
  replacementReason?: string;
  replacementDate?: string;
  previousCardNumber?: string;
  previousToken?: string;

  // Contact
  email: string;
  phone: string;
  emergencyPhone?: string;
  bloodGroup?: string;
  address?: string;

  // Champs personnalisés
  customFieldValues?: Record<string, string>;

  // Sécurité & QR
  token: string; // Token cryptographique unique pour URL de vérification
  securityClearance?: string;
  isSensitiveDataApproved?: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  value?: string;
  defaultValue?: string;
  type: 'text' | 'number' | 'date' | 'badge';
  position?: 'front' | 'back';
  side?: 'front' | 'back';
  placementPreset?: 'top_right' | 'top_left' | 'top_center' | 'bottom_right' | 'bottom_left' | 'bottom_center' | 'free_coords' | 'header_badge' | 'footer_badge';
  x?: number; // 0 to 100%
  y?: number; // 0 to 100%
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  fontColor?: string;
  color?: string; // background color or main accent
  textColor?: string; // text color
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  styleVariant?: 'badge_filled' | 'badge_outlined' | 'subtle_card' | 'plain_text' | 'compact_chip';
  isLocked?: boolean;
  isVisible?: boolean;
  showOnCard?: boolean;
}

export interface CustomElement {
  id: string;
  type: 'text' | 'shape' | 'badge' | 'stamp' | 'image';
  name: string;
  content?: string;
  shapeType?: 'rectangle' | 'circle' | 'line' | 'ribbon' | 'triangle';
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width?: number; // px or %
  height?: number;
  color?: string;
  opacity?: number;
  fontSize?: number;
  isLocked?: boolean;
  isVisible?: boolean;
  face: 'front' | 'back';
}

export interface ManufacturerConfig {
  name: string;
  logoUrl?: string;
  website?: string;
  phone?: string;
  email?: string;
  showOnCards: boolean;
  position: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'back_center' | 'bottom_stripe';
  size: 'small' | 'medium' | 'large';
}

export interface FieldPrivacySetting {
  fieldKey: string;
  label: string;
  onCard: boolean;
  onScan: boolean;
  isPrivate: boolean;
}

export type TemplateCategory =
  | 'all'
  | 'corporate'
  | 'executive'
  | 'security'
  | 'medical'
  | 'education'
  | 'technology'
  | 'construction'
  | 'transport'
  | 'finance'
  | 'african'
  | 'minimal'
  | 'luxury'
  | 'creative'
  | 'ngo'
  | 'visitor'
  | 'access';

export interface CardTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  orientation: CardOrientation;
  description: string;
  style: string;
  tags: string[];
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  defaultAccentColor: string;
  defaultTextColor?: string;
  defaultWatermark?: WatermarkType;
  defaultWatermarkOpacity?: WatermarkOpacity;
  defaultPhotoShape?: PhotoShape;
  defaultQrPosition?: QrPosition;
  hasFoilEffect?: boolean;
  hasGuillochePattern?: boolean;
  hasBarcode?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
  version?: number;
  author?: string;
  requiredElements?: string[];
  optionalElements?: string[];
}

export interface CardCustomization {
  templateId: string;
  rectoTemplateId?: string;
  versoTemplateId?: string;
  cardType?: CardType;
  orientation: CardOrientation;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;

  // Photo & Logo styling
  photoShape?: PhotoShape;
  photoBorderType?: 'none' | 'thin' | 'thick' | 'double' | 'custom';
  photoBorderColor?: string;
  photoBorderWidth?: number;
  watermarkType?: WatermarkType;
  watermarkOpacity?: WatermarkOpacity;
  qrPosition?: QrPosition;
  backDesignMode?: BackDesignMode;

  // Custom Elements & Fields
  customFields?: CustomField[];
  customElements?: CustomElement[];
  manufacturer?: ManufacturerConfig;
  showManufacturerLogo?: boolean;

  // Toggles Visibilité Champs (Minimisation des données)
  showPhoto?: boolean;
  showManagerSignature?: boolean;
  showEmployeeSignature?: boolean;
  managerSignatoryName?: string;
  managerSignatoryTitle?: string;
  showQrCode?: boolean;
  showBarcode?: boolean;
  showEmergencyContact?: boolean;
  showDepartment?: boolean;
  showService?: boolean;
  showUnit?: boolean;
  showGrade?: boolean;
  showCategory?: boolean;
  showWorkSite?: boolean;
  showContractType?: boolean;
  showBirthDate?: boolean;
  showBirthPlace?: boolean;
  showGender?: boolean;
  showNationality?: boolean;
  showBloodGroup?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  showSecurityHash?: boolean;
  showCardNumber?: boolean;
  showIssueDate?: boolean;
  showExpiryDate?: boolean;
  showAccessLevel?: boolean;
  showNonNationalIdNotice?: boolean;
  nonNationalIdNoticeText?: string;

  pvc3dEffect?: boolean;
  lockedElements?: string[];
}

export interface PrintSheetConfig {
  paperSize: 'A4' | 'A3' | 'A5' | 'CR80_SINGLE';
  sheetOrientation: 'portrait' | 'landscape';
  layoutType: 'front-only' | 'back-only' | 'side-by-side' | 'duplex-pages';
  marginsMm: number;
  spacingHorizontalMm: number;
  spacingVerticalMm: number;
  showCropMarks: boolean;
  showCutLines: boolean;
  showBleed: boolean;
  cardsPerPage: number;
  selectedEmployeeIds: string[];
}

export interface VerificationLog {
  id: string;
  token: string;
  cardNumber: string;
  timestamp: string;
  employeeName: string;
  companyName: string;
  status: CardStatus;
  verifiedBy: string;
  ipLocation?: string;
  userAgent?: string;
  cardType?: CardType;
}

export interface CardPreflightAudit {
  isValid: boolean;
  score: number; // 0-100%
  checks: {
    id: string;
    label: string;
    passed: boolean;
    level: 'error' | 'warning' | 'success';
    message: string;
  }[];
}
