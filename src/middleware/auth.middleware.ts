import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const betaAccessMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const appEnv = process.env.APP_ENV;

    // Skip check for health endpoint
    if (req.path === '/health') {
        return next();
    }

    if (appEnv !== 'dev') {
        logger.warn(`Blocked API access from ${req.ip} - App in Beta Mode`);
        return res.status(403).json({
            success: false,
            error: 'Beta Access Restricted',
            message: 'This application is currently in private beta. Please contact kiradev2210@gmail.com for access credentials.'
        });
    }

    next();
};
