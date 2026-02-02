import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  FileSpreadsheet,
  Palette,
  BarChart3,
  Save,
  RotateCcw,
  Check,
  X,
  Eye,
  EyeOff,
  Layers,
  Edit,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImportFormatConfig {
  id: string;
  name: string;
  enabled: boolean;
  maxFileSize: number; // en MB
}

interface ChartConfig {
  type: string;
  label: string;
  enabled: boolean;
}

interface PageComponent {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
}

interface PageConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  category: 'reporting' | 'import' | 'admin';
  components?: PageComponent[];
}

interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  accentColor: string;
}

interface AppSettings {
  importFormats: ImportFormatConfig[];
  charts: ChartConfig[];
  pages: PageConfig[];
  theme: ThemeConfig;
  autoSave: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  importFormats: [
    { id: 'excel', name: 'Excel', enabled: true, maxFileSize: 10 },
    { id: 'csv', name: 'CSV/TSV', enabled: true, maxFileSize: 50 },
    { id: 'json', name: 'JSON', enabled: true, maxFileSize: 50 },
    { id: 'xml', name: 'XML', enabled: true, maxFileSize: 50 },
    { id: 'hl7', name: 'HL7/FHIR', enabled: true, maxFileSize: 50 },
    { id: 'docx', name: 'Word/PDF', enabled: false, maxFileSize: 50 },
  ],
  charts: [
    { type: 'line', label: 'Gráficos de Línea', enabled: true },
    { type: 'bar', label: 'Gráficos de Barras', enabled: true },
    { type: 'pie', label: 'Gráficos Circulares', enabled: true },
    { type: 'area', label: 'Gráficos de Área', enabled: true },
    { type: 'scatter', label: 'Gráficos de Dispersión', enabled: false },
  ],
  pages: [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      enabled: true,
      category: 'reporting',
      components: [
        { id: 'summary-cards', name: 'Tarjetas de Resumen', enabled: true, description: 'Métricas principales' },
        { id: 'charts', name: 'Gráficos', enabled: true, description: 'Visualizaciones' },
        { id: 'recent-activity', name: 'Actividad Reciente', enabled: true, description: 'Últimas acciones' },
      ],
    },
    {
      id: 'facility-report',
      name: 'Facility Wound Report',
      icon: '📋',
      enabled: true,
      category: 'reporting',
      components: [
        { id: 'filter-panel', name: 'Panel de Filtros', enabled: true, description: 'Opciones de búsqueda' },
        { id: 'data-table', name: 'Tabla de Datos', enabled: true, description: 'Listado de heridas' },
        { id: 'export-options', name: 'Opciones de Exportación', enabled: true, description: 'Descarga de reportes' },
      ],
    },
    {
      id: 'outcome-report',
      name: 'Outcome Report Global',
      icon: '📈',
      enabled: true,
      category: 'reporting',
      components: [
        { id: 'timeline', name: 'Línea de Tiempo', enabled: true, description: 'Evolución temporal' },
        { id: 'statistics', name: 'Estadísticas', enabled: true, description: 'Análisis de datos' },
        { id: 'comparisons', name: 'Comparativas', enabled: true, description: 'Comparación de períodos' },
      ],
    },
    {
      id: 'etiology-report',
      name: 'Wound Etiology',
      icon: '🔍',
      enabled: true,
      category: 'reporting',
      components: [
        { id: 'etiology-breakdown', name: 'Desglose de Etiología', enabled: true, description: 'Causas de heridas' },
        { id: 'patterns', name: 'Patrones', enabled: true, description: 'Tendencias identificadas' },
      ],
    },
    {
      id: 'acuity-report',
      name: 'Acuity Index',
      icon: '⚠️',
      enabled: true,
      category: 'reporting',
      components: [
        { id: 'risk-assessment', name: 'Evaluación de Riesgo', enabled: true, description: 'Puntuaciones de riesgo' },
        { id: 'severity-chart', name: 'Gráfico de Severidad', enabled: true, description: 'Distribución de severidad' },
      ],
    },
    {
      id: 'data-import',
      name: 'Data Import Hub',
      icon: '📥',
      enabled: true,
      category: 'import',
      components: [
        { id: 'format-selector', name: 'Selector de Formato', enabled: true, description: 'Elegir formato' },
        { id: 'upload-area', name: 'Área de Carga', enabled: true, description: 'Cargar archivo' },
        { id: 'preview', name: 'Vista Previa', enabled: true, description: 'Previsualizar datos' },
        { id: 'validation', name: 'Validación', enabled: true, description: 'Verificar datos' },
      ],
    },
    {
      id: 'excel-import',
      name: 'Excel Import',
      icon: '📊',
      enabled: true,
      category: 'import',
      components: [
        { id: 'upload-area', name: 'Área de Carga', enabled: true, description: 'Cargar archivo Excel' },
        { id: 'preview', name: 'Vista Previa', enabled: true, description: 'Previsualizar datos' },
        { id: 'validation', name: 'Validación', enabled: true, description: 'Verificar datos' },
      ],
    },
    {
      id: 'settings',
      name: 'Configuración',
      icon: '⚙️',
      enabled: true,
      category: 'admin',
      components: [
        { id: 'general-settings', name: 'Configuración General', enabled: true, description: 'Opciones básicas' },
        { id: 'page-management', name: 'Gestión de Páginas', enabled: true, description: 'Control de páginas' },
        { id: 'theme-settings', name: 'Configuración de Tema', enabled: true, description: 'Apariencia' },
      ],
    },
  ],
  theme: {
    mode: 'system',
    accentColor: '#3b82f6', // blue-500
  },
  autoSave: true,
  notificationsEnabled: true,
};

