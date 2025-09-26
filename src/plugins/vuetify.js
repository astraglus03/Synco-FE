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