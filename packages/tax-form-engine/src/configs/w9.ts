import type { FormDefinition } from '@tax/shared-types';

export const W9_FORM: FormDefinition = {
  code: 'W9',
  slug: 'w-9',
  version: '2024',
  country: 'US',
  language: 'en',
  title: 'Form W-9, Request for Taxpayer Identification Number and Certification',
  shortTitle: 'Form W-9',
  agency: 'Internal Revenue Service (IRS)',
  category: 'identification',
  audience: 'U.S. persons, resident aliens, sole proprietors and U.S. entities',
  description:
    'Request for Taxpayer Identification Number and Certification. Give this form to the requester (payer); do not send it to the IRS.',
  officialUrl: 'https://www.irs.gov/pub/irs-pdf/fw9.pdf',
  instructionsUrl: 'https://www.irs.gov/instructions/iw9',
  lastReviewed: '2026-11-18',
  estimatedMinutes: 5,
  steps: [
    {
      id: 'name',
      title: 'Name and tax classification',
      subtitle:
        'Enter the name exactly as it appears on your income tax return, then select your federal tax classification.',
      fields: [
        {
          name: 'fullName',
          label: 'Name of entity/individual (line 1)',
          type: 'text',
          required: true,
          placeholder: 'John A. Example',
          autoComplete: 'name',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
          help: 'For a sole proprietor or disregarded entity, enter the owner’s name on line 1 and the business name on line 2.',
        },
        {
          name: 'businessName',
          label: 'Business name / disregarded entity name (line 2)',
          type: 'text',
          placeholder: 'Example Consulting LLC',
          autoComplete: 'organization',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
        },
        {
          name: 'taxClassification',
          label: 'Federal tax classification (line 3a)',
          type: 'radio',
          required: true,
          colSpan: 2,
          options: [
            { value: 'individual', label: 'Individual/sole proprietor' },
            { value: 'c-corp', label: 'C corporation' },
            { value: 's-corp', label: 'S corporation' },
            { value: 'partnership', label: 'Partnership' },
            { value: 'trust-estate', label: 'Trust/estate' },
            { value: 'llc', label: 'LLC (enter the tax classification code)' },
            { value: 'other', label: 'Other (see instructions)' },
          ],
        },
        {
          name: 'llcCode',
          label: 'LLC tax classification code',
          type: 'select',
          visibleWhen: { field: 'taxClassification', equals: 'llc' },
          requiredWhen: { field: 'taxClassification', equals: 'llc' },
          options: [
            { value: 'C', label: 'C, C corporation' },
            { value: 'S', label: 'S, S corporation' },
            { value: 'P', label: 'P, Partnership' },
          ],
          help: 'Unless the LLC is a disregarded entity, in which case check the tax classification of its owner instead.',
        },
        {
          name: 'otherClassification',
          label: 'Other classification (describe)',
          type: 'text',
          visibleWhen: { field: 'taxClassification', equals: 'other' },
          requiredWhen: { field: 'taxClassification', equals: 'other' },
          validation: { maxLength: 50, rule: 'latin' },
          colSpan: 2,
        },
        {
          name: 'foreignPartners',
          label: 'Check if you have any foreign partners, owners, or beneficiaries (line 3b)',
          type: 'checkbox',
          visibleWhen: {
            field: 'taxClassification',
            in: ['partnership', 'trust-estate', 'llc'],
          },
          help: 'Applies when you checked Partnership or Trust/estate, or LLC taxed as a partnership.',
          colSpan: 2,
        },
      ],
    },
    {
      id: 'exemptions',
      title: 'Exemptions and account details',
      subtitle: 'Most individuals leave this section blank. Only complete it if the instructions apply to you.',
      fields: [
        {
          name: 'exemptPayeeCode',
          label: 'Exempt payee code (line 4, if any)',
          type: 'text',
          maxLength: 2,
          placeholder: 'e.g. 1',
          validation: { rule: 'digits', maxLength: 2 },
          help: 'Codes apply only to certain entities, not individuals. See the IRS instructions for the code list.',
        },
        {
          name: 'fatcaCode',
          label: 'Exemption from FATCA reporting code (if any)',
          type: 'text',
          maxLength: 2,
          placeholder: 'e.g. A',
          help: 'Applies to accounts maintained outside the United States.',
        },
        {
          name: 'accountNumbers',
          label: 'Account number(s) (line 7, optional)',
          type: 'text',
          maxLength: 40,
          help: 'May be required by the requester to identify your account.',
          colSpan: 2,
        },
        {
          name: 'requesterNameAddress',
          label: 'Requester’s name and address (optional)',
          type: 'textarea',
          maxLength: 120,
          help: 'Usually completed by the requester, not by the taxpayer.',
          colSpan: 2,
        },
      ],
    },
    {
      id: 'address',
      title: 'Address',
      subtitle: 'Use the address where you receive mail. Do not use a P.O. box unless it is your only address.',
      fields: [
        {
          name: 'addressLine1',
          label: 'Address (number, street, apt. or suite no.) — line 5',
          type: 'address',
          required: true,
          autoComplete: 'street-address',
          placeholder: '123 Main Street, Apt 4',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
        },
        {
          name: 'cityStateZip',
          label: 'City, state, and ZIP code — line 6',
          type: 'text',
          required: true,
          autoComplete: 'address-level2',
          placeholder: 'Springfield, IL 62704',
          validation: { rule: 'latin', maxLength: 70 },
          colSpan: 2,
        },
      ],
    },
    {
      id: 'tin',
      title: 'Taxpayer identification number',
      subtitle: 'Enter your SSN or EIN. The name on line 1 must match the name associated with this number.',
      fields: [
        {
          name: 'tinType',
          label: 'Which number are you providing?',
          type: 'radio',
          required: true,
          colSpan: 2,
          options: [
            { value: 'ssn', label: 'Social security number (SSN)' },
            { value: 'ein', label: 'Employer identification number (EIN)' },
          ],
        },
        {
          name: 'ssn',
          label: 'Social security number',
          type: 'ssn',
          visibleWhen: { field: 'tinType', equals: 'ssn' },
          requiredWhen: { field: 'tinType', equals: 'ssn' },
          placeholder: '123-45-6789',
          validation: { rule: 'ssn', maxLength: 11 },
          help: 'For individuals, this is generally your SSN. If you do not have a number, see “How to get a TIN” in the instructions.',
          colSpan: 2,
        },
        {
          name: 'ein',
          label: 'Employer identification number',
          type: 'ein',
          visibleWhen: { field: 'tinType', equals: 'ein' },
          requiredWhen: { field: 'tinType', equals: 'ein' },
          placeholder: '12-3456789',
          validation: { rule: 'ein', maxLength: 10 },
          colSpan: 2,
        },
      ],
    },
    {
      id: 'signature',
      title: 'Certification and signature',
      subtitle:
        'Sign under penalties of perjury. Your typed name is not a signature on this form; draw your signature below.',
      kind: 'signature',
      fields: [
        {
          name: 'signatureDate',
          label: 'Date',
          type: 'date',
          required: true,
          defaultValue: 'today',
          validation: { rule: 'date' },
        },
        {
          name: 'certification',
          label:
            'I certify that the number shown on this form is my correct taxpayer identification number and that I am not subject to backup withholding.',
          type: 'checkbox',
          required: true,
          colSpan: 2,
        },
        {
          name: 'signature',
          label: 'Signature of U.S. person',
          type: 'signature',
          required: true,
          colSpan: 2,
        },
      ],
    },
  ],
  pdf: {
    path: '/templates/US/W9/fw9.pdf',
    pages: 6,
    revision: 'Rev. March 2024',
    catalogNumber: 'Cat. No. 10231X',
    officialUrl: 'https://www.irs.gov/pub/irs-pdf/fw9.pdf',
    sha256: '2d420cbb4123dcf1fb82595b2359cfbb5d81f00b9df9d359fcc7af361d093f53',
    pageSize: [611.98, 791.97],
    fields: {
      fullName: { field: 'topmostSubform[0].Page1[0].f1_01[0]', type: 'text', fontSize: 11 },
      businessName: { field: 'topmostSubform[0].Page1[0].f1_02[0]', type: 'text', fontSize: 10 },
      llcCode: { field: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_03[0]', type: 'text', transform: 'uppercase' },
      exemptPayeeCode: {
        field: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].f1_04[0]',
        type: 'text',
      },
      fatcaCode: { field: 'topmostSubform[0].Page1[0].f1_06[0]', type: 'text' },
      addressLine1: {
        field: 'topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_07[0]',
        type: 'text',
        fontSize: 10,
      },
      cityStateZip: {
        field: 'topmostSubform[0].Page1[0].Address_ReadOrder[0].f1_08[0]',
        type: 'text',
        fontSize: 10,
      },
      requesterNameAddress: { field: 'topmostSubform[0].Page1[0].f1_09[0]', type: 'text', fontSize: 9 },
      accountNumbers: { field: 'topmostSubform[0].Page1[0].f1_10[0]', type: 'text', fontSize: 9 },
      foreignPartners: {
        field: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_2[0]',
        type: 'checkbox',
      },
      ssn: {
        field: 'topmostSubform[0].Page1[0].f1_11[0]',
        type: 'text',
        transform: 'digits',
        segments: [
          { field: 'topmostSubform[0].Page1[0].f1_11[0]', length: 3 },
          { field: 'topmostSubform[0].Page1[0].f1_12[0]', length: 2 },
          { field: 'topmostSubform[0].Page1[0].f1_13[0]', length: 4 },
        ],
      },
      ein: {
        field: 'topmostSubform[0].Page1[0].f1_14[0]',
        type: 'text',
        transform: 'digits',
        segments: [
          { field: 'topmostSubform[0].Page1[0].f1_14[0]', length: 2 },
          { field: 'topmostSubform[0].Page1[0].f1_15[0]', length: 7 },
        ],
      },
    },
    optionGroups: {
      taxClassification: {
        individual: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[0]',
        'c-corp': 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[1]',
        's-corp': 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[2]',
        partnership: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[3]',
        'trust-estate': 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[4]',
        llc: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[5]',
        other: 'topmostSubform[0].Page1[0].Boxes3a-b_ReadOrder[0].c1_1[6]',
      },
    },
    signature: {
      required: true,
      page: 0,
      x: 100,
      y: 184,
      width: 270,
      height: 20,
      signerLabel: 'Signature of U.S. person',
      consentText: 'I have read and agree to the certification in Part II of Form W-9.',
      dateText: { x: 404, y: 186, size: 10 },
    },
    flatten: true,
  },
  seo: {
    title: 'Free W-9 Form Generator | Fill W-9 PDF',
    description:
      'Fill out IRS Form W-9 online in minutes. Enter your name, tax classification and TIN, sign on screen and download a print-ready PDF. No account required.',
    h1: 'Free W-9 Form Generator',
    keywords: [
      'W-9 form generator',
      'fill W-9 online',
      'IRS Form W-9',
      'W-9 PDF',
      'taxpayer identification number',
      'free W-9',
    ],
    landingPath: '/w9-form-generator',
    intro:
      'Form W-9 is the IRS request for a taxpayer identification number and certification. Businesses and payers ask independent contractors, freelancers and U.S. entities to complete it before making payments. Create a correctly formatted W-9 in your browser, sign it, and download the official IRS PDF.',
    sections: [
      {
        heading: 'What is Form W-9 used for?',
        paragraphs: [
          'A requester uses Form W-9 to collect your correct taxpayer identification number (TIN) and certify that you are a U.S. person. The information is used to prepare information returns such as Form 1099-NEC or 1099-MISC.',
          'You give the completed form to the business that asked for it. Do not send Form W-9 to the IRS.',
        ],
      },
      {
        heading: 'Who should complete a W-9?',
        paragraphs: ['Use Form W-9 if you are any of the following:'],
        bullets: [
          'A U.S. citizen or other U.S. person, including a resident alien',
          'A sole proprietor or single-member LLC taxed as a disregarded entity',
          'A partnership, corporation, trust or estate organized in the United States',
          'An individual providing services as an independent contractor',
        ],
      },
      {
        heading: 'How to fill out Form W-9',
        paragraphs: ['The generator follows the order of the official form:'],
        bullets: [
          'Line 1 and 2: enter your name and, if different, your business or disregarded entity name',
          'Line 3a: choose the federal tax classification that matches your entity; LLCs enter C, S or P in the entry space',
          'Line 4: add exemption codes only if the instructions say they apply to you',
          'Lines 5 and 6: provide the address where you receive mail',
          'Part I: enter your SSN or EIN and make sure it matches the name on line 1',
          'Part II: sign and date the certification',
        ],
      },
      {
        heading: 'Common W-9 mistakes',
        paragraphs: ['The IRS can reject a W-9 that does not match its records. Watch for these issues:'],
        bullets: [
          'Using a business name on line 1 when the TIN belongs to the individual owner',
          'Entering an SSN or EIN that does not match the name exactly',
          'Checking the LLC box without entering the C, S or P classification code',
          'Signing with a typed name only; the form requires a handwritten signature',
          'Sending the form to the IRS instead of the requester',
        ],
      },
      {
        heading: 'Privacy: your tax data stays in your browser',
        paragraphs: [
          'The form is filled and the PDF is generated locally in your browser. Your name, address, SSN or EIN and signature are not uploaded to our servers unless you explicitly save a copy to your account.',
          'Download the finished PDF and share it only with the business that requested it.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is this W-9 generator free?',
        answer:
          'Yes. You can complete the form, preview the official IRS PDF and download it at no cost. Optional paid plans add saved records and higher usage limits; creating a tax form never requires a subscription.',
      },
      {
        question: 'Can I sign Form W-9 electronically?',
        answer:
          'Form W-9 requires a signature. This tool lets you draw a handwritten signature with a finger, stylus, mouse or trackpad and embeds it into the signature area of the official PDF. A handwritten signature image is not a digital certificate signature; confirm with the requester if they require a specific e-signature process.',
      },
      {
        question: 'Do I need an EIN to fill out a W-9?',
        answer:
          'No. Individuals and sole proprietors generally provide an SSN. Entities and some LLCs provide an EIN. Use the number that the IRS issued to the name entered on line 1.',
      },
      {
        question: 'Should I send the completed W-9 to the IRS?',
        answer:
          'No. Give the form to the business or payer that requested it. The IRS does not accept Form W-9 by mail for this purpose.',
      },
      {
        question: 'Is my SSN safe in this tool?',
        answer:
          'Form filling, signature capture and PDF generation happen in your browser. The SSN is not transmitted when you generate the PDF, and it is not written to analytics or logs. Only save a copy to your account if you choose to.',
      },
      {
        question: 'Which W-9 revision does the generator use?',
        answer:
          'The generator uses the official IRS Form W-9, Rev. March 2024. If the IRS publishes a newer revision, a new template version is added without changing previously generated documents.',
      },
    ],
  },
  disclaimers: [
    'This tool is not affiliated with, endorsed by, or connected to the Internal Revenue Service.',
    'It does not provide tax, legal or accounting advice. Tax form content and filing requirements are governed by the current IRS instructions.',
    'Always review the completed PDF before sending it to a requester.',
  ],
};
