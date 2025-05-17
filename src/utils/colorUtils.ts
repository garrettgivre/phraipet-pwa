/**
 * Returns the appropriate color for a need bar based on its value
 * @param value The current value of the need (0-100, with higher values being better)
 * @returns The color code to use for the bar
 */
export function getNeedBarColor(value: number): string {
  // For hunger specifically, add more vibrant colors for increasing values
  if (value > 110) {
    return "#8C44FF"; // Purple for excellent hunger (overstuffed)
  } else if (value > 100) {
    return "#4285F4"; // Blue for very good hunger
  } else if (value >= 75) {
    return "#27AE60"; // Darker green for good hunger
  } else if (value >= 50) {
    return "#4CAF50"; // Green for ok hunger
  } else if (value >= 20) {
    return "#FFC107"; // Yellow for low hunger
  } else {
    return "#F44336"; // Red for critical hunger
  }
} 