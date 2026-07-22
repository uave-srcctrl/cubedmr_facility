import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LOCAL_API } from "@/lib/api-config";
import { useAuth } from "./use-auth";
import { useCallback, useEffect, useState } from "react";
import { secureStorageSync } from "@/lib/secure-storage";
import { logger } from "@/lib/logger";

// ==================== TYPES ====================

export interface ImportFormatConfig {
  id: string;
  name: string;
  enabled: boolean;
  maxFileSize: number;
}

export interface ChartConfig {
  type: string;
  label: string;
  enabled: boolean;
}

// Data types for visualization recommendations
export type DataType = 'trend' | 'comparison' | 'distribution' | 'proportion' | 'correlation' | 'temporal';

// Visualization component configuration
export interface VisualizationComponent {
  id: string;
  name: string;
  description: string;
  location: string;  // Page or component where it's used
  dataType: DataType;
  currentChartType: string;
  recommendedChartTypes: string[];
  enabled: boolean;
}

export interface PageComponent {
  id: string;
  name: string;
  enabled: boolean;
  description?: string;
  children?: PageComponent[];  // Nested child components
}

export interface PageConfig {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  category: 'reporting' | 'settings';
  components?: PageComponent[];
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  accentColor: string;
}

export interface AppSettings {
  importFormats: ImportFormatConfig[];
  charts: ChartConfig[];
  visualizations: VisualizationComponent[];
  pages: PageConfig[];
  theme: ThemeConfig;
  autoSave: boolean;
  notificationsEnabled: boolean;
}

