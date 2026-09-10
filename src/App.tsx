import React, { useState, useEffect } from 'react';
import { Company, Employee, CardTemplate, CardCustomization } from './types';
import { CARD_TEMPLATES } from './data/templates';
import { INITIAL_COMPANIES, INITIAL_EMPLOYEES } from './data/mockData';
import { TemplateGallery } from './components/card/TemplateGallery';
import { CardStudio } from './components/editor/CardStudio';
import { PrintSheetView } from './components/printing/PrintSheetView';
import { EmployeeManager } from './components/employees/EmployeeManager';
import { VerificationPortal } from './components/verification/VerificationPortal';
import { VisualAnalyticsDashboard } from './components/analytics/VisualAnalyticsDashboard';
import {
  Sparkles,
  Layers,
  Palette,
  Printer,
  Users,
  ShieldCheck,
  Building2,
  ChevronDown,
  CreditCard,
  RotateCcw,
  BarChart3,
} from 'lucide-react';

const DEFAULT_CUSTOMIZATION: CardCustomization = {
  templateId: 'corporate-premium',
  orientation: 'horizontal',
  primaryColor: '#0f172a',
  secondaryColor: '#2563eb',
  accentColor: '#f59e0b',
  textColor: '#0f172a',
  backgroundColor: '#ffffff',
  fontFamily: 'Inter, sans-serif',
  showPhoto: true,
  showManagerSignature: true,
  showEmployeeSignature: true,
  showQrCode: true,
  qrContentType: 'encrypted_payload',
  qrPayloadFormat: 'smart_url',
  qrIncludeHash: true,
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
  manufacturer: {
    name: 'RM Card Services',
    logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&auto=format&fit=crop&q=80',
    showOnCards: true,
    position: 'bottom_right',
    size: 'small',
  },
  customFields: [
    {
      id: 'cf-blood',
      name: 'Groupe Sanguin',
      defaultValue: 'O+ Rh+',
      type: 'badge',
      side: 'front',
      color: '#dc2626',
      textColor: '#ffffff',
      fontFamily: 'Montserrat, sans-serif',
      fontSize: 8,
      fontWeight: 'bold',
      placementPreset: 'top_right',
      x: 82,
      y: 16,
      styleVariant: 'badge_filled',
      borderRadius: 4,
      showOnCard: true,
    },
    {
      id: 'cf-zone',
      name: 'Zone Affectation',
      defaultValue: 'Siège Principal - Bâtiment A',
      type: 'text',
      side: 'back',
      color: '#0f172a',
      textColor: '#0f172a',
      fontFamily: 'Inter, sans-serif',
      fontSize: 8,
      fontWeight: 'medium',
      placementPreset: 'bottom_left',
      x: 20,
      y: 80,
      styleVariant: 'subtle_card',
      borderRadius: 4,
      showOnCard: true,
    },
  ],
  pvc3dEffect: true,
  lockedElements: [],
};

