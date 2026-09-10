import React, { useState, useEffect } from 'react';
import { Company, Employee, CardTemplate, CardCustomization } from '../../types';
import { generateQrCodeDataUrl, getVerificationUrl, generateCryptoHash } from '../../utils/qrCodeHelper';
import {
  Shield,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Award,
  Radio,
  Sparkles,
  QrCode as QrIcon,
  Fingerprint,
  HeartPulse,
  HardHat,
  Plane,
  GraduationCap,
  Scale
} from 'lucide-react';

interface CardRendererProps {
  company: Company;
  employee: Employee;
  template: CardTemplate;
  customization?: Partial<CardCustomization>;
  side?: 'front' | 'back';
  scale?: number;
  isInteractive3D?: boolean;
  isPrintMode?: boolean;
  className?: string;
  onClick?: () => void;
  showBleedLines?: boolean;
}

export const CardRenderer: React.FC<CardRendererProps> = ({
  company,
  employee,
  template,
  customization,
  side = 'front',
  scale = 1,
  isInteractive3D = false,
  isPrintMode = false,
  className = '',
  onClick,
  showBleedLines = false,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isFlipped, setIsFlipped] = useState<boolean>(side === 'back');

  const cust: Partial<CardCustomization> = customization || {};
  const primary = cust.primaryColor || template.defaultPrimaryColor || company.primaryColor || '#0f172a';
  const secondary = cust.secondaryColor || template.defaultSecondaryColor || company.secondaryColor || '#2563eb';
  const accent = cust.accentColor || template.defaultAccentColor || company.accentColor || '#f59e0b';
  const isVertical = template.orientation === 'vertical' || cust.orientation === 'vertical';

  const verificationUrl = getVerificationUrl(employee.token, company.verificationBaseUrl);
  const cryptoHash = generateCryptoHash(employee.id, employee.token);

  useEffect(() => {
    let isMounted = true;
    generateQrCodeDataUrl(verificationUrl, {
      darkColor: template.id === 'executive-dark' || template.id === 'black-gold' ? '#000000' : '#0f172a',
      lightColor: '#ffffff',
      width: 250,
      margin: 1,
    }).then((url) => {
      if (isMounted) setQrDataUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [verificationUrl, template.id]);

  useEffect(() => {
    setIsFlipped(side === 'back');
  }, [side]);

  // Dimensions: Standard ISO ID-1 ratio (85.60 x 53.98 mm) -> 428px x 270px (1px ≈ 0.2mm)
  const widthPx = isVertical ? 270 : 428;
  const heightPx = isVertical ? 428 : 270;

  const currentSide: 'front' | 'back' = isInteractive3D
    ? isFlipped
      ? 'back'
      : 'front'
    : side === 'back'
    ? 'back'
    : 'front';

  return (
    <div
      className={`relative select-none ${isInteractive3D ? 'cursor-pointer perspective-1000' : ''} ${className}`}
      style={{
        width: `${widthPx * scale}px`,
        height: `${heightPx * scale}px`,
      }}
      onClick={() => {
        if (isInteractive3D) {
          setIsFlipped(!isFlipped);
        }
        if (onClick) onClick();
      }}
    >
      <div
        className={`w-full h-full relative transition-transform duration-500 transform-style-3d ${
          isInteractive3D && isFlipped ? 'rotate-y-180' : ''
        }`}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${widthPx}px`,
          height: `${heightPx}px`,
        }}
      >
        <div
          id={`card-${employee.id}-${currentSide}`}
          className={`w-full h-full relative overflow-hidden text-slate-900 ${
            isPrintMode
              ? 'rounded-none'
              : 'rounded-[12px] shadow-xl border border-slate-700/20'
          }`}
          style={{
            width: `${widthPx}px`,
            height: `${heightPx}px`,
            backgroundColor: '#ffffff',
            boxShadow: isPrintMode
              ? 'none'
              : '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Bleed lines preview for printing inspection */}
          {showBleedLines && (
            <div className="absolute inset-[3mm] border border-dashed border-red-500/50 pointer-events-none z-50 flex items-start justify-end p-1">
              <span className="text-[7px] text-red-600 bg-white/80 px-1 rounded font-mono">Zone Sûre</span>
            </div>
          )}

          {/* Watermark / Background Brand Logo Overlay */}
          <WatermarkOverlay
            company={company}
            watermarkType={cust.watermarkType || template.watermarkStyle || 'center_transparent'}
            opacity={cust.watermarkOpacity !== undefined ? cust.watermarkOpacity : 0.12}
            side={currentSide}
          />

          {/* Render specific template layout */}
          {renderTemplateLayout({
            templateId: template.id,
            company,
            employee,
            side: currentSide,
            primary,
            secondary,
            accent,
            qrDataUrl,
            cryptoHash,
            isVertical,
            customization: cust,
          })}

          {/* Dynamic Custom Fields Overlay */}
          <CustomFieldsOverlay
            customFields={cust.customFields || []}
            customFieldValues={employee.customFieldValues}
            side={currentSide}
            primaryColor={primary}
          />

          {/* Manufacturer / Platform Branding Overlay */}
          <ManufacturerOverlay
            manufacturer={cust.manufacturer}
            show={cust.showManufacturerLogo !== false}
            side={currentSide}
          />

          {/* Realistic PVC Gloss overlay */}
          {!isPrintMode && (
            <div
              className="absolute inset-0 pointer-events-none z-40 opacity-40 bg-gradient-to-tr from-transparent via-white/10 to-white/40"
              style={{ mixBlendMode: 'overlay' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface TemplateLayoutProps {
  templateId: string;
  company: Company;
  employee: Employee;
  side: 'front' | 'back';
  primary: string;
  secondary: string;
  accent: string;
  qrDataUrl: string;
  cryptoHash: string;
  isVertical: boolean;
  customization: Partial<CardCustomization>;
}

function renderTemplateLayout(props: TemplateLayoutProps) {
  const { templateId, side } = props;

  if (side === 'back') {
    return <TemplateBackLayout {...props} />;
  }

  switch (templateId) {
    case 'executive-dark':
      return <ExecutiveDarkFront {...props} />;
    case 'modern-grid':
      return <ModernGridFront {...props} />;
    case 'digital-id':
      return <DigitalIdFront {...props} />;
    case 'security-pro':
      return <SecurityProFront {...props} />;
    case 'institutional':
      return <InstitutionalFront {...props} />;
    case 'african-corporate':
      return <AfricanCorporateFront {...props} />;
    case 'technology':
      return <TechnologyFront {...props} />;
    case 'medical':
      return <MedicalFront {...props} />;
    case 'education':
      return <EducationFront {...props} />;
    case 'construction':
      return <ConstructionFront {...props} />;
    case 'transport':
      return <TransportFront {...props} />;
    case 'finance-exec':
      return <FinanceExecFront {...props} />;
    case 'minimal-white':
      return <MinimalWhiteFront {...props} />;
    case 'black-gold':
      return <BlackGoldFront {...props} />;
    case 'glass-corporate':
      return <GlassCorporateFront {...props} />;
    case 'vertical-exec':
      return <VerticalExecFront {...props} />;
    case 'advanced-security':
      return <AdvancedSecurityFront {...props} />;
    case 'future-id':
      return <FutureIdFront {...props} />;
    case 'executive-board':
      return <ExecutiveBoardFront {...props} />;
    case 'hospitality-resort':
      return <HospitalityFront {...props} />;
    case 'ngo-humanitarian':
      return <NgoFront {...props} />;
    case 'corporate-premium':
    default:
      return <CorporatePremiumFront {...props} />;
  }
}

// -------------------------------------------------------------
// 1. CORPORATE PREMIUM (Recto)
// -------------------------------------------------------------
const CorporatePremiumFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between relative bg-slate-50 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div
        className="w-full px-4 py-2.5 flex items-center justify-between text-white relative z-10 shadow-sm"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
        }}
      >
        <div className="flex items-center space-x-2.5">
          <img
            src={company.logoUrl}
            alt="Logo"
            className="w-8 h-8 rounded-full bg-white p-0.5 object-cover shadow-sm border border-white/20"
          />
          <div>
            <h3 className="font-bold text-xs tracking-wider uppercase leading-tight line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[8px] text-white/80 line-clamp-1 italic">
              {company.slogan || 'Carte d’Identification Professionnelle'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className="text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider text-slate-950 inline-block shadow-sm"
            style={{ backgroundColor: accent }}
          >
            CARTE DE SERVICE
          </span>
        </div>
      </div>

      {/* Decorative Guilloche/Angle line */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${secondary} 50%, ${primary} 100%)`,
        }}
      />

      {/* Center Body */}
      <div className="px-4 py-2.5 flex-1 flex items-center space-x-4 relative z-10">
        {/* Photo Container */}
        <div className="relative flex-shrink-0">
          <div
            className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 shadow-md bg-slate-200 relative"
            style={{ borderColor: primary }}
          >
            <img
              src={employee.photoUrl}
              alt={`${employee.firstName} ${employee.lastName}`}
              className="w-full h-full object-cover"
            />
            {/* Hologram simulator badge on photo corner */}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-cyan-300 opacity-85 shadow-sm border border-white/60 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-slate-800" />
            </div>
          </div>
        </div>

        {/* Employee Details with dynamic auto-fit */}
        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <div className="mb-1">
            <span className="text-[8px] uppercase tracking-widest text-slate-400 font-semibold block">
              Agent / Collaborateur
            </span>
            <h2 className="font-extrabold text-slate-900 text-[15px] leading-tight uppercase tracking-tight line-clamp-1">
              {employee.firstName} {employee.lastName}
            </h2>
            <p
              className="font-bold text-[11px] leading-snug line-clamp-1"
              style={{ color: secondary }}
            >
              {employee.position}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[9px] pt-1.5 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block text-[7.5px] uppercase font-semibold">
                Matricule
              </span>
              <span
                className="font-mono font-bold text-[10px] px-1 py-0.5 rounded bg-slate-100 border border-slate-200 inline-block"
                style={{ color: primary }}
              >
                {employee.employeeNumber}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[7.5px] uppercase font-semibold">
                Département
              </span>
              <span className="font-semibold text-slate-800 line-clamp-1 text-[9px]">
                {employee.department}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[7.5px] uppercase font-semibold">
                Émission
              </span>
              <span className="font-medium text-slate-700">{employee.issueDate}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[7.5px] uppercase font-semibold">
                Expiration
              </span>
              <span className="font-bold text-slate-900">{employee.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Band */}
      <div
        className="px-4 py-1.5 flex items-center justify-between text-white text-[8px] relative z-10"
        style={{ backgroundColor: primary }}
      >
        <span className="font-medium tracking-wide text-white/90">
          ID: {employee.cardNumber || 'UNC-7810-ID1'}
        </span>
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold text-emerald-400 uppercase tracking-widest text-[7.5px]">
            {employee.status === 'active' ? 'CARTE ACTIVE' : employee.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Watermark Logo Background */}
      <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.04] pointer-events-none">
        <Building2 className="w-48 h-48 text-slate-900" />
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. EXECUTIVE DARK (Recto)
// -------------------------------------------------------------
const ExecutiveDarkFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-4 relative text-slate-100 overflow-hidden font-sans"
      style={{
        background: `radial-gradient(circle at top right, ${secondary} 0%, #090d16 65%, #03060a 100%)`,
      }}
    >
      {/* Subtle Metallic Gold Frame */}
      <div
        className="absolute inset-1.5 rounded-lg border pointer-events-none"
        style={{ borderColor: `${accent}40` }}
      />
      <div
        className="absolute inset-2 rounded-md border pointer-events-none"
        style={{ borderColor: `${accent}20` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-2.5">
          <img
            src={company.logoUrl}
            alt="Logo"
            className="w-7 h-7 rounded-md object-cover border"
            style={{ borderColor: accent }}
          />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] uppercase tracking-widest text-amber-300/80 font-medium">
              EXECUTIVE VIP PASS
            </p>
          </div>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center border shadow-inner"
          style={{
            borderColor: accent,
            background: `linear-gradient(135deg, ${accent}30, #090d16)`,
          }}
        >
          <Award className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div className="relative flex-shrink-0">
          <div
            className="w-[82px] h-[102px] rounded-lg overflow-hidden border-2 shadow-2xl relative"
            style={{
              borderColor: accent,
              boxShadow: `0 0 15px ${accent}25`,
            }}
          >
            <img
              src={employee.photoUrl}
              alt={`${employee.firstName} ${employee.lastName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[8px] uppercase tracking-widest text-amber-400 font-semibold block mb-0.5">
            HAUTE DIRECTION
          </span>
          <h2 className="font-extrabold text-white text-[15px] leading-tight tracking-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-[11px] font-bold text-slate-300 leading-snug line-clamp-1 mb-2">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] border-t border-slate-800 pt-1.5">
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-mono">MATRICULE</span>
              <span className="font-mono font-bold text-amber-300">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-mono">DÉPARTEMENT</span>
              <span className="font-medium text-slate-300 line-clamp-1">{employee.department}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-mono">VALIDITÉ</span>
              <span className="font-medium text-slate-300">{employee.expiryDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-mono">ACCÈS</span>
              <span className="font-bold text-emerald-400">NIVEAU 5 - TOTAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[7.5px] text-slate-400 pt-1 border-t border-slate-800/80 relative z-10 font-mono">
        <span>SECURITY TOKEN ENCRYPTED</span>
        <span className="text-amber-400/90 font-bold">UNINCOMPANY EXECUTIVE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. MODERN GRID (Recto)
// -------------------------------------------------------------
const ModernGridFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex bg-slate-900 text-white font-sans overflow-hidden">
      {/* Left Column Photo */}
      <div
        className="w-[125px] h-full relative flex-shrink-0 flex flex-col justify-between p-2.5 text-center"
        style={{ backgroundColor: primary }}
      >
        <div className="w-full flex justify-center">
          <img
            src={company.logoUrl}
            alt="Logo"
            className="w-6 h-6 rounded bg-white p-0.5 object-cover"
          />
        </div>
        <div className="w-[88px] h-[108px] mx-auto rounded-lg overflow-hidden border-2 border-white/40 shadow-md">
          <img
            src={employee.photoUrl}
            alt="Employee"
            className="w-full h-full object-cover"
          />
        </div>
        <div
          className="text-[8px] font-mono font-bold py-0.5 px-1 rounded text-slate-950 uppercase"
          style={{ backgroundColor: accent }}
        >
          {employee.employeeNumber}
        </div>
      </div>

      {/* Right Column Data */}
      <div className="flex-1 p-3.5 flex flex-col justify-between bg-slate-950/80">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200 line-clamp-1">
              {company.name}
            </h3>
            <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold font-mono">
              ACTIF
            </span>
          </div>

          <span className="text-[7.5px] uppercase tracking-widest text-slate-500 font-semibold block">
            IDENTITÉ PROFESSIONNELLE
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase tracking-tight line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p
            className="font-bold text-[11px] leading-snug line-clamp-1 mt-0.5"
            style={{ color: accent }}
          >
            {employee.position}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[8.5px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-500 block text-[7px] uppercase font-mono">Département</span>
            <span className="font-semibold text-slate-200 line-clamp-1">{employee.department}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7px] uppercase font-mono">Service</span>
            <span className="font-semibold text-slate-200 line-clamp-1">{employee.service || 'Standard'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7px] uppercase font-mono">Émis le</span>
            <span className="text-slate-300 font-mono">{employee.issueDate}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[7px] uppercase font-mono">Expire le</span>
            <span className="text-amber-400 font-mono font-bold">{employee.expiryDate}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[7px] text-slate-500 font-mono pt-1">
          <span>VERIFIED ID CARD SYSTEM</span>
          <span>ISO/IEC 7810</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. DIGITAL ID (Recto)
// -------------------------------------------------------------
const DigitalIdFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div
      className="w-full h-full p-4 flex flex-col justify-between relative text-white font-mono overflow-hidden"
      style={{
        backgroundColor: '#030712',
        backgroundImage: `radial-gradient(${secondary}20 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-[9px] font-bold tracking-widest text-emerald-400">
            DIGITAL CREDENTIAL // VERIFIED
          </span>
        </div>
        <span className="text-[8px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-sans">
          {company.name}
        </span>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div className="relative flex-shrink-0">
          <div className="w-[82px] h-[100px] rounded border-2 border-emerald-500/60 overflow-hidden shadow-lg bg-slate-900">
            <img
              src={employee.photoUrl}
              alt="Photo"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Simulated NFC Chip */}
          <div className="absolute top-1 left-1 w-4 h-3 rounded bg-amber-400/90 border border-amber-600 flex items-center justify-center">
            <div className="w-2 h-1.5 border border-amber-900/60" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden font-sans">
          <span className="text-[7.5px] font-mono uppercase text-emerald-400 block">
            ID: {employee.employeeNumber}
          </span>
          <h2 className="font-extrabold text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-semibold text-cyan-400 text-[11px] line-clamp-1">
            {employee.position}
          </p>

          <div className="mt-2 text-[8px] font-mono text-slate-400 space-y-0.5">
            <div className="flex justify-between border-b border-slate-800 pb-0.5">
              <span>DEPT:</span>
              <span className="text-slate-200">{employee.department}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-0.5">
              <span>EXP:</span>
              <span className="text-emerald-400 font-bold">{employee.expiryDate}</span>
            </div>
            <div className="flex justify-between">
              <span>HASH:</span>
              <span className="text-slate-500 font-mono text-[7px]">{employee.token.slice(0, 12)}...</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Barcode */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 relative z-10 text-[7px] text-slate-500 font-mono">
        <span>AUTHENTICATION: NFC + QR SECURE</span>
        <span>STATUS: PASS-OK</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. SECURITY PRO (Recto)
// -------------------------------------------------------------
const SecurityProFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between relative bg-slate-950 text-white font-sans overflow-hidden">
      {/* Top Warning Band */}
      <div className="w-full bg-red-600 px-3 py-1 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 fill-white text-red-600" />
          <span className="font-black text-[9px] uppercase tracking-widest">
            SÉCURITÉ & PROTECTION RAPPROCHÉE
          </span>
        </div>
        <span className="text-[8px] font-mono font-bold bg-black/40 px-1.5 py-0.2 rounded">
          {company.name}
        </span>
      </div>

      {/* Main Body */}
      <div className="px-4 py-2 flex items-center space-x-3.5 flex-1 relative z-10">
        <div className="relative flex-shrink-0">
          <div className="w-[84px] h-[104px] rounded border-2 border-red-500 shadow-xl overflow-hidden bg-slate-900">
            <img
              src={employee.photoUrl}
              alt="Photo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[7px] font-bold px-1 rounded uppercase">
            AGENT
          </span>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded mb-1.5 flex items-center justify-between">
            <span className="text-[7.5px] text-red-400 font-mono uppercase font-bold">MATRICULE:</span>
            <span className="text-[11px] font-mono font-black text-amber-400 tracking-wider">
              {employee.employeeNumber}
            </span>
          </div>

          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-slate-300 text-[10.5px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-400 font-mono">
            <div>
              <span className="block text-[6.5px] text-slate-500">DIVISION</span>
              <span className="text-slate-200 font-semibold line-clamp-1">{employee.department}</span>
            </div>
            <div>
              <span className="block text-[6.5px] text-slate-500">URGENCE 24/7</span>
              <span className="text-red-400 font-bold">{employee.emergencyPhone || company.emergencyPhone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safety Stripe */}
      <div
        className="w-full h-3 flex items-center justify-center font-mono text-[7px] font-bold text-slate-900 uppercase"
        style={{
          background: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 8px, #111827 8px, #111827 16px)',
        }}
      />
    </div>
  );
};

// -------------------------------------------------------------
// 6. INSTITUTIONAL (Recto)
// -------------------------------------------------------------
const InstitutionalFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-slate-50 border-4 border-double border-slate-300 relative text-slate-900 font-serif overflow-hidden">
      {/* Header */}
      <div className="text-center border-b-2 border-slate-900/80 pb-1.5 relative z-10">
        <div className="flex items-center justify-center space-x-2">
          <img
            src={company.logoUrl}
            alt="Seal"
            className="w-7 h-7 rounded-full border border-slate-700 object-cover"
          />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-950 font-serif leading-tight">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-slate-600 font-sans uppercase tracking-widest">
              ACCRÉDITATION OFFICIELLE D’ÉTAT / INSTITUTION
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-4 my-auto relative z-10 font-sans">
        <div className="w-[82px] h-[102px] rounded border border-slate-800 shadow-sm overflow-hidden bg-slate-200">
          <img
            src={employee.photoUrl}
            alt="Agent"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[8px] font-serif uppercase tracking-widest text-slate-600 font-bold block">
            TITULAIRE DE LA CARTE
          </span>
          <h2 className="font-bold text-slate-950 text-[15px] font-serif leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-[11px] font-medium text-slate-700 leading-snug line-clamp-1 mb-1.5 italic font-serif">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] pt-1 border-t border-slate-300 font-sans">
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-bold">Matricule</span>
              <span className="font-mono font-bold text-slate-900">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-bold">Département</span>
              <span className="font-medium text-slate-800 line-clamp-1">{employee.department}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-bold">Délivré le</span>
              <span className="text-slate-700">{employee.issueDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[7px] uppercase font-bold">Validité</span>
              <span className="font-bold text-slate-950">{employee.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[7px] text-slate-500 border-t border-slate-300 pt-1 font-sans">
        <span>RÉPUBLIQUE & INSTITUTIONS</span>
        <span className="font-bold uppercase tracking-wider text-slate-800">DOCUMENT OFFICIEL</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 7. AFRICAN CORPORATE (Recto)
// -------------------------------------------------------------
const AfricanCorporateFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3.5 relative text-white font-sans overflow-hidden"
      style={{
        backgroundColor: '#064e3b',
        backgroundImage: `linear-gradient(135deg, ${primary} 0%, #064e3b 60%, #022c22 100%)`,
      }}
    >
      {/* African Geometric Pattern Background simulation */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, ${accent} 0, ${accent} 1px, transparent 0, transparent 20px)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-1.5 relative z-10" style={{ borderColor: `${accent}40` }}>
        <div className="flex items-center space-x-2">
          <img
            src={company.logoUrl}
            alt="Logo"
            className="w-7 h-7 rounded-full border-2 object-cover bg-white p-0.5"
            style={{ borderColor: accent }}
          />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-amber-300/80 font-medium tracking-wide">
              CARTE D’IDENTIFICATION PROFESSIONNELLE
            </p>
          </div>
        </div>
        <span
          className="text-[8px] font-extrabold px-2 py-0.5 rounded text-emerald-950 uppercase shadow"
          style={{ backgroundColor: accent }}
        >
          PANAFRICAIN
        </span>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div
          className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 shadow-xl bg-emerald-950 flex-shrink-0"
          style={{ borderColor: accent }}
        >
          <img
            src={employee.photoUrl}
            alt="Photo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest text-amber-300 font-bold block mb-0.5">
            COLLABORATEUR HABILITÉ
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase tracking-tight line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-emerald-200 text-[11px] leading-snug line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-emerald-900/60 p-2 rounded border border-emerald-700/50">
            <div>
              <span className="text-emerald-300/70 block text-[6.5px] uppercase font-mono">MATRICULE</span>
              <span className="font-mono font-bold text-amber-300">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-emerald-300/70 block text-[6.5px] uppercase font-mono">DÉPARTEMENT</span>
              <span className="font-medium text-slate-100 line-clamp-1">{employee.department}</span>
            </div>
            <div>
              <span className="text-emerald-300/70 block text-[6.5px] uppercase font-mono">VALIDITÉ</span>
              <span className="text-slate-200 font-medium">{employee.expiryDate}</span>
            </div>
            <div>
              <span className="text-emerald-300/70 block text-[6.5px] uppercase font-mono">STATUT</span>
              <span className="font-bold text-amber-400 uppercase">OFFICIEL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[7.5px] text-emerald-300/80 pt-1 border-t border-emerald-800/80 relative z-10 font-mono">
        <span>EXCELLENCE & DÉVELOPPEMENT DURABLE</span>
        <span className="text-amber-300 font-bold">UNINCOMPANY AFRICA</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 8. TECHNOLOGY & DEV (Recto)
// -------------------------------------------------------------
const TechnologyFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-slate-950 text-white font-mono relative overflow-hidden">
      {/* Cyber Grid Lines */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-bold text-xs text-cyan-300 uppercase tracking-wider font-sans">
            {company.name}
          </span>
        </div>
        <span className="text-[8px] text-cyan-400 bg-cyan-950/80 border border-cyan-500/50 px-2 py-0.5 rounded">
          DEV // PASS 2.0
        </span>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div className="w-[84px] h-[104px] rounded border border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.2)] overflow-hidden bg-slate-900 flex-shrink-0 relative">
          <img
            src={employee.photoUrl}
            alt="Dev"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden font-sans">
          <span className="text-[7.5px] font-mono text-cyan-400 block mb-0.5">
            // MATRICULE: {employee.employeeNumber}
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase tracking-tight line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-cyan-300 text-[11px] line-clamp-1 mb-1.5 font-mono">
            &gt; {employee.position}
          </p>

          <div className="space-y-1 font-mono text-[8px] bg-slate-900/90 p-1.5 rounded border border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500">DEPT:</span>
              <span className="text-slate-300">{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">EXP_DATE:</span>
              <span className="text-cyan-400 font-bold">{employee.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[7px] text-slate-500 pt-1 border-t border-slate-900 relative z-10 font-mono">
        <span>BUILD: 2026.08.PROD</span>
        <span className="text-cyan-400">UNINCOMPANY TECH ENGINE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 9. MEDICAL & HEALTHCARE (Recto)
// -------------------------------------------------------------
const MedicalFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {/* Top Medical Header */}
      <div className="w-full flex items-center justify-between border-b-2 border-teal-600 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-teal-900 uppercase leading-tight line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-teal-700 font-medium">
              PERSONNEL MÉDICAL & HOSPITALIER HABILITÉ
            </p>
          </div>
        </div>
        <div className="bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-sm">
          {employee.bloodGroup || 'O+'}
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center space-x-3.5 my-auto relative z-10">
        <div className="w-[84px] h-[104px] rounded-lg border-2 border-teal-600 shadow-md overflow-hidden bg-slate-200 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Doctor"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-wider text-teal-700 font-bold block">
            CORPS MÉDICAL
          </span>
          <h2 className="font-black text-slate-900 text-[14.5px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-teal-800 text-[11px] leading-snug line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-teal-50/80 p-1.5 rounded border border-teal-200">
            <div>
              <span className="text-teal-700 block text-[6.5px] uppercase font-bold">MATRICULE</span>
              <span className="font-mono font-bold text-slate-900">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-teal-700 block text-[6.5px] uppercase font-bold">SERVICE</span>
              <span className="font-semibold text-slate-800 line-clamp-1">{employee.service || employee.department}</span>
            </div>
            <div>
              <span className="text-teal-700 block text-[6.5px] uppercase font-bold">VALIDITÉ</span>
              <span className="font-bold text-slate-900">{employee.expiryDate}</span>
            </div>
            <div>
              <span className="text-teal-700 block text-[6.5px] uppercase font-bold">URGENCE</span>
              <span className="font-bold text-red-600">{employee.emergencyPhone || company.emergencyPhone}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[7px] text-slate-500 pt-1 border-t border-slate-200">
        <span>ACCÈS SOINS & UNITÉS PROTÉGÉES</span>
        <span className="font-bold text-teal-700 uppercase">CARTE DE SANTÉ OFFICIELLE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 10. EDUCATION / UNIVERSITY (Recto)
// -------------------------------------------------------------
const EducationFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-b from-purple-900 via-indigo-950 to-slate-950 text-white font-sans relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-purple-400/40 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-5 h-5 text-amber-300" />
          <div>
            <h3 className="font-bold text-xs uppercase text-amber-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-purple-200 font-serif">CARTE UNIVERSITAIRE & RECHERCHE</p>
          </div>
        </div>
        <span className="text-[8px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded font-mono">
          2025 - 2028
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div className="w-[84px] h-[104px] rounded-lg border-2 border-amber-400 shadow-xl overflow-hidden bg-slate-900 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Academic"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest text-amber-300 font-semibold block">
            FACULTÉ & CORPS ENSEIGNANT
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-purple-200 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-purple-950/70 p-2 rounded border border-purple-700/50 font-mono">
            <div>
              <span className="text-purple-300 block text-[6.5px] uppercase">ID ACADÉMIQUE</span>
              <span className="font-bold text-amber-300">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-purple-300 block text-[6.5px] uppercase">DÉPARTEMENT</span>
              <span className="font-semibold text-white line-clamp-1 font-sans">{employee.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-purple-300 pt-1 border-t border-purple-900">
        <span>CAMPUS CENTRAL // RECHERCHE DE POINTE</span>
        <span className="font-bold text-amber-300">CARTE OFFICIELLE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 11. CONSTRUCTION & BTP (Recto)
// -------------------------------------------------------------
const ConstructionFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-stone-900 text-white font-sans relative overflow-hidden border-t-4 border-amber-500">
      <div className="flex items-center justify-between border-b border-stone-700 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <HardHat className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-extrabold text-xs uppercase text-white line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-amber-400 font-bold uppercase">INGÉNIERIE, BTP & MINES</p>
          </div>
        </div>
        <span className="text-[8px] bg-amber-500 text-stone-950 font-black px-2 py-0.5 rounded font-mono">
          EPI REQUIS
        </span>
      </div>

      <div className="flex items-center space-x-3.5 my-auto relative z-10">
        <div className="w-[84px] h-[104px] rounded border-2 border-amber-500 shadow-xl overflow-hidden bg-stone-950 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Engineer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-wider text-amber-400 font-bold font-mono block">
            HABILITATION CHANTIER
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-stone-300 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-stone-950 p-2 rounded border border-stone-800 font-mono">
            <div>
              <span className="text-stone-500 block text-[6.5px]">MATRICULE</span>
              <span className="font-bold text-amber-400">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[6.5px]">SITE / ZONE</span>
              <span className="text-white line-clamp-1 font-sans">{employee.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-stone-400 pt-1 border-t border-stone-800 font-mono">
        <span>SÉCURITÉ QHSE STRICTE</span>
        <span className="text-amber-400 font-bold">ACCÈS ZONE CONTRÔLÉE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 12. TRANSPORT & LOGISTICS (Recto)
// -------------------------------------------------------------
const TransportFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-sky-950 text-white font-sans relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-sky-600 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <Plane className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="font-bold text-xs uppercase text-sky-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-sky-300">FLOTTE LOGISTIQUE & AVIATION</p>
          </div>
        </div>
        <span className="text-[8px] bg-sky-500 text-sky-950 font-bold px-2 py-0.5 rounded font-mono">
          EQUIPAGE
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div className="w-[84px] h-[104px] rounded border-2 border-sky-400 shadow-xl overflow-hidden bg-sky-900 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Transport"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-wider text-sky-300 font-bold block">
            PERSONNEL NAVIGANT & FRET
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-sky-200 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1 text-[8.5px] bg-sky-900/80 p-2 rounded border border-sky-700 font-mono">
            <div>
              <span className="text-sky-300/70 block text-[6.5px]">LICENCE / ID</span>
              <span className="font-bold text-amber-300">{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-sky-300/70 block text-[6.5px]">SERVICE</span>
              <span className="text-white line-clamp-1 font-sans">{employee.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-sky-400 pt-1 border-t border-sky-800 font-mono">
        <span>ZONE SOUS DOUANE // PISTE</span>
        <span className="font-bold text-white">HABILITÉ IATA</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 13. FINANCE EXEC (Recto)
// -------------------------------------------------------------
const FinanceExecFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-4 relative text-white font-sans overflow-hidden"
      style={{
        background: `linear-gradient(135deg, #0a192f 0%, #172a45 100%)`,
      }}
    >
      <div className="flex items-center justify-between border-b pb-1.5 relative z-10" style={{ borderColor: `${accent}40` }}>
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5" style={{ color: accent }} />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-slate-400 uppercase tracking-widest font-mono">
              FINANCE & WEALTH MANAGEMENT
            </p>
          </div>
        </div>
        <span
          className="text-[8px] font-bold px-2 py-0.5 rounded uppercase text-slate-950"
          style={{ backgroundColor: accent }}
        >
          BANQUE PRIVÉE
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div
          className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 shadow-2xl flex-shrink-0"
          style={{ borderColor: accent }}
        >
          <img
            src={employee.photoUrl}
            alt="Finance"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest block font-bold" style={{ color: accent }}>
            CADRE FINANCIER HABILITÉ
          </span>
          <h2 className="font-extrabold text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-semibold text-slate-300 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-slate-900/80 p-2 rounded border border-slate-700">
            <div>
              <span className="text-slate-400 block text-[6.5px] uppercase font-mono">MATRICULE</span>
              <span className="font-mono font-bold" style={{ color: accent }}>{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[6.5px] uppercase font-mono">DÉPARTEMENT</span>
              <span className="font-medium text-slate-200 line-clamp-1">{employee.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
        <span>CONFIDENTIALITÉ ABSOLUE</span>
        <span style={{ color: accent }} className="font-bold">UNINCOMPANY WEALTH</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 14. MINIMAL WHITE (Recto)
// -------------------------------------------------------------
const MinimalWhiteFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-white text-black font-sans relative overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between border-b border-black pb-2">
        <h3 className="font-black text-xs uppercase tracking-tight line-clamp-1">
          {company.name}
        </h3>
        <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-600">
          ID CARD
        </span>
      </div>

      <div className="flex items-center space-x-5 my-auto">
        <div className="w-[84px] h-[104px] bg-slate-100 border border-black overflow-hidden flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Minimal"
            className="w-full h-full object-cover grayscale contrast-125"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] font-mono uppercase text-slate-500 block">
            {employee.employeeNumber}
          </span>
          <h2 className="font-black text-[15px] leading-tight uppercase tracking-tight line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="text-[11px] font-medium text-slate-700 line-clamp-1 mb-2">
            {employee.position}
          </p>

          <div className="text-[8.5px] space-y-0.5 border-t border-slate-200 pt-1 text-slate-800">
            <div>
              <span className="text-slate-400 text-[7px] uppercase font-mono mr-2">DEPT:</span>
              <span className="font-semibold">{employee.department}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[7px] uppercase font-mono mr-2">VALIDITY:</span>
              <span className="font-mono">{employee.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono border-t border-black pt-1">
        <span>SWISS TYPOGRAPHIC STYLE</span>
        <span className="font-bold text-black">OFFICIAL CREDENTIAL</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 15. BLACK & GOLD (Recto)
// -------------------------------------------------------------
const BlackGoldFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  const gold = '#d4af37';
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-4 relative text-white font-sans overflow-hidden"
      style={{
        backgroundColor: '#050505',
        backgroundImage: 'radial-gradient(circle at 80% 20%, #1c1917 0%, #050505 100%)',
      }}
    >
      <div className="flex items-center justify-between border-b pb-1.5 relative z-10" style={{ borderColor: `${gold}60` }}>
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5" style={{ color: gold }} />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider line-clamp-1" style={{ color: gold }}>
              {company.name}
            </h3>
            <p className="text-[7px] text-amber-200/80 uppercase tracking-widest font-mono">
              VIP PRESTIGE ACCESS
            </p>
          </div>
        </div>
        <span
          className="text-[8px] font-black px-2 py-0.5 rounded uppercase text-black"
          style={{ backgroundColor: gold }}
        >
          GOLD VIP
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto relative z-10">
        <div
          className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 shadow-2xl flex-shrink-0"
          style={{ borderColor: gold }}
        >
          <img
            src={employee.photoUrl}
            alt="VIP"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest block font-bold" style={{ color: gold }}>
            MEMBRE DE PRESTIGE
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-semibold text-amber-100 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-stone-900/90 p-2 rounded border border-amber-900/40">
            <div>
              <span className="text-amber-400/60 block text-[6.5px] uppercase font-mono">MATRICULE</span>
              <span className="font-mono font-bold" style={{ color: gold }}>{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-amber-400/60 block text-[6.5px] uppercase font-mono">DÉPARTEMENT</span>
              <span className="font-medium text-white line-clamp-1">{employee.department}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-amber-400/60 pt-1 border-t border-amber-950 font-mono">
        <span>EXCLUSIVE CLUB & SUITES</span>
        <span style={{ color: gold }} className="font-bold">UNINCOMPANY PRESTIGE</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 16. GLASS CORPORATE (Recto)
// -------------------------------------------------------------
const GlassCorporateFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white font-sans relative overflow-hidden">
      <div className="flex items-center justify-between bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-white line-clamp-1">
          {company.name}
        </h3>
        <span className="text-[8px] bg-cyan-400 text-slate-950 font-bold px-1.5 py-0.5 rounded">
          CREATIVE ID
        </span>
      </div>

      <div className="flex items-center space-x-3.5 my-auto bg-white/5 backdrop-blur-sm p-2.5 rounded-xl border border-white/10">
        <div className="w-[82px] h-[100px] rounded-lg overflow-hidden border border-white/30 shadow-xl flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Glass"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] text-cyan-300 uppercase tracking-widest font-semibold block">
            {employee.employeeNumber}
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-indigo-200 text-[11px] line-clamp-1 mb-1">
            {employee.position}
          </p>
          <span className="text-[8.5px] text-slate-300 block line-clamp-1">
            {employee.department}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono pt-1">
        <span>GLASS UI ARCHITECTURE</span>
        <span className="text-cyan-300 font-bold">VALID {employee.expiryDate}</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 17. VERTICAL EXECUTIVE (Recto 54x86 mm portrait)
// -------------------------------------------------------------
const VerticalExecFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3.5 relative text-white font-sans overflow-hidden text-center"
      style={{
        backgroundColor: primary,
        backgroundImage: `linear-gradient(180deg, ${primary} 0%, ${secondary} 100%)`,
      }}
    >
      {/* Top Lanyard Slot graphic indicator */}
      <div className="w-8 h-1.5 bg-black/40 rounded-full mx-auto mb-1 border border-white/20" />

      {/* Header */}
      <div className="mb-1">
        <img
          src={company.logoUrl}
          alt="Logo"
          className="w-8 h-8 rounded-full mx-auto bg-white p-0.5 object-cover mb-1 shadow"
        />
        <h3 className="font-extrabold text-xs uppercase tracking-wider text-white line-clamp-1">
          {company.name}
        </h3>
        <p className="text-[7.5px] text-white/80 uppercase tracking-widest font-mono">
          CARTE DE SERVICE
        </p>
      </div>

      {/* Center Photo */}
      <div className="my-auto">
        <div
          className="w-[96px] h-[120px] mx-auto rounded-xl overflow-hidden border-2 shadow-2xl bg-slate-900"
          style={{ borderColor: accent }}
        >
          <img
            src={employee.photoUrl}
            alt="Portrait"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="mt-2">
          <h2 className="font-black text-white text-[14.5px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p
            className="font-bold text-[11px] leading-snug line-clamp-1 mt-0.5"
            style={{ color: accent }}
          >
            {employee.position}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-black/30 p-2 rounded-lg border border-white/10 text-[8px] space-y-0.5">
        <div className="flex justify-between font-mono">
          <span className="text-white/60">MATRICULE:</span>
          <span className="font-bold text-white">{employee.employeeNumber}</span>
        </div>
        <div className="flex justify-between font-mono">
          <span className="text-white/60">VALIDITÉ:</span>
          <span className="font-bold text-emerald-400">{employee.expiryDate}</span>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 18. ADVANCED SECURITY (Recto)
// -------------------------------------------------------------
const AdvancedSecurityFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
  cryptoHash,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-slate-900 text-white font-sans relative overflow-hidden">
      {/* Guilloche micro-pattern simulation */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, #10b981 1px, transparent 1px), radial-gradient(circle at 0% 0%, #3b82f6 1px, transparent 1px)',
          backgroundSize: '8px 8px',
        }}
      />

      <div className="flex items-center justify-between border-b border-emerald-500/40 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-xs uppercase text-slate-100 line-clamp-1">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-emerald-400 font-mono">CARTE HAUTE SÉCURITÉ CRYPTOGRAPHIQUE</p>
          </div>
        </div>
        <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 font-mono px-2 py-0.5 rounded font-bold">
          PASSED
        </span>
      </div>

      <div className="flex items-center space-x-3.5 my-auto relative z-10">
        <div className="relative flex-shrink-0">
          <div className="w-[84px] h-[104px] rounded border-2 border-emerald-400 shadow-xl overflow-hidden bg-slate-950">
            <img
              src={employee.photoUrl}
              alt="Security ID"
              className="w-full h-full object-cover"
            />
          </div>
          {/* Hologram simulator */}
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gradient-to-tr from-pink-400 via-amber-300 to-cyan-300 opacity-90 border border-white flex items-center justify-center shadow">
            <Fingerprint className="w-3.5 h-3.5 text-slate-900" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest text-emerald-400 font-bold block font-mono">
            {employee.employeeNumber}
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-slate-300 text-[11px] line-clamp-1 mb-1">
            {employee.position}
          </p>

          <div className="space-y-0.5 text-[8px] bg-slate-950/80 p-1.5 rounded border border-emerald-900/50 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500">DEPT:</span>
              <span className="text-slate-200">{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">HASH:</span>
              <span className="text-emerald-400 text-[7px]">{cryptoHash.slice(0, 16)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono pt-1 border-t border-slate-800">
        <span>UV-PROTECTION + HOLOGRAM SEAL</span>
        <span className="text-emerald-400 font-bold">AUTHENTICITY VERIFIED</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 19. FUTURE ID (Recto)
// -------------------------------------------------------------
const FutureIdFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-black text-cyan-400 font-mono relative overflow-hidden border-2 border-cyan-500">
      <div className="flex items-center justify-between border-b border-cyan-500 pb-1 relative z-10">
        <h3 className="font-black text-xs uppercase tracking-widest text-white line-clamp-1">
          {company.name}
        </h3>
        <span className="text-[8px] bg-cyan-400 text-black font-black px-2 py-0.2">
          NEO // ID
        </span>
      </div>

      <div className="flex items-center space-x-3.5 my-auto relative z-10">
        <div className="w-[84px] h-[104px] border border-cyan-400 bg-slate-900 overflow-hidden flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Neo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden font-sans">
          <span className="text-[7.5px] font-mono text-cyan-500 block">
            HEX:// {employee.employeeNumber}
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-cyan-300 text-[11px] line-clamp-1 mb-1 font-mono">
            {employee.position}
          </p>
          <span className="text-[8.5px] text-slate-400 block line-clamp-1 font-mono">
            SEC_LEVEL: ALPHA-9
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-cyan-600 border-t border-cyan-900 pt-1 font-mono">
        <span>CYBER PROTOCOL 2026</span>
        <span className="text-cyan-400 font-bold">STATUS: OK</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 20. EXECUTIVE BOARD (Recto)
// -------------------------------------------------------------
const ExecutiveBoardFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  const gold = '#c59b27';
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-4 relative text-white font-serif overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #1e1b18 0%, #2e2823 60%, #151311 100%)',
      }}
    >
      <div className="flex items-center justify-between border-b pb-1.5 relative z-10" style={{ borderColor: `${gold}60` }}>
        <div className="flex items-center space-x-2">
          <Award className="w-5 h-5" style={{ color: gold }} />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-100 line-clamp-1 font-serif">
              {company.name}
            </h3>
            <p className="text-[7.5px] text-amber-300/80 uppercase tracking-widest font-sans">
              CONSEIL D’ADMINISTRATION & PRÉSIDENCE
            </p>
          </div>
        </div>
        <span
          className="text-[8px] font-bold px-2 py-0.5 rounded text-black font-sans uppercase"
          style={{ backgroundColor: gold }}
        >
          BOARD MEMBER
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto relative z-10 font-sans">
        <div
          className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 shadow-2xl flex-shrink-0"
          style={{ borderColor: gold }}
        >
          <img
            src={employee.photoUrl}
            alt="Board"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest block font-bold" style={{ color: gold }}>
            MEMBRE DU CONSEIL
          </span>
          <h2 className="font-bold text-white text-[15px] font-serif leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-semibold text-amber-200 text-[11px] line-clamp-1 mb-1.5">
            {employee.position}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] bg-black/40 p-2 rounded border border-amber-900/40">
            <div>
              <span className="text-amber-400/70 block text-[6.5px] uppercase font-mono">MATRICULE</span>
              <span className="font-mono font-bold" style={{ color: gold }}>{employee.employeeNumber}</span>
            </div>
            <div>
              <span className="text-amber-400/70 block text-[6.5px] uppercase font-mono">MANDAT JUSQU’À</span>
              <span className="font-medium text-white">{employee.expiryDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-amber-400/70 pt-1 border-t border-amber-950 font-sans">
        <span>HAUTE GOUVERNANCE CORPORATE</span>
        <span style={{ color: gold }} className="font-bold">UNINCOMPANY BOARD</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 21. HOSPITALITY (Recto)
// -------------------------------------------------------------
const HospitalityFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-4 bg-stone-900 text-stone-100 font-sans relative overflow-hidden border-b-4 border-amber-600">
      <div className="flex items-center justify-between border-b border-stone-700 pb-1.5">
        <h3 className="font-bold text-xs uppercase tracking-wider text-amber-200 line-clamp-1 font-serif">
          {company.name}
        </h3>
        <span className="text-[8px] bg-amber-600 text-stone-950 font-bold px-2 py-0.5 rounded uppercase">
          HOSPITALITÉ
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto">
        <div className="w-[84px] h-[104px] rounded-lg overflow-hidden border-2 border-amber-600 shadow-lg bg-stone-950 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="Hospitality"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest text-amber-400 font-bold block">
            STAFF LUXURY RESORT
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-stone-300 text-[11px] line-clamp-1 mb-1">
            {employee.position}
          </p>
          <span className="text-[8.5px] text-amber-200 block font-mono">
            {employee.department}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-stone-400 pt-1 border-t border-stone-800 font-mono">
        <span>VIP CONCIERGE & GUEST EXCELLENCE</span>
        <span className="text-amber-400 font-bold">5-STAR RESORT</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 22. NGO / HUMANITARIAN (Recto)
// -------------------------------------------------------------
const NgoFront: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-between p-3.5 bg-emerald-950 text-white font-sans relative overflow-hidden border-l-4 border-sky-400">
      <div className="flex items-center justify-between border-b border-emerald-700 pb-1.5">
        <h3 className="font-extrabold text-xs uppercase text-white line-clamp-1">
          {company.name}
        </h3>
        <span className="text-[8px] bg-sky-400 text-slate-950 font-bold px-2 py-0.5 rounded font-mono">
          MISSION PASS
        </span>
      </div>

      <div className="flex items-center space-x-4 my-auto">
        <div className="w-[84px] h-[104px] rounded border-2 border-sky-400 shadow-xl overflow-hidden bg-emerald-900 flex-shrink-0">
          <img
            src={employee.photoUrl}
            alt="NGO"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="text-[7.5px] uppercase tracking-widest text-sky-300 font-bold block">
            HUMANITAIRE & SOLIDARITÉ
          </span>
          <h2 className="font-black text-white text-[15px] leading-tight uppercase line-clamp-1">
            {employee.firstName} {employee.lastName}
          </h2>
          <p className="font-bold text-emerald-200 text-[11px] line-clamp-1 mb-1">
            {employee.position}
          </p>
          <span className="text-[8.5px] text-slate-300 block font-mono">
            FIELD: {employee.department}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[7px] text-emerald-400 pt-1 border-t border-emerald-800 font-mono">
        <span>NEUTRALITÉ & PROTECTION INTERNATIONALE</span>
        <span className="text-sky-300 font-bold">UN-ALIGNED</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// VERSO UNIFIÉ ET HAUTE DÉFINITION (Back Layout)
// -------------------------------------------------------------
const TemplateBackLayout: React.FC<TemplateLayoutProps> = ({
  company,
  employee,
  primary,
  secondary,
  accent,
  qrDataUrl,
  cryptoHash,
  isVertical,
}) => {
  return (
    <div
      className="w-full h-full flex flex-col justify-between p-3.5 relative bg-slate-50 text-slate-900 font-sans overflow-hidden border border-slate-200"
      style={{
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
        backgroundSize: '12px 12px',
      }}
    >
      {/* Top Header Verso */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 relative z-10">
        <div className="flex items-center space-x-2">
          <img
            src={company.logoUrl}
            alt="Logo"
            className="w-6 h-6 rounded-full object-cover border border-slate-300 bg-white p-0.5"
          />
          <div>
            <h4 className="font-extrabold text-[10.5px] text-slate-900 uppercase tracking-tight line-clamp-1">
              {company.name}
            </h4>
            <p className="text-[7px] text-slate-500 line-clamp-1">
              {company.address}
            </p>
          </div>
        </div>
        <span className="text-[7.5px] font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
          VERSO OFFICIEL
        </span>
      </div>

      {/* Middle Content */}
      <div className="flex items-start space-x-3 my-auto relative z-10 py-1">
        {/* Terms & Legal Notices */}
        <div className="flex-1 text-[7.5px] text-slate-600 leading-relaxed overflow-hidden">
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm space-y-1">
            <span className="font-extrabold text-slate-900 uppercase text-[7.5px] block border-b border-slate-100 pb-0.5">
              CONDITIONS D’UTILISATION
            </span>
            <p className="line-clamp-3 text-slate-700">
              {company.customTerms ||
                'Cette carte de service est strictement personnelle et demeure la propriété de l’entreprise. En cas de perte, merci de la retourner immédiatement au service RH.'}
            </p>
            <div className="pt-0.5 flex items-center justify-between text-[7px] text-slate-500 font-mono">
              <span>Tél: {company.phone}</span>
              <span>Urgence: {company.emergencyPhone}</span>
            </div>
          </div>

          {/* Dual Signature Block: Titulaire de la carte + Autorité Émettrice */}
          <div className="mt-1 flex items-end justify-between px-1 gap-2 pt-0.5 border-t border-slate-200">
            {/* Signature Porteur / Titulaire */}
            <div className="flex-1 overflow-hidden">
              <span className="text-[6px] text-slate-400 block uppercase font-semibold">
                Signature du Titulaire
              </span>
              <span className="font-bold text-[7.5px] text-slate-800 line-clamp-1">
                {employee.firstName} {employee.lastName}
              </span>
              <div className="h-6 w-20 flex items-center justify-start">
                {employee.employeeSignatureUrl ? (
                  <img
                    src={employee.employeeSignatureUrl}
                    alt="Signature Titulaire"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[5.5px] text-slate-400 italic">Signature manuelle</span>
                )}
              </div>
            </div>

            {/* Signature Autorité Émettrice */}
            <div className="flex-1 overflow-hidden text-right flex flex-col items-end">
              <span className="text-[6px] text-slate-400 block uppercase font-semibold">
                Autorité Émettrice
              </span>
              <span className="font-bold text-[7.5px] text-slate-800 line-clamp-1">
                {company.managerName}
              </span>
              <div className="h-6 w-20 flex items-center justify-end">
                <img
                  src={company.managerSignatureUrl}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain filter contrast-150"
                />
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Verification Box */}
        <div className="flex flex-col items-center justify-center bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm flex-shrink-0 text-center">
          <div className="w-[68px] h-[68px] bg-white rounded overflow-hidden flex items-center justify-center p-0.5">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            ) : (
              <QrIcon className="w-12 h-12 text-slate-400" />
            )}
          </div>
          <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-900 mt-0.5">
            SCAN POUR VÉRIFIER
          </span>
          <span className="text-[5.5px] font-mono text-slate-400">
            {employee.token.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* Footer Fingerprint */}
      <div className="flex items-center justify-between text-[6.5px] text-slate-400 font-mono pt-1 border-t border-slate-200">
        <span>SIG: {cryptoHash.slice(0, 20)}...</span>
        <span className="font-bold text-slate-700">UNINCOMPANY SECURITY AUTH</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// WATERMARK & BACKGROUND BRAND LOGO OVERLAY
// -------------------------------------------------------------
interface WatermarkOverlayProps {
  company: Company;
  watermarkType: string;
  opacity: number;
  side: 'front' | 'back';
}

const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  company,
  watermarkType,
  opacity,
  side,
}) => {
  if (watermarkType === 'none' || opacity <= 0) return null;

  switch (watermarkType) {
    case 'giant_right':
      return (
        <div
          className="absolute -right-16 -bottom-16 w-72 h-72 pointer-events-none z-0 overflow-hidden"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-full h-full object-contain filter grayscale contrast-200"
          />
        </div>
      );
    case 'diagonal_faint':
      return (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 transform -rotate-12 scale-125"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-48 h-48 object-contain filter grayscale"
          />
        </div>
      );
    case 'micro_logos':
      return (
        <div
          className="absolute inset-0 pointer-events-none z-0 flex flex-wrap gap-8 p-4 items-center justify-center overflow-hidden"
          style={{ opacity }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <img
              key={i}
              src={company.logoUrl}
              alt=""
              className="w-8 h-8 object-contain filter grayscale transform rotate-12"
            />
          ))}
        </div>
      );
    case 'behind_photo':
      return (
        <div
          className="absolute left-6 top-10 w-36 h-36 pointer-events-none z-0"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-full h-full object-contain filter grayscale"
          />
        </div>
      );
    case 'pattern_discreet':
      return (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            opacity,
            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
            backgroundSize: '16px 16px',
          }}
        />
      );
    case 'vertical_stripe':
      return (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-0 bg-gradient-to-r from-black/10 to-transparent flex items-center justify-center"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-6 h-6 object-contain filter grayscale"
          />
        </div>
      );
    case 'back_watermark':
      if (side !== 'back') return null;
      return (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-40 h-40 object-contain filter grayscale"
          />
        </div>
      );
    case 'center_transparent':
    default:
      return (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity }}
        >
          <img
            src={company.logoUrl}
            alt=""
            className="w-44 h-44 object-contain filter grayscale contrast-150"
          />
        </div>
      );
  }
};

// -------------------------------------------------------------
// DYNAMIC CUSTOM FIELDS OVERLAY
// -------------------------------------------------------------
interface CustomFieldsOverlayProps {
  customFields: import('../../types').CustomField[];
  customFieldValues?: Record<string, string>;
  side: 'front' | 'back';
  primaryColor: string;
}

const CustomFieldsOverlay: React.FC<CustomFieldsOverlayProps> = ({
  customFields,
  customFieldValues = {},
  side,
  primaryColor,
}) => {
  const visibleFields = customFields.filter(
    (f) => (f.side || 'front') === side && f.showOnCard !== false
  );

  if (visibleFields.length === 0) return null;

  // Separate absolute positioned (with custom coords or presets) vs standard stacked
  const freeOrPresetFields = visibleFields.filter(
    (f) => f.x !== undefined || (f.placementPreset && f.placementPreset !== 'top_right')
  );
  const defaultStackedFields = visibleFields.filter(
    (f) => f.x === undefined && (!f.placementPreset || f.placementPreset === 'top_right')
  );

  const renderSingleField = (field: import('../../types').CustomField) => {
    const val = customFieldValues[field.id] || field.defaultValue || '';
    if (!val && !field.name) return null;

    const fontFam = field.fontFamily || 'Inter, sans-serif';
    const fontSz = field.fontSize ? `${field.fontSize}px` : '7px';
    const fontWt = field.fontWeight || 'bold';
    const bgCol = field.color || primaryColor;
    const txtCol = field.textColor || field.fontColor || '#ffffff';
    const variant = field.styleVariant || (field.type === 'badge' ? 'badge_filled' : 'subtle_card');

    if (variant === 'badge_filled') {
      return (
        <div
          key={field.id}
          className="px-2 py-0.5 rounded shadow-sm flex items-center space-x-1 pointer-events-none whitespace-nowrap"
          style={{
            backgroundColor: bgCol,
            color: txtCol,
            fontFamily: fontFam,
            fontSize: fontSz,
            fontWeight: fontWt,
            borderRadius: field.borderRadius !== undefined ? `${field.borderRadius}px` : '4px',
            border: field.borderWidth ? `${field.borderWidth}px solid ${field.borderColor || '#ffffff'}` : undefined,
          }}
        >
          {field.name && <span className="opacity-80 text-[85%]">{field.name}:</span>}
          <span>{val || field.name}</span>
        </div>
      );
    }

    if (variant === 'badge_outlined') {
      return (
        <div
          key={field.id}
          className="px-2 py-0.5 rounded shadow-xs flex items-center space-x-1 pointer-events-none bg-white/90 backdrop-blur-[2px] whitespace-nowrap"
          style={{
            borderColor: bgCol,
            borderWidth: field.borderWidth ? `${field.borderWidth}px` : '1.5px',
            borderStyle: 'solid',
            color: field.textColor || bgCol,
            fontFamily: fontFam,
            fontSize: fontSz,
            fontWeight: fontWt,
            borderRadius: field.borderRadius !== undefined ? `${field.borderRadius}px` : '4px',
          }}
        >
          {field.name && <span className="opacity-75 text-[85%]">{field.name}:</span>}
          <span>{val || field.name}</span>
        </div>
      );
    }

    if (variant === 'compact_chip') {
      return (
        <div
          key={field.id}
          className="px-1.5 py-0.2 rounded-full shadow-xs flex items-center space-x-1 pointer-events-none whitespace-nowrap"
          style={{
            backgroundColor: bgCol,
            color: txtCol,
            fontFamily: fontFam,
            fontSize: fontSz,
            fontWeight: fontWt,
          }}
        >
          <span>{val || field.name}</span>
        </div>
      );
    }

    if (variant === 'plain_text') {
      return (
        <div
          key={field.id}
          className="pointer-events-none leading-tight drop-shadow-xs whitespace-nowrap"
          style={{
            color: field.textColor || field.color || '#0f172a',
            fontFamily: fontFam,
            fontSize: fontSz,
            fontWeight: fontWt,
          }}
        >
          {field.name && <span className="text-[80%] opacity-70 block uppercase tracking-wider">{field.name}</span>}
          <span className="block font-bold">{val || field.name}</span>
        </div>
      );
    }

    // Default: subtle_card
    return (
      <div
        key={field.id}
        className="leading-tight bg-white/90 backdrop-blur-[2px] px-1.5 py-0.5 rounded shadow-xs pointer-events-none whitespace-nowrap"
        style={{
          color: field.textColor || '#0f172a',
          fontFamily: fontFam,
          fontSize: fontSz,
          fontWeight: fontWt,
          borderRadius: field.borderRadius !== undefined ? `${field.borderRadius}px` : '4px',
          border: `1px solid ${field.borderColor || 'rgba(226, 232, 240, 0.8)'}`,
        }}
      >
        {field.name && (
          <span className="text-[6.5px] text-slate-500 uppercase font-semibold block tracking-wider">
            {field.name}
          </span>
        )}
        <span className="font-bold truncate max-w-[130px] block" style={{ color: field.color || '#0f172a' }}>
          {val || field.name}
        </span>
      </div>
    );
  };

  const getPresetStyles = (preset?: string): React.CSSProperties => {
    switch (preset) {
      case 'top_left':
        return { position: 'absolute', top: '10px', left: '12px', zIndex: 35 };
      case 'top_center':
        return { position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 35 };
      case 'bottom_left':
        return { position: 'absolute', bottom: '10px', left: '12px', zIndex: 35 };
      case 'bottom_right':
        return { position: 'absolute', bottom: '10px', right: '12px', zIndex: 35 };
      case 'bottom_center':
        return { position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 35 };
      case 'header_badge':
        return { position: 'absolute', top: '6px', right: '8px', zIndex: 35 };
      case 'footer_badge':
        return { position: 'absolute', bottom: '6px', left: '8px', zIndex: 35 };
      default:
        return { position: 'absolute', top: '10px', right: '12px', zIndex: 35 };
    }
  };

  return (
    <>
      {/* Default Top-Right Stacked Container */}
      {defaultStackedFields.length > 0 && (
        <div className="absolute right-3 top-9 pointer-events-none z-35 flex flex-col items-end gap-1 max-w-[150px]">
          {defaultStackedFields.map((field) => renderSingleField(field))}
        </div>
      )}

      {/* Freely Positioned or Specific Preset Fields */}
      {freeOrPresetFields.map((field) => {
        const style: React.CSSProperties =
          field.x !== undefined && field.y !== undefined
            ? {
                position: 'absolute',
                left: `${field.x}%`,
                top: `${field.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 35,
              }
            : getPresetStyles(field.placementPreset);

        return (
          <div key={field.id} style={style} className="pointer-events-none">
            {renderSingleField(field)}
          </div>
        );
      })}
    </>
  );
};

// -------------------------------------------------------------
// MANUFACTURER / PLATFORM BRANDING OVERLAY
// -------------------------------------------------------------
interface ManufacturerOverlayProps {
  manufacturer?: import('../../types').ManufacturerConfig;
  show: boolean;
  side: 'front' | 'back';
}

const ManufacturerOverlay: React.FC<ManufacturerOverlayProps> = ({
  manufacturer,
  show,
  side,
}) => {
  if (!show || !manufacturer?.enabled) return null;

  // Render on verso by default, or front if configured
  const pos = manufacturer.position || 'bottom_right';
  const size = manufacturer.size || 'small';

  const positionClasses = {
    top_left: 'top-1.5 left-2',
    top_right: 'top-1.5 right-2',
    bottom_left: 'bottom-1 left-2',
    bottom_right: 'bottom-1 right-2',
    back_center: 'bottom-1 left-1/2 -translate-x-1/2',
    bottom_stripe: 'bottom-0 left-0 right-0 bg-slate-900/90 text-white py-0.5 px-2 flex justify-between',
  }[pos] || 'bottom-1 right-2';

  const sizeStyles = {
    small: 'text-[5.5px] scale-95',
    medium: 'text-[6.5px] scale-100',
    large: 'text-[7.5px] scale-105',
  }[size] || 'text-[5.5px]';

  return (
    <div
      className={`absolute ${positionClasses} pointer-events-none z-30 flex items-center space-x-1 opacity-75 font-mono ${sizeStyles}`}
    >
      {manufacturer.logoUrl && (
        <img
          src={manufacturer.logoUrl}
          alt=""
          className="w-2.5 h-2.5 object-contain"
        />
      )}
      <span className="tracking-tight text-slate-500 font-semibold truncate max-w-[150px]">
        {manufacturer.name || 'RM Card Services'}
      </span>
    </div>
  );
};
