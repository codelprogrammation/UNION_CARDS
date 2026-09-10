import React, { useState, useRef } from 'react';
import { Company, Employee, CardTemplate } from '../../types';
import { generateSecureToken } from '../../utils/qrCodeHelper';
import {
  DatabaseBackupEnvelope,
  JsonVerificationReport,
  CorruptedRecordDetail,
  JsonStructuralIssue,
  exportEmployeeDatabaseToJson,
  validateAndParseBackupJson,
  mergeEmployeeDatabases,
} from '../../utils/dataPersistence';
import {
  UserPlus,
  Search,
  Upload,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Filter,
  Eye,
  ShieldCheck,
  Building,
  RefreshCw,
  Camera,
  Image as ImageIcon,
  ShieldAlert,
  Lock,
  FileCheck,
  X,
  Check,
  Sparkles,
  CheckCircle2,
  PenTool,
  FileJson,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  ShieldX,
  Sliders,
} from 'lucide-react';
import { SignaturePad } from './SignaturePad';

interface EmployeeManagerProps {
  company: Company;
  employees: Employee[];
  selectedTemplate: CardTemplate;
  onAddEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onSelectEmployeeForStudio: (employee: Employee) => void;
  onRestoreEmployees?: (employees: Employee[]) => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({
  company,
  employees,
  selectedTemplate,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onSelectEmployeeForStudio,
  onRestoreEmployees,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isMassPhotoModalOpen, setIsMassPhotoModalOpen] = useState(false);
  const [isReplaceCardModalOpen, setIsReplaceCardModalOpen] = useState(false);
  const [employeeToReplace, setEmployeeToReplace] = useState<Employee | null>(null);
  const [replacementReason, setReplacementReason] = useState<string>('Carte perdue');

  // JSON Data Persistence State
  const [jsonInputText, setJsonInputText] = useState('');
  const [jsonFileName, setJsonFileName] = useState('');
  const [jsonValidationResult, setJsonValidationResult] = useState<JsonVerificationReport | null>(null);
  const [jsonRestoreMode, setJsonRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [showDetailedAudit, setShowDetailedAudit] = useState(false);
  const [ignoreCorrupted, setIgnoreCorrupted] = useState(true);
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'profile' | 'security_privacy'>('profile');

  // Interactive signature capture state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [employeeForDirectSignature, setEmployeeForDirectSignature] = useState<Employee | null>(null);

  // Webcam capture in form
  const [isFormWebcamActive, setIsFormWebcamActive] = useState<boolean>(false);
  const [formCountdown, setFormCountdown] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Mass photos matching state
  interface MassPhotoItem {
    id: string;
    filename: string;
    dataUrl: string;
    matchedEmployeeId: string | null;
    matchType: 'exact_matricule' | 'normalized_matricule' | 'name_match' | 'card_number' | 'manual' | 'unmatched';
    matchLabel: string;
    sizeKb: number;
  }
  const [massPhotoItems, setMassPhotoItems] = useState<MassPhotoItem[]>([]);
  const [massPhotoFilter, setMassPhotoFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [massPhotoOverwrite, setMassPhotoOverwrite] = useState<boolean>(true);
  const [isProcessingMassPhotos, setIsProcessingMassPhotos] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    employeeNumber: '',
    cardNumber: '',
    position: '',
    department: 'Direction',
    service: 'Général',
    email: '',
    phone: '',
    emergencyPhone: '',
    bloodGroup: 'O+',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  });

  const departments = Array.from(new Set(employees.map((e) => e.department)));

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = filterDepartment === 'all' || emp.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setActiveFormTab('profile');
    const nextMatriculeNum = String(employees.length + 1).padStart(3, '0');
    setFormData({
      firstName: '',
      lastName: '',
      employeeNumber: `UNC-${company.name.slice(0, 3).toUpperCase()}-${nextMatriculeNum}`,
      cardNumber: `CARD-2026-${Date.now().toString().slice(-6)}`,
      position: 'Collaborateur',
      department: 'Direction',
      service: 'Général',
      email: '',
      phone: company.phone,
      emergencyPhone: company.emergencyPhone,
      bloodGroup: 'O+',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      employeeSignatureUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setActiveFormTab('profile');
    setFormData(emp);
    setIsModalOpen(true);
  };

  const handleOpenReplace = (emp: Employee) => {
    setEmployeeToReplace(emp);
    setReplacementReason('Carte égarée / perdue');
    setIsReplaceCardModalOpen(true);
  };

  const handleConfirmCardReplacement = () => {
    if (!employeeToReplace) return;

    const newVersion = (employeeToReplace.cardVersion || 1) + 1;
    const newCardNumber = `CARD-2026-${Date.now().toString().slice(-6)}-v${newVersion}`;
    const newToken = generateSecureToken();

    const updatedEmployee: Employee = {
      ...employeeToReplace,
      cardNumber: newCardNumber,
      cardVersion: newVersion,
      token: newToken,
      status: 'active',
      replacementReason,
      replacementDate: new Date().toISOString().split('T')[0],
      previousCardNumber: employeeToReplace.cardNumber,
      previousToken: employeeToReplace.token,
    };

    onUpdateEmployee(updatedEmployee);
    setIsReplaceCardModalOpen(false);
    alert(`Nouvelle carte v${newVersion} générée pour ${employeeToReplace.firstName} ${employeeToReplace.lastName} ! L’ancienne carte a été révoquée.`);
  };

  // Webcam in form
  const startFormWebcam = async () => {
    try {
      setIsFormWebcamActive(true);
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
      console.error('Webcam error', err);
      alert('Impossible d’activer la webcam.');
      setIsFormWebcamActive(false);
    }
  };

  const stopFormWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsFormWebcamActive(false);
    setFormCountdown(null);
  };

  const snapFormPhoto = () => {
    setFormCountdown(3);
    const interval = setInterval(() => {
      setFormCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth || 400;
            canvas.height = videoRef.current.videoHeight || 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              setFormData((f) => ({ ...f, photoUrl: dataUrl }));
              stopFormWebcam();
            }
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.employeeNumber) {
      alert('Veuillez remplir les champs obligatoires (Nom, Prénom, Matricule).');
      return;
    }

    if (editingEmployee) {
      onUpdateEmployee({
        ...editingEmployee,
        ...formData,
      } as Employee);
    } else {
      const newId = `emp-${Date.now()}`;
      const newEmployee: Employee = {
        id: newId,
        companyId: company.id,
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        employeeNumber: formData.employeeNumber || `UNC-${Date.now()}`,
        cardNumber: formData.cardNumber || `CARD-2026-${Date.now().toString().slice(-6)}`,
        position: formData.position || 'Agent',
        department: formData.department || 'Général',
        service: formData.service || 'Standard',
        email: formData.email || '',
        phone: formData.phone || '',
        emergencyPhone: formData.emergencyPhone || company.emergencyPhone,
        bloodGroup: formData.bloodGroup || 'O+',
        issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: formData.expiryDate || '2028-12-31',
        status: (formData.status as any) || 'active',
        token: generateSecureToken(),
        cardVersion: 1,
        photoUrl:
          formData.photoUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        employeeSignatureUrl: formData.employeeSignatureUrl || '',
      };
      onAddEmployee(newEmployee);
    }
    setIsModalOpen(false);
  };

  // Advanced Multi-Criteria Mass Photo Importer handler
  const handleMassPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    setIsProcessingMassPhotos(true);
    const newItems: MassPhotoItem[] = [];

    let processedCount = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          const dataUrl = ev.target.result as string;
          // Strip extension and normalize string
          const rawBasename = file.name.replace(/\.[^/.]+$/, '');
          const cleanName = rawBasename.toLowerCase().trim();
          const alphanumericName = cleanName.replace(/[^a-z0-9]/g, '');

          let matchedEmp: Employee | undefined = undefined;
          let matchType: MassPhotoItem['matchType'] = 'unmatched';
          let matchLabel = 'Non associé';

          // 1. Check exact employeeNumber (case-insensitive)
          matchedEmp = employees.find(
            (emp) => emp.employeeNumber.toLowerCase().trim() === cleanName
          );
          if (matchedEmp) {
            matchType = 'exact_matricule';
            matchLabel = `Matricule exact (${matchedEmp.employeeNumber})`;
          }

          // 2. Check alphanumeric employeeNumber (e.g., "unc001" matches "UNC-001")
          if (!matchedEmp) {
            matchedEmp = employees.find((emp) => {
              const empAlpha = emp.employeeNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
              return empAlpha === alphanumericName || cleanName.includes(empAlpha);
            });
            if (matchedEmp) {
              matchType = 'normalized_matricule';
              matchLabel = `Matricule normalisé (${matchedEmp.employeeNumber})`;
            }
          }

          // 3. Check full name combination (e.g., "jean_dupont" or "dupont_jean")
          if (!matchedEmp) {
            matchedEmp = employees.find((emp) => {
              const fnLn = `${emp.firstName}_${emp.lastName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
              const lnFn = `${emp.lastName}_${emp.firstName}`.toLowerCase().replace(/[^a-z0-9]/g, '');
              return alphanumericName === fnLn || alphanumericName === lnFn || cleanName.includes(fnLn) || cleanName.includes(lnFn);
            });
            if (matchedEmp) {
              matchType = 'name_match';
              matchLabel = `Nom complet (${matchedEmp.firstName} ${matchedEmp.lastName})`;
            }
          }

          // 4. Check single last name
          if (!matchedEmp) {
            matchedEmp = employees.find(
              (emp) =>
                emp.lastName.toLowerCase().trim() === cleanName ||
                cleanName.startsWith(emp.lastName.toLowerCase().trim())
            );
            if (matchedEmp) {
              matchType = 'name_match';
              matchLabel = `Nom de famille (${matchedEmp.lastName})`;
            }
          }

          // 5. Check Card Number
          if (!matchedEmp) {
            matchedEmp = employees.find(
              (emp) => emp.cardNumber && emp.cardNumber.toLowerCase().includes(cleanName)
            );
            if (matchedEmp) {
              matchType = 'card_number';
              matchLabel = `N° de Carte (${matchedEmp.cardNumber})`;
            }
          }

          // 6. Check trailing numeric digits (e.g. "001.jpg" for UNC-001)
          if (!matchedEmp) {
            const digits = cleanName.match(/\d+/);
            if (digits && digits[0].length >= 2) {
              const matchedByDigits = employees.filter((emp) =>
                emp.employeeNumber.endsWith(digits[0])
              );
              if (matchedByDigits.length === 1) {
                matchedEmp = matchedByDigits[0];
                matchType = 'normalized_matricule';
                matchLabel = `Suffixe matricule (${matchedEmp.employeeNumber})`;
              }
            }
          }

          newItems.push({
            id: `photo-item-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
            filename: file.name,
            dataUrl,
            matchedEmployeeId: matchedEmp ? matchedEmp.id : null,
            matchType,
            matchLabel,
            sizeKb: Math.round(file.size / 1024),
          });

          processedCount++;
          if (processedCount === files.length) {
            setMassPhotoItems((prev) => [...prev, ...newItems]);
            setIsProcessingMassPhotos(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleManualReassignPhoto = (itemId: string, targetEmployeeId: string) => {
    setMassPhotoItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const targetEmp = employees.find((e) => e.id === targetEmployeeId);
        return {
          ...item,
          matchedEmployeeId: targetEmployeeId || null,
          matchType: targetEmployeeId ? 'manual' : 'unmatched',
          matchLabel: targetEmp ? `Manuel : ${targetEmp.firstName} ${targetEmp.lastName} (${targetEmp.employeeNumber})` : 'Non associé',
        };
      })
    );
  };

  const handleRemoveMassPhotoItem = (itemId: string) => {
    setMassPhotoItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleApplyMassPhotos = () => {
    let appliedCount = 0;
    massPhotoItems.forEach((item) => {
      if (!item.matchedEmployeeId) return;
      const emp = employees.find((e) => e.id === item.matchedEmployeeId);
      if (emp) {
        // If overwrite is false, only apply if emp has no photo or default placeholder
        if (!massPhotoOverwrite && emp.photoUrl && !emp.photoUrl.includes('unsplash.com')) {
          return;
        }
        onUpdateEmployee({
          ...emp,
          photoUrl: item.dataUrl,
        });
        appliedCount++;
      }
    });

    alert(`Succès : ${appliedCount} photo(s) d’employé(s) ont été synchronisée(s) et appliquées avec succès !`);
    setIsMassPhotoModalOpen(false);
    setMassPhotoItems([]);
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Matricule',
      'Numero_Carte',
      'Nom',
      'Prénom',
      'Fonction',
      'Département',
      'Service',
      'Email',
      'Téléphone',
      'Groupe_Sanguin',
      'Date_Emission',
      'Date_Expiration',
      'Statut',
      'Token_Verification',
    ];

    const rows = employees.map((e) => [
      e.employeeNumber,
      e.cardNumber || '',
      `"${e.lastName}"`,
      `"${e.firstName}"`,
      `"${e.position}"`,
      `"${e.department}"`,
      `"${e.service || ''}"`,
      e.email,
      e.phone,
      e.bloodGroup || '',
      e.issueDate,
      e.expiryDate,
      e.status,
      e.token,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `EFFECTIF_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import Simulation
  const [importCsvText, setImportCsvText] = useState('');
  const handleProcessImportCsv = () => {
    if (!importCsvText.trim()) return;

    const lines = importCsvText.trim().split('\n');
    let importedCount = 0;

    lines.forEach((line, idx) => {
      if (idx === 0 && (line.toLowerCase().includes('nom') || line.toLowerCase().includes('matricule'))) {
        return;
      }

      const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 3) {
        const [empNum, lastName, firstName, position, dept] = parts;
        const newId = `emp-imported-${Date.now()}-${idx}`;
        const newEmp: Employee = {
          id: newId,
          companyId: company.id,
          employeeNumber: empNum || `IMP-${idx + 100}`,
          cardNumber: `CARD-2026-${Date.now().toString().slice(-6)}-${idx + 1}`,
          lastName: lastName || 'Nom',
          firstName: firstName || 'Prénom',
          position: position || 'Collaborateur',
          department: dept || 'Général',
          email: `${(firstName || 'user').toLowerCase()}.${(lastName || 'emp').toLowerCase()}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
          phone: company.phone,
          emergencyPhone: company.emergencyPhone,
          bloodGroup: 'O+',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active',
          token: generateSecureToken(),
          cardVersion: 1,
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        };
        onAddEmployee(newEmp);
        importedCount++;
      }
    });