// Función para validar y migrar configuración antigua
const migrateSettings = (saved: any): AppSettings => {
  // Fusionar páginas guardadas con componentes por defecto
  const savedPages = saved?.pages || [];
  const mergedPages = DEFAULT_SETTINGS.pages.map(defaultPage => {
    const savedPage = savedPages.find((p: PageConfig) => p.id === defaultPage.id);
    if (savedPage) {
      // Mantener estado guardado pero asegurar que tenga componentes
      return {
        ...savedPage,
        components: defaultPage.components, // Usar siempre los componentes por defecto
      };
    }
    return defaultPage;
  });

  const merged: AppSettings = {
    importFormats: saved?.importFormats || DEFAULT_SETTINGS.importFormats,
    charts: saved?.charts || DEFAULT_SETTINGS.charts,
    pages: mergedPages,
    theme: saved?.theme || DEFAULT_SETTINGS.theme,
    autoSave: saved?.autoSave !== undefined ? saved.autoSave : DEFAULT_SETTINGS.autoSave,
    notificationsEnabled: saved?.notificationsEnabled !== undefined ? saved.notificationsEnabled : DEFAULT_SETTINGS.notificationsEnabled,
  };
  return merged;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const { toast } = useToast();

  // Cargar configuración al montar el componente
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        const migrated = migrateSettings(parsed);
        setSettings(migrated);
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
      }
    }
  }, []);

  // Detectar cambios
  const handleSettingChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setHasChanges(true);
  };

  // Alternar expansión de página
  const togglePageExpanded = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  // Actualizar componente de una página
  const updatePageComponent = (pageId: string, componentId: string, enabled: boolean) => {
    const newPages = settings.pages.map(page =>
      page.id === pageId
        ? {
            ...page,
            components: (page.components || []).map(comp =>
              comp.id === componentId ? { ...comp, enabled } : comp
            ),
          }
        : page
    );
    handleSettingChange({
      ...settings,
      pages: newPages,
    });
  };

  // Guardar configuración
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 500));

      localStorage.setItem('appSettings', JSON.stringify(settings));

      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias han sido guardadas exitosamente.',
      });

      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error al guardar',
        description: 'No pudimos guardar tu configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar valores por defecto
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast({
      title: 'Configuración reiniciada',
      description: 'Se han restaurado los valores por defecto.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="text-muted-foreground">
          Personaliza las opciones de importación, temas y componentes de la aplicación
        </p>
      </div>

      {/* Advertencia si hay cambios sin guardar */}
      {hasChanges && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>Tienes cambios sin guardar</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs para las diferentes secciones de configuración */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="pages">
            <Layers className="h-4 w-4 mr-2" />
            Páginas
          </TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart3 className="h-4 w-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="import-formats">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Formato de Importación
          </TabsTrigger>
          <TabsTrigger value="theme">
            <Palette className="h-4 w-4 mr-2" />
            Tema
          </TabsTrigger>
        </TabsList>

        {/* Pestaña: Formatos de Importación */}
        {/* Pestaña: General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Opciones generales de la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Guardado Automático</p>
                    <p className="text-sm text-muted-foreground">
                      Guarda cambios automáticamente cada cierto tiempo
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleSettingChange({
                        ...settings,
                        autoSave: !settings.autoSave,
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.autoSave
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {settings.autoSave ? (
                      <>
                        <Check className="h-4 w-4 inline mr-2" />
                        Habilitado
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Deshabilitado
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Notificaciones</p>
                    <p className="text-sm text-muted-foreground">
                      Recibe notificaciones sobre importaciones y cambios
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleSettingChange({
                        ...settings,
                        notificationsEnabled: !settings.notificationsEnabled,
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      settings.notificationsEnabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {settings.notificationsEnabled ? (
                      <>
                        <Check className="h-4 w-4 inline mr-2" />
                        Habilitado
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Deshabilitado
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium">Resumen de Configuración</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded">
                    <p className="text-muted-foreground">Formatos Habilitados</p>
                    <p className="font-semibold text-lg">
                      {settings.importFormats.filter(f => f.enabled).length}/{settings.importFormats.length}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p className="text-muted-foreground">Gráficos Habilitados</p>
                    <p className="font-semibold text-lg">
                      {settings.charts.filter(c => c.enabled).length}/{settings.charts.length}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded">
                    <p className="text-muted-foreground">Páginas Visibles</p>
                    <p className="font-semibold text-lg">
                      {settings.pages.filter(p => p.enabled).length}/{settings.pages.length}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Páginas */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Páginas</CardTitle>
              <CardDescription>
                Controla qué páginas están disponibles en la aplicación
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Validación defensiva */}
              {!settings.pages || settings.pages.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No hay páginas configuradas. Por favor, recarga la página.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Agrupar por categoría */}
                  {(['reporting', 'import', 'admin'] as const).map((category) => {
                    const categoryLabel = {
                      reporting: '📊 Reportes y Análisis',
                      import: '📥 Importación de Datos',
                      admin: '⚙️ Administración',
                    }[category];

                    const pagesInCategory = (settings.pages || []).filter(p => p.category === category);

                    return (
                      <div key={category} className="space-y-3">
                        <h4 className="font-semibold text-sm">{categoryLabel}</h4>
                        <div className="space-y-3">
                          {pagesInCategory.map((page) => (
                        <div key={page.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="space-y-1 flex-1">
                              <p className="font-medium flex items-center gap-2">
                                <span className="text-lg">{page.icon}</span>
                                {page.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {page.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => togglePageExpanded(page.id)}
                                className="p-2 hover:bg-muted rounded transition-colors"
                                title="Editar componentes"
                              >
                                {expandedPages.has(page.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const newPages = settings.pages.map(p =>
                                    p.id === page.id ? { ...p, enabled: !p.enabled } : p
                                  );
                                  handleSettingChange({
                                    ...settings,
                                    pages: newPages,
                                  });
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                                  page.enabled
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                              >
                                {page.enabled ? (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Visible
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Oculta
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Panel de edición de componentes */}
                          {expandedPages.has(page.id) && page.components && page.components.length > 0 && (
                            <div className="mt-2 pt-4 border-t">
                              <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-xs font-bold uppercase text-blue-900 mb-3 flex items-center gap-2">
                                  <span>📦</span>
                                  Componentes de esta página
                                </p>
                                <div className="space-y-2">
                                  {page.components.map((component) => (
                                    <div
                                      key={component.id}
                                      className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all"
                                    >
                                      <div className="space-y-1 flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900">{component.name}</p>
                                        {component.description && (
                                          <p className="text-xs text-gray-500">
                                            {component.description}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updatePageComponent(page.id, component.id, !component.enabled)
                                        }
                                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ml-3 ${
                                          component.enabled
                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                      >
                                        {component.enabled ? (
                                          <>
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>Visible</span>
                                          </>
                                        ) : (
                                          <>
                                            <EyeOff className="h-3.5 w-3.5" />
                                            <span>Oculto</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
                  })}

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-6 space-y-2">
                    <p className="text-sm text-blue-900">
                      💡 <strong>Nota sobre páginas:</strong> Las páginas ocultas no aparecerán en el menú de navegación, pero pueden seguir siendo accesibles directamente mediante URL. Para mayor seguridad, implementa validación en el backend.
                    </p>
                    <p className="text-sm text-blue-900">
                      🔧 <strong>Nota sobre componentes:</strong> Haz clic en el botón de flecha (↑↓) para expandir una página y editar sus componentes específicos. Puedes mostrar u ocultar cada componente de forma independiente.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Gráficos */}
        <TabsContent value="charts">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Gráficos</CardTitle>
              <CardDescription>
                Selecciona qué tipos de gráficos están disponibles en los reportes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.charts.map((chart) => (
                <div
                  key={chart.type}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{chart.label}</p>
                    <p className="text-sm text-muted-foreground">
                      Tipo: {chart.type}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newCharts = settings.charts.map(c =>
                        c.type === chart.type ? { ...c, enabled: !c.enabled } : c
                      );
                      handleSettingChange({
                        ...settings,
                        charts: newCharts,
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      chart.enabled
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {chart.enabled ? (
                      <>
                        <Check className="h-4 w-4 inline mr-2" />
                        Habilitado
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Deshabilitado
                      </>
                    )}
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-4">
                💡 Mantén habilitados al menos los gráficos que uses frecuentemente
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-formats">
          <Card>
            <CardHeader>
              <CardTitle>Formatos de Importación</CardTitle>
              <CardDescription>
                Controla qué formatos de archivo están disponibles en el Data Import Hub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.importFormats.map((format) => (
                <div
                  key={format.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{format.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Tamaño máximo: {format.maxFileSize} MB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newFormats = settings.importFormats.map(f =>
                        f.id === format.id ? { ...f, enabled: !f.enabled } : f
                      );
                      handleSettingChange({
                        ...settings,
                        importFormats: newFormats,
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      format.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {format.enabled ? (
                      <>
                        <Check className="h-4 w-4 inline mr-2" />
                        Habilitado
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Deshabilitado
                      </>
                    )}
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-4">
                💡 Deshabilitar un formato lo ocultará del selector de Data Import Hub
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Tema */}
        <TabsContent value="theme">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Modo de Tema</CardTitle>
                <CardDescription>
                  Elige cómo deseas que se vea la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        handleSettingChange({
                          ...settings,
                          theme: { ...settings.theme, mode },
                        });
                      }}
                      className={`p-4 border-2 rounded-lg transition-colors capitalize ${
                        settings.theme.mode === mode
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{mode}</div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {mode === 'light' && 'Modo claro'}
                        {mode === 'dark' && 'Modo oscuro'}
                        {mode === 'system' && 'Del sistema'}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Color de Acento</CardTitle>
                <CardDescription>
                  Personaliza el color principal de la aplicación
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { hex: '#3b82f6', name: 'Azul' },
                    { hex: '#ef4444', name: 'Rojo' },
                    { hex: '#10b981', name: 'Verde' },
                    { hex: '#f59e0b', name: 'Ámbar' },
                    { hex: '#8b5cf6', name: 'Púrpura' },
                  ].map((color) => (
                    <button
                      key={color.hex}
                      onClick={() => {
                        handleSettingChange({
                          ...settings,
                          theme: { ...settings.theme, accentColor: color.hex },
                        });
                      }}
                      className={`p-4 rounded-lg border-2 transition-transform hover:scale-105 ${
                        settings.theme.accentColor === color.hex
                          ? 'border-foreground'
                          : 'border-border'
                      }`}
                    >
                      <div
                        className="w-full h-12 rounded mb-2"
                        style={{ backgroundColor: color.hex }}
                      />
                      <p className="text-sm font-medium text-center">{color.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
