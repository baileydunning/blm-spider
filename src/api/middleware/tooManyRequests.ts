import { Request, Response, NextFunction } from 'express';

export default function tooManyRequests(req: Request, res: Response, next: NextFunction) {
  const rateLimit = req.app.get('rateLimit');
  const isRateLimited = rateLimit && rateLimit.isRateLimited(req);

  if (isRateLimited) {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  } else {
    next();
  }
}