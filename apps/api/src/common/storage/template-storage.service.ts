import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { env } from '../env';

/**
 * Serves the official PDF templates from the server's local disk.
 *
 * Two directories are consulted, in order:
 *  1. `${STORAGE_DIR}/templates` — writable, survives image rebuilds, used for
 *     publishing a new IRS revision without redeploying the code.
 *  2. `TEMPLATE_DIR` — the copies bundled with the application.
 *
 * There is no object storage dependency; every file is streamed straight from
 * disk by the API, which also keeps the deployment to a single server.
 */
@Injectable()
export class TemplateStorageService {
  private readonly logger = new Logger(TemplateStorageService.name);
  private readonly bundledRoot = resolve(process.cwd(), env.storage.templateDir);
  private readonly writableRoot = resolve(process.cwd(), env.storage.storageDir, 'templates');

  /** Absolute path of the file that would be served for a template path. */
  localPath(templatePath: string): string {
    const key = this.relativeKey(templatePath);
    const override = this.contain(join(this.writableRoot, key), this.writableRoot);
    if (existsSync(override)) return override;
    return this.contain(join(this.bundledRoot, key), this.bundledRoot);
  }

  /** Directory where operators can drop updated templates. */
  get uploadDir(): string {
    return this.writableRoot;
  }

  /**
   * Configurations store the template as a public URL (`/templates/US/W9/fw9.pdf`)
   * so the browser can fetch it directly. Storage only cares about the part
   * below the templates root, so leading slashes and the `/templates/` prefix
   * are stripped here.
   */
  private relativeKey(templatePath: string): string {
    return normalize(templatePath)
      .replace(/^([/\\])+/, '')
      .replace(/^templates[/\\]/, '');
  }

  /** Refuses paths that escape their root. */
  private contain(absolute: string, root: string): string {
    if (!absolute.startsWith(root)) {
      this.logger.warn(`Refused template path outside ${root}: ${absolute}`);
      throw new Error('Template path escapes the configured directory.');
    }
    return absolute;
  }

  exists(templatePath: string): boolean {
    try {
      return existsSync(this.localPath(templatePath));
    } catch {
      return false;
    }
  }

  /** Whether the active template comes from the writable storage directory. */
  isOverride(templatePath: string): boolean {
    try {
      return this.localPath(templatePath).startsWith(this.writableRoot);
    } catch {
      return false;
    }
  }

  async size(templatePath: string): Promise<number> {
    const info = await stat(this.localPath(templatePath));
    return info.size;
  }

  stream(templatePath: string): Readable {
    return createReadStream(this.localPath(templatePath));
  }
}
