import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function isBiometricsApiRequest(url: string): boolean {
  return url.includes('/biometrics-api') || url.includes('pioneerbiometrics.com');
}

export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (isBiometricsApiRequest(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getAuthToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
