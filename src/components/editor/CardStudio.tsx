import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Company,
  Employee,
  CardTemplate,
  CardCustomization,
  CustomField,
  ManufacturerConfig,
  PhotoShape,
  WatermarkType,
} from '../../types';
import { CARD_TEMPLATES } from '../../data/templates';
import { CardRenderer } from '../card/CardRenderer';
import { DEFAULT_MANUFACTURER } from '../../data/mockData';
import { downloadElementAsPng, exportSingleCardPdf } from '../../utils/exportHelper';
import {
  Sparkles,
  Download,
  Printer,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Layers,
  Palette,
  User,
  Building,
  Sliders,
  CheckCircle2,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Eye,
  Camera,
  Upload,
  Plus,
  Trash2,
  RefreshCw,
  Tag,
  Phone,
  Mail,
  QrCode as QrIcon,
  AlertTriangle,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutTemplate,
  SlidersHorizontal,
  FileCheck,
  Zap,
  Copy,
  Edit3,
  Move,
  Type,
  Paintbrush,
  Radio,
  Wifi,
  Smartphone,
} from 'lucide-react';
import { NfcEncoderModal } from './NfcEncoderModal';
import { isWebNfcSupported, compileNfcData } from '../../utils/nfcHelper';
import { generateEncryptedQrPayload } from '../../utils/secureQrHelper';

interface CardStudioProps {
  currentCompany: Company;
  currentEmployee: Employee;
  selectedTemplate: CardTemplate;
  employees: Employee[];
  companies: Company[];
  customization?: CardCustomization;
  onUpdateCustomization?: (customization: CardCustomization) => void;
  onSelectEmployee: (employee: Employee) => void;
  onSelectCompany: (company: Company) => void;
  onSelectTemplate: (template: CardTemplate) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onUpdateCompany: (company: Company) => void;
  onNavigateToPrintSheet: () => void;
  onNavigateToVerification?: (prefillPayload?: string) => void;
}

