/**
 * Fills all four official IRS templates with sample data, verifies every
 * logical binding against the real AcroForm and writes the results to
 * docs/pdf-samples so they can be rendered and inspected.
 *
 * Usage: pnpm pdf:sample
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getForm, pdfValues, validateForm } = require('../packages/tax-form-engine/dist/index.js');
const { generateTaxFormPdf, verifyTemplateBindings } = require('../packages/pdf-engine/dist/index.js');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = join(root, 'apps/web/public/templates/US');
const outDir = join(root, 'docs/pdf-samples');

const SAMPLES = {
  W9: {
    file: 'W9/fw9.pdf',
    values: {
      fullName: 'Jonathan Q. Whitmore',
      businessName: 'Whitmore Consulting LLC',
      taxClassification: 'llc',
      llcCode: 'S',
      foreignPartners: false,
      exemptPayeeCode: '5',
      fatcaCode: '',
      accountNumbers: 'ACCT-8842-A',
      requesterNameAddress: 'Northwind Trading Co., 1200 Market Street, San Francisco, CA 94102',
      addressLine1: '4820 Cedar Ridge Drive',
      cityStateZip: 'Austin, TX 78745',
      tinType: 'ssn',
      ssn: '123-45-6789',
      ein: '',
      signatureDate: '2026-11-18',
      certification: true,
    },
  },
  W4: {
    file: 'W4/fw4.pdf',
    values: {
      firstName: 'Jonathan',
      lastName: 'Whitmore',
      address: '4820 Cedar Ridge Drive',
      cityStateZip: 'Austin, TX 78745',
      ssn: '123-45-6789',
      filingStatus: 'married-jointly',
      multipleJobs: false,
      qualifyingChildrenAmount: '2000',
      otherDependentsAmount: '500',
      totalDependents: '2500',
      otherIncome: '0',
      deductions: '1200',
      extraWithholding: '75',
      exempt: false,
      certification: true,
      signatureDate: '2026-11-18',
    },
  },
  W8BEN: {
    file: 'W8BEN/fw8ben.pdf',
    values: {
      fullName: 'Katarzyna Nowak',
      citizenshipCountry: 'PL',
      permanentCountry: 'PL',
      permanentAddress: 'ul. Piekna 18/4',
      permanentCity: '00-539 Warszawa',
      mailingAddress: '',
      mailingCity: '',
      mailingCountry: '',
      usTin: '',
      foreignTin: '8392716453',
      ftinNotRequired: false,
      referenceNumbers: 'CUST-77120',
      dateOfBirth: '1988-04-12',
      claimTreaty: true,
      treatyCountry: 'PL',
      treatyArticle: 'Article 12, paragraph 1',
      withholdingRate: '0',
      incomeType: 'Royalties',
      treatyExplanation: 'Resident of Poland; royalties paid for the use of copyright are taxable only in Poland.',
      printedName: 'Katarzyna Nowak',
      capacity: true,
      certification: true,
      signatureDate: '2026-11-18',
    },
  },
  W8BENE: {
    file: 'W8BENE/fw8bene.pdf',
    values: {
      organizationName: 'Norrland Analytics AB',
      countryOfIncorporation: 'SE',
      disregardedEntityName: '',
      chapter3Status: 'corporation',
      chapter4Status: 'active-nffe',
      permanentAddress: 'Sveavagen 42',
      permanentCity: '111 34 Stockholm',
      permanentCountry: 'SE',
      mailingAddress: '',
      mailingCity: '',
      mailingCountry: '',
      usTin: '',
      giin: '',
      foreignTin: '5566778899',
      ftinNotRequired: false,
      referenceNumbers: 'VENDOR-3391',
      branchChapter4Status: '',
      branchAddress: '',
      branchCity: '',
      branchCountry: '',
      branchGiin: '',
      claimTreaty: true,
      treatyCountry: 'SE',
      limitationOption: 'company-ownership-and-base-erosion',
      limitationOther: '',
      treatyDividends: false,
      treatyArticle: 'Article 10, paragraph 2',
      withholdingRate: '5',
      incomeType: 'Dividends',
      treatyExplanation: 'Swedish resident company meeting the ownership and base erosion test.',
      printedName: 'Anna Lindqvist',
      capacity: true,
      certification: true,
      signatureDate: '2026-11-18',
    },
  },
};

async function main() {
  mkdirSync(outDir, { recursive: true });
  const signatureBytes = new Uint8Array(readFileSync(join(root, 'docs/signature-sample.png')));
  const editable = process.argv.includes('--editable');
  let failures = 0;

  for (const [code, sample] of Object.entries(SAMPLES)) {
    const form = getForm(code);
    if (!form) throw new Error(`Unknown form ${code}`);

    const templateBytes = new Uint8Array(readFileSync(join(templateRoot, sample.file)));
    const validation = validateForm(form, sample.values, {
      signatureCaptured: true,
      signatureRequired: true,
    });
    const bindings = await verifyTemplateBindings(templateBytes, form.pdf);

    const result = await generateTaxFormPdf({
      templateBytes,
      form,
      values: pdfValues(form, sample.values),
      signatureBytes,
      flatten: !editable,
    });

    const outFile = join(outDir, `${form.code}${editable ? '-editable' : ''}.pdf`);
    writeFileSync(outFile, result.bytes);

    console.log(`\n=== ${form.code} (${form.pdf.revision}) -> ${outFile}`);
    console.log(`  bindings checked: ${bindings.checked}`);
    console.log(`  missing bindings: ${bindings.missing.length}`);
    if (bindings.missing.length) console.log(`    ${bindings.missing.join('\n    ')}`);
    if (bindings.typeMismatches.length) {
      console.log(`  type mismatches: ${JSON.stringify(bindings.typeMismatches)}`);
    }
    console.log(`  validation errors: ${Object.keys(validation.errors).length}`);
    if (Object.keys(validation.errors).length) console.log(`    ${JSON.stringify(validation.errors)}`);
    console.log(`  applied fields: ${result.appliedFields.length}`);
    console.log(`  skipped fields: ${result.skippedFields.length}`);
    if (result.skippedFields.length) console.log(`    ${result.skippedFields.join(', ')}`);
    if (result.warnings.length) console.log(`  warnings: ${result.warnings.join(' | ')}`);

    const problems =
      bindings.missing.length +
      bindings.typeMismatches.length +
      Object.keys(validation.errors).length;
    if (problems > 0) failures += 1;
  }

  console.log(`\nPDF samples written to ${outDir}`);
  if (failures > 0) {
    console.error(`${failures} form(s) reported problems`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
