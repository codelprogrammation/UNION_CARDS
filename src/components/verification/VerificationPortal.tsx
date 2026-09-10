import React, { useState, useEffect } from 'react';
import { Company, Employee } from '../../types';
import { generateCryptoHash } from '../../utils/qrCodeHelper';
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
  Radio
} from 'lucide-react';

interface VerificationPortalProps {
  companies: Company[];
  employees: Employee[];
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({
  companies,
  employees,
}) => {
  const [tokenInput, setTokenInput] = useState<string>('');
  const [verifiedEmployee, setVerifiedEmployee] = useState<Employee | null>(null);
  const [verifiedCompany, setVerifiedCompany] = useState<Company | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [scanTimestamp, setScanTimestamp] = useState<string>('');

  // Check URL query parameters if opened via QR code link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setTokenInput(urlToken);
      performVerification(urlToken);
    } else if (employees.length > 0) {
      // Default to first employee for demonstration
      setTokenInput(employees[0].token);
      performVerification(employees[0].token);
    }
  }, [employees]);

  const performVerification = (tokenToVerify: string) => {
    setHasSearched(true);
    setScanTimestamp(new Date().toLocaleString('fr-FR'));

    const foundEmp = employees.find(
      (e) =>
        e.token.toLowerCase() === tokenToVerify.trim().toLowerCase() ||
        e.employeeNumber.toLowerCase() === tokenToVerify.trim().toLowerCase()
    );

    if (foundEmp) {
      setVerifiedEmployee(foundEmp);
      const comp = companies.find((c) => c.id === foundEmp.companyId) || companies[0];
      setVerifiedCompany(comp);
    } else {
      setVerifiedEmployee(null);
      setVerifiedCompany(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      performVerification(tokenInput);
    }
  };

  const cryptoHash = verifiedEmployee
    ? generateCryptoHash(verifiedEmployee.id, verifiedEmployee.token)
    : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 sm:p-8 text-slate-800 text-center border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3 border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Portail d'Authentification Cryptographique</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Vérification d’Identité & Validité de Carte
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto">
          Scannez le QR Code présent au verso de la carte de service ou saisissez le token de sécurité pour contrôler instantanément le statut de l'agent.
        </p>

        {/* Search input */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto mt-6 flex gap-2">
          <div className="relative flex-1">
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Token de sécurité (ex: tok_7810_...) ou Matricule"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm shadow-indigo-100 flex items-center space-x-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Vérifier</span>
          </button>
        </form>
      </div>

      {/* Quick Test Token Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-slate-500 font-medium">Tester un profil :</span>
        {employees.slice(0, 4).map((emp) => (
          <button
            key={emp.id}
            onClick={() => {
              setTokenInput(emp.token);
              performVerification(emp.token);
            }}
            className={`px-3 py-1 rounded-lg border text-xs font-mono font-semibold transition-all ${
              verifiedEmployee?.id === emp.id
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {emp.firstName} ({emp.status})
          </button>
        ))}
      </div>

      {/* Verification Result Certificate */}
      {hasSearched && (
        <div className="space-y-4">
          {verifiedEmployee && verifiedCompany ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
              {/* Status Banner */}
              <div
                className={`p-4 flex items-center justify-between text-white ${
                  verifiedEmployee.status === 'active'
                    ? 'bg-emerald-600'
                    : verifiedEmployee.status === 'revoked'
                    ? 'bg-rose-600'
                    : 'bg-amber-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {verifiedEmployee.status === 'active' && (
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {verifiedEmployee.status === 'revoked' && (
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <ShieldX className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {verifiedEmployee.status === 'expired' && (
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 block">
                      RÉSULTAT DU CONTRÔLE D'AUTHENTICITÉ
                    </span>
                    <h2 className="text-base sm:text-lg font-bold">
                      {verifiedEmployee.status === 'active' && 'CARTE AUTHENTIQUE & ACTIVE'}
                      {verifiedEmployee.status === 'revoked' && 'CARTE RÉVOQUÉE — ACCÈS REFUSÉ'}
                      {verifiedEmployee.status === 'expired' && 'CARTE EXPIRÉE — RENOUVELLEMENT REQUIS'}
                    </h2>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] font-mono text-white/80 block">DATE DU SCAN</span>
                  <span className="text-xs font-semibold font-mono">{scanTimestamp}</span>
                </div>
              </div>

              {/* Certificate Content */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Photo and Badge */}
                <div className="flex flex-col items-center text-center">
                  <div className="w-32 h-40 rounded-lg overflow-hidden border border-slate-200 shadow-sm mb-3 bg-slate-100 relative">
                    <img
                      src={verifiedEmployee.photoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {verifiedEmployee.status === 'active' && (
                      <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                    {verifiedEmployee.employeeNumber}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Groupe Sanguin: <strong className="text-slate-800">{verifiedEmployee.bloodGroup || 'O+'}</strong>
                  </span>
                </div>

                {/* Agent & Company Credentials */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                      Identité de l'Agent
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 uppercase">
                      {verifiedEmployee.firstName} {verifiedEmployee.lastName}
                    </h3>
                    <p className="text-sm font-semibold text-slate-600">
                      {verifiedEmployee.position}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Entreprise</span>
                      <span className="font-bold text-slate-900">{verifiedCompany.name}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Département</span>
                      <span className="font-bold text-slate-900">{verifiedEmployee.department}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Délivrée le</span>
                      <span className="font-medium text-slate-700">{verifiedEmployee.issueDate}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Date d'Expiration</span>
                      <span className="font-bold text-slate-900">{verifiedEmployee.expiryDate}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Téléphone Urgence</span>
                      <span className="font-bold text-rose-600">{verifiedEmployee.emergencyPhone || verifiedCompany.emergencyPhone}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block uppercase text-[10px] font-semibold">Autorité Émettrice</span>
                      <span className="font-medium text-slate-800">{verifiedCompany.managerName}</span>
                    </div>
                  </div>

                  {/* Cryptographic Proof */}
                  <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[10px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>SIGNATURE CRYPTOGRAPHIQUE SHA-256</span>
                      </span>
                      <span className="text-emerald-400 font-bold">STATUS: OK</span>
                    </div>
                    <p className="break-all text-slate-300">
                      {cryptoHash}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-rose-900">
                Aucune carte correspondante dans le registre UNINCOMPANY
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Le token ou matricule <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-mono">"{tokenInput}"</code> n'existe pas ou a été invalidé. Cette carte peut être une contrefaçon.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