// Default settings (matches settings.tsx DEFAULT_SETTINGS)
export const DEFAULT_SETTINGS: AppSettings = {
  importFormats: [
    { id: 'excel', name: 'Excel', enabled: true, maxFileSize: 10 },
    { id: 'csv', name: 'CSV/TSV', enabled: true, maxFileSize: 50 },
    { id: 'json', name: 'JSON', enabled: true, maxFileSize: 50 },
    { id: 'xml', name: 'XML', enabled: true, maxFileSize: 50 },
    { id: 'hl7', name: 'HL7/FHIR', enabled: true, maxFileSize: 50 },
    { id: 'docx', name: 'Word/PDF', enabled: false, maxFileSize: 50 },
  ],
  charts: [
    { type: 'line', label: 'Line Charts', enabled: true },
    { type: 'bar', label: 'Bar Charts', enabled: true },
    { type: 'pie', label: 'Pie Charts', enabled: true },
    { type: 'area', label: 'Area Charts', enabled: true },
    { type: 'scatter', label: 'Scatter Charts', enabled: false },
  ],
  visualizations: [
    // Dashboard Page Charts
    { id: 'viz-dashboard-etiology', name: 'Wound Etiology Distribution', description: 'Shows distribution of wounds by etiology type', location: 'Dashboard', dataType: 'distribution', currentChartType: 'pie', recommendedChartTypes: ['pie', 'donut', 'bar'], enabled: true },
    { id: 'viz-dashboard-reduction', name: 'Wound Reduction Progression', description: 'Weekly median/average wound reduction trend', location: 'Dashboard', dataType: 'trend', currentChartType: 'line', recommendedChartTypes: ['line', 'area'], enabled: true },
    // Facility Wound Report Page Charts
    { id: 'viz-facility-acuity-trend', name: 'Acuity Index Trend', description: 'Shows acuity index changes over time', location: 'Facility Wound Report', dataType: 'trend', currentChartType: 'line', recommendedChartTypes: ['line', 'area'], enabled: true },
    { id: 'viz-facility-push-score', name: 'PUSH Score Over Time', description: 'Displays PUSH score progression over time', location: 'Facility Wound Report', dataType: 'trend', currentChartType: 'area', recommendedChartTypes: ['area', 'line'], enabled: true },
    // Etiology Report Page Charts
    { id: 'viz-etiology-distribution', name: 'Etiology Distribution', description: 'Pie chart showing wound type distribution', location: 'Etiology Report', dataType: 'distribution', currentChartType: 'pie', recommendedChartTypes: ['pie', 'donut', 'bar'], enabled: true },
    // Acuity Report Page Charts
    { id: 'viz-acuity-trend', name: 'Acuity Trend', description: 'Line chart showing acuity trend over time', location: 'Acuity Report', dataType: 'trend', currentChartType: 'line', recommendedChartTypes: ['line', 'area'], enabled: true },
    // Modal Charts - Shared across multiple modals
    { id: 'viz-modal-push-chart', name: 'PUSH Score Chart', description: 'PUSH score progression in wound detail modals', location: 'Detail Modals', dataType: 'trend', currentChartType: 'line', recommendedChartTypes: ['line', 'area'], enabled: true },
    { id: 'viz-modal-surface-chart', name: 'Surface Area Chart', description: 'Surface area progression in wound detail modals', location: 'Detail Modals', dataType: 'trend', currentChartType: 'line', recommendedChartTypes: ['line', 'area'], enabled: true },
  ],
  pages: [
    {
      id: 'dashboard', name: 'Dashboard', icon: '📊', enabled: true, category: 'reporting',
      components: [
        // KPI Cards Group - Master toggle with nested child cards
        {
          id: 'kpi-cards',
          name: 'Summary Cards',
          enabled: true,
          description: 'Key performance indicator cards',
          children: [
            { id: 'card-active-wounds', name: 'Active Wounds', enabled: true, description: 'Shows total active wounds count' },
            { id: 'card-healing-rate', name: 'Healing Rate', enabled: true, description: 'Shows wound healing percentage' },
            { id: 'card-reports-generated', name: 'Reports Generated', enabled: true, description: 'Shows reports count with details' },
            { id: 'card-critical-cases', name: 'Critical Cases', enabled: true, description: 'Shows critical cases with alerts' },
          ]
        },
        // Charts Section - Master toggle with nested child charts
        {
          id: 'charts-section',
          name: 'Charts',
          enabled: true,
          description: 'Dashboard visualizations',
          children: [
            { id: 'chart-wound-etiology', name: 'Wound Etiology', enabled: true, description: 'Pie chart of wound types' },
            { id: 'chart-wound-reduction', name: 'Wound Reduction Median', enabled: true, description: 'Line chart with statistics' },
            { id: 'chart-healing-status', name: 'Healing Status', enabled: true, description: 'Bar chart of healing status' },
            { id: 'chart-wounds-by-status', name: 'Wounds by Status', enabled: true, description: 'Horizontal bar chart of statuses' },
          ]
        },
      ]
    },
    {
      id: 'patients', name: 'Patients', icon: '👥', enabled: true, category: 'reporting',
      components: [
        {
          id: 'patient-kpi-cards',
          name: 'KPI Cards',
          enabled: true,
          description: 'Patient metrics',
          children: [
            { id: 'card-total-patients', name: 'Total Patients', enabled: true, description: 'Shows total patients seen' },
            { id: 'card-active-wounds', name: 'Active Wounds', enabled: true, description: 'Shows total active wounds' },
            { id: 'card-resolved-wounds', name: 'Resolved Wounds', enabled: true, description: 'Shows total resolved wounds' },
          ]
        },
        { id: 'patient-list', name: 'Patient List', enabled: true, description: 'Patient listing' },
        { id: 'patient-search', name: 'Search', enabled: true, description: 'Search patients' },
      ]
    },
    {
      id: 'round-summary', name: 'Woundcare Round Summary', icon: '📋', enabled: true, category: 'reporting',
      components: [
        {
          id: 'summary-cards',
          name: 'Summary Cards',
          enabled: true,
          description: 'Round metrics',
          children: [
            { id: 'card-total-wounds', name: 'Total Wounds', enabled: true, description: 'Shows total wounds in round' },
            { id: 'card-chronic-wounds', name: 'Chronic Wounds', enabled: true, description: 'Shows wounds older than 100 days' },
            { id: 'card-deteriorating', name: 'Deteriorating', enabled: true, description: 'Shows worsening wounds' },
          ]
        },
        { id: 'wound-list', name: 'Wound List', enabled: true, description: 'Evaluated wounds' },
      ]
    },
    {
      id: 'facility-report', name: 'Facility Wound Report', icon: '📋', enabled: true, category: 'reporting',
      components: [
        { id: 'filter-panel', name: 'Filter Panel', enabled: true, description: 'Search options' },
        {
          id: 'kpi-cards',
          name: 'KPI Cards',
          enabled: true,
          description: 'Key performance indicators',
          children: [
            { id: 'card-avg-wound-reduction', name: 'Avg Wound Reduction', enabled: true, description: 'Monthly area reduction percentage' },
            { id: 'card-wounds-improving', name: 'Wounds Improving', enabled: true, description: 'Number of wounds getting better' },
            { id: 'card-wounds-deteriorating', name: 'Wounds Deteriorating', enabled: true, description: 'Number of wounds getting worse' },
            { id: 'card-wounds-stable', name: 'Wounds Stable', enabled: true, description: 'Number of wounds with no change' },
            { id: 'card-acuity-index', name: 'Facility Acuity Index', enabled: true, description: 'Shows wounds per patient ratio' },
            { id: 'card-chronic-wounds', name: 'Chronic Wounds', enabled: true, description: 'Shows wounds older than 100 days' },
          ]
        },
        {
          id: 'chart-acuity-trend',
          name: 'Acuity Index Trend',
          enabled: true,
          description: 'Acuity index trend over time',
          children: [
            { id: 'acuity-trend-4weeks', name: '4 Weeks Back', enabled: true, description: 'Calculate 4 weeks back from end date' },
            { id: 'acuity-trend-daterange', name: 'Date Range', enabled: false, description: 'Use selected date picker interval' },
          ]
        },
        {
          id: 'metrics-cards',
          name: 'Metrics Cards',
          enabled: true,
          description: 'Detailed metrics tables',
          children: [
            { id: 'card-wound-activity', name: 'Wound Activity Metrics', enabled: true, description: 'New, resolved, active wounds stats' },
            { id: 'card-healing-times', name: 'Average Healing Times', enabled: true, description: 'Days to heal by etiology' },
            { id: 'card-patient-acuity', name: 'Patient & Acuity Metrics', enabled: true, description: 'PUSH score and acuity level' },
          ]
        },
        { id: 'chart-push-score', name: 'Change in PUSH Score Over Time', enabled: true, description: 'PUSH score trend chart' },
        { id: 'data-table', name: 'Data Table', enabled: true, description: 'Wound listing' },
        { id: 'export-options', name: 'Export Options', enabled: true, description: 'Report download' },
      ]
    },
    {
      id: 'outcome-report', name: 'Outcome Report Global', icon: '📈', enabled: true, category: 'reporting',
      components: [
        { id: 'timeline', name: 'Timeline', enabled: true, description: 'Time evolution' },
        { id: 'statistics', name: 'Statistics', enabled: true, description: 'Data analysis' },
        { id: 'comparisons', name: 'Comparisons', enabled: true, description: 'Period comparison' },
      ]
    },
    {
      id: 'etiology-report', name: 'Wound Etiology', icon: '🔍', enabled: true, category: 'reporting',
      components: [
        { id: 'etiology-breakdown', name: 'Etiology Breakdown', enabled: true, description: 'Wound causes' },
        { id: 'patterns', name: 'Patterns', enabled: true, description: 'Identified trends' },
      ]
    },
    {
      id: 'acuity-report', name: 'Acuity Index', icon: '⚠️', enabled: true, category: 'reporting',
      components: [
        { id: 'risk-assessment', name: 'Risk Assessment', enabled: true, description: 'Risk scores' },
        { id: 'severity-chart', name: 'Severity Chart', enabled: true, description: 'Severity distribution' },
      ]
    },
    {
      id: 'data-import', name: 'Data Import', icon: '📥', enabled: true, category: 'reporting',
      components: [
        {
          id: 'format-selector',
          name: 'Format Selector',
          enabled: true,
          description: 'Choose format',
          children: [
            { id: 'format-excel', name: 'Excel', enabled: true, description: 'XLSX, XLS spreadsheets' },
            { id: 'format-csv', name: 'CSV/TSV', enabled: true, description: 'Comma or tab separated' },
            { id: 'format-json', name: 'JSON', enabled: true, description: 'JSON structured data' },
            { id: 'format-xml', name: 'XML', enabled: true, description: 'XML format data' },
            { id: 'format-hl7', name: 'HL7/FHIR', enabled: true, description: 'HL7 clinical data' },
            { id: 'format-word', name: 'Word', enabled: false, description: 'DOCX documents' },
            { id: 'format-pdf', name: 'PDF', enabled: false, description: 'PDF documents' },
          ]
        },
        { id: 'upload-area', name: 'Upload Area', enabled: true, description: 'Upload file' },
        { id: 'preview', name: 'Preview', enabled: true, description: 'Preview data' },
        { id: 'validation', name: 'Validation', enabled: true, description: 'Verify data' },
      ]
    },
    {
      id: 'excel-import', name: 'Excel Import', icon: '📊', enabled: true, category: 'reporting',
      components: [
        { id: 'upload-area', name: 'Upload Area', enabled: true, description: 'Upload Excel file' },
        { id: 'preview', name: 'Preview', enabled: true, description: 'Preview data' },
        { id: 'validation', name: 'Validation', enabled: true, description: 'Verify data' },
      ]
    },
    {
      id: 'facility-selector', name: 'Select Your Facility', icon: '🏢', enabled: true, category: 'settings',
      components: [
        { id: 'import-data-button', name: 'Import Data Button', enabled: true, description: 'Show/hide Import Data button' },
      ]
    },
    {
      id: 'settings', name: 'Settings', icon: '⚙️', enabled: true, category: 'settings',
      components: [
        { id: 'general-settings', name: 'General', enabled: true, description: 'Basic options' },
        { id: 'page-management', name: 'Pages', enabled: true, description: 'Page control' },
        { id: 'chart-settings', name: 'Charts', enabled: true, description: 'Chart types configuration' },
        { id: 'theme-settings', name: 'Theme', enabled: true, description: 'Appearance' },
        { id: 'users-settings', name: 'Users', enabled: true, description: 'User management' },
        { id: 'import-audit', name: 'Import Audit', enabled: true, description: 'Review and revert file imports' },
      ]
    },
  ],
  theme: {
    mode: 'system',
    accentColor: '#3b82f6',
  },
  autoSave: true,
  notificationsEnabled: true,
};

