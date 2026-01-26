import { HttpInterceptorFn } from '@angular/common/http';

export const timezoneInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for Cloudinary uploads
  if (req.url.includes('https://api.cloudinary.com')) {
    return next(req); // just pass through, no X-Timezone
  }

  const clone = req.clone({
    setHeaders: {
      'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  return next(clone);
};