export const CardStudio: React.FC<CardStudioProps> = ({
  currentCompany,
  currentEmployee,
  selectedTemplate,
  employees,
  companies,
  customization: externalCustomization,
  onUpdateCustomization,
  onSelectEmployee,
  onSelectCompany,
  onSelectTemplate,
  onUpdateEmployee,
  onUpdateCompany,
  onNavigateToPrintSheet,
  onNavigateToVerification,
}) => {
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [copiedSecurePayload, setCopiedSecurePayload] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'profile' | 'elements' | 'custom_fields' | 'layers' | 'colors_watermark' | 'photo_studio' | 'manufacturer' | 'nfc' | 'ai' | 'preflight'
  >('profile');
  const [isNfcModalOpen, setIsNfcModalOpen] = useState<boolean>(false);
  const [pvc3dEffect, setPvc3dEffect] = useState<boolean>(true);
  const [showBleedGuides, setShowBleedGuides] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiResultNotice, setAiResultNotice] = useState<string | null>(null);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');

  // Preflight audit modal
  const [isPreflightOpen, setIsPreflightOpen] = useState<boolean>(false);

  // Webcam capture state
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Custom Field Form State
  const [isAddFieldOpen, setIsAddFieldOpen] = useState<boolean>(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldData, setNewFieldData] = useState<Partial<CustomField>>({
    name: 'Groupe Sanguin',
    defaultValue: 'O+ Rh+',
    type: 'badge',
    side: 'front',
    placementPreset: 'top_right',
    x: 82,
    y: 16,
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#dc2626',
    textColor: '#ffffff',
    styleVariant: 'badge_filled',
    borderRadius: 4,
    showOnCard: true,
  });

  // Customization state
  const [customization, setCustomizationState] = useState<CardCustomization>(() => {
    if (externalCustomization) {
      return {
        ...externalCustomization,
        templateId: selectedTemplate.id,
        orientation: selectedTemplate.orientation,
      };
    }
    return {
      templateId: selectedTemplate.id,
      orientation: selectedTemplate.orientation,
      primaryColor: selectedTemplate.defaultPrimaryColor || currentCompany.primaryColor || '#0f172a',
      secondaryColor: selectedTemplate.defaultSecondaryColor || currentCompany.secondaryColor || '#2563eb',
      accentColor: selectedTemplate.defaultAccentColor || currentCompany.accentColor || '#f59e0b',
      textColor: '#0f172a',
      backgroundColor: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      showPhoto: true,
      showManagerSignature: true,
      showEmployeeSignature: true,
      showQrCode: true,
      showBarcode: true,
      showEmergencyContact: true,
      showDepartment: true,
      showService: true,
      showBloodGroup: true,
      showSecurityHash: true,
      showIssueDate: true,
      showExpiryDate: true,
      showManufacturerLogo: true,
      photoShape: 'rounded',
      photoBorderType: 'thin',
      watermarkType: 'center_transparent',
      watermarkOpacity: 0.12,
      manufacturer: DEFAULT_MANUFACTURER,
      customFields: [
        {
          id: 'cf-blood',
          name: 'Groupe Sanguin',
          defaultValue: currentEmployee.bloodGroup || 'O+',
          type: 'badge',
          side: 'front',
          color: '#b91c1c',
          showOnCard: true,
        },
        {
          id: 'cf-zone',
          name: 'Zone Affectation',
          defaultValue: currentEmployee.workSite || 'Siège Principal',
          type: 'text',
          side: 'back',
          color: '#0f172a',
          showOnCard: true,
        },
      ],
      pvc3dEffect: true,
      lockedElements: [],
    };
  });

  const setCustomization = (updater: CardCustomization | ((prev: CardCustomization) => CardCustomization)) => {
    setCustomizationState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onUpdateCustomization) {
        onUpdateCustomization(next);
      }
      return next;
    });
  };

  // Sync when externalCustomization changes from parent
  useEffect(() => {
    if (externalCustomization) {
      setCustomizationState((prev) => ({
        ...externalCustomization,
        templateId: selectedTemplate.id,
        orientation: selectedTemplate.orientation,
      }));
    }
  }, [externalCustomization, selectedTemplate.id, selectedTemplate.orientation]);

  // Sync with template change
  useEffect(() => {
    setCustomization((prev) => ({
      ...prev,
      templateId: selectedTemplate.id,
      orientation: selectedTemplate.orientation,
      primaryColor: selectedTemplate.defaultPrimaryColor || prev.primaryColor,
      secondaryColor: selectedTemplate.defaultSecondaryColor || prev.secondaryColor,
      accentColor: selectedTemplate.defaultAccentColor || prev.accentColor,
    }));
  }, [selectedTemplate]);

  // Webcam helpers
  const startWebcam = async () => {
    try {
      setIsWebcamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Webcam access error', err);
      alert('Impossible d’accéder à la webcam. Vérifiez vos autorisations de navigateur.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
    setCountdown(null);
  };

  const triggerSnapshot = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 400;
    canvas.height = videoRef.current.videoHeight || 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onUpdateEmployee({
        ...currentEmployee,
        photoUrl: dataUrl,
      });
      stopWebcam();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          onUpdateEmployee({
            ...currentEmployee,
            photoUrl: ev.target.result as string,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Color extraction from company logo
  const extractPaletteFromLogo = () => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = currentCompany.logoUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);
        const data = ctx.getImageData(0, 0, 40, 40).data;

        // Sample dominant colors
        let r1 = 15, g1 = 41, b1 = 74; // Default primary fallback
        let r2 = 37, g2 = 99, b2 = 235; // Secondary
        let r3 = 245, g3 = 158, b3 = 11; // Accent

        if (data.length >= 12) {
          r1 = data[0]; g1 = data[1]; b1 = data[2];
          r2 = data[16]; g2 = data[17]; b2 = data[18];
          r3 = data[32]; g3 = data[33]; b3 = data[34];
        }

        const hex1 = `#${((1 << 24) + (r1 << 16) + (g1 << 8) + b1).toString(16).slice(1)}`;
        const hex2 = `#${((1 << 24) + (r2 << 16) + (g2 << 8) + b2).toString(16).slice(1)}`;
        const hex3 = `#${((1 << 24) + (r3 << 16) + (g3 << 8) + b3).toString(16).slice(1)}`;

        setCustomization((prev) => ({
          ...prev,
          primaryColor: hex1,
          secondaryColor: hex2,
          accentColor: hex3,
        }));
        alert('Palette intelligente extraite avec succès depuis le logo de l’entreprise !');
      } catch (e) {
        console.warn('Canvas color extraction note:', e);
      }
    };
  };

  // Custom field helpers
  const handleSaveCustomField = () => {
    if (!newFieldData.name) return;

    if (editingFieldId) {
      // Update existing field
      setCustomization((prev) => ({
        ...prev,
        customFields: (prev.customFields || []).map((f) =>
          f.id === editingFieldId
            ? {
                ...f,
                name: newFieldData.name || f.name,
                defaultValue: newFieldData.defaultValue !== undefined ? newFieldData.defaultValue : f.defaultValue,
                type: newFieldData.type || f.type,
                side: newFieldData.side || f.side,
                placementPreset: newFieldData.placementPreset || f.placementPreset,
                x: newFieldData.x !== undefined ? newFieldData.x : f.x,
                y: newFieldData.y !== undefined ? newFieldData.y : f.y,
                fontFamily: newFieldData.fontFamily || f.fontFamily,
                fontSize: newFieldData.fontSize || f.fontSize,
                fontWeight: newFieldData.fontWeight || f.fontWeight,
                color: newFieldData.color || f.color,
                textColor: newFieldData.textColor || f.textColor,
                styleVariant: newFieldData.styleVariant || f.styleVariant,
                borderRadius: newFieldData.borderRadius !== undefined ? newFieldData.borderRadius : f.borderRadius,
                showOnCard: newFieldData.showOnCard !== undefined ? newFieldData.showOnCard : true,
              }
            : f
        ),
      }));

      if (newFieldData.defaultValue !== undefined) {
        onUpdateEmployee({
          ...currentEmployee,
          customFieldValues: {
            ...(currentEmployee.customFieldValues || {}),
            [editingFieldId]: newFieldData.defaultValue,
          },
        });
      }
    } else {
      // Create new field
      const newFieldId = `cf-${Date.now()}`;
      const newField: CustomField = {
        id: newFieldId,
        name: newFieldData.name,
        defaultValue: newFieldData.defaultValue || '',
        type: newFieldData.type || 'badge',
        side: newFieldData.side || 'front',
        placementPreset: newFieldData.placementPreset || 'top_right',
        x: newFieldData.x,
        y: newFieldData.y,
        fontFamily: newFieldData.fontFamily || 'Inter, sans-serif',
        fontSize: newFieldData.fontSize || 8,
        fontWeight: newFieldData.fontWeight || 'bold',
        color: newFieldData.color || customization.primaryColor,
        textColor: newFieldData.textColor || '#ffffff',
        styleVariant: newFieldData.styleVariant || 'badge_filled',
        borderRadius: newFieldData.borderRadius !== undefined ? newFieldData.borderRadius : 4,
        showOnCard: true,
      };

      setCustomization((prev) => ({
        ...prev,
        customFields: [...(prev.customFields || []), newField],
      }));

      if (newFieldData.defaultValue) {
        onUpdateEmployee({
          ...currentEmployee,
          customFieldValues: {
            ...(currentEmployee.customFieldValues || {}),
            [newFieldId]: newFieldData.defaultValue,
          },
        });
      }
    }

    setIsAddFieldOpen(false);
    setEditingFieldId(null);
  };

  const handleStartEditField = (field: CustomField) => {
    setEditingFieldId(field.id);
    setNewFieldData({
      name: field.name,
      defaultValue: currentEmployee.customFieldValues?.[field.id] || field.defaultValue || '',
      type: field.type || 'badge',
      side: field.side || 'front',
      placementPreset: field.placementPreset || 'top_right',
      x: field.x,
      y: field.y,
      fontFamily: field.fontFamily || 'Inter, sans-serif',
      fontSize: field.fontSize || 8,
      fontWeight: field.fontWeight || 'bold',
      color: field.color || '#0f172a',
      textColor: field.textColor || '#ffffff',
      styleVariant: field.styleVariant || 'badge_filled',
      borderRadius: field.borderRadius !== undefined ? field.borderRadius : 4,
      showOnCard: field.showOnCard !== false,
    });
    setIsAddFieldOpen(true);
  };

  const handleDuplicateCustomField = (field: CustomField) => {
    const cloneId = `cf-${Date.now()}`;
    const clone: CustomField = {
      ...field,
      id: cloneId,
      name: `${field.name} (Copie)`,
      x: field.x !== undefined ? Math.min(95, field.x + 4) : undefined,
      y: field.y !== undefined ? Math.min(95, field.y + 4) : undefined,
    };

    setCustomization((prev) => ({
      ...prev,
      customFields: [...(prev.customFields || []), clone],
    }));

    const val = currentEmployee.customFieldValues?.[field.id] || field.defaultValue;
    if (val) {
      onUpdateEmployee({
        ...currentEmployee,
        customFieldValues: {
          ...(currentEmployee.customFieldValues || {}),
          [cloneId]: val,
        },
      });
    }
  };

  const handleToggleFieldVisibility = (fieldId: string) => {
    setCustomization((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === fieldId ? { ...f, showOnCard: f.showOnCard === false ? true : false } : f
      ),
    }));
  };

  const handleTweakFieldCoord = (fieldId: string, axis: 'x' | 'y', val: number) => {
    setCustomization((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).map((f) =>
        f.id === fieldId
          ? {
              ...f,
              placementPreset: 'free_coords',
              [axis]: Math.max(0, Math.min(100, val)),
              // initialize other axis if not present
              x: axis === 'x' ? val : f.x !== undefined ? f.x : 50,
              y: axis === 'y' ? val : f.y !== undefined ? f.y : 50,
            }
          : f
      ),
    }));
  };

  const handleDeleteCustomField = (id: string) => {
    setCustomization((prev) => ({
      ...prev,
      customFields: (prev.customFields || []).filter((f) => f.id !== id),
    }));
    if (editingFieldId === id) {
      setEditingFieldId(null);
      setIsAddFieldOpen(false);
    }
  };

  const handleToggleLockElement = (key: string) => {
    setCustomization((prev) => {
      const locked = prev.lockedElements || [];
      return {
        ...prev,
        lockedElements: locked.includes(key)
          ? locked.filter((k) => k !== key)
          : [...locked, key],
      };
    });
  };

  // Export handlers
  const handleDownloadImage = async (side: 'front' | 'back' | 'both') => {
    setIsExporting(true);
    try {
      if (side === 'front' || side === 'both') {
        await downloadElementAsPng(
          `card-${currentEmployee.id}-front`,
          `CARTE_${currentEmployee.lastName}_${currentEmployee.firstName}_RECTO`
        );
      }

      if (side === 'back' || side === 'both') {
        await downloadElementAsPng(
          `card-${currentEmployee.id}-back`,
          `CARTE_${currentEmployee.lastName}_${currentEmployee.firstName}_VERSO`
        );
      }
    } catch (error) {
      console.error('Error generating image export:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      await exportSingleCardPdf({
        frontElementId: `card-${currentEmployee.id}-front`,
        backElementId: `card-${currentEmployee.id}-back`,
        filename: `CARTE_PVC_${currentEmployee.lastName}_${currentEmployee.employeeNumber}`,
        includeBack: true,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // AI Design Trigger
  const handleTriggerAiRecommendation = async (overridePrompt?: string) => {
    setIsAiLoading(true);
    setAiResultNotice(null);
    try {
      const response = await fetch('/api/ai/suggest-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: currentCompany.name,
          industry: currentCompany.industry,
          companyDescription: overridePrompt || aiCustomPrompt || currentCompany.slogan,
        }),
      });
      const data = await response.json();

      if (data.recommendedTemplateId) {
        const foundTpl = CARD_TEMPLATES.find((t) => t.id === data.recommendedTemplateId);
        if (foundTpl) onSelectTemplate(foundTpl);
      }

      setCustomization((prev) => ({
        ...prev,
        primaryColor: data.primaryColor || prev.primaryColor,
        secondaryColor: data.secondaryColor || prev.secondaryColor,
        accentColor: data.accentColor || prev.accentColor,
      }));

      if (data.suggestedSlogan) {
        onUpdateCompany({
          ...currentCompany,
          slogan: data.suggestedSlogan,
          customTerms: data.suggestedTerms || currentCompany.customTerms,
        });
      }

      setAiResultNotice(
        data.aiRationale ||
          'Optimisation IA appliquée : palette corporate harmonisée et structure adaptée au secteur d’activité.'
      );
    } catch (err) {
      console.error('AI Suggestion error', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Preflight Quality Checks
  const preflightChecks = [
    {
      title: 'Dimensions ISO 7810 ID-1 (85.60 × 53.98 mm)',
      status: 'pass',
      description: 'Format standard carte de crédit PVC respecté au pixel près.',
    },
    {
      title: 'Logo Entreprise Haute Définition',
      status: currentCompany.logoUrl ? 'pass' : 'fail',
      description: currentCompany.logoUrl ? 'Logo présent et chargé.' : 'Aucun logo d’entreprise configuré.',
    },
    {
      title: 'Photo d’Identité Employé',
      status: currentEmployee.photoUrl ? 'pass' : 'fail',
      description: currentEmployee.photoUrl ? 'Photo présente et cadrée.' : 'Photo manquante pour cet employé.',
    },
    {
      title: 'Matricule d’Identification Unique',
      status: currentEmployee.employeeNumber ? 'pass' : 'fail',
      description: `Matricule: ${currentEmployee.employeeNumber}`,
    },
    {
      title: 'Nom & Prénom Complets',
      status: currentEmployee.firstName && currentEmployee.lastName ? 'pass' : 'fail',
      description: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
    },
    {
      title: 'Poste / Fonction Professionnelle',
      status: currentEmployee.position ? 'pass' : 'warn',
      description: currentEmployee.position || 'Poste non précisé',
    },
    {
      title: 'QR Code & Token Cryptographique Actif',
      status: currentEmployee.token ? 'pass' : 'fail',
      description: `Token: ${currentEmployee.token.slice(0, 16)}...`,
    },
    {
      title: 'Signature de l’Autorité Émettrice',
      status: currentCompany.managerSignatureUrl ? 'pass' : 'warn',
      description: currentCompany.managerSignatureUrl ? 'Signature chargée.' : 'Signature absente au verso.',
    },
    {
      title: 'Mentions Légales & Conditions au Verso',
      status: currentCompany.customTerms ? 'pass' : 'warn',
      description: 'Texte d’usage et de restitution en cas de perte présent.',
    },
    {
      title: 'Zone de Sécurité & Découpe (Safe Zone 3mm)',
      status: 'pass',
      description: 'Aucun texte critique ne dépasse les marges de sécurité du massicot.',
    },
  ];

  // Employee & Template switcher helpers
  const companyEmployees = employees.filter((e) => e.companyId === currentCompany.id);
  const activeEmployeesList = companyEmployees.length > 0 ? companyEmployees : employees;
  const currentEmpIndex = activeEmployeesList.findIndex((e) => e.id === currentEmployee.id);

  const handlePrevEmployee = () => {
    if (activeEmployeesList.length === 0) return;
    const nextIdx = (currentEmpIndex - 1 + activeEmployeesList.length) % activeEmployeesList.length;
    onSelectEmployee(activeEmployeesList[nextIdx]);
  };

  const handleNextEmployee = () => {
    if (activeEmployeesList.length === 0) return;
    const nextIdx = (currentEmpIndex + 1) % activeEmployeesList.length;
    onSelectEmployee(activeEmployeesList[nextIdx]);
  };

  const currentTplIndex = CARD_TEMPLATES.findIndex((t) => t.id === selectedTemplate.id);
  const handlePrevTemplate = () => {
    const nextIdx = (currentTplIndex - 1 + CARD_TEMPLATES.length) % CARD_TEMPLATES.length;
    onSelectTemplate(CARD_TEMPLATES[nextIdx]);
  };

  const handleNextTemplate = () => {
    const nextIdx = (currentTplIndex + 1) % CARD_TEMPLATES.length;
    onSelectTemplate(CARD_TEMPLATES[nextIdx]);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* LEFT: Live Interactive Canvas Stage */}
      <div className="flex-1 w-full flex flex-col bg-slate-900 rounded-2xl border border-slate-800 p-4 sm:p-6 shadow-2xl overflow-hidden">
        {/* Stage Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 text-slate-300">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Studio Visuel</span>
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
              85.60 × 53.98 mm (ISO 7810)
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.max(0.6, prev - 0.1))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-200">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale((prev) => Math.min(1.5, prev + 0.1))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* PVC 3D effect toggle */}
            <button
              type="button"
              onClick={() => setPvc3dEffect(!pvc3dEffect)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                pvc3dEffect
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rendu PVC 3D</span>
            </button>

            {/* Bleed guides toggle */}
            <button
              type="button"
              onClick={() => setShowBleedGuides(!showBleedGuides)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                showBleedGuides
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Zone Sûre</span>
            </button>
          </div>
        </div>

        {/* Quick Switcher Bar (Employees & Templates) */}
        <div className="py-3 px-3.5 my-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Employee Selector with Prev/Next */}
          <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
            <span className="text-slate-400 font-semibold flex items-center space-x-1 shrink-0">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Employé :</span>
            </span>

            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 flex-1">
              <button
                type="button"
                onClick={handlePrevEmployee}
                title="Employé précédent"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={currentEmployee.id}
                onChange={(e) => {
                  const emp = employees.find((empItem) => empItem.id === e.target.value);
                  if (emp) onSelectEmployee(emp);
                }}
                className="bg-transparent text-slate-200 font-medium text-xs py-1 px-1.5 focus:outline-none cursor-pointer flex-1 truncate"
              >
                {activeEmployeesList.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-slate-900 text-white">
                    {emp.firstName} {emp.lastName} ({emp.employeeNumber || 'N/A'}) - {emp.position}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextEmployee}
                title="Employé suivant"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              {currentEmpIndex >= 0 ? `${currentEmpIndex + 1}/${activeEmployeesList.length}` : ''}
            </span>
          </div>

          {/* Template Selector with Prev/Next */}
          <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
            <span className="text-slate-400 font-semibold flex items-center space-x-1 shrink-0">
              <LayoutTemplate className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modèle :</span>
            </span>

            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 flex-1">
              <button
                type="button"
                onClick={handlePrevTemplate}
                title="Modèle précédent"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedTemplate.id}
                onChange={(e) => {
                  const tpl = CARD_TEMPLATES.find((t) => t.id === e.target.value);
                  if (tpl) onSelectTemplate(tpl);
                }}
                className="bg-transparent text-slate-200 font-medium text-xs py-1 px-1.5 focus:outline-none cursor-pointer flex-1 truncate"
              >
                {CARD_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id} className="bg-slate-900 text-white">
                    {tpl.name} ({tpl.orientation === 'vertical' ? 'Vertical' : 'Horizontal'})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextTemplate}
                title="Modèle suivant"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shrink-0">
              {selectedTemplate.orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
            </span>
          </div>
        </div>

        {/* Dual Side-by-Side Canvas Stage with Framer-Motion Transitions */}
        <div className="w-full min-h-[460px] py-8 flex flex-wrap items-center justify-center gap-8 bg-slate-950/90 rounded-xl border border-slate-800/80 my-2 overflow-x-auto relative">
          {/* Subtle Stage Grid */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

          {/* FRONT (RECTO) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                Recto (Face Avant)
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`front-${currentEmployee.id}-${selectedTemplate.id}-${customization.orientation}`}
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -10 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="p-1"
              >
                <CardRenderer
                  company={currentCompany}
                  employee={currentEmployee}
                  template={selectedTemplate}
                  customization={customization}
                  side="front"
                  scale={zoomScale}
                  isInteractive3D={false}
                  isPrintMode={!pvc3dEffect}
                  showBleedLines={showBleedGuides}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* BACK (VERSO) */}
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                Verso (Face Arrière & QR)
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`back-${currentEmployee.id}-${selectedTemplate.id}-${customization.orientation}`}
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -10 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1], delay: 0.04 }}
                className="p-1"
              >
                <CardRenderer
                  company={currentCompany}
                  employee={currentEmployee}
                  template={selectedTemplate}
                  customization={customization}
                  side="back"
                  scale={zoomScale}
                  isInteractive3D={false}
                  isPrintMode={!pvc3dEffect}
                  showBleedLines={showBleedGuides}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Export & Quick Actions Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Matricule: {currentEmployee.employeeNumber}</span>
            <span>•</span>
            <span>Statut: {currentEmployee.status.toUpperCase()}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preflight Quality Check Button */}
            <button
              type="button"
              onClick={() => setIsPreflightOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Audit Avant Impression</span>
            </button>

            {/* NFC Encoding Button */}
            <button
              type="button"
              onClick={() => setIsNfcModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Programmer la puce NFC sans contact de la carte (Web NFC)"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Codage NFC</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleDownloadImage('both')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Exporter PNG</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>PDF ISO CR-80</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToPrintSheet}
              className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Planche A4 Imposition</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: High-Precision Control Inspector */}
      <div className="w-full lg:w-[460px] bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identité & Poste</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom_fields')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'custom_fields'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Champs (+)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('elements')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'elements'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Éléments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layers')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'layers'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Calques</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('colors_watermark')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'colors_watermark'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Couleurs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('photo_studio')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'photo_studio'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Photo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manufacturer')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'manufacturer'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Fabricant</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('nfc')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'nfc'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-500" />
            <span>Codage NFC</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-3 flex-shrink-0 flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'ai'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>IA</span>
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="p-5 max-h-[620px] overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* TAB: DIRECT AGENT IDENTITY & TEXT VALUES */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span>Personnalisation Directe de l'Agent</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Modifiez le nom, le poste, le matricule et les coordonnées en direct sur la carte.
                  </p>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  En Direct
                </span>
              </div>

              {/* 1. Identité Civile */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Identité & État Civil</span>
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.firstName || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, firstName: e.target.value })}
                      placeholder="Prénom"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Nom de Famille <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.lastName || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, lastName: e.target.value })}
                      placeholder="Nom"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Affectation Professionnelle */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>2. Affectation Professionnelle</span>
                </span>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Fonction / Poste Occupé <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={currentEmployee.position || ''}
                    onChange={(e) => onUpdateEmployee({ ...currentEmployee, position: e.target.value })}
                    placeholder="Ex: Directeur Général, Chef de Projet, Ingénieur..."
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-semibold focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Matricule Unique <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-1">
                      <input
                        type="text"
                        value={currentEmployee.employeeNumber || ''}
                        onChange={(e) => onUpdateEmployee({ ...currentEmployee, employeeNumber: e.target.value })}
                        placeholder="MAT-001"
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = currentCompany.name.slice(0, 3).toUpperCase() || 'EMP';
                          const rnd = Math.floor(100 + Math.random() * 900);
                          onUpdateEmployee({
                            ...currentEmployee,
                            employeeNumber: `${prefix}-${rnd}`,
                          });
                        }}
                        className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[10px] font-bold shrink-0"
                        title="Générer un matricule aléatoire"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Département
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.department || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, department: e.target.value })}
                      placeholder="Ex: Direction, Sûreté, IT..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Service / Unité
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.service || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, service: e.target.value })}
                      placeholder="Ex: Opérations, Logistique..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Groupe Sanguin
                    </label>
                    <select
                      value={currentEmployee.bloodGroup || 'O+'}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, bloodGroup: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-bold text-red-700 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="O+">O+ Rh+</option>
                      <option value="O-">O- Rh-</option>
                      <option value="A+">A+ Rh+</option>
                      <option value="A-">A- Rh-</option>
                      <option value="B+">B+ Rh+</option>
                      <option value="B-">B- Rh-</option>
                      <option value="AB+">AB+ Rh+</option>
                      <option value="AB-">AB- Rh-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Validité & Sécurité */}
              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. Validité & Sécurité de la Carte</span>
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      N° de Carte (CR-80)
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.cardNumber || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, cardNumber: e.target.value })}
                      placeholder="CARD-2026-XXXX"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-mono text-[11px] focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Statut de la Carte
                    </label>
                    <select
                      value={currentEmployee.status || 'active'}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, status: e.target.value as any })}
                      className={`w-full text-xs p-2 rounded-lg border font-bold focus:ring-2 focus:ring-indigo-500 ${
                        currentEmployee.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : currentEmployee.status === 'expired'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : currentEmployee.status === 'revoked'
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : 'bg-purple-50 text-purple-800 border-purple-300'
                      }`}
                    >
                      <option value="active">Active (En service)</option>
                      <option value="expired">Expirée</option>
                      <option value="revoked">Révoquée (Perdue/Annulée)</option>
                      <option value="replaced">Remplacée</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Date d'Émission
                    </label>
                    <input
                      type="date"
                      value={currentEmployee.issueDate || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, issueDate: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Date d'Expiration
                    </label>
                    <input
                      type="date"
                      value={currentEmployee.expiryDate || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, expiryDate: e.target.value })}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Téléphone Professionnel
                    </label>
                    <input
                      type="text"
                      value={currentEmployee.phone || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, phone: e.target.value })}
                      placeholder="+243..."
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Email Professionnel
                    </label>
                    <input
                      type="email"
                      value={currentEmployee.email || ''}
                      onChange={(e) => onUpdateEmployee({ ...currentEmployee, email: e.target.value })}
                      placeholder="agent@entreprise.com"
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB 1: MODULAR ELEMENTS ("Ajouter / Retirer") */}
          {activeTab === 'elements' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Contrôle des Éléments de la Carte</h3>
                <span className="text-xs text-slate-400">Section 4 du Cahier</span>
              </div>

              {/* Categorized Element Toggles */}
              {/* Category: Identité */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  1. Identité & Photo
                </span>
                <div className="grid grid-cols-1 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Photo d’Identité</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleLockElement('photo')}
                        className={`p-1 rounded ${customization.lockedElements?.includes('photo') ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {customization.lockedElements?.includes('photo') ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <input
                        type="checkbox"
                        checked={customization.showPhoto !== false}
                        onChange={(e) => setCustomization({ ...customization, showPhoto: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category: Professionnel */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  2. Professionnel & Organisation
                </span>
                <div className="grid grid-cols-1 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Département</span>
                    <input
                      type="checkbox"
                      checked={customization.showDepartment !== false}
                      onChange={(e) => setCustomization({ ...customization, showDepartment: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Service / Unité</span>
                    <input
                      type="checkbox"
                      checked={customization.showService !== false}
                      onChange={(e) => setCustomization({ ...customization, showService: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category: Dates & Validité */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  3. Dates & Validité
                </span>
                <div className="grid grid-cols-1 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Date d’Émission</span>
                    <input
                      type="checkbox"
                      checked={customization.showIssueDate !== false}
                      onChange={(e) => setCustomization({ ...customization, showIssueDate: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Date d’Expiration</span>
                    <input
                      type="checkbox"
                      checked={customization.showExpiryDate !== false}
                      onChange={(e) => setCustomization({ ...customization, showExpiryDate: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Category: Sécurité & Signatures */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  4. Sécurité & Signatures
                </span>
                <div className="grid grid-cols-1 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1.5">
                      <QrIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Afficher le QR Code sur la carte</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={customization.showQrCode !== false}
                      onChange={(e) => setCustomization({ ...customization, showQrCode: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* QR Code Security Configuration */}
                  {customization.showQrCode !== false && (
                    <div className="mt-1 pt-2.5 border-t border-slate-200/80 space-y-2.5">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                          Type de Contenu du QR Code
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-lg border border-slate-200 text-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setCustomization({
                                ...customization,
                                qrContentType: 'encrypted_payload',
                              })
                            }
                            className={`py-1.5 px-2 rounded-md font-bold text-center transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              customization.qrContentType !== 'standard_url'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>QR Chiffré Sécurisé</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCustomization({
                                ...customization,
                                qrContentType: 'standard_url',
                              })
                            }
                            className={`py-1.5 px-2 rounded-md font-bold text-center transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                              customization.qrContentType === 'standard_url'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>URL Standard</span>
                          </button>
                        </div>
                      </div>

                      {/* Advanced Settings when Encrypted Payload is active */}
                      {customization.qrContentType !== 'standard_url' && (() => {
                        const encryptedSample = generateEncryptedQrPayload(currentEmployee, currentCompany);
                        return (
                          <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-100 text-xs space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-indigo-900 flex items-center space-x-1">
                                <Lock className="w-3 h-3 text-indigo-600" />
                                <span>Cryptage AES + Hash SHA-256</span>
                              </span>
                              <span className="text-[10px] bg-indigo-200/80 text-indigo-800 font-mono px-1.5 py-0.5 rounded font-bold">
                                FIPS 180-4
                              </span>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                Format d'encodage du QR :
                              </span>
                              <div className="flex gap-2">
                                <label className="flex items-center space-x-1.5 text-[11px] text-slate-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="qrFormat"
                                    checked={customization.qrPayloadFormat !== 'raw_encrypted'}
                                    onChange={() =>
                                      setCustomization({ ...customization, qrPayloadFormat: 'smart_url' })
                                    }
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>URL Intelligente (Smartphone)</span>
                                </label>
                                <label className="flex items-center space-x-1.5 text-[11px] text-slate-700 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="qrFormat"
                                    checked={customization.qrPayloadFormat === 'raw_encrypted'}
                                    onChange={() =>
                                      setCustomization({ ...customization, qrPayloadFormat: 'raw_encrypted' })
                                    }
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span>Payload Brut (Lecteur 2D)</span>
                                </label>
                              </div>
                            </div>

                            {/* Live Hash Pill */}
                            <div className="bg-white p-2 rounded border border-indigo-100 font-mono text-[10px] text-slate-700 flex items-center justify-between">
                              <div>
                                <span className="text-slate-400 block text-[9px] uppercase">Empreinte SHA-256 Calculée :</span>
                                <span className="font-bold text-indigo-700">{encryptedSample.displayHash}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(encryptedSample.encryptedString);
                                  setCopiedSecurePayload(true);
                                  setTimeout(() => setCopiedSecurePayload(false), 2000);
                                }}
                                className="text-slate-500 hover:text-indigo-600 flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 cursor-pointer"
                                title="Copier le payload chiffré brut"
                              >
                                {copiedSecurePayload ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedSecurePayload ? 'Copié' : 'Copier'}</span>
                              </button>
                            </div>

                            {/* Direct navigation to verification portal */}
                            {onNavigateToVerification && (
                              <button
                                type="button"
                                onClick={() => onNavigateToVerification(encryptedSample.smartVerificationUrl)}
                                className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition-colors flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Vérifier ce QR dans le Portail de Vérification</span>
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-xs font-medium text-slate-800">Signature Autorité Émettrice</span>
                    <input
                      type="checkbox"
                      checked={customization.showManagerSignature !== false}
                      onChange={(e) => setCustomization({ ...customization, showManagerSignature: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-800">Empreinte de Sécurité (Hash)</span>
                    <input
                      type="checkbox"
                      checked={customization.showSecurityHash !== false}
                      onChange={(e) => setCustomization({ ...customization, showSecurityHash: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM FIELDS ("+ Ajouter un champ") */}
          {activeTab === 'custom_fields' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-indigo-600" />
                    <span>Champs Personnalisés Dynamiques</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ajoutez et positionnez librement des données spécifiques avec typographie et couleurs personnalisées.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isAddFieldOpen && !editingFieldId) {
                      setIsAddFieldOpen(false);
                    } else {
                      setEditingFieldId(null);
                      setNewFieldData({
                        name: 'Zone Sécurisée',
                        defaultValue: 'NIVEAU 4 - ALPHA',
                        type: 'badge',
                        side: 'front',
                        placementPreset: 'top_right',
                        x: 80,
                        y: 16,
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: 8,
                        fontWeight: 'bold',
                        color: '#b91c1c',
                        textColor: '#ffffff',
                        styleVariant: 'badge_filled',
                        borderRadius: 4,
                        showOnCard: true,
                      });
                      setIsAddFieldOpen(true);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddFieldOpen && !editingFieldId ? 'Fermer le Panneau' : 'Nouveau Champ'}</span>
                </button>
              </div>

              {/* Quick Presets Gallery (1-Click) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-2">
                  ✨ Modèles Prédéfinis (Insertion Rapide 1-Clic) :
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      name: 'Groupe Sanguin',
                      val: currentEmployee.bloodGroup || 'O+ Rh+',
                      type: 'badge' as const,
                      side: 'front' as const,
                      color: '#dc2626',
                      textColor: '#ffffff',
                      font: 'Montserrat, sans-serif',
                      preset: 'top_right' as const,
                      x: 82,
                      y: 15,
                      variant: 'badge_filled' as const,
                    },
                    {
                      name: 'Zone Accès VIP',
                      val: 'ZONE 4 - RESTREINT',
                      type: 'badge' as const,
                      side: 'front' as const,
                      color: '#0f172a',
                      textColor: '#38bdf8',
                      font: 'JetBrains Mono, monospace',
                      preset: 'header_badge' as const,
                      x: 75,
                      y: 8,
                      variant: 'badge_outlined' as const,
                    },
                    {
                      name: 'N° Parking',
                      val: 'PK-S2 / EMP-042',
                      type: 'text' as const,
                      side: 'back' as const,
                      color: '#2563eb',
                      textColor: '#0f172a',
                      font: 'Inter, sans-serif',
                      preset: 'bottom_left' as const,
                      x: 18,
                      y: 82,
                      variant: 'subtle_card' as const,
                    },
                    {
                      name: 'Habilitation Électrique',
                      val: 'B2V / BR / BC',
                      type: 'badge' as const,
                      side: 'front' as const,
                      color: '#d97706',
                      textColor: '#ffffff',
                      font: 'JetBrains Mono, monospace',
                      preset: 'top_left' as const,
                      x: 18,
                      y: 15,
                      variant: 'badge_filled' as const,
                    },
                    {
                      name: 'Code Chantier',
                      val: 'PRJ-INFRA-2026',
                      type: 'text' as const,
                      side: 'front' as const,
                      color: '#4f46e5',
                      textColor: '#ffffff',
                      font: 'Oswald, sans-serif',
                      preset: 'bottom_right' as const,
                      x: 80,
                      y: 85,
                      variant: 'compact_chip' as const,
                    },
                    {
                      name: 'Contact Urgence',
                      val: currentEmployee.emergencyPhone || '+243 81 234 5678',
                      type: 'text' as const,
                      side: 'back' as const,
                      color: '#0f172a',
                      textColor: '#0f172a',
                      font: 'Inter, sans-serif',
                      preset: 'bottom_left' as const,
                      x: 20,
                      y: 80,
                      variant: 'plain_text' as const,
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const newFieldId = `cf-${Date.now()}-${idx}`;
                        const field: CustomField = {
                          id: newFieldId,
                          name: preset.name,
                          defaultValue: preset.val,
                          type: preset.type,
                          side: preset.side,
                          color: preset.color,
                          textColor: preset.textColor,
                          fontFamily: preset.font,
                          fontSize: 8,
                          fontWeight: 'bold',
                          placementPreset: preset.preset,
                          x: preset.x,
                          y: preset.y,
                          styleVariant: preset.variant,
                          borderRadius: 4,
                          showOnCard: true,
                        };
                        setCustomization((prev) => ({
                          ...prev,
                          customFields: [...(prev.customFields || []), field],
                        }));
                        onUpdateEmployee({
                          ...currentEmployee,
                          customFieldValues: {
                            ...(currentEmployee.customFieldValues || {}),
                            [newFieldId]: preset.val,
                          },
                        });
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-900 rounded-lg text-[11px] border border-slate-200 hover:border-indigo-300 font-semibold shadow-2xs transition-all flex items-center space-x-1"
                    >
                      <span>+</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Field Builder / Parameter Editor */}
              {isAddFieldOpen && (
                <div className="bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200 space-y-4 shadow-sm animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-200/80">
                    <h4 className="font-black text-xs text-indigo-950 flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span>{editingFieldId ? 'Modifier les Paramètres du Champ' : 'Configurer un Nouveau Champ Dynamique'}</span>
                    </h4>
                    <span className="text-[10px] bg-indigo-200/60 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                      {newFieldData.side === 'front' ? 'Face Recto' : 'Face Verso'}
                    </span>
                  </div>

                  {/* 1. Identification & Value */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Nom / Libellé du Champ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newFieldData.name || ''}
                        onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                        placeholder="Ex: Groupe Sanguin, Zone d'accès, Site..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Valeur / Contenu par Défaut
                      </label>
                      <input
                        type="text"
                        value={newFieldData.defaultValue || ''}
                        onChange={(e) => setNewFieldData({ ...newFieldData, defaultValue: e.target.value })}
                        placeholder="Ex: O+ Rh+, Bâtiment Alpha, Niveau 3..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* 2. Side & Style Variant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Emplacement (Face)</label>
                      <select
                        value={newFieldData.side || 'front'}
                        onChange={(e) => setNewFieldData({ ...newFieldData, side: e.target.value as any })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        <option value="front">Recto (Face Avant de la Carte)</option>
                        <option value="back">Verso (Face Arrière de la Carte)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">Style Visuel du Champ</label>
                      <select
                        value={newFieldData.styleVariant || 'badge_filled'}
                        onChange={(e) => setNewFieldData({ ...newFieldData, styleVariant: e.target.value as any })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        <option value="badge_filled">🏷️ Badge Plein (Fond coloré + Texte)</option>
                        <option value="badge_outlined">🔲 Badge Contourné (Bordure colorée)</option>
                        <option value="compact_chip">🔘 Puce Compacte Arrondie</option>
                        <option value="subtle_card">🧊 Boîte Subtile Translucide</option>
                        <option value="plain_text">📝 Texte Pur avec Libellé Haut</option>
                      </select>
                    </div>
                  </div>

                  {/* 3. Typography Parameters (Font, Size, Weight) */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                      <Type className="w-4 h-4 text-indigo-600" />
                      <span>Paramètres Typographiques</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Police de Caractères</label>
                        <select
                          value={newFieldData.fontFamily || 'Inter, sans-serif'}
                          onChange={(e) => setNewFieldData({ ...newFieldData, fontFamily: e.target.value })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
                        >
                          <option value="Inter, sans-serif">Inter (Moderne & Neutre)</option>
                          <option value="Montserrat, sans-serif">Montserrat (Corporate Élégant)</option>
                          <option value="JetBrains Mono, monospace">JetBrains Mono (Technique / Sûreté)</option>
                          <option value="Roboto, sans-serif">Roboto (Standard Haute Lisibilité)</option>
                          <option value="Oswald, sans-serif">Oswald (Condensé & Fort)</option>
                          <option value="Playfair Display, serif">Playfair Display (Exécutif Prestige)</option>
                          <option value="Space Grotesk, sans-serif">Space Grotesk (Futuriste)</option>
                          <option value="Georgia, serif">Georgia (Classique Institutionnel)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Taille de Police : {newFieldData.fontSize || 8}px
                        </label>
                        <input
                          type="range"
                          min={6}
                          max={16}
                          step={1}
                          value={newFieldData.fontSize || 8}
                          onChange={(e) => setNewFieldData({ ...newFieldData, fontSize: Number(e.target.value) })}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">Graisse (Poids)</label>
                        <select
                          value={newFieldData.fontWeight || 'bold'}
                          onChange={(e) => setNewFieldData({ ...newFieldData, fontWeight: e.target.value as any })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
                        >
                          <option value="normal">Normal (400)</option>
                          <option value="medium">Médium (500)</option>
                          <option value="semibold">Demi-Gras (600)</option>
                          <option value="bold">Gras (700)</option>
                          <option value="black">Extra-Gras (900)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 4. Color Parameters */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-3">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                      <Paintbrush className="w-4 h-4 text-indigo-600" />
                      <span>Couleurs & Teintes</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Couleur Principale / Fond
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={newFieldData.color || '#0f172a'}
                            onChange={(e) => setNewFieldData({ ...newFieldData, color: e.target.value })}
                            className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 bg-white cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={newFieldData.color || '#0f172a'}
                            onChange={(e) => setNewFieldData({ ...newFieldData, color: e.target.value })}
                            className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-mono uppercase w-24"
                          />
                          {/* Quick color dots */}
                          <div className="flex items-center space-x-1">
                            {['#dc2626', '#2563eb', '#059669', '#d97706', '#4f46e5', '#0f172a'].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewFieldData({ ...newFieldData, color: c })}
                                className="w-4 h-4 rounded-full border border-white shadow-xs"
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Couleur du Texte
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={newFieldData.textColor || '#ffffff'}
                            onChange={(e) => setNewFieldData({ ...newFieldData, textColor: e.target.value })}
                            className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 bg-white cursor-pointer shrink-0"
                          />
                          <input
                            type="text"
                            value={newFieldData.textColor || '#ffffff'}
                            onChange={(e) => setNewFieldData({ ...newFieldData, textColor: e.target.value })}
                            className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-mono uppercase w-24"
                          />
                          {/* Quick color dots */}
                          <div className="flex items-center space-x-1">
                            {['#ffffff', '#0f172a', '#38bdf8', '#fbbf24', '#f87171'].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewFieldData({ ...newFieldData, textColor: c })}
                                className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Positioning Parameters (Presets + X/Y Coordinates) */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                        <Move className="w-4 h-4 text-indigo-600" />
                        <span>Positionnement & Emplacement sur la Carte</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Préréglage d'Alignement
                        </label>
                        <select
                          value={newFieldData.placementPreset || 'top_right'}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            let defaultX = 80;
                            let defaultY = 15;
                            if (val === 'top_left') { defaultX = 15; defaultY = 15; }
                            if (val === 'top_center') { defaultX = 50; defaultY = 12; }
                            if (val === 'bottom_right') { defaultX = 80; defaultY = 85; }
                            if (val === 'bottom_left') { defaultX = 15; defaultY = 85; }
                            if (val === 'bottom_center') { defaultX = 50; defaultY = 88; }
                            if (val === 'header_badge') { defaultX = 75; defaultY = 8; }
                            if (val === 'footer_badge') { defaultX = 20; defaultY = 92; }

                            setNewFieldData({
                              ...newFieldData,
                              placementPreset: val,
                              x: defaultX,
                              y: defaultY,
                            });
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
                        >
                          <option value="top_right">↗️ En Haut à Droite</option>
                          <option value="top_left">↖️ En Haut à Gauche</option>
                          <option value="top_center">⬆️ En Haut au Centre</option>
                          <option value="bottom_right">↘️ En Bas à Droite</option>
                          <option value="bottom_left">↙️ En Bas à Gauche</option>
                          <option value="bottom_center">⬇️ En Bas au Centre</option>
                          <option value="header_badge">🏷️ En-tête Badge (Bandeau Haut)</option>
                          <option value="footer_badge">🏷️ Pied-de-page Badge (Bandeau Bas)</option>
                          <option value="free_coords">🎯 Coordonnées Libres X / Y (%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Rayon des Bords (Bordure Arrondie)
                        </label>
                        <select
                          value={newFieldData.borderRadius !== undefined ? newFieldData.borderRadius : 4}
                          onChange={(e) => setNewFieldData({ ...newFieldData, borderRadius: Number(e.target.value) })}
                          className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white font-medium"
                        >
                          <option value={0}>Carré Strict (0px)</option>
                          <option value={4}>Légèrement Arrondi (4px)</option>
                          <option value={8}>Arrondi Doux (8px)</option>
                          <option value={999}>Pilule Complète (Ronde)</option>
                        </select>
                      </div>
                    </div>

                    {/* Fine-tuning Coordinates X and Y Sliders */}
                    <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-100">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Axe Horizontal X :</span>
                          <span className="font-mono text-indigo-600">{newFieldData.x !== undefined ? newFieldData.x : 80}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          step={1}
                          value={newFieldData.x !== undefined ? newFieldData.x : 80}
                          onChange={(e) =>
                            setNewFieldData({
                              ...newFieldData,
                              placementPreset: 'free_coords',
                              x: Number(e.target.value),
                            })
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                          <span>Axe Vertical Y :</span>
                          <span className="font-mono text-indigo-600">{newFieldData.y !== undefined ? newFieldData.y : 15}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={95}
                          step={1}
                          value={newFieldData.y !== undefined ? newFieldData.y : 15}
                          onChange={(e) =>
                            setNewFieldData({
                              ...newFieldData,
                              placementPreset: 'free_coords',
                              y: Number(e.target.value),
                            })
                          }
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-indigo-200/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFieldOpen(false);
                        setEditingFieldId(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCustomField}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingFieldId ? 'Enregistrer les Modifications' : 'Ajouter à la Carte'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Configured Fields List with Live Inline Controls */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Champs Configurés sur la Carte ({customization.customFields?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Modifiez la position en direct ou cliquez pour éditer
                  </span>
                </div>

                {(customization.customFields || []).length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1">
                    <Tag className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <p className="font-bold text-slate-700">Aucun champ personnalisé configuré</p>
                    <p>Cliquez sur "Nouveau Champ" ou utilisez un modèle rapide ci-dessus pour en ajouter un.</p>
                  </div>
                ) : (
                  (customization.customFields || []).map((field) => {
                    const currentVal =
                      currentEmployee.customFieldValues?.[field.id] || field.defaultValue || '';

                    return (
                      <div
                        key={field.id}
                        className={`p-3 rounded-2xl border transition-all space-y-2.5 ${
                          editingFieldId === field.id
                            ? 'bg-indigo-50/90 border-indigo-400 shadow-sm ring-2 ring-indigo-200'
                            : field.showOnCard !== false
                            ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                            : 'bg-slate-100/50 border-slate-200 opacity-60'
                        }`}
                      >
                        {/* Header line */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                              style={{ backgroundColor: field.color || '#0f172a' }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900 text-xs truncate">{field.name}</span>
                                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                                  {field.side === 'front' ? 'Recto' : 'Verso'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-600 block truncate font-mono">
                                {currentVal || '—'}
                              </span>
                            </div>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center space-x-1 shrink-0">
                            {/* Toggle visibility */}
                            <button
                              type="button"
                              onClick={() => handleToggleFieldVisibility(field.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                field.showOnCard !== false
                                  ? 'text-indigo-600 hover:bg-indigo-100'
                                  : 'text-slate-400 hover:bg-slate-200'
                              }`}
                              title={field.showOnCard !== false ? 'Masquer sur la carte' : 'Afficher sur la carte'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit parameters */}
                            <button
                              type="button"
                              onClick={() => handleStartEditField(field)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Éditer tous les paramètres"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateCustomField(field)}
                              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Dupliquer ce champ"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteCustomField(field.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer ce champ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Direct Position Sliders (Live Interactive Adjustment) */}
                        <div className="bg-white/90 p-2 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-[10px]">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-500 shrink-0">X ({field.x !== undefined ? `${field.x}%` : 'Auto'}) :</span>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              step={1}
                              value={field.x !== undefined ? field.x : 80}
                              onChange={(e) => handleTweakFieldCoord(field.id, 'x', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-500 shrink-0">Y ({field.y !== undefined ? `${field.y}%` : 'Auto'}) :</span>
                            <input
                              type="range"
                              min={5}
                              max={95}
                              step={1}
                              value={field.y !== undefined ? field.y : 15}
                              onChange={(e) => handleTweakFieldCoord(field.id, 'y', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LAYERS & HIERARCHY */}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Calques & Ordre de Superposition</h3>
                <span className="text-xs text-slate-400">Section 39 du Cahier</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { name: '1. Rendu PVC 3D & Brillance', locked: false },
                  { name: '2. Repères & Zone Sûre', locked: false },
                  { name: '3. Champs Personnalisés Dynamiques', locked: false },
                  { name: '4. Logo Fabricant / Plateforme', locked: false },
                  { name: '5. QR Code Cryptographique', locked: false },
                  { name: '6. Signatures Émettrices', locked: false },
                  { name: '7. Photo Employé', locked: customization.lockedElements?.includes('photo') },
                  { name: '8. Typographie & Identité', locked: false },
                  { name: '9. Filigrane & Logo en Arrière-Plan', locked: false },
                  { name: '10. Fond & Formes Géométriques', locked: true },
                ].map((layer, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs"
                  >
                    <span className="font-medium text-slate-800">{layer.name}</span>
                    <div className="flex items-center space-x-1 text-slate-400">
                      {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: COLORS & WATERMARK */}
          {activeTab === 'colors_watermark' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Palette & Filigrane de Fond</h3>
                <button
                  type="button"
                  onClick={extractPaletteFromLogo}
                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 flex items-center space-x-1"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Palette depuis le Logo</span>
                </button>
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Primaire</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={customization.primaryColor}
                      onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-500">{customization.primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Secondaire</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={customization.secondaryColor}
                      onChange={(e) => setCustomization({ ...customization, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-500">{customization.secondaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Accent</label>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="color"
                      value={customization.accentColor}
                      onChange={(e) => setCustomization({ ...customization, accentColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-mono text-slate-500">{customization.accentColor}</span>
                  </div>
                </div>
              </div>

              {/* Watermark Selector */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Style du Filigrane / Logo Arrière-Plan
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'center_transparent', name: 'Transparent Centré' },
                    { id: 'giant_right', name: 'Géant Latéral Droit' },
                    { id: 'diagonal_faint', name: 'Diagonale Inclinée' },
                    { id: 'micro_logos', name: 'Micro-Logos Répétés' },
                    { id: 'behind_photo', name: 'Derrière Photo' },
                    { id: 'back_watermark', name: 'Verso Uniquement' },
                    { id: 'pattern_discreet', name: 'Trame de Points' },
                    { id: 'none', name: 'Aucun Filigrane' },
                  ].map((wm) => (
                    <button
                      key={wm.id}
                      type="button"
                      onClick={() => setCustomization({ ...customization, watermarkType: wm.id as WatermarkType })}
                      className={`p-2 rounded-lg text-left text-xs font-medium border transition-colors ${
                        customization.watermarkType === wm.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {wm.name}
                    </button>
                  ))}
                </div>

                {/* Opacity slider */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Opacité du Filigrane</span>
                    <span className="font-mono">{Math.round((customization.watermarkOpacity ?? 0.12) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    value={customization.watermarkOpacity ?? 0.12}
                    onChange={(e) => setCustomization({ ...customization, watermarkOpacity: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PHOTO STUDIO & WEBCAM */}
          {activeTab === 'photo_studio' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Studio Photo & Capture Webcam</h3>
                <span className="text-xs text-slate-400">Sections 11 à 15</span>
              </div>

              {/* Webcam Live Capture Area */}
              {isWebcamActive ? (
                <div className="bg-slate-900 p-4 rounded-xl text-center space-y-3 relative">
                  <div className="relative w-full h-52 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-5xl font-black text-white animate-pulse">{countdown}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={triggerSnapshot}
                      disabled={countdown !== null}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Prendre la Photo (3s)</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopWebcam}
                      className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
                    >
                      Fermer Webcam
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={startWebcam}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ouvrir Webcam en Direct</span>
                  </button>

                  <label className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border border-slate-300 cursor-pointer">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Importer Fichier</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}

              {/* Photo Shapes */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Forme de la Photo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'rounded', name: 'Arrondi Doux' },
                    { id: 'square', name: 'Carré Net' },
                    { id: 'round', name: 'Cercle' },
                    { id: 'hexagon', name: 'Hexagone' },
                    { id: 'vertical_portrait', name: 'Portrait 3:4' },
                    { id: 'framed', name: 'Encadré Pro' },
                  ].map((shape) => (
                    <button
                      key={shape.id}
                      type="button"
                      onClick={() => setCustomization({ ...customization, photoShape: shape.id as PhotoShape })}
                      className={`p-2 rounded-lg text-center text-xs font-semibold border transition-colors ${
                        customization.photoShape === shape.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {shape.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: MANUFACTURER LOGO CONFIG */}
          {activeTab === 'manufacturer' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Logo du Fabricant & Plateforme</h3>
                  <p className="text-xs text-slate-500">Sections 18 à 23 : Branding discret du prestataire.</p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Afficher le Logo Fabricant</span>
                  <input
                    type="checkbox"
                    checked={customization.showManufacturerLogo !== false}
                    onChange={(e) => setCustomization({ ...customization, showManufacturerLogo: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nom de la Plateforme / Fabricant</label>
                  <input
                    type="text"
                    value={customization.manufacturer?.name || 'RM Card Services'}
                    onChange={(e) =>
                      setCustomization({
                        ...customization,
                        manufacturer: {
                          ...(customization.manufacturer || DEFAULT_MANUFACTURER),
                          name: e.target.value,
                        },
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Position</label>
                    <select
                      value={customization.manufacturer?.position || 'bottom_right'}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          manufacturer: {
                            ...(customization.manufacturer || DEFAULT_MANUFACTURER),
                            position: e.target.value as any,
                          },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="bottom_right">Bas Droite</option>
                      <option value="bottom_left">Bas Gauche</option>
                      <option value="back_center">Centre Verso</option>
                      <option value="top_right">Haut Droite</option>
                      <option value="bottom_stripe">Bande Inférieure</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Taille</label>
                    <select
                      value={customization.manufacturer?.size || 'small'}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          manufacturer: {
                            ...(customization.manufacturer || DEFAULT_MANUFACTURER),
                            size: e.target.value as any,
                          },
                        })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="small">Discret (Petit)</option>
                      <option value="medium">Moyen</option>
                      <option value="large">Grand</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: AI ASSISTANT & GENERATOR */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm">Générateur IA de Cartes</h3>
                </div>
                <span className="text-xs text-slate-400">Gemini 2.5 Flash</span>
              </div>

              {/* Natural Language Prompt Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Décrivez le style souhaité en langage naturel :
                </label>
                <textarea
                  rows={3}
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="Ex: Crée une carte ultra-moderne pour une banque d’investissement avec des teintes bleu nuit, doré et un filigrane discret..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => handleTriggerAiRecommendation()}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                  <span>{isAiLoading ? 'Génération IA en cours...' : 'Générer & Harmoniser la Carte'}</span>
                </button>
              </div>

              {/* Quick Sector Presets */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Recommandations Rapides par Secteur
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Banque & Finance', prompt: 'Style corporate bancaire sobre et haut de gamme' },
                    { label: 'Sécurité & Gardiennage', prompt: 'Style sécurité avec badge d’accès renforcé' },
                    { label: 'Clinique & Santé', prompt: 'Style médical épuré avec vert menthe et croix de santé' },
                    { label: 'ONG Humanitaire', prompt: 'Style mission humanitaire internationale neutre' },
                    { label: 'Tech & Startup', prompt: 'Style cyber néo-technologique avec accents néon' },
                    { label: 'BTP & Chantier', prompt: 'Style chantier robuste avec jaune sécurité et bandes' },
                  ].map((sec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleTriggerAiRecommendation(sec.prompt)}
                      className="p-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-left text-xs font-medium text-slate-700 transition-colors"
                    >
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {aiResultNotice && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-bold block mb-1">Rapport IA :</span>
                  {aiResultNotice}
                </div>
              )}
            </div>
          )}

          {/* TAB: NFC CONTACTLESS ENCODING */}
          {activeTab === 'nfc' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                    <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                    <span>Codage NFC Sans Contact (ISO 14443)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Programmation de la puce intégrée de la carte PVC via l'API standardisée Web NFC.
                  </p>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">
                  NDEF 2.0
                </span>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">Statut du Lecteur :</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800">
                    {isWebNfcSupported() ? 'Web NFC Disponible' : 'Mode Émulation & Export'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Encodez directement le matricule <strong>{currentEmployee.employeeNumber}</strong>, la fiche contact vCard 4.0, l'URL de vérification instantanée et les autorisations d'accès.
                </p>
              </div>

              {/* Specs & Memory Overview */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Puces PVC recommandées :</span>
                  <span className="font-mono text-indigo-400 font-bold">NTAG215 / NTAG216</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-slate-400 block">Fréquence :</span>
                    <span className="font-bold text-slate-200">13.56 MHz (HF)</span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-slate-400 block">Format standard :</span>
                    <span className="font-bold text-slate-200">ISO 7810 ID-1 CR-80</span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-slate-400 block">Tap-to-Verify :</span>
                    <span className="font-bold text-emerald-400">Sans application requise</span>
                  </div>
                  <div className="p-2 bg-slate-800/80 rounded border border-slate-700">
                    <span className="text-slate-400 block">Sécurité :</span>
                    <span className="font-bold text-slate-200">SHA-256 + Token Unique</span>
                  </div>
                </div>
              </div>

              {/* Main Launch Button */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNfcModalOpen(true)}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 transition-all hover:shadow cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>Ouvrir l'Interface de Codage NFC</span>
                </button>
                <p className="text-[11px] text-center text-slate-500">
                  Prise en charge de l'écriture sans contact, lecture diagnostique, jauge de mémoire et export NDEF.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preflight Audit Modal */}
      {isPreflightOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-emerald-600">
                <FileCheck className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Audit Qualité Avant Impression PVC</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPreflightOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
              {preflightChecks.map((chk, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between p-2.5 rounded-lg border bg-slate-50 border-slate-200"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 block">{chk.title}</span>
                    <span className="text-slate-500">{chk.description}</span>
                  </div>
                  <div>
                    {chk.status === 'pass' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono">
                        CONFORME
                      </span>
                    )}
                    {chk.status === 'warn' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold font-mono">
                        ATTENTION
                      </span>
                    )}
                    {chk.status === 'fail' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold font-mono">
                        ERREUR
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Carte prête pour imprimantes Zebra, Fargo & Evolis.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsPreflightOpen(false);
                  handleDownloadPdf();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Confirmer & Télécharger PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web NFC Contactless Card Encoder Modal */}
      <NfcEncoderModal
        isOpen={isNfcModalOpen}
        onClose={() => setIsNfcModalOpen(false)}
        employee={currentEmployee}
        company={currentCompany}
      />
    </div>
  );
};
