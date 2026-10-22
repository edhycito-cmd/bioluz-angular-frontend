export const environment = {
  production: true,
  // En producción, apuntar directamente a la URL pública del backend.
  //apiUrl: 'https://api.tu-dominio.com/api',
  apiUrl: 'http://192.168.1.50:3002/api',
  // Client ID de Google (identificador público, el mismo GOOGLE_CLIENT_ID del backend).
  // En Google Cloud Console hay que registrar el origen desde el que se sirve
  // esta build (ej. http://192.168.1.50:4200) en "Orígenes autorizados de JavaScript".
  // Si queda vacío, el botón "Sign in with Google" no se muestra en el login.
  googleClientId: '776610735736-mj0g83kvpt6c2vf48r30qnovm9mbk518.apps.googleusercontent.com',
};
