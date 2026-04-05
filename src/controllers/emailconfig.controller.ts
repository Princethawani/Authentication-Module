import { Response, NextFunction } from 'express';
import { EmailConfigService } from '../services/emailconfig.service';
import { AuthRequest } from '../types';
import { validationError } from '../middleware/errorHandler';
import { EmailConfigSchema, UpdateEmailConfigSchema } from '../types/schemas';

export class EmailConfigController {
  constructor(private emailConfigService: EmailConfigService) {}

  // ── List ──────────────────────────────────────────────────────────────────────

  list = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const configs = await this.emailConfigService.list();
      res.json(configs);
    } catch (err) {
      next(err);
    }
  };

  // ── Find One ──────────────────────────────────────────────────────────────────

  findById = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const config = await this.emailConfigService.findById(req.params.id);
      res.json(config);
    } catch (err) {
      next(err);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────────

  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = EmailConfigSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const config = await this.emailConfigService.create(result.data);
      res.status(201).json(config);
    } catch (err) {
      next(err);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────────────

  update = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const result = UpdateEmailConfigSchema.safeParse(req.body);

    if (!result.success) {
      validationError(res, result.error.flatten());
      return;
    }

    try {
      const config = await this.emailConfigService.update(
        req.params.id,
        result.data
      );
      res.json(config);
    } catch (err) {
      next(err);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  delete = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.emailConfigService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ── Toggle ────────────────────────────────────────────────────────────────────

  toggle = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const config = await this.emailConfigService.toggle(req.params.id);
      res.json(config);
    } catch (err) {
      next(err);
    }
  };
}