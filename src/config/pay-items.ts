/**
 * Pay Item Configuration
 *
 * Defines pay item codes and their display names used in timesheet processing.
 * Modify this file to add, remove, or update pay item types.
 */

export interface PayItem {
  code: string;
  name: string;
  description?: string;
}

/**
 * Pay item code to name mappings
 */
export const PAY_ITEM_NAMES: Record<string, string> = {
  '1099COMP': '1099-NEC Comp',
  'BER': 'Bereavement',
  'CTI_REG': 'CTI Regular',
  'CTI_OVT': 'CTI Overtime',
  'FLTHOL': 'Float Holiday',
  'HOL': 'Holiday',
  'JURY': 'Jury Duty',
  'OVT15': 'Overtime @ 1.5',
  'PTO': 'Paid Time Off',
  'HRLY': 'Regular Hourly',
  'SalaryHrs': 'Salary Track',
  'LV_UNPD': 'Unpaid Leave',
  'MIL': 'Military Unpaid'
};

/**
 * Get the display name for a pay item code
 * @param code - The pay item code
 * @returns The display name, or the code itself if not found
 */
export function getPayItemName(code: string): string {
  return PAY_ITEM_NAMES[code] || code;
}

/**
 * Get all available pay item codes
 */
export function getPayItemCodes(): string[] {
  return Object.keys(PAY_ITEM_NAMES);
}

/**
 * Check if a pay item code is valid
 */
export function isValidPayItemCode(code: string): boolean {
  return code in PAY_ITEM_NAMES;
}

/**
 * Get all pay items as an array of objects
 */
export function getAllPayItems(): PayItem[] {
  return Object.entries(PAY_ITEM_NAMES).map(([code, name]) => ({
    code,
    name
  }));
}
