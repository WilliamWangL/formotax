/**
 * Seeds reference data: tax form definitions/versions, system configuration and
 * the first admin account. Safe to run repeatedly — every write is an upsert.
 *
 *   pnpm --filter @tax/api prisma:seed
 */
import '../src/common/load-env';
import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { FORM_DEFINITIONS } from '@tax/tax-form-engine';

const prisma = new PrismaClient();

async function seedTaxForms() {
  for (const form of FORM_DEFINITIONS) {
    const record = await prisma.taxForm.upsert({
      where: { formCode_country: { formCode: form.code, country: form.country } },
      update: { name: form.title, description: form.description, status: 1 },
      create: {
        formCode: form.code,
        country: form.country,
        name: form.title,
        description: form.description,
        status: 1,
      },
    });

    // Prisma's generated JSON types are stricter than the shared interfaces,
    // so the payloads are converted through a JSON round trip.
    const configJson = JSON.parse(
      JSON.stringify({
        code: form.code,
        slug: form.slug,
        title: form.title,
        version: form.version,
        revision: form.pdf.revision,
        steps: form.steps,
        seo: form.seo,
        disclaimers: form.disclaimers,
      }),
    ) as Prisma.InputJsonValue;
    const mappingJson = JSON.parse(
      JSON.stringify({
        templatePath: form.pdf.path,
        revision: form.pdf.revision,
        sha256: form.pdf.sha256,
        fields: form.pdf.fields,
        optionGroups: form.pdf.optionGroups,
        signature: form.pdf.signature ?? null,
      }),
    ) as Prisma.InputJsonValue;

    await prisma.taxFormVersion.upsert({
      where: { formId_version: { formId: record.id, version: form.version } },
      update: { templatePath: form.pdf.path, configJson, mappingJson, status: 1 },
      create: {
        formId: record.id,
        version: form.version,
        templatePath: form.pdf.path,
        configJson,
        mappingJson,
        effectiveDate: new Date(`${form.version}-01-01T00:00:00.000Z`),
        status: 1,
      },
    });

    // Older versions stay archived instead of being deleted.
    await prisma.taxFormVersion.updateMany({
      where: { formId: record.id, version: { not: form.version } },
      data: { status: 0 },
    });

    console.log(`Seeded ${form.code} version ${form.version}.`);
  }
}

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@formotax.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, status: 1 },
    create: { email, passwordHash, role: 'admin', status: 1 },
  });
  console.log(`Seeded admin ${email}.`);
}

async function seedSystemConfigs() {
  const entries = [
    { configKey: 'site.name', configValue: 'FormoTax', description: 'Public brand name' },
    { configKey: 'download.priceUsd', configValue: 1, description: 'Price per downloaded document' },
    { configKey: 'download.accessHours', configValue: 24, description: 'Free re-download window after purchase' },
    { configKey: 'support.email', configValue: 'support@formotax.com', description: 'Support address' },
  ];

  for (const entry of entries) {
    await prisma.systemConfig.upsert({
      where: { configKey: entry.configKey },
      update: { configValue: entry.configValue, description: entry.description },
      create: entry,
    });
  }
  console.log(`Seeded ${entries.length} system configs.`);
}

async function main() {
  await seedTaxForms();
  await seedAdmin();
  await seedSystemConfigs();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
