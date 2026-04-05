import { AppDataSource } from '../config/database';
import { AppEmailConfig } from '../entities/AppEmailConfig';
import { EmailConfigDto, UpdateEmailConfigDto } from '../types/schemas';

export class EmailConfigService {
  private repo = AppDataSource.getRepository(AppEmailConfig);

  // ── List ─────────────────────────────────────────────────────────────────────

  async list(): Promise<AppEmailConfig[]> {
    return this.repo.find({
      order: { appId: 'ASC' },
    });
  }

  // ── Find One ──────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<AppEmailConfig> {
    const config = await this.repo.findOne({ where: { id } });

    if (!config) {
      throw new Error('EMAIL_CONFIG_NOT_FOUND');
    }

    return config;
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(dto: EmailConfigDto): Promise<AppEmailConfig> {
    // Check appId is unique
    const existing = await this.repo.findOne({
      where: { appId: dto.appId },
    });

    if (existing) {
      throw new Error('APP_ID_EXISTS');
    }

    const config = this.repo.create(dto);
    return this.repo.save(config);
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateEmailConfigDto
  ): Promise<AppEmailConfig> {
    // Make sure it exists first
    await this.findById(id);

    await this.repo.update(id, dto);

    // Return the updated record
    return this.findById(id);
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }

  // ── Toggle Active ─────────────────────────────────────────────────────────────

  async toggle(id: string): Promise<AppEmailConfig> {
    const config = await this.findById(id);

    await this.repo.update(id, {
      isActive: !config.isActive,
    });

    return this.findById(id);
  }
}