    alert(`${importedCount} employé(s) importé(s) avec succès !`);
    setIsImportModalOpen(false);
    setImportCsvText('');
  };

  // JSON Data Persistence Handlers
  const handleExportJson = () => {
    exportEmployeeDatabaseToJson(company, employees);
  };

  const handleJsonFileSelect = (file: File) => {
    setJsonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setJsonInputText(text);
      const validation = validateAndParseBackupJson(text, company.id);
      setJsonValidationResult(validation);
      if (
        validation.corruptedRecordsCount > 0 ||
        validation.issues.some((i) => i.severity === 'error' || i.severity === 'warning')
      ) {
        setShowDetailedAudit(true);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonTextChange = (text: string) => {
    setJsonInputText(text);
    if (!text.trim()) {
      setJsonValidationResult(null);
      return;
    }
    const validation = validateAndParseBackupJson(text, company.id);
    setJsonValidationResult(validation);
    if (
      validation.corruptedRecordsCount > 0 ||
      validation.issues.some((i) => i.severity === 'error' || i.severity === 'warning')
    ) {
      setShowDetailedAudit(true);
    }
  };

  const handleDownloadTemplateJson = () => {
    const templateData = {
      app: 'UNINCOMPANY ID Management Platform',
      version: '2.5.0',
      exportDate: new Date().toISOString(),
      checksum: 'e7f10a8b',
      totalEmployees: 2,
      company: {
        id: company.id,
        name: company.name,
        industry: company.industry,
      },
      employees: [
        {
          id: `emp-template-01`,
          companyId: company.id,
          cardType: 'professional',
          firstName: 'Jean-Luc',
          lastName: 'Kabeya',
          employeeNumber: 'MAT-2026-0001',
          cardNumber: 'ID-2026-000001',
          position: 'Directeur des Opérations',
          department: 'Direction Générale',
          gender: 'M',
          status: 'active',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: `${new Date().getFullYear() + 3}-12-31`,
          email: 'jeanluc.kabeya@entreprise.cd',
          phone: '+243 81 234 5678',
          token: generateSecureToken(),
        },
        {
          id: `emp-template-02`,
          companyId: company.id,
          cardType: 'service',
          firstName: 'Aline',
          lastName: 'Mbuyi',
          employeeNumber: 'MAT-2026-0002',
          cardNumber: 'ID-2026-000002',
          position: 'Responsable Ressources Humaines',
          department: 'Ressources Humaines',
          gender: 'F',
          status: 'active',
          issueDate: new Date().toISOString().split('T')[0],
          expiryDate: `${new Date().getFullYear() + 3}-12-31`,
          email: 'aline.mbuyi@entreprise.cd',
          phone: '+243 82 987 6543',
          token: generateSecureToken(),
        },
      ],
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele_restauration_unincompany.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteRestoreJson = () => {
    if (
      !jsonValidationResult ||
      !jsonValidationResult.canRestore ||
      !jsonValidationResult.employees ||
      jsonValidationResult.employees.length === 0
    ) {
      alert('Veuillez charger ou coller une sauvegarde JSON valide avec des données exploitables.');
      return;
    }

    if (jsonValidationResult.corruptedRecordsCount > 0 && !ignoreCorrupted) {
      alert(
        'Veuillez activer l’option d’exclusion des fiches corrompues ou corriger le fichier avant d’appliquer la restauration.'
      );
      return;
    }

    const imported = jsonValidationResult.employees;
    const merged = mergeEmployeeDatabases(employees, imported, jsonRestoreMode);

    if (onRestoreEmployees) {
      onRestoreEmployees(merged);
    } else {
      if (jsonRestoreMode === 'replace') {
        employees.forEach((e) => onDeleteEmployee(e.id));
        imported.forEach((e) => onAddEmployee(e));
      } else {
        merged.forEach((e) => {
          const exists = employees.some((ex) => ex.id === e.id);
          if (exists) onUpdateEmployee(e);
          else onAddEmployee(e);
        });
      }
    }

    const corruptDetail =
      jsonValidationResult.corruptedRecordsCount > 0
        ? ` (${jsonValidationResult.corruptedRecordsCount} fiche(s) corrompue(s) exclue(s) par sécurité)`
        : '';
    const repairDetail =
      jsonValidationResult.repairedRecordsCount > 0
        ? ` (${jsonValidationResult.repairedRecordsCount} anomalie(s) mineure(s) corrigée(s) automatiquement)`
        : '';

    alert(
      `Restauration terminée avec succès : ${imported.length} collaborateur(s) ${
        jsonRestoreMode === 'replace' ? 'remplacés' : 'fusionnés'
      } dans le registre !${corruptDetail}${repairDetail}`
    );
    setIsJsonModalOpen(false);
    setJsonInputText('');
    setJsonFileName('');
    setJsonValidationResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Building className="w-4 h-4" />
            <span>Gestion du Registre du Personnel — {company.name}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Effectif & Cartes d'Identification
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {employees.length} collaborateur(s) enregistré(s) • Prêts pour personnalisation, remplacement et impression
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* JSON Persistence Suite (Export & Restore) */}
          <button
            type="button"
            onClick={handleExportJson}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-emerald-200 transition-colors shadow-2xs"
            title="Télécharger une sauvegarde chiffrée et intègre au format JSON"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Sauvegarde JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsJsonModalOpen(true);
              setJsonInputText('');
              setJsonFileName('');
              setJsonValidationResult(null);
            }}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-amber-200 transition-colors shadow-2xs"
            title="Restaurer ou fusionner des collaborateurs depuis un fichier JSON"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>Restaurer JSON</span>
          </button>

          {/* Mass Photos Importer */}
          <button
            type="button"
            onClick={() => setIsMassPhotoModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 border border-indigo-200 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Importer Lot Photos</span>
          </button>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Importer CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un Employé</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matricule, poste, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent focus:outline-none text-slate-800"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium cursor-pointer"
            >
              <option value="all">Tous Départements</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">Tous Statuts</option>
            <option value="active">Actif</option>
            <option value="expired">Expiré</option>
            <option value="revoked">Révoqué</option>
          </select>
        </div>
      </div>

      {/* Employees Grid / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="py-3.5 px-4">Collaborateur</th>
                <th className="py-3.5 px-4">Matricule & Carte</th>
                <th className="py-3.5 px-4">Fonction & Département</th>
                <th className="py-3.5 px-4">Validité</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                        <img
                          src={emp.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {emp.firstName} {emp.lastName}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-slate-400">{emp.email}</span>
                          {emp.employeeSignatureUrl && !emp.employeeSignatureUrl.includes('photo-1589829545856') ? (
                            <span className="inline-flex items-center text-[9.5px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                              <PenTool className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Signée
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[9.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                              Sans signature
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    <div>
                      <span className="block font-bold">{emp.employeeNumber}</span>
                      <span className="text-[10px] text-slate-400">
                        {emp.cardNumber || 'ID-2026-ACT'} {emp.cardVersion && emp.cardVersion > 1 ? `(v${emp.cardVersion})` : ''}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{emp.position}</span>
                    <span className="text-slate-400">{emp.department}</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px]">
                    <span className="text-slate-700 block">Exp: {emp.expiryDate}</span>
                    <span className="text-slate-400 text-[10px]">Émis: {emp.issueDate}</span>
                  </td>

                  <td className="py-3 px-4">
                    {emp.status === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        ACTIF
                      </span>
                    ) : emp.status === 'revoked' ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                        RÉVOQUÉ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                        EXPIRÉ
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectEmployeeForStudio(emp)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold"
                        title="Ouvrir dans le Studio Visuel"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEmployeeForDirectSignature(emp);
                          setIsSignatureModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg font-bold transition-colors ${
                          emp.employeeSignatureUrl && !emp.employeeSignatureUrl.includes('photo-1589829545856')
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={
                          emp.employeeSignatureUrl && !emp.employeeSignatureUrl.includes('photo-1589829545856')
                            ? 'Modifier la signature manuscrite'
                            : 'Signer à l’écran (souris / tactile)'
                        }
                      >
                        <PenTool className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenReplace(emp)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg font-bold"
                        title="Remplacer la Carte (Perte/Vol)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(emp)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                        title="Modifier les données"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer définitivement ${emp.firstName} ${emp.lastName} ?`)) {
                            onDeleteEmployee(emp.id);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal with Webcam & Privacy */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {editingEmployee ? 'Modifier Collaborateur' : 'Nouveau Collaborateur'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  stopFormWebcam();
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveFormTab('profile')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeFormTab === 'profile'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Informations Personnelles & Photo
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('security_privacy')}
                className={`pb-2 border-b-2 transition-colors ${
                  activeFormTab === 'security_privacy'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Sécurité & Confidentialité
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
              {activeFormTab === 'profile' && (
                <>
                  {/* Photo & Webcam section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-indigo-500 bg-slate-200 flex-shrink-0 shadow-sm relative">
                      <img
                        src={formData.photoUrl}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <span className="font-bold text-slate-800 block">Photo d'Identité</span>
                      <p className="text-[11px] text-slate-500">
                        Prenez une photo en direct avec la webcam ou chargez un fichier.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={startFormWebcam}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Prendre avec Caméra</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Signature Manuscrite Section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-28 h-18 rounded-lg overflow-hidden border border-slate-300 bg-white flex-shrink-0 shadow-inner flex items-center justify-center p-1 relative">
                      {formData.employeeSignatureUrl ? (
                        <img
                          src={formData.employeeSignatureUrl}
                          alt="Signature Porteur"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400 text-center p-1">
                          <PenTool className="w-4 h-4 mb-0.5 opacity-40" />
                          <span className="text-[9px] font-mono italic">Non signée</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5 text-center sm:text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 block">Signature Manuscrite du Collaborateur</span>
                        {formData.employeeSignatureUrl && (
                          <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            Enregistrée
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Capturez la vraie signature manuscrite via souris, stylet ou écran tactile pour l'imprimer au dos du badge.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => setIsSignatureModalOpen(true)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center space-x-1.5 text-xs shadow-sm cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>{formData.employeeSignatureUrl ? 'Modifier la Signature' : 'Capturer la Signature (Écran / Souris)'}</span>
                        </button>

                        {formData.employeeSignatureUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, employeeSignatureUrl: '' })}
                            className="px-2.5 py-1.5 border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs"
                          >
                            Effacer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Webcam stream modal inside form */}
                  {isFormWebcamActive && (
                    <div className="bg-slate-950 p-3 rounded-xl text-center space-y-2">
                      <div className="relative w-full h-44 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        {formCountdown !== null && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-4xl font-black text-white">{formCountdown}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={snapFormPhoto}
                          className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold"
                        >
                          Capturer (3s)
                        </button>
                        <button
                          type="button"
                          onClick={stopFormWebcam}
                          className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Prénom *</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Matricule *</label>
                      <input
                        type="text"
                        required
                        value={formData.employeeNumber}
                        onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Fonction / Titre</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Département</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Service / Unité</label>
                      <input
                        type="text"
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Email Professionnel</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Téléphone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeFormTab === 'security_privacy' && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                    <span className="font-bold block mb-0.5">Matrice de Confidentialité & Minimisation des Données</span>
                    Définissez la visibilité des données sensibles entre la carte physique et le scan en ligne.
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: 'Date de Naissance', desc: 'Afficher sur la carte physique' },
                      { label: 'Groupe Sanguin (Urgence)', desc: 'Recommandé pour chantiers et sites isolés' },
                      { label: 'Numéro de Téléphone Personnel', desc: 'Accessible uniquement après scan cryptographique' },
                      { label: 'Zone d’Affectation & Accès N4', desc: 'Badge visible sur le recto' },
                    ].map((priv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-900 block">{priv.label}</span>
                          <span className="text-[10px] text-slate-500">{priv.desc}</span>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Card Replacement Modal */}
      {isReplaceCardModalOpen && employeeToReplace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center space-x-2 text-amber-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 text-base">Remplacement de Carte</h3>
            </div>

            <p className="text-xs text-slate-600">
              Vous êtes sur le point de révoquer l'ancienne carte de{' '}
              <strong className="text-slate-900 font-bold">
                {employeeToReplace.firstName} {employeeToReplace.lastName}
              </strong>{' '}
              (Matricule : {employeeToReplace.employeeNumber}).
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Motif de Remplacement</label>
              <select
                value={replacementReason}
                onChange={(e) => setReplacementReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="Carte égarée / perdue">Carte égarée / perdue</option>
                <option value="Vol déclaré">Vol déclaré</option>
                <option value="Détérioration physique">Détérioration physique</option>
                <option value="Renouvellement périodique">Renouvellement périodique</option>
                <option value="Changement de fonction / grade">Changement de fonction / grade</option>
              </select>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 text-[11px]">
              <strong>Sécurité Cryptographique :</strong> L'ancien QR code sera immédiatement désactivé sur le portail de vérification. Un nouveau numéro de carte (v{(employeeToReplace.cardVersion || 1) + 1}) et un nouveau token unique seront générés.
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsReplaceCardModalOpen(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmCardReplacement}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Générer la Nouvelle Carte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass Photos Importer Modal */}
      {isMassPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2.5 text-indigo-600">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Importation Massive de Photos d'Employés</h3>
                  <p className="text-xs text-slate-500">
                    Association automatique par nom de fichier (ex: <code>UNC-001.jpg</code>, <code>KASUMBI.png</code>, <code>Jean_Dupont.webp</code>)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMassPhotoModalOpen(false);
                  setMassPhotoItems([]);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop Zone */}
            <div className="shrink-0">
              <label className="block p-5 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50/80 text-center cursor-pointer transition-all">
                <Upload className="w-7 h-7 text-indigo-600 mx-auto mb-1.5" />
                <span className="font-bold text-xs text-indigo-950 block">
                  Cliquez ou glissez-déposez un lot d'images (JPEG, PNG, WebP)
                </span>
                <span className="text-[11px] text-indigo-600">
                  Importez plusieurs fichiers simultanément pour traitement et association par lot
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleMassPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {isProcessingMassPhotos && (
              <div className="p-3 bg-indigo-50 text-indigo-800 rounded-xl text-xs flex items-center justify-center space-x-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>Analyse et matching algorithmique des photos en cours...</span>
              </div>
            )}

            {/* Batch Results & Controls */}
            {massPhotoItems.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                {/* Stats and Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 shrink-0 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setMassPhotoFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        massPhotoFilter === 'all'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Toutes ({massPhotoItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMassPhotoFilter('matched')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        massPhotoFilter === 'matched'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-emerald-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Associées ({massPhotoItems.filter((i) => i.matchedEmployeeId).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setMassPhotoFilter('unmatched')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        massPhotoFilter === 'unmatched'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-amber-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Non Associées ({massPhotoItems.filter((i) => !i.matchedEmployeeId).length})
                    </button>
                  </div>

                  <label className="flex items-center space-x-2 text-slate-700 cursor-pointer font-medium text-[11px]">
                    <input
                      type="checkbox"
                      checked={massPhotoOverwrite}
                      onChange={(e) => setMassPhotoOverwrite(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Écraser les photos existantes</span>
                  </label>
                </div>

                {/* Photos List Table */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
                  {massPhotoItems
                    .filter((item) => {
                      if (massPhotoFilter === 'matched') return item.matchedEmployeeId !== null;
                      if (massPhotoFilter === 'unmatched') return item.matchedEmployeeId === null;
                      return true;
                    })
                    .map((item) => {
                      const emp = employees.find((e) => e.id === item.matchedEmployeeId);
                      const isMatched = !!emp;

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-colors gap-3 ${
                            isMatched
                              ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                              : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
                          }`}
                        >
                          {/* File info & Thumbnail */}
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300 shadow-xs relative">
                              <img
                                src={item.dataUrl}
                                alt={item.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-xs block truncate" title={item.filename}>
                                {item.filename}
                              </span>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                                <span>{item.sizeKb} Ko</span>
                                <span>•</span>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-semibold ${
                                    isMatched
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {item.matchLabel}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Association status & Target selector */}
                          <div className="flex items-center space-x-2 self-end sm:self-center">
                            {isMatched ? (
                              <div className="flex items-center space-x-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
                                <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                  <img
                                    src={emp?.photoUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="text-left">
                                  <span className="font-bold text-slate-900 text-xs block">
                                    {emp?.firstName} {emp?.lastName}
                                  </span>
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    {emp?.employeeNumber}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-amber-600 px-2 py-1 bg-amber-100/80 rounded-lg">
                                Non Assigné
                              </span>
                            )}

                            {/* Manual Reassign Selector */}
                            <select
                              value={item.matchedEmployeeId || ''}
                              onChange={(e) => handleManualReassignPhoto(item.id, e.target.value)}
                              className="text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 max-w-[150px] truncate"
                            >
                              <option value="">-- Assigner à... --</option>
                              {employees.map((e) => (
                                <option key={e.id} value={e.id}>
                                  {e.employeeNumber} - {e.lastName} {e.firstName}
                                </option>
                              ))}
                            </select>

                            {/* Remove photo from batch */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMassPhotoItem(item.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Retirer de la file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <div>
                {massPhotoItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMassPhotoItems([])}
                    className="text-xs text-slate-500 hover:text-red-600 underline font-medium"
                  >
                    Vider la liste
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMassPhotoModalOpen(false);
                    setMassPhotoItems([]);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={massPhotoItems.filter((i) => i.matchedEmployeeId).length === 0}
                  onClick={handleApplyMassPhotos}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center space-x-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Appliquer ({massPhotoItems.filter((i) => i.matchedEmployeeId).length} photos)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">
              Importation de Masse (CSV)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Collez vos données CSV au format : <code>Matricule,Nom,Prénom,Fonction,Département</code>
            </p>

            <textarea
              rows={8}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="UNC-001,Dupont,Jean,Directeur Général,Direction&#10;UNC-002,Martin,Sophie,Ingénieur Cloud,Technologies&#10;UNC-003,Traoré,Moussa,Chef de Sécurité,Sûreté"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 mb-4 focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleProcessImportCsv}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md"
              >
                Lancer l'importation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Restore / Backup Import Modal with Structural Verification */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Restauration & Vérification Structurelle JSON
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Contrôle d'intégrité cryptographique, validation de schéma et protection anti-corruption.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplateJson}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center space-x-1"
                  title="Télécharger un modèle JSON type pour référence"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Modèle JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              {/* File Dropzone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingJson(true);
                }}
                onDragLeave={() => setIsDraggingJson(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingJson(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleJsonFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => jsonFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                  isDraggingJson
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200 hover:border-indigo-400 bg-slate-50/60'
                }`}
              >
                <input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleJsonFileSelect(e.target.files[0]);
                    }
                  }}
                />
                <ArrowUpFromLine className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">
                  {jsonFileName ? (
                    <span className="text-indigo-600">Fichier chargé : {jsonFileName}</span>
                  ) : (
                    'Cliquez ou glissez-déposez votre fichier .json ici'
                  )}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Archives officielles UNINCOMPANY avec hash SHA-256 ou tableaux d'employés
                </p>
              </div>

              {/* Textarea Fallback */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ou collez directement le contenu JSON brut :
                </label>
                <textarea
                  rows={3}
                  value={jsonInputText}
                  onChange={(e) => handleJsonTextChange(e.target.value)}
                  placeholder='{"app": "UNINCOMPANY ID Management Platform", "employees": [...]}'
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Structural Verification Dashboard */}
              {jsonValidationResult && (
                <div className="space-y-3">
                  {/* Status Banner */}
                  {jsonValidationResult.canRestore &&
                  jsonValidationResult.corruptedRecordsCount === 0 &&
                  (jsonValidationResult.checksumStatus === 'verified' ||
                    jsonValidationResult.checksumStatus === 'absent') ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Structure 100% conforme et données intègres : prêt pour la restauration.
                      </span>
                    </div>
                  ) : jsonValidationResult.canRestore ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2 text-amber-800 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          Restauration partielle possible avec anomalies
                        </span>
                        <span className="text-[11px] text-amber-700">
                          {jsonValidationResult.validRecordsCount} fiche(s) valide(s) exploitable(s).{' '}
                          {jsonValidationResult.corruptedRecordsCount > 0 &&
                            `${jsonValidationResult.corruptedRecordsCount} fiche(s) corrompue(s) seront exclues.`}
                          {jsonValidationResult.checksumStatus === 'mismatch' &&
                            ' Empreinte d’intégrité modifiée.'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-700 text-xs">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">
                          Fichier non conforme ou données corrompues
                        </span>
                        <span className="text-[11px] text-red-600 block mt-0.5">
                          {jsonValidationResult.error ||
                            'Le document fourni ne respecte pas le format requis.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4-Metric Diagnostic Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Format
                      </span>
                      <span className="font-bold text-slate-800 text-[11px] line-clamp-1">
                        {jsonValidationResult.format === 'unincompany_envelope'
                          ? 'Archive v2.5'
                          : jsonValidationResult.format === 'raw_employee_array'
                          ? 'Tableau JSON'
                          : 'Inconnu'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Contrôle Intégrité
                      </span>
                      <div className="flex items-center space-x-1">
                        {jsonValidationResult.checksumStatus === 'verified' ? (
                          <span className="text-emerald-700 font-bold text-[11px] flex items-center space-x-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Certifié</span>
                          </span>
                        ) : jsonValidationResult.checksumStatus === 'mismatch' ? (
                          <span className="text-amber-700 font-bold text-[11px] flex items-center space-x-1">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                            <span>Altéré</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium text-[11px]">
                            Non signé
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Fiches Conformes
                      </span>
                      <span className="font-bold text-emerald-600 text-[11px]">
                        {jsonValidationResult.validRecordsCount} / {jsonValidationResult.totalRecordsFound}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                        Anomalies
                      </span>
                      <span
                        className={`font-bold text-[11px] ${
                          jsonValidationResult.corruptedRecordsCount > 0
                            ? 'text-red-600'
                            : jsonValidationResult.repairedRecordsCount > 0
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {jsonValidationResult.corruptedRecordsCount} rejetée(s)
                        {jsonValidationResult.repairedRecordsCount > 0 &&
                          ` · ${jsonValidationResult.repairedRecordsCount} réparée(s)`}
                      </span>
                    </div>
                  </div>

                  {/* Metadata Header (if present) */}
                  {jsonValidationResult.metadata && (
                    <div className="p-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-[11px] grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {jsonValidationResult.metadata.companyName && (
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase block font-bold">
                            Organisation Source
                          </span>
                          <span className="text-slate-800 font-bold">
                            {jsonValidationResult.metadata.companyName}
                          </span>
                        </div>
                      )}
                      {jsonValidationResult.metadata.exportDate && (
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase block font-bold">
                            Date d'Export
                          </span>
                          <span className="text-slate-700">
                            {new Date(jsonValidationResult.metadata.exportDate).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      )}
                      {jsonValidationResult.calculatedChecksum && (
                        <div>
                          <span className="text-slate-400 text-[9px] uppercase block font-bold">
                            Hash Empreinte
                          </span>
                          <span className="font-mono text-indigo-600 font-bold">
                            {jsonValidationResult.calculatedChecksum}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Corrupted Records Exclusion Confirmation Checkbox */}
                  {jsonValidationResult.corruptedRecordsCount > 0 && (
                    <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-900 flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>
                            {jsonValidationResult.corruptedRecordsCount} enregistrement(s) corrompu(s) détecté(s)
                          </span>
                        </span>
                      </div>
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        Certains collaborateurs dans le fichier ne possèdent pas les champs d'identité obligatoires (nom ou prénom manquant, ou données non objets). Pour garantir la stabilité de votre registre, ces fiches doivent être exclues.
                      </p>
                      <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ignoreCorrupted}
                          onChange={(e) => setIgnoreCorrupted(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold text-slate-800 text-xs">
                          Exclure automatiquement les fiches corrompues et continuer avec les {jsonValidationResult.validRecordsCount} fiches saines
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Toggle Detailed Audit Log */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowDetailedAudit(!showDetailedAudit)}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          Rapport d'audit structurel détaillé (
                          {jsonValidationResult.issues.length + jsonValidationResult.corruptedRecords.length}{' '}
                          événements)
                        </span>
                      </div>
                      {showDetailedAudit ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showDetailedAudit && (
                      <div className="p-3 bg-white space-y-2 max-h-48 overflow-y-auto text-xs divide-y divide-slate-100">
                        {/* Corrupted items list */}
                        {jsonValidationResult.corruptedRecords.map((cr) => (
                          <div key={cr.index} className="pt-2 first:pt-0">
                            <div className="flex items-center space-x-1.5 text-red-700 font-bold text-[11px]">
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[9px] uppercase">
                                Rejeté
                              </span>
                              <span>{cr.identifier}</span>
                            </div>
                            <ul className="list-disc list-inside text-[11px] text-red-600 pl-2 mt-0.5">
                              {cr.reasons.map((r, rIdx) => (
                                <li key={rIdx}>{r}</li>
                              ))}
                            </ul>
                            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                              Extrait brut : {cr.rawSnippet}
                            </p>
                          </div>
                        ))}

                        {/* Structural issues list */}
                        {jsonValidationResult.issues.map((iss, iIdx) => (
                          <div key={iIdx} className="pt-2 first:pt-0 flex items-start space-x-2 text-[11px]">
                            {iss.severity === 'error' ? (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[9px] uppercase shrink-0 mt-0.5">
                                Erreur
                              </span>
                            ) : iss.severity === 'warning' ? (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] uppercase shrink-0 mt-0.5">
                                {iss.autoRepaired ? 'Auto-Réparé' : 'Alerte'}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] uppercase shrink-0 mt-0.5">
                                Info
                              </span>
                            )}
                            <div className="text-slate-600">
                              <span>{iss.message}</span>
                            </div>
                          </div>
                        ))}

                        {jsonValidationResult.corruptedRecords.length === 0 &&
                          jsonValidationResult.issues.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">
                              Aucune anomalie structurelle détectée dans ce document.
                            </p>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Restore Mode Choice */}
              {jsonValidationResult?.canRestore && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Mode d'application des données :
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label
                      className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-all ${
                        jsonRestoreMode === 'merge'
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-slate-900 mb-0.5">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={jsonRestoreMode === 'merge'}
                          onChange={() => setJsonRestoreMode('merge')}
                          className="text-indigo-600"
                        />
                        <span>Fusionner (Recommandé)</span>
                      </div>
                      <span className="text-[10px] text-slate-500 pl-5">
                        Met à jour les matricules existants et ajoute les nouveaux sans effacer les autres collaborateurs.
                      </span>
                    </label>

                    <label
                      className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-all ${
                        jsonRestoreMode === 'replace'
                          ? 'border-red-600 bg-red-50/60 ring-2 ring-red-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-slate-900 mb-0.5">
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={jsonRestoreMode === 'replace'}
                          onChange={() => setJsonRestoreMode('replace')}
                          className="text-red-600"
                        />
                        <span>Écraser & Remplacer</span>
                      </div>
                      <span className="text-[10px] text-slate-500 pl-5">
                        Remplace l'intégralité du personnel actuel par les enregistrements validés du fichier.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                {jsonValidationResult
                  ? `${jsonValidationResult.validRecordsCount} collaborateur(s) prêt(s)`
                  : 'En attente d’un fichier ou texte JSON'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={
                    !jsonValidationResult?.canRestore ||
                    (jsonValidationResult.corruptedRecordsCount > 0 && !ignoreCorrupted)
                  }
                  onClick={handleExecuteRestoreJson}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs shadow-md flex items-center space-x-1.5 transition-colors"
                >
                  <ArrowUpFromLine className="w-4 h-4" />
                  <span>
                    Appliquer la Restauration ({jsonValidationResult?.validRecordsCount || 0})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Handwriting / Mouse / Touch Signature Capture Modal */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <SignaturePad
            initialSignature={
              employeeForDirectSignature
                ? employeeForDirectSignature.employeeSignatureUrl
                : formData.employeeSignatureUrl
            }
            employeeName={
              employeeForDirectSignature
                ? `${employeeForDirectSignature.firstName} ${employeeForDirectSignature.lastName}`
                : `${formData.firstName || ''} ${formData.lastName || 'Collaborateur'}`
            }
            onSave={(sigDataUrl) => {
              if (employeeForDirectSignature) {
                onUpdateEmployee({
                  ...employeeForDirectSignature,
                  employeeSignatureUrl: sigDataUrl,
                });
                setEmployeeForDirectSignature(null);
              } else {
                setFormData((f) => ({ ...f, employeeSignatureUrl: sigDataUrl }));
              }
              setIsSignatureModalOpen(false);
            }}
            onClose={() => {
              setIsSignatureModalOpen(false);
              setEmployeeForDirectSignature(null);
            }}
          />
        </div>
      )}
    </div>
  );
};
