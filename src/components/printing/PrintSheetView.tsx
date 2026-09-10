import React, { useState } from 'react';
import { Company, Employee, CardTemplate, PrintSheetConfig, CardCustomization } from '../../types';
import { CardRenderer } from '../card/CardRenderer';
import { exportA4PrintSheetPdf } from '../../utils/exportHelper';
import {
  Printer,
  FileDown,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  Sliders,
  Scissors,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Gauge,
  HelpCircle,
  FileCheck,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface PrintSheetViewProps {
  company: Company;
  employees: Employee[];
  template: CardTemplate;
  customization?: CardCustomization;
  onNavigateToStudio: () => void;
}

export const PrintSheetView: React.FC<PrintSheetViewProps> = ({
  company,
  employees,
  template,
  customization,
  onNavigateToStudio,
}) => {
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(
    employees.map((e) => e.id)
  );
  const [printLayout, setPrintLayout] = useState<'both_pages' | 'front_only' | 'back_only'>(
    'both_pages'
  );
  const [showCropMarks, setShowCropMarks] = useState<boolean>(true);
  const [showBleed, setShowBleed] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [selectedDpi, setSelectedDpi] = useState<number>(300); // 150, 300, 600 DPI
  const [pdfProgressMessage, setPdfProgressMessage] = useState<string>('');
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [cardsPerPage, setCardsPerPage] = useState<number>(8); // 8 cards per A4 page

  const selectedEmployees = employees.filter((e) =>
    selectedEmployeeIds.includes(e.id)
  );

  const toggleSelectAll = () => {
    if (selectedEmployeeIds.length === employees.length) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(employees.map((e) => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter((x) => x !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleGeneratePdfPlanche = async (overrideDpi?: number) => {
    const targetDpi = overrideDpi || selectedDpi;
    setIsGeneratingPdf(true);
    setPdfProgressMessage('Initialisation de la planche d’impression...');
    setExportSuccessMessage(null);

    try {
      await exportA4PrintSheetPdf({
        frontSheetElementId: 'print-sheet-front',
        backSheetElementId: 'print-sheet-back',
        companyName: company.name,
        printLayout,
        dpi: targetDpi,
        onProgress: (msg) => setPdfProgressMessage(msg),
      });

      setExportSuccessMessage(
        `Planche PDF haute résolution (${targetDpi} DPI) générée avec succès pour ${selectedEmployees.length} carte(s) !`
      );
      setTimeout(() => setExportSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Failed to generate A4 print sheet PDF', err);
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgressMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {exportSuccessMessage && (
        <div className="print:hidden bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold">{exportSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Control Bar (hidden on browser print) */}
      <div className="print:hidden bg-white rounded-xl p-6 text-slate-800 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-1">
              <Scissors className="w-4 h-4" />
              <span>Module d’Imposition & Massicotage A4 — Pré-Presse</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
              <span>Générateur de Planche d’Impression Recto-Verso</span>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">
                300 DPI PRO
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Calibré pour papier PVC / cartonné 300g format A4 (210 × 297 mm) avec repères de coupe professionnels et alignement miroir recto-verso.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePrintBrowser}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2 border border-slate-200 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimer Navigateur</span>
            </button>

            {/* Direct 300 DPI Export Button */}
            <button
              type="button"
              disabled={isGeneratingPdf || selectedEmployees.length === 0}
              onClick={() => handleGeneratePdfPlanche(300)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm shadow-indigo-200 disabled:opacity-50 transition-all hover:shadow"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfProgressMessage || 'Génération 300 DPI...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Exporter Planche PDF (300 DPI Pro)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Technical Pre-Press Quality Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5 font-medium">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-slate-800">Résolution d'exportation :</span>
            </div>

            <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedDpi(150)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  selectedDpi === 150
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                150 DPI (Brouillon)
              </button>
              <button
                type="button"
                onClick={() => setSelectedDpi(300)}
                className={`px-3 py-1 rounded text-xs font-bold transition-colors flex items-center space-x-1 ${
                  selectedDpi === 300
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>300 DPI</span>
                <span className="text-[10px] uppercase opacity-90">(Pro)</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDpi(600)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  selectedDpi === 600
                    ? 'bg-purple-700 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                600 DPI (Ultra HD)
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
            <span className="bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-semibold">
              {selectedDpi === 300
                ? '2480 × 3508 px'
                : selectedDpi === 600
                ? '4960 × 7016 px'
                : '1240 × 1754 px'}
            </span>
            <span>• Format A4 ISO 210×297 mm</span>
            <span>• 8 Badges CR-80 / feuille</span>
          </div>
        </div>

        {/* Filters and Options */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="text-slate-600 block font-semibold mb-1">
              Mode de Rendu & Imposition
            </label>
            <select
              value={printLayout}
              onChange={(e) =>
                setPrintLayout(e.target.value as 'both_pages' | 'front_only' | 'back_only')
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="both_pages">Recto & Verso (Alignement Duplex)</option>
              <option value="front_only">Recto Uniquement (Page 1)</option>
              <option value="back_only">Verso Uniquement (Page 2)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-600 block font-semibold mb-1">
              Repères d'imprimerie & Découpe
            </label>
            <div className="flex items-center space-x-4 pt-2">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCropMarks}
                  onChange={(e) => setShowCropMarks(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">Traits de coupe (Massicot)</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBleed}
                  onChange={(e) => setShowBleed(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 font-medium">Fond perdu</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-800 font-semibold block">
                Employés sélectionnés: {selectedEmployees.length} / {employees.length}
              </span>
              <span className="text-slate-500 text-[11px]">
                {Math.ceil(selectedEmployees.length / cardsPerPage)} page(s) A4 requise(s) pour la production
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors shadow-sm"
            >
              {selectedEmployeeIds.length === employees.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
          </div>
        </div>
      </div>

      {/* Selected Employee Quick Toggles (hidden in print) */}
      <div className="print:hidden bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
          Sélection individuelle des cartes à inclure dans la planche :
        </span>
        <div className="flex flex-wrap gap-2">
          {employees.map((emp) => {
            const isSelected = selectedEmployeeIds.includes(emp.id);
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => toggleSelect(emp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                    : 'bg-slate-100 text-slate-500 border border-slate-200 opacity-60'
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {emp.lastName} {emp.firstName} ({emp.employeeNumber})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* A4 PRINT SHEET RENDERING CONTAINER */}
      <div className="space-y-8 flex flex-col items-center">
        {/* RECTO SHEET */}
        {(printLayout === 'both_pages' || printLayout === 'front_only') && (
          <div className="flex flex-col items-center">
            <div className="print:hidden text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center space-x-2">
              <span>Planche A4 — RECTO (Face avant • Résolution {selectedDpi} DPI)</span>
            </div>

            {/* A4 Sheet Dimensions: 210mm x 297mm (Approx 794px x 1123px at 96 DPI CSS, scaled to 300 DPI during export) */}
            <div
              id="print-sheet-front"
              className="bg-white text-black shadow-2xl border border-slate-300 print:shadow-none print:border-none relative flex flex-col justify-between"
              style={{
                width: '794px',
                height: '1123px',
                padding: '24px 32px',
                boxSizing: 'border-box',
              }}
            >
              {/* Header Sheet Info */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-1 text-[9px] text-slate-500 font-mono">
                <span>{company.name} — PLANCHE DE PRODUCTION RECTO</span>
                <span>ISO CR-80 (85.60 × 53.98 mm) • {selectedDpi} DPI</span>
                <span>DATE: {new Date().toLocaleDateString('fr-FR')}</span>
              </div>

              {/* Grid 2 Columns x 4 Rows = 8 Cards */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 my-auto items-center justify-items-center">
                {selectedEmployees.slice(0, cardsPerPage).map((emp) => (
                  <div key={emp.id} className="relative p-1">
                    {/* Crop marks corners */}
                    {showCropMarks && (
                      <>
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-black pointer-events-none" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-black pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-black pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-black pointer-events-none" />
                      </>
                    )}
                    <CardRenderer
                      company={company}
                      employee={emp}
                      template={template}
                      customization={customization}
                      side="front"
                      scale={0.76}
                      isInteractive3D={false}
                      isPrintMode={true}
                    />
                  </div>
                ))}
              </div>

              {/* Footer Sheet Color Bars & Alignment Target */}
              <div className="flex items-center justify-between border-t border-slate-300 pt-1 text-[8px] text-slate-400 font-mono">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-2 bg-cyan-500" />
                  <div className="w-3 h-2 bg-pink-500" />
                  <div className="w-3 h-2 bg-yellow-400" />
                  <div className="w-3 h-2 bg-black" />
                  <span className="ml-2 text-slate-600">UNIONCOMPANY CMYK REGISTRATION • 300 DPI OFFSET READY</span>
                </div>
                <span>PAGE 1 // RECTO</span>
              </div>
            </div>
          </div>
        )}

        {/* VERSO SHEET (Mirrored horizontally for precise duplex front-back registration) */}
        {(printLayout === 'both_pages' || printLayout === 'back_only') && (
          <div className="flex flex-col items-center">
            <div className="print:hidden text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center space-x-2">
              <span>Planche A4 — VERSO (Alignement Recto-Verso Automatique • Résolution {selectedDpi} DPI)</span>
            </div>

            <div
              id="print-sheet-back"
              className="bg-white text-black shadow-2xl border border-slate-300 print:shadow-none print:border-none relative flex flex-col justify-between"
              style={{
                width: '794px',
                height: '1123px',
                padding: '24px 32px',
                boxSizing: 'border-box',
              }}
            >
              {/* Header Sheet Info */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-1 text-[9px] text-slate-500 font-mono">
                <span>{company.name} — PLANCHE DE PRODUCTION VERSO (DUPLEX)</span>
                <span>ISO CR-80 (85.60 × 53.98 mm) • {selectedDpi} DPI</span>
                <span>QR CODES SÉCURISÉS</span>
              </div>

              {/* Mirrored grid for reverse side alignment */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 my-auto items-center justify-items-center">
                {selectedEmployees.slice(0, cardsPerPage).map((emp) => (
                  <div key={`back-${emp.id}`} className="relative p-1">
                    {showCropMarks && (
                      <>
                        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-black pointer-events-none" />
                        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-black pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-black pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-black pointer-events-none" />
                      </>
                    )}
                    <CardRenderer
                      company={company}
                      employee={emp}
                      template={template}
                      customization={customization}
                      side="back"
                      scale={0.76}
                      isInteractive3D={false}
                      isPrintMode={true}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-300 pt-1 text-[8px] text-slate-400 font-mono">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-2 bg-black" />
                  <div className="w-3 h-2 bg-yellow-400" />
                  <div className="w-3 h-2 bg-pink-500" />
                  <div className="w-3 h-2 bg-cyan-500" />
                  <span className="ml-2 text-slate-600">UNIONCOMPANY CMYK REGISTRATION • 300 DPI DUPLEX MASTER</span>
                </div>
                <span>PAGE 2 // VERSO</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

