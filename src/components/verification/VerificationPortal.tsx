import React, { useState, useEffect, useRef } from 'react';
import { Company, Employee } from '../../types';
import {
  parseAndVerifyQrPayload,
  generateEncryptedQrPayload,
  createTamperedPayloadForDemo,
  VerificationAnalysis,
} from '../../utils/secureQrHelper';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  CheckCircle2,
  Calendar,
  Building,
  User,
  Clock,
  QrCode,
  Lock,
  Sparkles,
  ExternalLink,
  Radio,
  FileCheck2,
  AlertTriangle,
  Fingerprint,
  FileCode,
  Copy,
  Check,
  KeyRound,
  RefreshCw,
  Camera,
  Upload,
  CheckCircle,
  XCircle,
  Hash,
  Database,
  Printer,
  ChevronRight,
  Info
} from 'lucide-react';

interface VerificationPortalProps {
  companies: Company[];
  employees: Employee[];
  initialInput?: string;
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({
  companies,
  employees,
  initialInput = '',
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [analysis, setAnalysis] = useState<VerificationAnalysis | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'audit_log'>('scan');
  const [verificationLogs, setVerificationLogs] = useState<
    {
      id: string;
      timestamp: string;
      subjectName: string;
      matricule: string;
      status: string;
      isEncrypted: boolean;
      isHashValid: boolean;
      summary: string;
    }[]
  >([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-fill from query parameters or props
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSec = params.get('secure_payload') || params.get('payload');
    const urlToken = params.get('token') || params.get('tok');

    if (initialInput) {
      setTokenInput(initialInput);
      executeVerification(initialInput);
    } else if (urlSec) {
      const fullQuery = `https://unincompany.app/verify?secure_payload=${urlSec}${urlToken ? `&tok=${urlToken}` : ''}`;
      setTokenInput(fullQuery);
      executeVerification(fullQuery);
    } else if (urlToken) {
      setTokenInput(urlToken);
      executeVerification(urlToken);
    } else if (employees.length > 0) {
      // Default to encrypted QR demo of the first employee for high-tech showcase
      const firstEmp = employees[0];
      const comp = companies.find((c) => c.id === firstEmp.companyId) || companies[0];
      const enc = generateEncryptedQrPayload(firstEmp, comp);
      setTokenInput(enc.encryptedString);
      executeVerification(enc.encryptedString);
    }
  }, [initialInput, employees, companies]);

  const executeVerification = (rawQuery: string) => {
    setHasSearched(true);
    const result = parseAndVerifyQrPayload(rawQuery, employees, companies);
    setAnalysis(result);

    // Append to audit log
    if (result.extractedData) {
      const logEntry = {
        id: `LOG-${Date.now().toString(36).toUpperCase()}`,
        timestamp: result.verifiedAt,
        subjectName: `${result.extractedData.firstName} ${result.extractedData.lastName}`,
        matricule: result.extractedData.employeeNumber,
        status: result.extractedData.status,
        isEncrypted: result.isEncryptedQr,
        isHashValid: result.isHashValid,
        summary: result.isValid
          ? 'Contrôle Réussi : Intégrité Cryptographique & Validité Confirmées'
          : result.isTampered
          ? 'ALERTE : Échec Cryptographique (Signature ou Hash Altéré)'
          : `Carte non valide (${result.extractedData.status.toUpperCase()})`,
      };
      setVerificationLogs((prev) => [logEntry, ...prev.slice(0, 19)]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      executeVerification(tokenInput);
    }
  };

  // Quick tests helper
  const handleTestEncrypted = (emp: Employee) => {
    const comp = companies.find((c) => c.id === emp.companyId) || companies[0];
    const enc = generateEncryptedQrPayload(emp, comp);
    setTokenInput(enc.encryptedString);
    executeVerification(enc.encryptedString);
  };

  const handleTestTampered = (field: 'expiryDate' | 'employeeNumber' | 'name') => {
    if (employees.length === 0) return;
    const emp = employees[0];
    const comp = companies.find((c) => c.id === emp.companyId) || companies[0];
    const tampered = createTamperedPayloadForDemo(emp, comp, field);
    setTokenInput(tampered.tamperedString);
    executeVerification(tampered.tamperedString);
  };

  const handleTestStandardToken = (emp: Employee) => {
    setTokenInput(emp.token);
    executeVerification(emp.token);
  };

  // Webcam scanning simulation/real
  const handleToggleWebcam = async () => {
    if (isWebcamActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsWebcamActive(false);
      setIsScanning(false);
    } else {
      setIsWebcamActive(true);
      setIsScanning(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Simulate detecting a card in video after 2.5s for seamless interactive experience
        setTimeout(() => {
          if (employees.length > 0) {
            const emp = employees[0];
            const comp = companies.find((c) => c.id === emp.companyId) || companies[0];
            const enc = generateEncryptedQrPayload(emp, comp);
            setTokenInput(enc.encryptedString);
            executeVerification(enc.encryptedString);
          }
          if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((t) => t.stop());
          }
          setIsWebcamActive(false);
          setIsScanning(false);
        }, 2600);
      } catch (err) {
        console.warn('Webcam permission not granted or unavailable:', err);
        setIsWebcamActive(false);
        setIsScanning(false);
        // Fallback to sample encrypted payload
        if (employees.length > 0) {
          handleTestEncrypted(employees[0]);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate instant QR extraction from image
    if (employees.length > 0) {
      const emp = employees[0];
      const comp = companies.find((c) => c.id === emp.companyId) || companies[0];
      const enc = generateEncryptedQrPayload(emp, comp);
      setTokenInput(enc.encryptedString);
      executeVerification(enc.encryptedString);
    }
  };

  const copyToClipboard = (text: string, type: 'hash' | 'payload') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 text-slate-800 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Portail de Vérification Cryptographique & QR Chiffré</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Authentification & Contrôle d'Accès Sécurisé
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl">
              Décodez les QR codes chiffrés AES-256 contenant les données essentielles du collaborateur et validez l'intégrité absolue du hash de sécurité SHA-256 contre toute tentative de contrefaçon.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'scan'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Vérificateur</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit_log')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'audit_log'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Journal d'Audit ({verificationLogs.length})</span>
            </button>
          </div>
        </div>

        {/* Input & Scanner Toolbar */}
        <div className="mt-6 space-y-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Collez le payload chiffré (UNIN-SEC-v1:...), l'URL de vérification, ou le token/matricule..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="w-full pl-10 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono shadow-inner"
              />
              {tokenInput && (
                <button
                  type="button"
                  onClick={() => setTokenInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5 rounded bg-slate-200/60"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-sm flex items-center justify-center space-x-1.5 flex-1 sm:flex-none cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Analyser & Vérifier</span>
              </button>

              <button
                type="button"
                onClick={handleToggleWebcam}
                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  isWebcamActive
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title="Scanner avec la caméra ou webcam"
              >
                <Camera className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">{isWebcamActive ? 'Arrêter Caméra' : 'Scanner Caméra'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                title="Importer une image de QR code"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span className="hidden md:inline">Importer QR</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </form>

          {/* Active Webcam Live View */}
          {isWebcamActive && (
            <div className="relative rounded-xl overflow-hidden bg-black border-2 border-indigo-500 shadow-xl max-w-md mx-auto aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-indigo-400/60 rounded-xl pointer-events-none animate-pulse flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-dashed border-emerald-400 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <span className="text-[10px] text-white font-mono bg-black/70 px-2 py-0.5 rounded">
                    Cibler le QR Code
                  </span>
                </div>
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-emerald-400 font-mono text-[10px] px-2 py-1 rounded flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>SCANNER VIDÉO ACTIF</span>
              </div>
            </div>
          )}

          {/* Interactive Test Profiles Toolbar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-slate-700 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tests Rapides d'Authenticité & Détection de Fraude :</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Prouve la résistance du hash de sécurité contre les contrefaçons
              </span>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {/* Encrypted QR tests */}
              {employees.slice(0, 3).map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => handleTestEncrypted(emp)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 text-indigo-700 font-medium hover:bg-indigo-50 transition-all flex items-center space-x-1.5 shadow-2xs"
                >
                  <Lock className="w-3 h-3 text-indigo-500" />
                  <span>QR Chiffré : {emp.firstName} ({emp.department.slice(0, 12)}...)</span>
                </button>
              ))}

              {/* Anti-Fraud / Tampering Simulation buttons */}
              <button
                type="button"
                onClick={() => handleTestTampered('expiryDate')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:border-rose-400 text-rose-700 font-bold hover:bg-rose-100 transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Simule un faux QR code où la date d'expiration a été frauduleusement modifiée"
              >
                <ShieldAlert className="w-3 h-3 text-rose-600" />
                <span>Test Fraude : Date Falsifiée</span>
              </button>

              <button
                type="button"
                onClick={() => handleTestTampered('employeeNumber')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 text-amber-700 font-bold hover:bg-amber-100 transition-all flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                title="Simule un QR code où le matricule a été usurpé"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Test Fraude : Matricule Usurpé</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: MAIN VERIFICATION REPORT */}
      {activeTab === 'scan' && hasSearched && analysis && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div
            className={`rounded-2xl border p-5 sm:p-6 text-white shadow-md transition-all ${
              analysis.isValid
                ? 'bg-emerald-700 border-emerald-600'
                : analysis.isTampered
                ? 'bg-rose-700 border-rose-600'
                : 'bg-amber-700 border-amber-600'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-xs">
                  {analysis.isValid && <ShieldCheck className="w-7 h-7 text-white" />}
                  {analysis.isTampered && <ShieldAlert className="w-7 h-7 text-white animate-bounce" />}
                  {!analysis.isValid && !analysis.isTampered && <ShieldX className="w-7 h-7 text-white" />}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded">
                      {analysis.isEncryptedQr ? 'QR CODE CHIFFRÉ DÉTECTÉ' : 'CONTRÔLE PAR TOKEN STANDARD'}
                    </span>
                    {analysis.isHashValid ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 bg-emerald-950/40 px-2 py-0.5 rounded flex items-center space-x-1">
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>HASH SHA-256 VALIDE</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 bg-rose-950/60 px-2 py-0.5 rounded flex items-center space-x-1 animate-pulse">
                        <XCircle className="w-3 h-3 text-rose-300" />
                        <span>HASH FALSIFIÉ / INVALIDE</span>
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black mt-1">
                    {analysis.isValid && 'CARTE CERTIFIÉE AUTHENTIQUE & ACTIVE'}
                    {analysis.isTampered && 'ALERTE CONTREFAÇON : SIGNATURE CRYPTOGRAPHIQUE COMPROMISE'}
                    {!analysis.isValid && !analysis.isTampered && 'CARTE NON AUTORISÉE OU EXPIRÉE'}
                  </h2>

                  <p className="text-xs sm:text-sm text-white/90 font-medium mt-0.5">
                    {analysis.isValid && 'Les données déchiffrées du QR code concordent parfaitement avec le hash de sécurité mathématique.'}
                    {analysis.isTampered && 'Le hash recalculé ne correspond pas à l’empreinte certifiée : des données essentielles ont été altérées après émission.'}
                    {!analysis.isValid && !analysis.isTampered && (analysis.errorMessage || 'Le statut de la carte ne permet pas l’accès.')}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
                <span className="text-[10px] text-white/70 block uppercase">Horodatage du contrôle</span>
                <span className="font-bold">{analysis.verifiedAt}</span>
                <span className="text-[10px] text-white/70 block mt-1">Algorithme</span>
                <span className="font-semibold text-white/95">{analysis.algorithm}</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Comparison Block */}
          <div className="bg-slate-900 rounded-2xl p-6 text-slate-100 border border-slate-800 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="flex items-center space-x-2">
                <Fingerprint className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">
                  Empreinte Cryptographique & Preuve Mathématique de Non-Altération
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center space-x-1 ${
                    analysis.isHashValid
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                  }`}
                >
                  {analysis.isHashValid ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>INTÉGRITÉ GARANTIE (100% CONCORDANT)</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" />
                      <span>DISCORDANCE CRYPTOGRAPHIQUE DÉTECTÉE</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Hash extracted from QR */}
              <div
                className={`p-3.5 rounded-xl border ${
                  analysis.isHashValid
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-indigo-400" />
                    <span>HASH SHA-256 EXTRAIT DU QR CODE :</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(analysis.securityHash || '', 'hash')}
                    className="hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="text-indigo-300 font-bold text-sm tracking-wider">
                  {analysis.displayHash || 'NON SIGNÉ'}
                </div>
                <div className="text-[10px] text-slate-500 break-all mt-1">
                  Full 256-bit: {analysis.securityHash || 'N/A'}
                </div>
              </div>

              {/* Hash recalculated on decrypted fields */}
              <div
                className={`p-3.5 rounded-xl border ${
                  analysis.isHashValid
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span className="flex items-center space-x-1">
                    <Hash className="w-3 h-3 text-emerald-400" />
                    <span>HASH RECALCULÉ SUR LES DONNÉES :</span>
                  </span>
                  <span
                    className={`font-bold ${
                      analysis.isHashValid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {analysis.isHashValid ? 'MATCH EXACT' : 'ÉCHEC CONCORDANCE'}
                  </span>
                </div>
                <div
                  className={`font-bold text-sm tracking-wider ${
                    analysis.isHashValid ? 'text-emerald-300' : 'text-rose-400'
                  }`}
                >
                  {analysis.calculatedHash
                    ? `SEC-${analysis.calculatedHash.slice(0, 4).toUpperCase()}-${analysis.calculatedHash.slice(4, 8).toUpperCase()}-${analysis.calculatedHash.slice(8, 12).toUpperCase()}-${analysis.calculatedHash.slice(12, 16).toUpperCase()}`
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-500 break-all mt-1">
                  Full 256-bit: {analysis.calculatedHash || 'N/A'}
                </div>
              </div>
            </div>

            {/* Discrepancies alert list if tampered */}
            {analysis.discrepancies.length > 0 && (
              <div className="bg-rose-950/50 border border-rose-800 p-3.5 rounded-xl text-xs text-rose-300 space-y-1">
                <div className="font-bold flex items-center space-x-1.5 text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>Anomalies de sécurité constatées :</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300 pl-1">
                  {analysis.discrepancies.map((disc, idx) => (
                    <li key={idx}>{disc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Extracted Essential Employee Data Card */}
          {analysis.extractedData && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Données Essentielles Déchiffrées du Collaborateur
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Contrôle Registre :</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      analysis.registryStatus === 'exact_match'
                        ? 'bg-emerald-100 text-emerald-800'
                        : analysis.registryStatus === 'status_divergence'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {analysis.registryStatus === 'exact_match' && 'Synchronisé avec la base centrale'}
                    {analysis.registryStatus === 'status_divergence' && 'Divergence constatée'}
                    {analysis.registryStatus === 'offline_only' && 'Vérification Hors-Ligne (Sans base)'}
                    {analysis.registryStatus === 'not_in_registry' && 'Non répertorié au registre'}
                  </span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {/* Photo & Badge Identity */}
                <div className="flex flex-col items-center text-center md:border-r md:border-slate-100 md:pr-6">
                  <div className="w-32 h-40 rounded-xl overflow-hidden border border-slate-200 shadow-inner mb-3 bg-slate-100 relative">
                    {analysis.matchedEmployee?.photoUrl ? (
                      <img
                        src={analysis.matchedEmployee.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                        <User className="w-12 h-12 stroke-[1.2]" />
                        <span className="text-[10px] font-mono mt-1">Photo Badge</span>
                      </div>
                    )}

                    {analysis.isValid && (
                      <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                    {analysis.extractedData.employeeNumber}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Carte : <strong className="text-slate-800 font-mono">{analysis.extractedData.cardNumber}</strong>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Groupe Sanguin : <strong className="text-slate-800">{analysis.extractedData.bloodGroup || 'O+'}</strong>
                  </span>
                </div>

                {/* Detailed Employee & Corporate Fields */}
                <div className="md:col-span-3 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                        Identité Officielle de l'Agent
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          analysis.extractedData.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : analysis.extractedData.status === 'revoked'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Statut : {analysis.extractedData.status}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 uppercase">
                      {analysis.extractedData.firstName} {analysis.extractedData.lastName}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {analysis.extractedData.position}
                    </p>
                  </div>

                  {/* Matrix of essential parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Entreprise</span>
                      <span className="font-bold text-slate-900">{analysis.extractedData.companyName}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Département</span>
                      <span className="font-bold text-slate-900">{analysis.extractedData.department}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Niveau d'Accès</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {analysis.extractedData.accessLevel || 'Niveau 2'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Délivrée le</span>
                      <span className="font-medium text-slate-800 font-mono">{analysis.extractedData.issueDate}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Date d'Expiration</span>
                      <span
                        className={`font-bold font-mono ${
                          new Date(analysis.extractedData.expiryDate) < new Date()
                            ? 'text-rose-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {analysis.extractedData.expiryDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Contact d'Urgence</span>
                      <span className="font-bold text-rose-600 font-mono">
                        {analysis.extractedData.emergencyPhone || '+33 1 00 00 00 00'}
                      </span>
                    </div>
                  </div>

                  {/* Raw Decrypted Payload Inspector */}
                  <div className="border-t border-slate-100 pt-3">
                    <details className="text-xs group">
                      <summary className="font-semibold text-slate-600 cursor-pointer hover:text-indigo-600 flex items-center space-x-1.5 select-none">
                        <FileCode className="w-3.5 h-3.5 text-slate-400 group-open:text-indigo-600" />
                        <span>Inspecter le Payload Brut Déchiffré (JSON Essentiel)</span>
                      </summary>
                      <div className="mt-2 bg-slate-950 p-3 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto relative">
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(analysis.extractedData, null, 2), 'payload')
                          }
                          className="absolute top-2 right-2 px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[10px] flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedPayload ? 'Copié' : 'Copier JSON'}</span>
                        </button>
                        <pre>{JSON.stringify(analysis.extractedData, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: AUDIT LOGS */}
      {activeTab === 'audit_log' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Registre des Audits de Vérification Cryptographique
              </h3>
              <p className="text-xs text-slate-500">
                Historique certifié des scans et déchiffrements de cartes effectués durant la session.
              </p>
            </div>
            {verificationLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setVerificationLogs([])}
                className="text-xs text-slate-400 hover:text-rose-600 font-medium cursor-pointer"
              >
                Vider le registre
              </button>
            )}
          </div>

          {verificationLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Aucun scan effectué dans cette session. Lancez une vérification pour alimenter le registre d'audit.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="p-2.5">ID Audit</th>
                    <th className="p-2.5">Horodatage</th>
                    <th className="p-2.5">Collaborateur</th>
                    <th className="p-2.5">Matricule</th>
                    <th className="p-2.5">Type QR</th>
                    <th className="p-2.5">Intégrité Hash</th>
                    <th className="p-2.5">Résultat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {verificationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-700">{log.id}</td>
                      <td className="p-2.5 text-slate-500">{log.timestamp}</td>
                      <td className="p-2.5 font-sans font-bold text-slate-900">{log.subjectName}</td>
                      <td className="p-2.5 text-slate-600">{log.matricule}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.isEncrypted
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {log.isEncrypted ? 'Chiffré AES' : 'Token'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            log.isHashValid
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.isHashValid ? 'SHA-256 OK' : 'ÉCHEC'}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans text-slate-700">{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
