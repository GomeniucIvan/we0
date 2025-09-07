export const getAppBaseUrl = (): string => {
  try {
    const settings = JSON.parse(localStorage.getItem('settingsConfig') || '{}');
    return settings.appBaseUrl || 'http://localhost:3000';
  } catch {
    return 'http://localhost:3000';
  }
};
