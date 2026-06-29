export const C = {
  // Primary — Electric Orange
  primary:              '#ae3200',
  onPrimary:            '#ffffff',
  primaryContainer:     '#ff5a1f',
  onPrimaryContainer:   '#541400',
  primaryFixed:         '#ffdbd0',
  primaryFixedDim:      '#ffb59e',

  // Secondary — Punchy Teal
  secondary:            '#006b5f',
  onSecondary:          '#ffffff',
  secondaryContainer:   '#62fae3',
  onSecondaryContainer: '#007165',

  // Tertiary — Soft Lilac
  tertiary:             '#6f5092',
  onTertiary:           '#ffffff',
  tertiaryContainer:    '#a584ca',
  onTertiaryContainer:  '#391b5a',

  // Surface
  background:           '#fcf9f8',
  surface:              '#fcf9f8',
  surfaceDim:           '#dcd9d9',
  surfaceContainerLow:  '#f6f3f2',
  surfaceContainer:     '#f0eded',
  surfaceContainerHigh: '#eae7e7',
  surfaceContainerHighest: '#e5e2e1',

  // On-surface
  onSurface:            '#1c1b1b',
  onSurfaceVariant:     '#5b4038',

  // Outline
  outline:              '#8f7067',
  outlineVariant:       '#e4beb3',

  // Error
  error:                '#ba1a1a',
  onError:              '#ffffff',

  // Border neo-brutalist
  border:               '#1c1b1b',
} as const;

/** Altura del floating navbar + margen. Usar como paddingBottom en screens con scroll. */
export const FLOATING_NAV_H = 80;

/** Sombra hard-offset estilo neo-brutalist */
export const shadow = {
  sm: {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  md: {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  lg: {
    shadowColor: '#1c1b1b',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  primary: {
    shadowColor: '#ae3200',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 0,
    elevation: 6,
  },
} as const;
