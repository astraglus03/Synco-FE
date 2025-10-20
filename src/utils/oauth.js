// OAuth helper utilities for social logins

export const getGoogleAuthorizeUrl = () => {
  const authorize = import.meta.env.VITE_GOOGLE_OAUTH_URL
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URL
  const scope = import.meta.env.VITE_GOOGLE_SCOPE
  const responseType = import.meta.env.VITE_GOOGLE_RESPONSE_TYPE || 'code'

  const state = encodeURIComponent(
    (window.location.pathname + window.location.search) || '/'
  )

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${authorize}?${params.toString()}`
}

export const redirectToGoogleOAuth = () => {
  window.location.href = getGoogleAuthorizeUrl()
}

// Kakao OAuth
export const getKakaoAuthorizeUrl = () => {
  const authorize = import.meta.env.VITE_KAKAO_OAUTH_URL || 'https://kauth.kakao.com/oauth/authorize'
  const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID
  const redirectUri = import.meta.env.VITE_KAKAO_REDIRECT_URL
  const responseType = 'code'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
  })

  return `${authorize}?${params.toString()}`
}

export const redirectToKakaoOAuth = () => {
  window.location.href = getKakaoAuthorizeUrl()
}

// Naver OAuth
export const getNaverAuthorizeUrl = () => {
  const authorize = import.meta.env.VITE_NAVER_OAUTH_URL || 'https://nid.naver.com/oauth2.0/authorize'
  const clientId = import.meta.env.VITE_NAVER_CLIENT_ID
  const redirectUri = import.meta.env.VITE_NAVER_REDIRECT_URL
  const responseType = 'code'
  const state = encodeURIComponent((window.location.pathname + window.location.search) || '/')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    state,
  })

  return `${authorize}?${params.toString()}`
}

export const redirectToNaverOAuth = () => {
  window.location.href = getNaverAuthorizeUrl()
}


