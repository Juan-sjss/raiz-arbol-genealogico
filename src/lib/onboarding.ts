const ONBOARDING_KEY = 'raiz.onboarding.v1'

/** ¿La persona ya vio la introducción en este dispositivo? */
export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'done'
  } catch {
    return false
  }
}

/** Marca la introducción como vista (se puede volver a abrir desde el menú). */
export function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'done')
  } catch {
    /* sin almacenamiento: se volverá a mostrar la próxima vez */
  }
}
