import { computed } from 'vue'
import { useTheme } from 'vuetify'

export function useThemeToggle() {
  const theme = useTheme()
  
  // 테마 토글 함수
  const toggleTheme = () => {
    theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
  }
  
  // 현재 테마 상태
  const isDark = computed(() => theme.global.current.value.dark)
  
  return {
    isDark,
    toggleTheme
  }
}
