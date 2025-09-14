
export function getInvoiceTemplateBase64(contractNumber: string): string {

  // select the invoice template based on the contract number for ipmssi, group14, greatHallJacobs, burns, facilitiesJWI, burgess, lsgGreatHall
  if (contractNumber === '202262512') {
    return group14InvoiceTemplate;
  }
  if (contractNumber === '202262947') {
    return ipmssiInvoiceTemplate;
  }
  if (contractNumber === '148042762') {
    return greatHallJacobsInvoiceTemplate;
  }
  if (contractNumber === '202262769') {
    return burnsInvoiceTemplate;
  }
  if (contractNumber === '202262936') {
    return facilitiesJWIInvoiceTemplate;
  }
  if (contractNumber === '0') {
    return burgessInvoiceTemplate;
  }
  if (contractNumber === '201839866') {
    return lsgGreatHallInvoiceTemplate;
  }

  // Default case: return empty string for unknown contract numbers to use the universal template
  return universalInvoiceTemplate;
}

export const ipmssiInvoiceTemplate = `JVBERi0xLj......yMDIKJSVFT0YK`;

export const group14InvoiceTemplate = `JVBERsdvsDi48/TC...mVmCjEyNDcasfagsbYK`;

export const greatHallJacobsInvoiceTemplate = `JVBEjkvnbKJSDi48/TC...mVmCjEydfhbzsdT0YK`;

export const burnsInvoiceTemplate = `JVBEaghtjndfJSDi48/TC...mVmCjEyNtrhndryYK`;

export const facilitiesJWIInvoiceTemplate = `JVBERi0xLjQKJsdgsgfm...mVmCjEyNDcyMjcKJSVFT0YK`;

export const burgessInvoiceTemplate = `JVBERi0xwetSDi48/TC...mVmCjEyyukVFT0YK`;

export const lsgGreatHallInvoiceTemplate = `JVBERi0xLdfgsdgfTC...mVmCjEyNhrshSVFT0YK`;

export const universalInvoiceTemplate = `JVBERdgsdfgfm...mVmCjEydfmgagsddnYK`;