export function App() {
  // App state with local persistence
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('unincompany_companies');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved companies', e);
    }
    return INITIAL_COMPANIES;
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return localStorage.getItem('unincompany_selected_company_id') || INITIAL_COMPANIES[0].id;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('unincompany_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved employees', e);
    }
    return INITIAL_EMPLOYEES;
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(() => {
    return localStorage.getItem('unincompany_selected_employee_id') || INITIAL_EMPLOYEES[0].id;
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return localStorage.getItem('unincompany_selected_template_id') || 'corporate-premium';
  });

  const [customization, setCustomization] = useState<CardCustomization>(() => {
    try {
      const saved = localStorage.getItem('unincompany_customization');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading saved customization', e);
    }
    return DEFAULT_CUSTOMIZATION;
  });

  const [currentView, setCurrentView] = useState<
    'gallery' | 'studio' | 'print' | 'employees' | 'verification' | 'analytics'
  >('gallery');
  const [verificationPrefill, setVerificationPrefill] = useState<string>('');

  // Persistence side-effects
  useEffect(() => {
    try {
      localStorage.setItem('unincompany_companies', JSON.stringify(companies));
    } catch (e) {
      console.warn('Failed to save companies', e);
    }
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem('unincompany_employees', JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem('unincompany_customization', JSON.stringify(customization));
    } catch (e) {
      console.warn('Failed to save customization', e);
    }
  }, [customization]);

  useEffect(() => {
    localStorage.setItem('unincompany_selected_company_id', selectedCompanyId);
  }, [selectedCompanyId]);

  useEffect(() => {
    localStorage.setItem('unincompany_selected_employee_id', selectedEmployeeId);
  }, [selectedEmployeeId]);

  useEffect(() => {
    localStorage.setItem('unincompany_selected_template_id', selectedTemplateId);
  }, [selectedTemplateId]);

  // Derived current active models
  const currentCompany =
    companies.find((c) => c.id === selectedCompanyId) || companies[0];

  const currentCompanyEmployees = employees.filter(
    (e) => e.companyId === currentCompany.id
  );

  const currentEmployee =
    employees.find((e) => e.id === selectedEmployeeId) ||
    currentCompanyEmployees[0] ||
    employees[0];

  const selectedTemplate =
    CARD_TEMPLATES.find((t) => t.id === selectedTemplateId) || CARD_TEMPLATES[0];

  // Updaters
  const handleUpdateCompany = (updated: Company) => {
    setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleUpdateEmployee = (updated: Employee) => {
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleAddEmployee = (newEmp: Employee) => {
    setEmployees((prev) => [newEmp, ...prev]);
    setSelectedEmployeeId(newEmp.id);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
  };

  const handleResetData = () => {
    if (window.confirm('Voulez-vous réinitialiser toutes les données aux valeurs par défaut de démonstration ?')) {
      localStorage.removeItem('unincompany_companies');
      localStorage.removeItem('unincompany_employees');
      localStorage.removeItem('unincompany_customization');
      localStorage.removeItem('unincompany_selected_company_id');
      localStorage.removeItem('unincompany_selected_employee_id');
      localStorage.removeItem('unincompany_selected_template_id');
      setCompanies(INITIAL_COMPANIES);
      setEmployees(INITIAL_EMPLOYEES);
      setSelectedCompanyId(INITIAL_COMPANIES[0].id);
      setSelectedEmployeeId(INITIAL_EMPLOYEES[0].id);
      setSelectedTemplateId('corporate-premium');
      setCustomization(DEFAULT_CUSTOMIZATION);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Main Navigation Header (hidden on browser print) */}
      <header className="print:hidden sticky top-0 z-40 bg-white text-slate-800 border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Slogan */}
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => setCurrentView('gallery')}
            >
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-indigo-200">
                <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900">
                    UNINCOMPANY
                  </span>
                  <span className="text-[10px] font-semibold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded">
                    PRO ID
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Générateur Professionnel de Cartes d’Identification
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => setCurrentView('gallery')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'gallery'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Modèles ({CARD_TEMPLATES.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('studio')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'studio'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Studio Visuel</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('print')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'print'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Planche A4</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('employees')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'employees'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Collaborateurs ({employees.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('verification')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'verification'
                    ? 'bg-white text-emerald-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vérification QR</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('analytics')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                  currentView === 'analytics'
                    ? 'bg-white text-indigo-700 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Analytique D3</span>
              </button>
            </nav>

            {/* Active Company Selector & Reset Action */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    const matchingEmp = employees.find((x) => x.companyId === e.target.value);
                    if (matchingEmp) setSelectedEmployeeId(matchingEmp.id);
                  }}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-800 text-xs font-medium py-1.5 pl-8 pr-7 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.industry})
                    </option>
                  ))}
                </select>
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleResetData}
                title="Réinitialiser les données de démo"
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-200 py-2 px-2 text-xs bg-slate-50">
          <button
            onClick={() => setCurrentView('gallery')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'gallery' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Modèles
          </button>
          <button
            onClick={() => setCurrentView('studio')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'studio' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Studio
          </button>
          <button
            onClick={() => setCurrentView('print')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'print' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Planche
          </button>
          <button
            onClick={() => setCurrentView('employees')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'employees' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Équipe
          </button>
          <button
            onClick={() => setCurrentView('verification')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'verification' ? 'text-emerald-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Vérif
          </button>
          <button
            onClick={() => setCurrentView('analytics')}
            className={`px-2 py-1 rounded font-semibold ${currentView === 'analytics' ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-600'}`}
          >
            Stats
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentView === 'gallery' && (
          <TemplateGallery
            currentCompany={currentCompany}
            currentEmployee={currentEmployee}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplate={(tpl: CardTemplate) => setSelectedTemplateId(tpl.id)}
            onNavigateToStudio={() => setCurrentView('studio')}
          />
        )}

        {currentView === 'studio' && (
          <CardStudio
            currentCompany={currentCompany}
            currentEmployee={currentEmployee}
            selectedTemplate={selectedTemplate}
            employees={employees}
            companies={companies}
            customization={customization}
            onUpdateCustomization={setCustomization}
            onSelectEmployee={(emp: Employee) => setSelectedEmployeeId(emp.id)}
            onSelectCompany={(comp: Company) => setSelectedCompanyId(comp.id)}
            onSelectTemplate={(tpl: CardTemplate) => setSelectedTemplateId(tpl.id)}
            onUpdateEmployee={handleUpdateEmployee}
            onUpdateCompany={handleUpdateCompany}
            onNavigateToPrintSheet={() => setCurrentView('print')}
            onNavigateToVerification={(prefill) => {
              if (prefill) setVerificationPrefill(prefill);
              setCurrentView('verification');
            }}
          />
        )}

        {currentView === 'print' && (
          <PrintSheetView
            company={currentCompany}
            employees={currentCompanyEmployees.length > 0 ? currentCompanyEmployees : employees}
            template={selectedTemplate}
            customization={customization}
            onNavigateToStudio={() => setCurrentView('studio')}
          />
        )}

        {currentView === 'employees' && (
          <EmployeeManager
            company={currentCompany}
            employees={employees}
            selectedTemplate={selectedTemplate}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onRestoreEmployees={(restoredList) => {
              setEmployees(restoredList);
              if (restoredList.length > 0) {
                setSelectedEmployeeId(restoredList[0].id);
              }
            }}
            onSelectEmployeeForStudio={(emp: Employee) => {
              setSelectedEmployeeId(emp.id);
              setSelectedCompanyId(emp.companyId);
              setCurrentView('studio');
            }}
          />
        )}

        {currentView === 'verification' && (
          <VerificationPortal
            companies={companies}
            employees={employees}
            initialInput={verificationPrefill}
          />
        )}

        {currentView === 'analytics' && (
          <VisualAnalyticsDashboard
            employees={employees}
            companies={companies}
            templates={CARD_TEMPLATES}
            onSelectEmployee={(emp: Employee) => {
              setSelectedEmployeeId(emp.id);
              setSelectedCompanyId(emp.companyId);
              setCurrentView('studio');
            }}
            onSelectTemplate={(tpl: CardTemplate) => {
              setSelectedTemplateId(tpl.id);
              setCurrentView('studio');
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden bg-white border-t border-slate-200 text-slate-500 py-6 px-4 text-center text-xs mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © 2026 <strong className="text-slate-800 font-semibold">UNINCOMPANY ID CARD PLATFORM</strong> — Conforme ISO/IEC 7810 ID-1 (85.60 × 53.98 mm).
          </p>
          <p className="text-slate-400">
            Export Vectoriel HD • QR Cryptographique • Prêt pour Imprimantes PVC (Zebra, Evolis, Fargo)
          </p>
        </div>
      </footer>
    </div>
  );
}
export default App;