// ==================== LOCAL STORAGE KEYS ====================

const SETTINGS_LOCAL_KEY = "appSettings";
const SETTINGS_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

// ==================== HELPER FUNCTIONS ====================

/**
 * Merge saved settings with defaults to handle missing properties
 */
function migrateSettings(saved: Partial<AppSettings> | null): AppSettings {
  if (!saved) return DEFAULT_SETTINGS;

  const savedPages = saved.pages || [];
  const mergedPages = DEFAULT_SETTINGS.pages.map(defaultPage => {
    const savedPage = savedPages.find((p: PageConfig) => p.id === defaultPage.id);
    if (savedPage) {
      // Merge components: use default structure but apply saved enabled states
      const mergedComponents = defaultPage.components?.map(defaultComponent => {
        const savedComponent = savedPage.components?.find(c => c.id === defaultComponent.id);
        if (savedComponent) {
          // Merge children if they exist
          const mergedChildren = defaultComponent.children?.map(defaultChild => {
            const savedChild = savedComponent.children?.find(ch => ch.id === defaultChild.id);
            if (savedChild) {
              return {
                ...defaultChild,
                enabled: savedChild.enabled,
              };
            }
            return defaultChild;
          });
          return {
            ...defaultComponent,
            enabled: savedComponent.enabled,
            children: mergedChildren,
          };
        }
        return defaultComponent;
      });
      return {
        ...defaultPage,
        enabled: savedPage.enabled,
        components: mergedComponents || defaultPage.components,
      };
    }
    return defaultPage;
  });

  return {
    importFormats: saved.importFormats || DEFAULT_SETTINGS.importFormats,
    charts: saved.charts || DEFAULT_SETTINGS.charts,
    visualizations: saved.visualizations || DEFAULT_SETTINGS.visualizations,
    pages: mergedPages,
    theme: saved.theme || DEFAULT_SETTINGS.theme,
    autoSave: saved.autoSave !== undefined ? saved.autoSave : DEFAULT_SETTINGS.autoSave,
    notificationsEnabled: saved.notificationsEnabled !== undefined ? saved.notificationsEnabled : DEFAULT_SETTINGS.notificationsEnabled,
  };
}

