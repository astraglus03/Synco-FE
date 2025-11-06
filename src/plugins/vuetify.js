import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { colors } from '@/constants/color.js'


export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      dark: {
        colors: {
          primary: colors.dark.primary,
          secondary: colors.dark.secondary,
          background: colors.dark.background,
          surface: colors.dark.surface,
          success: colors.dark.success,
          error: colors.dark.error,
          warning: colors.dark.warning,
          'on-primary': colors.dark.text,
          'on-secondary': colors.dark.text,
          'on-background': colors.dark.text,
          'on-surface': colors.dark.text,
          // Schedule 다크모드
          'schedule-card-bg': colors.dark.scheduleCardBg,
          'schedule-border': colors.dark.scheduleBorder,
          'schedule-text': colors.dark.scheduleText,
          'schedule-text-secondary': colors.dark.scheduleTextSecondary,
          'schedule-text-tertiary': colors.dark.scheduleTextTertiary,
          'schedule-placeholder': colors.dark.schedulePlaceholder,
          'schedule-hover-bg': colors.dark.scheduleHoverBg,
          'schedule-header-bg': colors.dark.scheduleHeaderBg,
        },
      },
      light: {
        colors: {
          primary: colors.light.primary,
          secondary: colors.light.secondary,
          background: colors.light.background,
          surface: colors.light.surface,
          success: colors.light.success,
          error: colors.light.error,
          warning: colors.light.warning,
          'on-primary': colors.light.text,
          'on-secondary': colors.light.text,
          'on-background': colors.light.text,
          'on-surface': colors.light.text,
          // Schedule 라이트모드
          'schedule-card-bg': colors.light.scheduleCardBg,
          'schedule-border': colors.light.scheduleBorder,
          'schedule-text': colors.light.scheduleText,
          'schedule-text-secondary': colors.light.scheduleTextSecondary,
          'schedule-text-tertiary': colors.light.scheduleTextTertiary,
          'schedule-placeholder': colors.light.schedulePlaceholder,
          'schedule-hover-bg': colors.light.scheduleHoverBg,
          'schedule-header-bg': colors.light.scheduleHeaderBg,
        },
      },
    },
  },
  icons: {
    iconfont: 'mdi',
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})