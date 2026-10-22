export const environment = {
  production: false,
  // En dev, el proxy.conf.json reenvía /api al backend en localhost:3002
  apiUrl: '/api',
  // Client ID de Google (mismo que GOOGLE_CLIENT_ID del backend).
  // Debe crearse en Google Cloud Console → Credenciales → "ID de cliente OAuth"
  // con "Orígenes autorizados de JavaScript" = http://localhost:4200 (dev).
  // Si queda vacío, el botón "Sign in with Google" no se muestra en el login.
  googleClientId: '776610735736-mj0g83kvpt6c2vf48r30qnovm9mbk518.apps.googleusercontent.com',
};
