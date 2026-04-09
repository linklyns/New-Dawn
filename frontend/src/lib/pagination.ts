/**
 * Generate dynamic page size options based on total record count.
 * Only includes options that are less than or equal to totalCount.
 * @param totalCount Total number of records
 * @returns Array of valid page size options
 */
export function getPageSizeOptions(totalCount?: number): number[] {
  const baseOptions = [10, 20, 50, 100];
  
  if (!totalCount) {
    return baseOptions;
  }
  
  // Filter out options larger than totalCount
  return baseOptions.filter(size => size < totalCount);
}