/**
 * Get settings from localStorage (fallback/cache)
 */
function getLocalSettings(): AppSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_LOCAL_KEY);
    if (saved) {
      return migrateSettings(JSON.parse(saved));
    }
  } catch (error) {
    logger.error('[useSettings] Error loading local settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage (cache)
 */
function saveLocalSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
  } catch (error) {
    logger.error('[useSettings] Error saving local settings:', error);
  }
}

// ==================== MAIN HOOK ====================

/**
 * Hook to manage user settings with DB persistence
 * Falls back to localStorage if DB is unavailable
 */
export function useSettings() {
  const { getToken, getEmail } = useAuth();
  const queryClient = useQueryClient();

  const token = getToken();
  const email = getEmail();

  // Get userId from secure storage (can be ProviderId or NurseId)
  // Settings are USER-based, not facility-based
  const userId = secureStorageSync.getItem("userEntityId");

  const deviceId = localStorage.getItem("deviceId") || "web-settings";

  // ==================== FETCH SETTINGS FROM DB ====================

  const { data: dbSettings, isLoading, error, refetch } = useQuery<AppSettings | null, Error>({
    queryKey: ["userSettings", userId],
    queryFn: async () => {
      if (!userId || !token || !email) {
        logger.debug('[useSettings] Missing auth params, using local settings');
        return null;
      }

      try {
        const response = await fetch(LOCAL_API.LOGIN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "FacilityDataCenter",
            method: "getUserSettings",
            token,
            email,
            deviceId,
            userId: parseInt(userId),
          }),
        });

        if (!response.ok) {
          logger.error('[useSettings] Failed to fetch settings from DB');
          return null;
        }

        const result = await response.json();

        if (result.status && result.data) {
          // Settings found in DB
          const dbSettingsData = result.data.settings;
          const migrated = migrateSettings(dbSettingsData);

          // Cache locally
          saveLocalSettings(migrated);

          logger.debug('[useSettings] Loaded settings from DB');
          return migrated;
        } else {
          // No settings in DB, return null (will use defaults)
          logger.debug('[useSettings] No settings in DB, using defaults');
          return null;
        }
      } catch (error) {
        logger.error('[useSettings] Error fetching settings:', error);
        return null;
      }
    },
    enabled: !!userId && !!token && !!email,
    staleTime: SETTINGS_CACHE_TIME,
    refetchOnWindowFocus: false,
  });

  // ==================== CURRENT SETTINGS ====================

  // Use DB settings if available, otherwise fall back to localStorage, then defaults
  const settings: AppSettings = dbSettings || getLocalSettings();

  // ==================== SAVE SETTINGS MUTATION ====================

  const saveMutation = useMutation({
    mutationFn: async (newSettings: AppSettings) => {
      // Always save locally first (for immediate feedback)
      saveLocalSettings(newSettings);

      if (!userId || !token || !email) {
        logger.debug('[useSettings] Missing auth params, saved locally only');
        return { success: true, local: true };
      }

      try {
        const response = await fetch(LOCAL_API.LOGIN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            entity: "FacilityDataCenter",
            method: "saveUserSettings",
            token,
            email,
            deviceId,
            userId: parseInt(userId),
            settings: newSettings,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save settings to DB');
        }

        const result = await response.json();

        if (result.status) {
          logger.debug('[useSettings] Settings saved to DB');
          return { success: true, local: false };
        } else {
          throw new Error(result.error || 'Unknown error saving settings');
        }
      } catch (error) {
        logger.error('[useSettings] Error saving to DB, saved locally:', error);
        return { success: true, local: true, error };
      }
    },
    onMutate: async (newSettings) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["userSettings", userId] });

      // Snapshot the previous value
      const previousSettings = queryClient.getQueryData(["userSettings", userId]);

      // Optimistically update the cache immediately
      queryClient.setQueryData(["userSettings", userId], newSettings);

      return { previousSettings };
    },
    onError: (err, newSettings, context) => {
      // If mutation fails, roll back to the previous value
      if (context?.previousSettings) {
        queryClient.setQueryData(["userSettings", userId], context.previousSettings);
      }
    },
    onSuccess: () => {
      // Invalidate the query to refetch latest settings (confirms DB sync)
      queryClient.invalidateQueries({ queryKey: ["userSettings", userId] });
    },
  });

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Save settings to DB and localStorage
   */
  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    return saveMutation.mutateAsync(newSettings);
  }, [saveMutation]);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(async () => {
    return saveMutation.mutateAsync(DEFAULT_SETTINGS);
  }, [saveMutation]);

  /**
   * Check if a page is enabled
   */
  const isPageEnabled = useCallback((pageId: string): boolean => {
    const page = settings.pages.find(p => p.id === pageId);
    return page?.enabled ?? true;
  }, [settings.pages]);

  /**
   * Check if a component within a page is enabled (supports nested children)
   */
  const isComponentEnabled = useCallback((pageId: string, componentId: string): boolean => {
    const page = settings.pages.find(p => p.id === pageId);
    if (!page?.enabled) return false;

    // First check if it's a direct component
    const directComponent = page.components?.find(c => c.id === componentId);
    if (directComponent) {
      return directComponent.enabled;
    }

    // Check if it's a child component
    for (const component of page.components || []) {
      if (component.children) {
        const childComponent = component.children.find(c => c.id === componentId);
        if (childComponent) {
          // Child is enabled only if both parent and child are enabled
          return component.enabled && childComponent.enabled;
        }
      }
    }

    // Default to true if not found
    return true;
  }, [settings.pages]);

  /**
   * Check if a chart type is enabled
   */
  const isChartEnabled = useCallback((chartType: string): boolean => {
    const chart = settings.charts.find(c => c.type === chartType);
    return chart?.enabled ?? true;
  }, [settings.charts]);

  /**
   * Check if an import format is enabled
   */
  const isImportFormatEnabled = useCallback((formatId: string): boolean => {
    const format = settings.importFormats.find(f => f.id === formatId);
    return format?.enabled ?? true;
  }, [settings.importFormats]);

  /**
   * Get enabled pages for navigation filtering
   */
  const getEnabledPages = useCallback((): PageConfig[] => {
    return settings.pages.filter(p => p.enabled);
  }, [settings.pages]);

  /**
   * Get enabled import formats
   */
  const getEnabledImportFormats = useCallback((): ImportFormatConfig[] => {
    return settings.importFormats.filter(f => f.enabled);
  }, [settings.importFormats]);

  return {
    // State
    settings,
    isLoading,
    error,
    isSaving: saveMutation.isPending,

    // Actions
    saveSettings,
    resetSettings,
    refetch,

    // Helpers
    isPageEnabled,
    isComponentEnabled,
    isChartEnabled,
    isImportFormatEnabled,
    getEnabledPages,
    getEnabledImportFormats,

    // Constants
    DEFAULT_SETTINGS,
  };
}

// ==================== SETTINGS CONTEXT (Optional) ====================

// If you need global settings state, you can create a context provider
// For now, the hook approach works well since React Query handles caching
