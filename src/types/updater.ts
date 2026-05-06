export interface UpdateInfo {
  available: boolean;
  version?: string;
  currentVersion?: string;
  date?: string;
  body?: string;
}

export interface UpdateProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export interface UpdateError {
  message: string;
  code?: string;
}

export interface UpdateSettings {
  autoUpdate: boolean;
  lastCheck?: Date;
  enabled: boolean;
}

export const UPDATE_SETTINGS_KEY = 'inventarioy_update_settings';

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = {
  autoUpdate: true,
  enabled: true,
};