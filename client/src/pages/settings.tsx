import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Users,
  UserCog,
  ShieldCheck,
  Ban,
  Unlock,
  RefreshCw,
  Plus,
  Info,
  Mail,
  Calendar,
  Clock,
  User,
  Loader2,
  ClipboardList,
  Building,
  Phone,
  Trash2,
  ShieldQuestion,
  Search,
  Shield,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { LOCAL_API } from '@/lib/api-config';
import { useAuth } from '@/hooks/use-auth';
import { dispatchAuthEvent, AUTH_EVENTS } from '@/lib/auth-events';
import ImportAudit from '@/components/import-audit';
import { 
  useSettings, 
  DEFAULT_SETTINGS,
  type AppSettings,
  type ImportFormatConfig,
  type ChartConfig,
  type PageConfig,
  type PageComponent,
  type ThemeConfig,
} from '@/hooks/use-settings';

export default function SettingsPage() {
  // Admin protection - redirect if not admin
  const { isAdmin } = useAuth();
  const [, navigate] = useLocation();
  
  // Check admin status on mount
  useEffect(() => {
    if (!isAdmin()) {
      navigate('/facility/');
    }
  }, [isAdmin, navigate]);

  // Use the settings hook for DB persistence
  const { 
    settings: dbSettings, 
    saveSettings, 
    resetSettings, 
    isLoading, 
    isSaving: hookIsSaving 
  } = useSettings();
  
  // Local state for editing (allows canceling changes)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [settingsSynced, setSettingsSynced] = useState(false);
  const { toast } = useToast();

  // Memoized settings page components for efficient tab visibility checks
  const settingsPageComponents = React.useMemo(() => {
    const settingsPage = settings.pages.find(p => p.id === 'settings');
    const components = settingsPage?.components || [];
    return {
      usersEnabled: components.find(c => c.id === 'users-settings')?.enabled ?? false,
      importAuditEnabled: components.find(c => c.id === 'import-audit')?.enabled ?? false,
      chartSettingsEnabled: components.find(c => c.id === 'chart-settings')?.enabled ?? false,
      themeSettingsEnabled: components.find(c => c.id === 'theme-settings')?.enabled ?? false,
    };
  }, [settings.pages]);

  // Toggle component expansion (for nested components)
  const toggleComponentExpanded = (componentId: string) => {
    const newExpanded = new Set(expandedComponents);
    if (newExpanded.has(componentId)) {
      newExpanded.delete(componentId);
    } else {
      newExpanded.add(componentId);
    }
    setExpandedComponents(newExpanded);
  };

  // Helper: Check if all components of a page are disabled (including children)
  const areAllComponentsDisabled = (page: PageConfig): boolean => {
    if (!page.components || page.components.length === 0) return false;
    
    return page.components.every(comp => {
      // If component has children, check if parent is disabled OR all children are disabled
      if (comp.children && comp.children.length > 0) {
        const allChildrenDisabled = comp.children.every(child => !child.enabled);
        return !comp.enabled || allChildrenDisabled;
      }
      return !comp.enabled;
    });
  };

  // Helper: Auto-disable page if all components are disabled
  const autoDisablePageIfNeeded = (pages: PageConfig[]): PageConfig[] => {
    return pages.map(page => {
      if (page.enabled && areAllComponentsDisabled(page)) {
        return { ...page, enabled: false };
      }
      return page;
    });
  };

  // Helper: Auto-enable page if a component is being enabled
  const autoEnablePageIfNeeded = (pages: PageConfig[], pageId: string): PageConfig[] => {
    return pages.map(page => {
      if (page.id === pageId && !page.enabled) {
        return { ...page, enabled: true };
      }
      return page;
    });
  };

  // Define mutually exclusive child groups (radio-button behavior)
  const mutuallyExclusiveGroups: Record<string, string[]> = {
    'chart-acuity-trend': ['acuity-trend-4weeks', 'acuity-trend-daterange'],
  };

  // Update nested child component
  const updateChildComponent = async (pageId: string, parentComponentId: string, childId: string, enabled: boolean) => {
    // Check if this child belongs to a mutually exclusive group
    const exclusiveGroup = mutuallyExclusiveGroups[parentComponentId];
    
    let newPages = settings.pages.map(page =>
      page.id === pageId
        ? {
            ...page,
            components: (page.components || []).map(comp =>
              comp.id === parentComponentId && comp.children
                ? {
                    ...comp,
                    children: comp.children.map(child => {
                      // If enabling and this is a mutually exclusive group
                      if (enabled && exclusiveGroup && exclusiveGroup.includes(childId)) {
                        // Enable only the selected child, disable others in the group
                        if (child.id === childId) {
                          return { ...child, enabled: true };
                        } else if (exclusiveGroup.includes(child.id)) {
                          return { ...child, enabled: false };
                        }
                      }
                      // Normal toggle for non-exclusive children
                      return child.id === childId ? { ...child, enabled } : child;
                    }),
                  }
                : comp
            ),
          }
        : page
    );
    
    // Auto-enable page if a component is being enabled
    if (enabled) {
      newPages = autoEnablePageIfNeeded(newPages, pageId);
    } else {
      // Auto-disable page if all components are now disabled
      newPages = autoDisablePageIfNeeded(newPages);
    }
    
    await handleSettingChangeWithAutoSave({
      ...settings,
      pages: newPages,
    });
  };

  // Sync local state with DB settings when they load (only once)
  useEffect(() => {
    if (dbSettings && !settingsSynced) {
      setSettings(dbSettings);
      setSettingsSynced(true);
    }
  }, [dbSettings, settingsSynced]);

  // Detect changes
  const handleSettingChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    setHasChanges(true);
  };

  // Handle setting change with auto-save support
  const handleSettingChangeWithAutoSave = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    
    // If autoSave is enabled, save immediately
    if (settings.autoSave) {
      try {
        await saveSettings(newSettings);
        setHasChanges(false);
        toast({
          title: 'Settings saved',
          description: 'Changes applied immediately.',
        });
      } catch (error) {
        console.error('[Settings] Auto-save failed:', error);
        setHasChanges(true);
      }
    } else {
      setHasChanges(true);
    }
  };

  // Toggle page visibility (with auto-save if enabled)
  const togglePageVisibility = async (pageId: string) => {
    const newPages = settings.pages.map(p =>
      p.id === pageId ? { ...p, enabled: !p.enabled } : p
    );
    const newSettings = { ...settings, pages: newPages };
    await handleSettingChangeWithAutoSave(newSettings);
  };

  // Toggle page expansion
  const togglePageExpanded = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  // Update page component (with auto-save if enabled)
  const updatePageComponent = async (pageId: string, componentId: string, enabled: boolean) => {
    let newPages = settings.pages.map(page =>
      page.id === pageId
        ? {
            ...page,
            components: (page.components || []).map(comp =>
              comp.id === componentId ? { ...comp, enabled } : comp
            ),
          }
        : page
    );
    
    // Auto-enable page if a component is being enabled
    if (enabled) {
      newPages = autoEnablePageIfNeeded(newPages, pageId);
    } else {
      // Auto-disable page if all components are now disabled
      newPages = autoDisablePageIfNeeded(newPages);
    }
    
    await handleSettingChangeWithAutoSave({
      ...settings,
      pages: newPages,
    });
  };

  // Save settings
  const handleSave = async () => {
    try {
      // Use the hook to save to DB and localStorage
      await saveSettings(settings);

      toast({
        title: 'Settings saved',
        description: 'Your preferences have been saved successfully.',
      });

      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error saving',
        description: 'We couldn\'t save your settings.',
        variant: 'destructive',
      });
    }
  };

  // Reset to default values
  const handleReset = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await resetSettings();
      toast({
        title: 'Settings reset',
        description: 'Default values have been restored.',
      });
      setHasChanges(false);
    } catch (error) {
      setHasChanges(true);
      toast({
        title: 'Settings reset locally',
        description: 'Default values have been restored. Save to confirm.',
      });
    }
  };

  // Show loading state while fetching settings
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Customize import options, themes and application components
        </p>
      </div>

      {/* Warning if there are unsaved changes */}
      {hasChanges && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>You have unsaved changes</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={hookIsSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {hookIsSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different settings sections */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          {settingsPageComponents.usersEnabled && (
            <TabsTrigger value="facilities">
              <Building className="h-4 w-4 mr-2" />
              Facilities
            </TabsTrigger>
          )}
          {settingsPageComponents.usersEnabled && (
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
          )}
          <TabsTrigger value="pages">
            <Layers className="h-4 w-4 mr-2" />
            Pages
          </TabsTrigger>
          {settingsPageComponents.importAuditEnabled && (
            <TabsTrigger value="import-audit">
              <ClipboardList className="h-4 w-4 mr-2" />
              Import Audit
            </TabsTrigger>
          )}
          {settingsPageComponents.chartSettingsEnabled && (
            <TabsTrigger value="charts">
              <BarChart3 className="h-4 w-4 mr-2" />
              Components and Charts
            </TabsTrigger>
          )}
          {settingsPageComponents.themeSettingsEnabled && (
            <TabsTrigger value="theme">
              <Palette className="h-4 w-4 mr-2" />
              Theme
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab: Import Formats */}
        {/* Tab: General */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                General application options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Auto Save</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically saves changes periodically
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
                        Enabled
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications about imports and changes
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
                        Enabled
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 inline mr-2" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <h4 className="font-medium">Settings Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {/* Visible Pages */}
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    settings.pages.filter(p => p.enabled).length === settings.pages.length
                      ? 'bg-green-50 border-green-200'
                      : settings.pages.filter(p => p.enabled).length === 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Visible Pages</p>
                    <p className="font-bold text-xl">
                      {settings.pages.filter(p => p.enabled).length}
                      <span className="text-sm font-normal text-muted-foreground">/{settings.pages.length}</span>
                    </p>
                  </div>
                  
                  {/* Enabled Charts */}
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    settings.charts.filter(c => c.enabled).length === settings.charts.length
                      ? 'bg-green-50 border-green-200'
                      : settings.charts.filter(c => c.enabled).length === 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Enabled Charts</p>
                    <p className="font-bold text-xl">
                      {settings.charts.filter(c => c.enabled).length}
                      <span className="text-sm font-normal text-muted-foreground">/{settings.charts.length}</span>
                    </p>
                  </div>
                  
                  {/* Import Formats */}
                  <div className={`p-3 rounded-lg border-2 transition-colors ${
                    settings.importFormats.filter(f => f.enabled).length === settings.importFormats.length
                      ? 'bg-green-50 border-green-200'
                      : settings.importFormats.filter(f => f.enabled).length === 0
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                  }`}>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">Import Formats</p>
                    <p className="font-bold text-xl">
                      {settings.importFormats.filter(f => f.enabled).length}
                      <span className="text-sm font-normal text-muted-foreground">/{settings.importFormats.length}</span>
                    </p>
                  </div>
                  
                  {/* Components Summary */}
                  {(() => {
                    const allComponents = settings.pages.flatMap(p => p.components || []);
                    const enabledComponents = allComponents.filter(c => c.enabled);
                    const allChildren = allComponents.flatMap(c => c.children || []);
                    const enabledChildren = allChildren.filter(ch => ch.enabled);
                    const totalItems = allComponents.length + allChildren.length;
                    const enabledItems = enabledComponents.length + enabledChildren.length;
                    return (
                      <div className={`p-3 rounded-lg border-2 transition-colors ${
                        enabledItems === totalItems
                          ? 'bg-green-50 border-green-200'
                          : enabledItems === 0
                            ? 'bg-red-50 border-red-200'
                            : 'bg-amber-50 border-amber-200'
                      }`}>
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Components</p>
                        <p className="font-bold text-xl">
                          {enabledItems}
                          <span className="text-sm font-normal text-muted-foreground">/{totalItems}</span>
                        </p>
                      </div>
                    );
                  })()}
                </div>
                
                {/* Quick Status Bar */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    settings.autoSave ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {settings.autoSave ? 'âœ“' : 'â—‹'} Auto-save
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    ðŸŽ¨ {settings.theme === 'system' ? 'System' : settings.theme === 'dark' ? 'Dark' : 'Light'} theme
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    ðŸ“Š {settings.defaultChartType} charts
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pages */}
        <TabsContent value="pages">
          <Card>
            <CardHeader>
              <CardTitle>Page Management</CardTitle>
              <CardDescription>
                Control which pages are available in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Defensive validation */}
              {!settings.pages || settings.pages.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No pages configured. Please reload the page.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {/* Group by category */}
                  {(['reporting', 'settings'] as const).map((category) => {
                    const categoryLabel = {
                      reporting: 'ðŸ“Š Reports & Analytics',
                      settings: 'âš™ï¸ Settings',
                    }[category];

                    const pagesInCategory = (settings.pages || []).filter(p => p.category === category);

                    return (
                      <div key={category} className="space-y-3">
                        <h4 className="font-semibold text-sm">{categoryLabel}</h4>
                        <LayoutGroup>
                          <div className="space-y-3">
                            {/* Sort pages: enabled first, then disabled */}
                            {[...pagesInCategory]
                              .sort((a, b) => {
                                if (a.enabled === b.enabled) return 0;
                                return a.enabled ? -1 : 1;
                              })
                              .map((page) => (
                        <motion.div
                          key={page.id}
                          layout
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            layout: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                          }}
                          className={page.id === 'settings' ? '' : 'border rounded-lg p-4 bg-white'}
                        >
                          {/* Settings page: show components directly without wrapper box */}
                          {page.id === 'settings' ? (
                            <>
                              {page.components && page.components.length > 0 && (
                                <div className="bg-muted/50 rounded-lg p-4 border">
                                  <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <span>ðŸ“¦</span>
                                    Components of this page
                                  </p>
                                  <LayoutGroup>
                                    <div className="space-y-2">
                                      {[...page.components]
                                        .sort((a, b) => {
                                          if (a.enabled === b.enabled) return 0;
                                          return a.enabled ? -1 : 1;
                                        })
                                        .map((component) => {
                                          // Components that can be toggled
                                          const isToggleable = ['chart-settings', 'theme-settings', 'users-settings', 'import-audit'].includes(component.id);
                                          
                                          return (
                                        <motion.div
                                          key={component.id}
                                          layout
                                          initial={{ opacity: 0, y: -10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ 
                                            layout: { type: "spring", stiffness: 300, damping: 30 },
                                            opacity: { duration: 0.2 }
                                          }}
                                        >
                                          <div
                                            className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-colors"
                                          >
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <p className="text-sm font-semibold">{component.name}</p>
                                              {component.description && (
                                                <p className="text-xs text-muted-foreground">{component.description}</p>
                                              )}
                                            </div>
                                            {isToggleable ? (
                                              <button
                                                type="button"
                                                onClick={() => updatePageComponent(page.id, component.id, !component.enabled)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                                  component.enabled
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                              >
                                                {component.enabled ? (
                                                  <>
                                                    <Eye className="h-3 w-3" />
                                                    <span>Visible</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <EyeOff className="h-3 w-3" />
                                                    <span>Hidden</span>
                                                  </>
                                                )}
                                              </button>
                                            ) : (
                                              <span
                                                className="px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-200"
                                              >
                                                <Info className="h-3 w-3" />
                                                <span>Required</span>
                                              </span>
                                            )}
                                          </div>
                                        </motion.div>
                                          );
                                        })}
                                    </div>
                                  </LayoutGroup>
                                </div>
                              )}
                            </>
                          ) : (
                            /* Other pages: normal behavior with expand/collapse */
                            <>
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
                                title="Edit components"
                              >
                                {expandedPages.has(page.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              {/* Hide visibility toggle for facility-selector (always visible) */}
                              {page.id !== 'facility-selector' && (
                              <button
                                type="button"
                                onClick={() => togglePageVisibility(page.id)}
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
                                    Hidden
                                  </>
                                )}
                              </button>
                              )}
                            </div>
                          </div>

                          {/* Component editing panel */}
                          {expandedPages.has(page.id) && page.components && page.components.length > 0 && (
                            <div className="mt-2 pt-4 border-t">
                              <div className="bg-muted/50 rounded-lg p-4 border">
                                <p className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                  <span>ðŸ“¦</span>
                                  Components of this page
                                </p>
                                <LayoutGroup>
                                  <div className="space-y-2">
                                    {/* Sort components: enabled first, then disabled */}
                                    {[...page.components]
                                      .sort((a, b) => {
                                        if (a.enabled === b.enabled) return 0;
                                        return a.enabled ? -1 : 1;
                                      })
                                      .map((component) => (
                                      <motion.div
                                        key={component.id}
                                        layout
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ 
                                          layout: { type: "spring", stiffness: 300, damping: 30 },
                                          opacity: { duration: 0.2 }
                                        }}
                                      >
                                        {/* Parent Component */}
                                        <div
                                          className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-colors"
                                        >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          {/* Expand button for components with children */}
                                          {component.children && component.children.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={() => toggleComponentExpanded(component.id)}
                                              className="p-1 hover:bg-muted rounded transition-colors"
                                            >
                                              {expandedComponents.has(component.id) ? (
                                                <ChevronUp className="h-4 w-4" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4" />
                                              )}
                                            </button>
                                          )}
                                          <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-sm font-semibold">
                                              {component.name}
                                              {component.children && component.children.length > 0 && (
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                  ({component.children.filter(c => c.enabled).length}/{component.children.length} visible)
                                                </span>
                                              )}
                                            </p>
                                            {component.description && (
                                              <p className="text-xs text-gray-500">
                                                {component.description}
                                              </p>
                                            )}
                                          </div>
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
                                              <span>Hidden</span>
                                            </>
                                          )}
                                        </button>
                                      </div>

                                      {/* Nested Children Components */}
                                      {component.children && component.children.length > 0 && expandedComponents.has(component.id) && (
                                        <LayoutGroup>
                                          <div className="ml-6 mt-2 pl-4 border-l-2 border-muted-foreground/30 space-y-2">
                                            {/* Check if this is a mutually exclusive group */}
                                            {mutuallyExclusiveGroups[component.id] ? (
                                              // Radio-button style for mutually exclusive options
                                              <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground mb-2">Select one option:</p>
                                                {component.children.map((child) => (
                                                  <motion.div
                                                    key={child.id}
                                                    layout
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ 
                                                      layout: { type: "spring", stiffness: 300, damping: 30 },
                                                      opacity: { duration: 0.2 }
                                                    }}
                                                    onClick={() => {
                                                      if (component.enabled && !child.enabled) {
                                                        updateChildComponent(page.id, component.id, child.id, true);
                                                      }
                                                    }}
                                                    className={`flex items-center gap-3 p-2.5 border rounded-lg cursor-pointer transition-all ${
                                                      !component.enabled
                                                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                                                        : child.enabled
                                                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200'
                                                          : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                                                    }`}
                                                  >
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                                      child.enabled 
                                                        ? 'border-blue-500 bg-blue-500' 
                                                        : 'border-gray-300 bg-white'
                                                    }`}>
                                                      {child.enabled && <div className="w-2 h-2 rounded-full bg-white" />}
                                                    </div>
                                                    <div className="space-y-0.5 flex-1 min-w-0">
                                                      <p className={`text-sm font-medium ${child.enabled ? 'text-blue-700' : ''}`}>{child.name}</p>
                                                      {child.description && (
                                                        <p className="text-xs text-gray-500">
                                                          {child.description}
                                                        </p>
                                                      )}
                                                    </div>
                                                  </motion.div>
                                                ))}
                                              </div>
                                            ) : (
                                              // Normal toggle style for non-exclusive children
                                              <>
                                            {/* Sort children: enabled first, then disabled */}
                                            {[...component.children]
                                              .sort((a, b) => {
                                                if (a.enabled === b.enabled) return 0;
                                                return a.enabled ? -1 : 1;
                                              })
                                              .map((child) => (
                                              <motion.div
                                                key={child.id}
                                                layout
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ 
                                                  layout: { type: "spring", stiffness: 300, damping: 30 },
                                                  opacity: { duration: 0.2 }
                                                }}
                                                className="flex items-center justify-between p-2.5 bg-muted/30 border rounded-lg hover:shadow-sm"
                                              >
                                                <div className="space-y-0.5 flex-1 min-w-0">
                                                  <p className="text-sm font-medium">{child.name}</p>
                                                  {child.description && (
                                                    <p className="text-xs text-gray-500">
                                                      {child.description}
                                                    </p>
                                                  )}
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    updateChildComponent(page.id, component.id, child.id, !child.enabled)
                                                  }
                                                  disabled={!component.enabled}
                                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-200 flex items-center gap-1 whitespace-nowrap ml-3 ${
                                                    !component.enabled
                                                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                                      : child.enabled
                                                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                                  }`}
                                                >
                                                  {child.enabled ? (
                                                    <>
                                                      <Eye className="h-3 w-3" />
                                                      <span>Visible</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <EyeOff className="h-3 w-3" />
                                                      <span>Hidden</span>
                                                    </>
                                                  )}
                                                </button>
                                              </motion.div>
                                            ))}
                                              </>
                                            )}
                                          </div>
                                        </LayoutGroup>
                                      )}
                                      </motion.div>
                                    ))}
                                  </div>
                                </LayoutGroup>
                              </div>
                            </div>
                          )}
                            </>
                          )}
                        </motion.div>
                      ))}
                          </div>
                        </LayoutGroup>
                      </div>
                );
                  })}

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-6 space-y-2">
                    <p className="text-sm text-blue-900">
                      ðŸ’¡ <strong>Note about pages:</strong> Hidden pages won't appear in the navigation menu, but can still be accessible directly via URL. For better security, implement backend validation.
                    </p>
                    <p className="text-sm text-blue-900">
                      ðŸ”§ <strong>Note about components:</strong> Click the arrow button (â†‘â†“) to expand a page and edit its specific components. Components with nested items can be expanded to show individual controls.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Charts */}
        {settingsPageComponents.chartSettingsEnabled && (
        <TabsContent value="charts">
          {/* Visualization Components by Page */}
          <Card>
            <CardHeader>
              <CardTitle>Chart Components by Page</CardTitle>
              <CardDescription>
                Manage chart visualizations across the application. Select chart types based on data type recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Group visualizations by location (page) */}
              {['Dashboard', 'Facility Wound Report', 'Etiology Report', 'Acuity Report', 'Detail Modals'].map((location) => {
                const locationVizs = settings.visualizations?.filter(v => v.location === location) || [];
                if (locationVizs.length === 0) return null;
                
                return (
                  <div key={location} className="space-y-3">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <span className="text-sm">ðŸ“„</span>
                      <h4 className="text-sm font-semibold">{location}</h4>
                      <span className="text-xs text-muted-foreground">({locationVizs.length} components)</span>
                    </div>
                    {locationVizs.map((viz) => (
                      <motion.div
                        key={viz.id}
                        layout
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ml-4"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{viz.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              viz.dataType === 'trend' ? 'bg-blue-100 text-blue-700' :
                              viz.dataType === 'comparison' ? 'bg-green-100 text-green-700' :
                              viz.dataType === 'distribution' ? 'bg-purple-100 text-purple-700' :
                              viz.dataType === 'proportion' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {viz.dataType}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{viz.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-muted-foreground">Chart:</span>
                            <select
                              value={viz.currentChartType}
                              onChange={(e) => {
                                const newVisualizations = settings.visualizations.map(v =>
                                  v.id === viz.id ? { ...v, currentChartType: e.target.value } : v
                                );
                                handleSettingChange({
                                  ...settings,
                                  visualizations: newVisualizations,
                                });
                              }}
                              className="text-xs px-2 py-1 border rounded bg-background"
                            >
                              {viz.recommendedChartTypes.map((chartType) => (
                                <option key={chartType} value={chartType}>
                                  {chartType.charAt(0).toUpperCase() + chartType.slice(1)}
                                  {chartType === viz.recommendedChartTypes[0] ? ' â­ Recommended' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newVisualizations = settings.visualizations.map(v =>
                              v.id === viz.id ? { ...v, enabled: !v.enabled } : v
                            );
                            handleSettingChange({
                              ...settings,
                              visualizations: newVisualizations,
                            });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            viz.enabled
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {viz.enabled ? (
                            <>
                              <Check className="h-3 w-3 inline mr-1" />
                              On
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 inline mr-1" />
                              Off
                            </>
                          )}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                );
              })}
              
              {/* Chart Type Recommendations Legend */}
              <div className="pt-4 border-t mt-4">
                <p className="text-sm font-medium mb-2">ðŸ’¡ Chart Recommendations by Data Type:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">trend</span>
                    <span className="text-muted-foreground">â†’ Line, Area</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">comparison</span>
                    <span className="text-muted-foreground">â†’ Bar</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">distribution</span>
                    <span className="text-muted-foreground">â†’ Pie, Donut, Bar</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">proportion</span>
                    <span className="text-muted-foreground">â†’ Pie</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Tab: Theme */}
        {settingsPageComponents.themeSettingsEnabled && (
        <TabsContent value="theme">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme Mode</CardTitle>
                <CardDescription>
                  Choose how you want the application to look
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
                        {mode === 'light' && 'Light mode'}
                        {mode === 'dark' && 'Dark mode'}
                        {mode === 'system' && 'System default'}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Accent Color</CardTitle>
                <CardDescription>
                  Customize the main color of the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { hex: '#3b82f6', name: 'Blue' },
                    { hex: '#ef4444', name: 'Red' },
                    { hex: '#10b981', name: 'Green' },
                    { hex: '#f59e0b', name: 'Amber' },
                    { hex: '#8b5cf6', name: 'Purple' },
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
        )}

        {/* Tab: Users */}
        {settingsPageComponents.usersEnabled && (
        <TabsContent value="users">
          <UsersManagementTab />
        </TabsContent>
        )}

        {/* Tab: Facilities */}
        {settingsPageComponents.usersEnabled && (
        <TabsContent value="facilities">
          <FacilitiesManagementTab />
        </TabsContent>
        )}

        {/* Tab: Import Audit */}
        {settingsPageComponents.importAuditEnabled && (
        <TabsContent value="import-audit">
          <ImportAudit />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ==================== FACILITIES MANAGEMENT TAB COMPONENT ====================

interface Facility {
  id: number;
  name: string;
  email: string | null;
  mobile: string | null;
  npi: string | null;
  contact: string | null;
  director: string | null;
  director_phone: string | null;
  director_email: string | null;
  pos: string | null;
  practice_id: number | null;
  tax_id: string | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

function FacilitiesManagementTab() {
  const { getToken, getEmail, getSelectedFacility, setAvailableFacilities, getAvailableFacilities } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const token = getToken();
  const email = getEmail();
  const deviceId = localStorage.getItem("deviceId") || "web-settings";
  const currentFacilityId = getSelectedFacility();

  // Dialog states
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewFacilityOpen, setIsNewFacilityOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newFacilityForm, setNewFacilityForm] = useState({
    name: '',
    facilityEmail: '',
    mobile: '',
    npi: '',
    contact: '',
    director: '',
    directorPhone: '',
    directorEmail: '',
    pos: '',
    taxId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [facilityToDelete, setFacilityToDelete] = useState<Facility | null>(null);

  // Fetch all facilities
  const { data: facilities, isLoading, error, refetch } = useQuery<Facility[], Error>({
    queryKey: ["allFacilities"],
    queryFn: async () => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "lstAllFacilities",
          token: currentToken,
          email: currentEmail,
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch facilities");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Failed to fetch facilities");
      }

      return result.data;
    },
    enabled: !!token && !!email,
  });

  // Create facility mutation
  const createFacilityMutation = useMutation({
    mutationFn: async (facilityData: typeof newFacilityForm) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "addNewFacility",
          token: currentToken,
          email: currentEmail,
          deviceId,
          ...facilityData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create facility");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Failed to create facility");
      }

      return result;
    },
    onSuccess: async () => {
      // First invalidate the cache to clear old data
      await queryClient.invalidateQueries({ queryKey: ["allFacilities"] });
      
      // Then refetch to get fresh data from the server
      // fetchQuery returns the data directly, not { data }
      const updatedFacilities = await queryClient.fetchQuery({ queryKey: ["allFacilities"] });
      if (updatedFacilities && Array.isArray(updatedFacilities)) {
        // Convert to the format expected by auth storage
        const facilitiesForStorage = updatedFacilities.map((f: Facility) => ({
          id: String(f.id),
          name: f.name,
          email: f.email,
        }));
        setAvailableFacilities(facilitiesForStorage);
        // Notify other components about the facilities list change
        dispatchAuthEvent(AUTH_EVENTS.FACILITIES_UPDATED, { count: facilitiesForStorage.length });
      }
      
      toast({
        title: "Facility created",
        description: "New facility has been created successfully.",
      });
      setIsNewFacilityOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update facility mutation
  const updateFacilityMutation = useMutation({
    mutationFn: async (data: { id: number } & Partial<typeof newFacilityForm>) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "updateFacility",
          token: currentToken,
          email: currentEmail,
          deviceId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update facility");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Failed to update facility");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFacilities"] });
      toast({
        title: "Facility updated",
        description: "Facility has been updated successfully.",
      });
      setIsDetailOpen(false);
      setIsEditMode(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete (deactivate) facility mutation
  const deleteFacilityMutation = useMutation({
    mutationFn: async (facilityId: number) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "deleteFacility",
          token: currentToken,
          email: currentEmail,
          deviceId,
          id: facilityId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete facility");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Failed to delete facility");
      }

      return result;
    },
    onSuccess: (_, deletedFacilityId) => {
      queryClient.invalidateQueries({ queryKey: ["allFacilities"] });
      
      // Update available facilities in auth storage
      const currentFacilities = getAvailableFacilities();
      const updatedFacilities = currentFacilities.filter(f => f.id !== String(deletedFacilityId) && Number(f.id) !== deletedFacilityId);
      setAvailableFacilities(updatedFacilities);
      
      // Notify Layout to refresh facilities selector
      dispatchAuthEvent(AUTH_EVENTS.FACILITIES_UPDATED, { count: updatedFacilities.length });
      
      toast({
        title: "Facility deleted",
        description: "Facility has been deleted successfully.",
      });
      setIsDetailOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewFacilityForm({
      name: '',
      facilityEmail: '',
      mobile: '',
      npi: '',
      contact: '',
      director: '',
      directorPhone: '',
      directorEmail: '',
      pos: '',
      taxId: '',
    });
  };

  const handleViewDetail = (facility: Facility) => {
    setSelectedFacility(facility);
    setIsEditMode(false);
    setIsDetailOpen(true);
  };

  const handleCreateFacility = async () => {
    if (!newFacilityForm.name.trim()) {
      toast({
        title: "Validation error",
        description: "Facility name is required",
        variant: "destructive",
      });
      return;
    }
    createFacilityMutation.mutate(newFacilityForm);
  };

  const handleUpdateFacility = async () => {
    if (!selectedFacility) return;
    
    updateFacilityMutation.mutate({
      id: selectedFacility.id,
      name: selectedFacility.name,
      facilityEmail: selectedFacility.email || '',
      mobile: selectedFacility.mobile || '',
      npi: selectedFacility.npi || '',
      contact: selectedFacility.contact || '',
      director: selectedFacility.director || '',
      directorPhone: selectedFacility.director_phone || '',
      directorEmail: selectedFacility.director_email || '',
      pos: selectedFacility.pos || '',
      taxId: selectedFacility.tax_id || '',
    });
  };

  const handleDeleteFacility = (facility: Facility) => {
    // Cannot delete current facility
    if (currentFacilityId && String(facility.id) === currentFacilityId) {
      toast({
        title: "Cannot delete",
        description: "You cannot delete the currently selected facility. Please switch to another facility first.",
        variant: "destructive",
      });
      return;
    }
    setFacilityToDelete(facility);
  };

  const confirmDeleteFacility = () => {
    if (facilityToDelete) {
      deleteFacilityMutation.mutate(facilityToDelete.id);
      setFacilityToDelete(null);
    }
  };

  const handleToggleActive = async (facility: Facility) => {
    updateFacilityMutation.mutate({
      id: facility.id,
      active: facility.active ? 0 : 1,
    } as any);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facilities Management</CardTitle>
          <CardDescription>Loading facilities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Facilities Management</CardTitle>
          <CardDescription>Error loading facilities</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Facilities Management</CardTitle>
            <CardDescription>
              Manage healthcare facilities in the system
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setIsNewFacilityOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Facility
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!facilities || facilities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No facilities found
          </div>
        ) : (
          <div className="space-y-4">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleViewDetail(facility)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">{facility.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {facility.email || 'No email'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      NPI: {facility.npi || '--'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Status badge */}
                  <div className="mr-4">
                    {facility.active ? (
                      <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-500/10 text-gray-500">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetail(facility)}
                    title="View details"
                  >
                    <Info className="h-4 w-4 text-blue-500" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(facility)}
                    disabled={updateFacilityMutation.isPending}
                    title={facility.active ? "Deactivate facility" : "Activate facility"}
                  >
                    {facility.active ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-green-600" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteFacility(facility)}
                    disabled={deleteFacilityMutation.isPending}
                    title="Delete facility"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Facility Detail/Edit Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              {isEditMode ? 'Edit Facility' : 'Facility Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Modify facility information' : 'Complete information for the selected facility'}
            </DialogDescription>
          </DialogHeader>
          {selectedFacility && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {!isEditMode ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedFacility.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedFacility.email || '--'}</p>
                    </div>
                    <div className="ml-auto">
                      {selectedFacility.active ? (
                        <Badge className="bg-green-500/10 text-green-600">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Mobile</span>
                        <span className="text-sm">{selectedFacility.mobile || '--'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">NPI</span>
                        <span className="text-sm">{selectedFacility.npi || '--'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Contact</span>
                        <span className="text-sm">{selectedFacility.contact || '--'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Director</span>
                        <span className="text-sm">{selectedFacility.director || '--'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg col-span-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Created</span>
                        <span className="text-sm">{formatDate(selectedFacility.created_at)}</span>
                      </div>
                    </div>

                    {selectedFacility.tax_id && (
                      <div className="flex items-center gap-3 p-3 border rounded-lg col-span-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Tax ID</span>
                          <span className="text-sm">{selectedFacility.tax_id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editName">Name *</Label>
                    <Input
                      id="editName"
                      value={selectedFacility.name}
                      onChange={(e) => setSelectedFacility({ ...selectedFacility, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editEmail">Email</Label>
                      <Input
                        id="editEmail"
                        type="email"
                        value={selectedFacility.email || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editMobile">Mobile</Label>
                      <Input
                        id="editMobile"
                        value={selectedFacility.mobile || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, mobile: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editNpi">NPI</Label>
                      <Input
                        id="editNpi"
                        value={selectedFacility.npi || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, npi: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editContact">Contact</Label>
                      <Input
                        id="editContact"
                        value={selectedFacility.contact || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, contact: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editDirector">Director</Label>
                    <Input
                      id="editDirector"
                      value={selectedFacility.director || ''}
                      onChange={(e) => setSelectedFacility({ ...selectedFacility, director: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editDirectorPhone">Director Phone</Label>
                      <Input
                        id="editDirectorPhone"
                        value={selectedFacility.director_phone || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, director_phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editDirectorEmail">Director Email</Label>
                      <Input
                        id="editDirectorEmail"
                        type="email"
                        value={selectedFacility.director_email || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, director_email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editPos">POS</Label>
                      <Input
                        id="editPos"
                        value={selectedFacility.pos || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, pos: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editTaxId">Tax ID</Label>
                      <Input
                        id="editTaxId"
                        value={selectedFacility.tax_id || ''}
                        onChange={(e) => setSelectedFacility({ ...selectedFacility, tax_id: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateFacility} disabled={updateFacilityMutation.isPending}>
                  {updateFacilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => setIsEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Facility Dialog */}
      <Dialog open={isNewFacilityOpen} onOpenChange={setIsNewFacilityOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Facility
            </DialogTitle>
            <DialogDescription>
              Enter the new facility's details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid gap-2">
              <Label htmlFor="facilityName">Facility Name <span className="text-red-500">*</span></Label>
              <Input
                id="facilityName"
                placeholder="Facility name"
                value={newFacilityForm.name}
                onChange={(e) => setNewFacilityForm({ ...newFacilityForm, name: e.target.value })}
                className="border-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facilityEmail">Email</Label>
                <Input
                  id="facilityEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={newFacilityForm.facilityEmail}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, facilityEmail: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facilityMobile">Mobile</Label>
                <Input
                  id="facilityMobile"
                  placeholder="Phone number"
                  value={newFacilityForm.mobile}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, mobile: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facilityNpi">NPI</Label>
                <Input
                  id="facilityNpi"
                  placeholder="NPI number"
                  value={newFacilityForm.npi}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, npi: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facilityContact">Contact</Label>
                <Input
                  id="facilityContact"
                  placeholder="Contact person"
                  value={newFacilityForm.contact}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, contact: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="facilityDirector">Director</Label>
              <Input
                id="facilityDirector"
                placeholder="Director name"
                value={newFacilityForm.director}
                onChange={(e) => setNewFacilityForm({ ...newFacilityForm, director: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facilityDirectorPhone">Director Phone</Label>
                <Input
                  id="facilityDirectorPhone"
                  placeholder="Director phone"
                  value={newFacilityForm.directorPhone}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, directorPhone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facilityDirectorEmail">Director Email</Label>
                <Input
                  id="facilityDirectorEmail"
                  type="email"
                  placeholder="Director email"
                  value={newFacilityForm.directorEmail}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, directorEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="facilityPos">POS (Place of Service)</Label>
                <Input
                  id="facilityPos"
                  placeholder="POS code"
                  value={newFacilityForm.pos}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, pos: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="facilityTaxId">Tax ID</Label>
                <Input
                  id="facilityTaxId"
                  placeholder="Tax ID"
                  value={newFacilityForm.taxId}
                  onChange={(e) => setNewFacilityForm({ ...newFacilityForm, taxId: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsNewFacilityOpen(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateFacility} disabled={createFacilityMutation.isPending}>
              {createFacilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Facility Confirmation Dialog */}
      <AlertDialog open={!!facilityToDelete} onOpenChange={(open) => !open && setFacilityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Delete Facility
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{facilityToDelete?.name}"</strong>?
              <br />
              <span className="text-red-500 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteFacility}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteFacilityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ==================== USERS MANAGEMENT TAB COMPONENT ====================

interface RoleUser {
  user_id: number;
  email: string;
  name: string;
  active: boolean;
  locked: boolean;
  entity_type: string;
  entity_id: number;
  groups: { id: number; name: string }[];
  created_at: string;
  last_login: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  userCount?: number;
}

function UsersManagementTab() {
  const { getToken, getEmail, getSelectedFacility } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const token = getToken();
  const email = getEmail();
  const facilityId = getSelectedFacility();
  const deviceId = localStorage.getItem("deviceId") || "web-settings";

  // State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditUserRolesOpen, setIsEditUserRolesOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RoleUser | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<string[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', entityType: 'Provider' });
  const [isEditUserMode, setIsEditUserMode] = useState(false);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '' });
  const [userToDelete, setUserToDelete] = useState<RoleUser | null>(null);

  // Fetch available roles from database
  const { data: roles = [], refetch: refetchRoles } = useQuery<Role[], Error>({
    queryKey: ["userGroups"],
    queryFn: async () => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "lstUserGroups",
          token: currentToken,
          email: currentEmail,
          deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user groups");
      }

      const result = await response.json();
      if (result.status) {
        return result.data || [];
      }
      throw new Error(result.error || "Unknown error");
    },
    enabled: !!token && !!email,
  });

  // Fetch all users
  const { data: allUsers, isLoading, error, refetch } = useQuery<RoleUser[], Error>({
    queryKey: ["facilityUsersForRoles", facilityId],
    queryFn: async () => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      const currentFacilityId = getSelectedFacility();
      
      if (!currentFacilityId || !currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "lstFacilityUsers",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId: parseInt(currentFacilityId),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const result = await response.json();
      if (result.status) {
        return result.data || [];
      }
      throw new Error(result.error || "Unknown error");
    },
    enabled: !!facilityId && !!token && !!email,
  });

  // Update user roles mutation
  const updateRolesMutation = useMutation({
    mutationFn: async ({ userEmail, userRoles }: { userEmail: string; userRoles: string[] }) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "updateUserRoles",
          token: currentToken,
          email: currentEmail,
          deviceId,
          targetEmail: userEmail,
          roles: userRoles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user roles");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Unknown error");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityUsersForRoles", facilityId] });
      toast({
        title: "Roles updated",
        description: "User roles have been updated successfully.",
      });
      setIsEditUserRolesOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user status mutation (for lock/active)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, active, locked }: { userId: number; active?: boolean; locked?: boolean }) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "updateUserStatus",
          token: currentToken,
          email: currentEmail,
          deviceId,
          userId,
          active,
          locked,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Unknown error");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityUsersForRoles", facilityId] });
      toast({
        title: "Status updated",
        description: "User status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user information mutation (name, email)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, name, newEmail }: { userId: number; name?: string; newEmail?: string }) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "updateUser",
          token: currentToken,
          email: currentEmail,
          deviceId,
          userId,
          name,
          newEmail,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Unknown error");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityUsersForRoles", facilityId] });
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
      setIsEditUserMode(false);
      setIsDetailOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      // Read fresh values to avoid stale closure issues
      const currentToken = getToken();
      const currentEmail = getEmail();
      
      if (!currentToken || !currentEmail) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "deleteUser",
          token: currentToken,
          email: currentEmail,
          deviceId,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Unknown error");
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facilityUsersForRoles", facilityId] });
      toast({
        title: "User deleted",
        description: "User has been removed from the system.",
      });
      setUserToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users by selected role and search query
  const filteredUsers = React.useMemo(() => {
    if (!allUsers) return [];
    
    let users = allUsers;
    
    // Filter by selected role
    if (selectedRole) {
      users = users.filter(user => 
        user.groups?.some(g => g.name === selectedRole.name)
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      users = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.entity_type.toLowerCase().includes(query)
      );
    }
    
    return users;
  }, [allUsers, selectedRole, searchQuery]);

  // Calculate user count per role
  const rolesWithCount = React.useMemo(() => {
    if (!allUsers) return roles;
    
    return roles.map(role => ({
      ...role,
      userCount: allUsers.filter(user => 
        user.groups?.some(g => g.name === role.name)
      ).length
    }));
  }, [allUsers, roles]);

  const handleOpenEditRoles = (user: RoleUser) => {
    setSelectedUser(user);
    setSelectedUserRoles(user.groups?.map(g => g.name) || []);
    setIsEditUserRolesOpen(true);
  };

  const handleToggleRole = (roleName: string) => {
    setSelectedUserRoles(prev => 
      prev.includes(roleName) 
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    );
  };

  const handleSaveRoles = () => {
    if (selectedUser) {
      updateRolesMutation.mutate({
        userEmail: selectedUser.email,
        userRoles: selectedUserRoles,
      });
    }
  };

  const handleAddRoleToUser = (user: RoleUser) => {
    if (!selectedRole) return;
    
    const currentRoles = user.groups?.map(g => g.name) || [];
    if (!currentRoles.includes(selectedRole.name)) {
      updateRolesMutation.mutate({
        userEmail: user.email,
        userRoles: [...currentRoles, selectedRole.name],
      });
    }
  };

  const handleRemoveRoleFromUser = (user: RoleUser) => {
    if (!selectedRole) return;
    
    const currentRoles = user.groups?.map(g => g.name) || [];
    if (currentRoles.includes(selectedRole.name)) {
      updateRolesMutation.mutate({
        userEmail: user.email,
        userRoles: currentRoles.filter(r => r !== selectedRole.name),
      });
    }
  };

  const handleToggleActive = (user: RoleUser) => {
    updateStatusMutation.mutate({ userId: user.user_id, active: !user.active });
  };

  const handleToggleLocked = (user: RoleUser) => {
    updateStatusMutation.mutate({ userId: user.user_id, locked: !user.locked });
  };

  const handleViewDetail = (user: RoleUser) => {
    setSelectedUser(user);
    setEditUserForm({ name: user.name, email: user.email });
    setIsEditUserMode(false);
    setIsDetailOpen(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    
    if (!editUserForm.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    
    updateUserMutation.mutate({
      userId: selectedUser.user_id,
      name: editUserForm.name,
      newEmail: editUserForm.email !== selectedUser.email ? editUserForm.email : undefined,
    });
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    // Read fresh values to avoid stale closure issues
    const currentToken = getToken();
    const currentEmail = getEmail();
    const currentFacilityId = getSelectedFacility();
    
    if (!currentToken || !currentEmail) {
      toast({
        title: "Session expired",
        description: "Please log in again.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await fetch(LOCAL_API.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entity: "FacilityDataCenter",
          method: "createUser",
          token: currentToken,
          email: currentEmail,
          deviceId,
          facilityId: parseInt(currentFacilityId || "0"),
          userName: newUserForm.name,
          userEmail: newUserForm.email,
          entityType: newUserForm.entityType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.error || "Unknown error");
      }

      queryClient.invalidateQueries({ queryKey: ["facilityUsersForRoles", facilityId] });
      toast({
        title: "User created",
        description: "New user has been created successfully.",
      });
      setIsNewUserOpen(false);
      setNewUserForm({ name: '', email: '', entityType: 'Provider' });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error creating user",
        variant: "destructive",
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Error loading users</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>{error.message}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Left Panel - Roles List */}
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Roles</CardTitle>
              <CardDescription>Select a role to view users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchRoles(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* All Users option */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                selectedRole === null
                  ? 'bg-primary/10 border border-primary'
                  : 'hover:bg-muted/50 border border-transparent'
              }`}
              onClick={() => setSelectedRole(null)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium">All Users</div>
                  <div className="text-xs text-muted-foreground">View all users</div>
                </div>
              </div>
              <Badge variant="secondary">{allUsers?.length || 0}</Badge>
            </div>

            {/* Role items */}
            {rolesWithCount.map((role) => (
              <div
                key={role.id}
                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
                onClick={() => setSelectedRole(role)}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    role.name === 'Admin' ? 'bg-red-500/10' :
                    role.name === 'Provider' ? 'bg-blue-500/10' :
                    role.name === 'Nurse' ? 'bg-green-500/10' :
                    'bg-yellow-500/10'
                  }`}>
                    <Shield className={`h-4 w-4 ${
                      role.name === 'Admin' ? 'text-red-500' :
                      role.name === 'Provider' ? 'text-blue-500' :
                      role.name === 'Nurse' ? 'text-green-500' :
                      'text-yellow-500'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-xs text-muted-foreground">{role.description}</div>
                  </div>
                </div>
                <Badge variant="secondary">{role.userCount || 0}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Right Panel - Users List */}
      <Card className="col-span-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {selectedRole ? `${selectedRole.name} Users` : 'All Users'}
              </CardTitle>
              <CardDescription>
                {selectedRole 
                  ? `Users with ${selectedRole.name} role` 
                  : 'All users in the facility'}
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setIsNewUserOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New User
            </Button>
          </div>
          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found matching your search' : 'No users found'}
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.name}
                        {!user.active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                        {user.locked && (
                          <Badge variant="destructive" className="text-xs">Locked</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="flex gap-1 mt-1">
                        {user.groups?.map((group) => (
                          <Badge 
                            key={group.id} 
                            variant="outline" 
                            className={`text-xs ${
                              group.name === 'Admin' ? 'border-red-500 text-red-500' :
                              group.name === 'Provider' ? 'border-blue-500 text-blue-500' :
                              group.name === 'Nurse' ? 'border-green-500 text-green-500' :
                              'border-yellow-500 text-yellow-500'
                            }`}
                          >
                            {group.name}
                          </Badge>
                        ))}
                        {(!user.groups || user.groups.length === 0) && (
                          <span className="text-xs text-muted-foreground">No roles assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Details button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(user)}
                      title="View details"
                    >
                      <Info className="h-4 w-4 text-blue-500" />
                    </Button>

                    {/* Activate/Deactivate button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(user)}
                      disabled={updateStatusMutation.isPending}
                      title={user.active ? "Deactivate user" : "Activate user"}
                    >
                      {user.active ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-green-600" />
                      )}
                    </Button>

                    {/* Lock/Unlock button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleLocked(user)}
                      disabled={updateStatusMutation.isPending}
                      title={user.locked ? "Unlock user" : "Lock user"}
                    >
                      {user.locked ? (
                        <Unlock className="h-4 w-4 text-green-600" />
                      ) : (
                        <Ban className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    {/* Edit all roles button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditRoles(user)}
                      title="Edit all roles"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Roles
                    </Button>

                    {/* Delete user button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToDelete(user)}
                      disabled={deleteUserMutation.isPending}
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>

                    {/* Quick add/remove for selected role */}
                    {selectedRole && (
                      <>
                        {user.groups?.some(g => g.name === selectedRole.name) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveRoleFromUser(user)}
                            disabled={updateRolesMutation.isPending}
                            title={`Remove ${selectedRole.name} role`}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddRoleToUser(user)}
                            disabled={updateRolesMutation.isPending}
                            title={`Add ${selectedRole.name} role`}
                            className="text-green-500 hover:text-green-600 hover:bg-green-50"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Roles Dialog */}
      <Dialog open={isEditUserRolesOpen} onOpenChange={setIsEditUserRolesOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Edit User Roles
            </DialogTitle>
            <DialogDescription>
              {selectedUser && `Manage roles for ${selectedUser.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedUser && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCog className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">{selectedUser.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUserRoles.includes(role.name)
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleToggleRole(role.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded border flex items-center justify-center ${
                      selectedUserRoles.includes(role.name)
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}>
                      {selectedUserRoles.includes(role.name) && (
                        <Check className="h-4 w-4 text-primary-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">{role.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserRolesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} disabled={updateRolesMutation.isPending}>
              {updateRolesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isEditUserMode ? 'Edit User' : 'User Details'}
            </DialogTitle>
            <DialogDescription>
              {isEditUserMode ? 'Modify user information' : 'Complete information for the selected user'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {!isEditUserMode ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{selectedUser.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Badge variant="secondary">{selectedUser.entity_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        ID: {selectedUser.entity_id || selectedUser.user_id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.email}</span>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Created</span>
                        <span className="text-sm">{formatDate(selectedUser.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Last access</span>
                        <span className="text-sm">{formatDate(selectedUser.last_login)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex gap-2">
                        {selectedUser.active ? (
                          <Badge className="bg-green-500/10 text-green-600">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {selectedUser.locked && (
                          <Badge variant="destructive" className="bg-red-500/10 text-red-600">
                            <Ban className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>

                    {selectedUser.groups && selectedUser.groups.length > 0 && (
                      <div className="p-3 border rounded-lg">
                        <span className="text-xs text-muted-foreground block mb-2">Groups</span>
                        <div className="flex gap-2 flex-wrap">
                          {selectedUser.groups.map((group) => (
                            <Badge key={group.id} variant="outline">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="editUserName">Name *</Label>
                    <Input
                      id="editUserName"
                      value={editUserForm.name}
                      onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editUserEmail">Email</Label>
                    <Input
                      id="editUserEmail"
                      type="email"
                      value={editUserForm.email}
                      onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <span className="text-xs text-muted-foreground">Type: {selectedUser.entity_type}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {isEditUserMode ? (
              <>
                <Button variant="outline" onClick={() => setIsEditUserMode(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => setIsEditUserMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New User Dialog */}
      <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New User
            </DialogTitle>
            <DialogDescription>
              Enter the new user's details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Name</Label>
              <Input
                id="userName"
                placeholder="Full name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="email@example.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entityType">Type</Label>
              <Select
                value={newUserForm.entityType}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, entityType: value })}
              >
                <SelectTrigger id="entityType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Provider">Provider</SelectItem>
                  <SelectItem value="Nurse">Nurse</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? 
              This action cannot be undone and will remove the user from all groups and sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate({ userId: userToDelete.user_id })}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
