import { HttpInterceptorFn } from '@angular/common/http';

export const socketInterceptor: HttpInterceptorFn = (req, next) => {
  // Skip interceptor for Cloudinary uploads
  if (req.url.includes('https://api.cloudinary.com')) {
    return next(req); // just pass through, no X-Socket-Id
  }

  const clone = req.clone({
    setHeaders: {
      Accept: 'application/json',
      'X-Socket-Id': '56756756',
    },
  });

  return next(clone);
};
