import type { FormDefinition } from '@tax/shared-types';

export const W4_FORM: FormDefinition = {
  code: 'W4',
  slug: 'w-4',
  version: '2026',
  country: 'US',
  language: 'en',
  title: "Form W-4, Employee's Withholding Certificate (2026)",
  shortTitle: 'Form W-4',
  agency: 'Internal Revenue Service (IRS)',
  category: 'withholding',
  audience: 'Employees paid wages in the United States',
  description:
    "Employee's Withholding Certificate. Give the completed form to your employer so the correct federal income tax is withheld from your pay.",
  officialUrl: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf',
  instructionsUrl: 'https://www.irs.gov/instructions/iw4',
  lastReviewed: '2026-11-18',
  estimatedMinutes: 6,
  steps: [
    {
      id: 'personal',
      title: 'Step 1: Personal information',
      subtitle:
        'Enter your name, address and social security number exactly as they appear on your Social Security card.',
      fields: [
        {
          name: 'firstName',
          label: 'First name and middle initial',
          type: 'text',
          required: true,
          autoComplete: 'given-name',
          placeholder: 'Jordan A.',
          validation: { rule: 'latin', maxLength: 40 },
        },
        {
          name: 'lastName',
          label: 'Last name',
          type: 'text',
          required: true,
          autoComplete: 'family-name',
          placeholder: 'Example',
          validation: { rule: 'latin', maxLength: 40 },
        },
        {
          name: 'address',
          label: 'Address',
          type: 'address',
          required: true,
          autoComplete: 'street-address',
          placeholder: '123 Main Street, Apt 4',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
        },
        {
          name: 'cityStateZip',
          label: 'City or town, state, and ZIP code',
          type: 'text',
          required: true,
          autoComplete: 'address-level2',
          placeholder: 'Springfield, IL 62704',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
        },
        {
          name: 'ssn',
          label: 'Social security number',
          type: 'ssn',
          required: true,
          placeholder: '123-45-6789',
          validation: { rule: 'ssn', maxLength: 11 },
          help: 'If your name does not match the SSN on file, contact the Social Security Administration before submitting this form.',
          colSpan: 2,
        },
        {
          name: 'filingStatus',
          label: 'Filing status (Step 1(c))',
          type: 'radio',
          required: true,
          colSpan: 2,
          options: [
            { value: 'single', label: 'Single or Married filing separately' },
            { value: 'married-jointly', label: 'Married filing jointly or Qualifying surviving spouse' },
            { value: 'head-of-household', label: 'Head of household' },
          ],
          help: 'Select the status you expect to use on your tax return. You may need to update your W-4 when your situation changes.',
        },
      ],
    },
    {
      id: 'multiple-jobs',
      title: 'Step 2: Multiple jobs or spouse works',
      subtitle:
        'Complete this step only if you hold more than one job at a time, or you are married filing jointly and your spouse also works.',
      fields: [
        {
          name: 'multipleJobs',
          label: 'I have multiple jobs, or my spouse also works (Step 2(c))',
          type: 'checkbox',
          colSpan: 2,
          help: 'If you check this box, withholding is calculated as if you had only one job. Use the IRS Tax Withholding Estimator for the most accurate result, or the Multiple Jobs Worksheet on page 3 of the official form.',
        },
        {
          name: 'higherPayingJobsNote',
          label: 'Notes for your records (not printed on the form)',
          type: 'textarea',
          maxLength: 200,
          colSpan: 2,
          help: 'Keep track of which job this W-4 applies to. Complete Steps 3–4(b) on only one W-4 when using the worksheet method.',
        },
      ],
    },
    {
      id: 'dependents',
      title: 'Steps 3–4: Dependents and other adjustments',
      subtitle:
        'Only complete these steps if they apply to you. Leave the amounts blank if you want the standard withholding.',
      fields: [
        {
          name: 'qualifyingChildrenAmount',
          label: 'Step 3(a): Qualifying children under age 17',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 100000 },
          help: 'Multiply the number of qualifying children by $2,200.',
        },
        {
          name: 'otherDependentsAmount',
          label: 'Step 3(b): Other dependents',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 100000 },
          help: 'Multiply the number of other dependents by $500.',
        },
        {
          name: 'totalDependents',
          label: 'Step 3: Total credit amount',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 200000 },
          help: 'Add Step 3(a) and 3(b) plus any other credits.',
          colSpan: 2,
        },
        {
          name: 'otherIncome',
          label: 'Step 4(a): Other income (not from jobs)',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 10000000 },
          help: 'Interest, dividends, retirement income or other expected income. Do not include wages from a job.',
        },
        {
          name: 'deductions',
          label: 'Step 4(b): Deductions',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 10000000 },
          help: 'Enter the amount from the Deductions Worksheet on page 4 only if you itemize or claim other deductions.',
        },
        {
          name: 'extraWithholding',
          label: 'Step 4(c): Extra withholding per pay period',
          type: 'currency',
          inputMode: 'decimal',
          placeholder: '0.00',
          validation: { min: 0, max: 10000000 },
          help: 'Any additional tax you want withheld from each paycheck.',
          colSpan: 2,
        },
      ],
    },
    {
      id: 'signature',
      title: 'Step 5: Sign and date',
      subtitle:
        'Sign under penalties of perjury. The form is not valid unless you sign it. Do not complete the Employers Only section.',
      kind: 'signature',
      fields: [
        {
          name: 'exempt',
          label: 'Exempt from withholding (only if you meet both IRS conditions)',
          type: 'checkbox',
          colSpan: 2,
          help: 'Most employees do not qualify. See page 2 of the official instructions before checking this box.',
        },
        {
          name: 'certification',
          label:
            'Under penalties of perjury, I declare that this certificate is true, correct and complete to the best of my knowledge.',
          type: 'checkbox',
          required: true,
          colSpan: 2,
        },
        {
          name: 'signatureDate',
          label: 'Date',
          type: 'date',
          required: true,
          defaultValue: 'today',
          validation: { rule: 'date' },
        },
        {
          name: 'signature',
          label: "Employee's signature",
          type: 'signature',
          required: true,
          colSpan: 2,
        },
      ],
    },
  ],
  pdf: {
    path: '/templates/US/W4/fw4.pdf',
    pages: 5,
    revision: 'Form W-4 (2026)',
    catalogNumber: 'Cat. No. 10220Q',
    officialUrl: 'https://www.irs.gov/pub/irs-pdf/fw4.pdf',
    sha256: '92444d8856ce55d9e25dca8b6d1420634fc68b11e1ab1f760916ea29ddd312b2',
    pageSize: [611.98, 791.97],
    fields: {
      firstName: { field: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]', type: 'text', fontSize: 11 },
      lastName: { field: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]', type: 'text', fontSize: 11 },
      address: { field: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]', type: 'text', fontSize: 10 },
      cityStateZip: {
        field: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]',
        type: 'text',
        fontSize: 10,
      },
      ssn: { field: 'topmostSubform[0].Page1[0].f1_05[0]', type: 'text', transform: 'digits' },
      multipleJobs: { field: 'topmostSubform[0].Page1[0].c1_2[0]', type: 'checkbox' },
      qualifyingChildrenAmount: {
        field: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]',
        type: 'text',
        fontSize: 9,
      },
      otherDependentsAmount: {
        field: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]',
        type: 'text',
        fontSize: 9,
      },
      totalDependents: { field: 'topmostSubform[0].Page1[0].f1_08[0]', type: 'text', fontSize: 9 },
      otherIncome: { field: 'topmostSubform[0].Page1[0].f1_09[0]', type: 'text', fontSize: 9 },
      deductions: { field: 'topmostSubform[0].Page1[0].f1_10[0]', type: 'text', fontSize: 9 },
      extraWithholding: { field: 'topmostSubform[0].Page1[0].f1_11[0]', type: 'text', fontSize: 9 },
      exempt: { field: 'topmostSubform[0].Page1[0].c1_3[0]', type: 'checkbox' },
    },
    optionGroups: {
      filingStatus: {
        single: 'topmostSubform[0].Page1[0].c1_1[0]',
        'married-jointly': 'topmostSubform[0].Page1[0].c1_1[1]',
        'head-of-household': 'topmostSubform[0].Page1[0].c1_1[2]',
      },
    },
    signature: {
      required: true,
      page: 0,
      x: 100,
      y: 94,
      width: 270,
      height: 18,
      signerLabel: "Employee's signature",
      consentText: 'I have read and agree to the certification in Step 5 of Form W-4.',
      dateText: { x: 440, y: 95, size: 10 },
    },
    flatten: true,
  },
  seo: {
    title: 'Free W-4 Form Generator 2026 | Fill W-4 PDF',
    description:
      'Complete IRS Form W-4 for 2026 online. Enter filing status, dependents and extra withholding, sign electronically and download the official PDF.',
    h1: 'Free 2026 W-4 Form Generator',
    keywords: [
      'W-4 form 2026',
      'fill W-4 online',
      'IRS Form W-4',
      'employee withholding certificate',
      'W-4 PDF',
      'federal withholding',
    ],
    landingPath: '/w4-form-generator',
    intro:
      'Form W-4 tells your employer how much federal income tax to withhold from each paycheck. The 2026 form uses the redesigned five-step layout with no withholding allowances. Complete the steps that apply to you, sign, and download the official IRS PDF to give to your employer.',
    sections: [
      {
        heading: 'What changed on the 2026 W-4?',
        paragraphs: [
          'The form keeps the five-step structure introduced in 2020. Employees enter personal information, adjust for multiple jobs, claim dependents and other credits, request extra withholding, and sign.',
          'The dollar amounts used in Step 3(a) and 3(b) are set by the IRS each year. Use the current official form and instructions for the tax year you are starting employment.',
        ],
      },
      {
        heading: 'How to complete each step',
        paragraphs: ['Only Steps 1 and 5 are required for most employees:'],
        bullets: [
          'Step 1: name, address, SSN and filing status',
          'Step 2: check the box only if you have multiple jobs or a working spouse',
          'Step 3: multiply qualifying children by $2,200 and other dependents by $500',
          'Step 4: add other income, deductions or extra withholding if you want a more precise result',
          'Step 5: sign and date; the form is not valid without your signature',
        ],
      },
      {
        heading: 'Do you need to update your W-4?',
        paragraphs: [
          'You are not required to file a new W-4 every year. Consider updating it after marriage, divorce, a new job, a change in dependents, or a large change in income outside your job.',
          'You can submit a new W-4 to your employer at any time. The most recent valid form on file controls withholding.',
        ],
      },
      {
        heading: 'Multiple jobs and the estimator',
        paragraphs: [
          'The IRS Tax Withholding Estimator at irs.gov/W4App produces the most accurate result when you or your spouse have more than one income source. The Multiple Jobs Worksheet on page 3 of the form is an alternative.',
          'When using the worksheet, complete Steps 3–4(b) on only one W-4: the one for the highest-paying job.',
        ],
      },
      {
        heading: 'Your data stays on your device',
        paragraphs: [
          'W-4 entries and the handwritten signature are processed in your browser. The generated PDF is created locally and is not uploaded unless you choose to save it to your account.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is the 2026 W-4 form required?',
        answer:
          'New employees must give their employer a completed W-4. Existing employees can keep a prior valid W-4 on file, but should update it when their personal or financial situation changes.',
      },
      {
        question: 'Can I claim exempt from withholding?',
        answer:
          'Only if you had no federal income tax liability last year and expect none this year, and you meet the other IRS conditions described on page 2 of the instructions. Most employees do not qualify.',
      },
      {
        question: 'Do I have to complete Steps 2, 3 and 4?',
        answer:
          'No. They are optional. If you leave them blank, withholding is calculated using the standard deduction and the filing status selected in Step 1.',
      },
      {
        question: 'How do I sign Form W-4 electronically?',
        answer:
          'Draw your signature with a finger, stylus or mouse. The signature is embedded in the signature area of the official PDF. A handwritten signature image is not a digital certificate signature; ask your employer if they require a specific e-signature platform.',
      },
      {
        question: 'Should I fill in the Employers Only section?',
        answer:
          'No. The employer completes that section, including your first date of employment and their EIN.',
      },
      {
        question: 'How do I calculate withholding for two jobs?',
        answer:
          'Use the IRS Tax Withholding Estimator or the Multiple Jobs Worksheet. Checking Step 2(c) is appropriate when there are only two jobs total and pay from the higher-paying job is more than half of the combined pay.',
      },
    ],
  },
  disclaimers: [
    'This tool is not affiliated with the Internal Revenue Service and does not provide tax or legal advice.',
    'Withholding rules and dollar amounts change; verify the current IRS instructions before relying on the result.',
    'Provide the completed form to your employer. Do not send Form W-4 to the IRS.',
  ],
};
