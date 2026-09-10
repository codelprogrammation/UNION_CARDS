import React, { useState } from 'react';
import { CardTemplate, Company, Employee, TemplateCategory } from '../../types';
import { CARD_TEMPLATES, CATEGORIES } from '../../data/templates';
import { CardRenderer } from './CardRenderer';
import {
  Sparkles,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface TemplateGalleryProps {
  currentCompany: Company;
  currentEmployee: Employee;
  selectedTemplateId: string;
  onSelectTemplate: (template: CardTemplate) => void;
  onNavigateToStudio: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  currentCompany,
  currentEmployee,
  selectedTemplateId,
  onSelectTemplate,
  onNavigateToStudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [previewTemplate, setPreviewTemplate] = useState<CardTemplate | null>(null);

  const toggleFlip = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  const filteredTemplates = CARD_TEMPLATES.filter((tpl) => {
    const matchesCategory =
      selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSearch =
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-white rounded-xl p-6 sm:p-8 text-slate-800 shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-3 border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Catalogue Officiel UNINCOMPANY — {CARD_TEMPLATES.length} Modèles Normés</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Choisissez votre modèle de carte professionnelle
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">
            Chaque modèle est rigoureusement calibré aux normes ISO 7810 ID-1 (85.60 × 53.98 mm) avec recto-verso haute définition, intégration QR code de vérification cryptographique et rendu PVC professionnel.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Génération Recto & Verso</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>QR Code Cryptographique</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <Layers className="w-4 h-4 text-amber-600" />
              <span>Export Planche A4 / PDF / PNG</span>
            </span>
          </div>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un style (ex: Corporate, Médical, Sécurité, Africain, Dark...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 self-center">
            <SlidersHorizontal className="w-4 h-4" />
            <span>{filteredTemplates.length} modèle(s) trouvé(s)</span>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.id === 'all'
                    ? CARD_TEMPLATES.length
                    : CARD_TEMPLATES.filter((t) => t.category === cat.id).length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const isFlipped = !!flippedCards[template.id];

          return (
            <div
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className={`group bg-white rounded-xl p-4 shadow-sm transition-all duration-200 border flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-slate-300 ${
                isSelected
                  ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Title & Badges */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-indigo-600 transition-colors">
                      {template.name}
                    </h3>
                    {template.isPopular && (
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        POPULAIRE
                      </span>
                    )}
                    {template.isNew && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        NOUVEAU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {template.style}
                  </p>
                </div>

                {/* Flip button */}
                <button
                  type="button"
                  title="Tourner la carte (Recto / Verso)"
                  onClick={(e) => toggleFlip(template.id, e)}
                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors flex items-center space-x-1 text-xs font-semibold"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{isFlipped ? 'Verso' : 'Recto'}</span>
                </button>
              </div>

              {/* Interactive Card Canvas Preview */}
              <div className="w-full py-4 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 relative overflow-hidden">
                <CardRenderer
                  company={currentCompany}
                  employee={currentEmployee}
                  template={template}
                  side={isFlipped ? 'back' : 'front'}
                  scale={0.72}
                  isInteractive3D={true}
                  className="shadow-sm transition-transform"
                />
              </div>

              {/* Tags & Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-1 overflow-hidden">
                  {template.tags.slice(0, 2).map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-slate-50 border border-slate-150 text-slate-600 px-2 py-0.5 rounded font-medium truncate"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(template);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    title="Aperçu Grand Format"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                      onNavigateToStudio();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm ${
                      isSelected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>Éditer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full p-6 text-slate-800 border border-slate-200 shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Aperçu Grand Format — {previewTemplate.name}
                </h3>
                <p className="text-sm text-slate-500">
                  {previewTemplate.description}
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-items-center py-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Recto (Face avant)
                </span>
                <CardRenderer
                  company={currentCompany}
                  employee={currentEmployee}
                  template={previewTemplate}
                  side="front"
                  scale={0.9}
                  isInteractive3D={false}
                />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Verso (Face arrière & QR)
                </span>
                <CardRenderer
                  company={currentCompany}
                  employee={currentEmployee}
                  template={previewTemplate}
                  side="back"
                  scale={0.9}
                  isInteractive3D={false}
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end space-x-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                  onNavigateToStudio();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-2 shadow-sm shadow-indigo-200"
              >
                <span>Éditer ce modèle dans le Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
