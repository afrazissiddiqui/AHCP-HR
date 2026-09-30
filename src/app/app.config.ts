import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authTokenInterceptor } from './interceptors/auth-token.interceptor';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authTokenInterceptor])),
  ]
};
