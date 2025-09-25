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
      light: {
        colors: {
          primary: colors.primary,
          background: colors.background,
          surface: colors.white,
          success: colors.success,
          error: colors.error,
          'on-surface': colors.text,
          'on-background': colors.text,
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