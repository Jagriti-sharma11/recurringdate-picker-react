// src/App.test.js (or create a new file like src/RecurringDatePicker.test.js)

// Import necessary testing utilities from React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Import Jest DOM matchers for more readable assertions
import '@testing-library/jest-dom';

// Import the main App component
import App from './App';

// --- IMPORTANT NOTE FOR UNIT TESTING HELPER FUNCTIONS ---
// The helper functions (formatDate, parseDate, getNthDayOfWeekInMonth, calculateRecurringDates)
// are currently defined inside App.js and are not exported.
// For true unit testing, these functions should ideally be in a separate utility file (e.g., src/utils/dateHelpers.js)
// and then exported from there. This allows you to import and test them in isolation.
//
// For the purpose of this demonstration and to get you started quickly without modifying
// your main App.js file structure, I am re-defining/copying the helper functions here.
// In a real-world scenario, you would export them from their own module and import them.

/**
 * Formats a Date object to 'YYYY-MM-DD' string.
 * @param {Date} date
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a 'YYYY-MM-DD' string to a Date object.
 * @param {string} dateString
 * @returns {Date | null}
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Check if the parsed date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
};

/**
 * Calculates the Nth day of the week in a given month and year.
 * @param {number} year
 * @param {number} month (0-indexed)
 * @param {number} nth (e.g., 1 for first, 2 for second)
 * @param {number} dayOfWeek (0 for Sunday, 6 for Saturday)
 * @returns {Date | null}
 */
const getNthDayOfWeekInMonth = (year, month, nth, dayOfWeek) => {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const date = new Date(Date.UTC(year, month, day));
    if (date.getUTCMonth() !== month) break; // Moved to next month
    if (date.getUTCDay() === dayOfWeek) {
      count++;
      if (count === nth) {
        return date;
      }
    }
  }
  return null;
};

/**
 * Calculates recurring dates based on the provided options.
 * This is an exact copy of the function from App.js for consistent testing.
 * @param {object} options
 * @param {string} options.recurrenceType - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {Date} options.startDate - The start date.
 * @param {Date | null} options.endDate - The optional end date.
 * @param {number} options.interval - Every X days/weeks/months/years.
 * @param {number[]} options.selectedDaysOfWeek - Array of 0-6 for selected days (Sunday=0).
 * @param {object} options.monthlyPattern - { type: 'dayOfMonth', day: number } or { type: 'nthDayOfWeek', nth: number, dayOfWeek: number }
 * @returns {Date[]} Array of recurring dates.
 */
const calculateRecurringDates = (options) => {
  const { recurrenceType, startDate, endDate, interval, selectedDaysOfWeek, monthlyPattern } = options;
  console.log(`[calculateRecurringDates] Start: Type=${recurrenceType}, StartDate=${formatDate(startDate)}, EndDate=${formatDate(endDate)}, Interval=${interval}`);
  if (!startDate) {
    console.log('[calculateRecurringDates] No start date, returning empty array.');
    return [];
  }

  const finalDates = [];
  let current = new Date(startDate.getTime()); // Start from the selected start date

  // Limit to 500 dates to prevent infinite loops during testing
  const MAX_DATES = 500;

  if (recurrenceType === 'daily') {
    console.log('[calculateRecurringDates] Daily recurrence logic.');
    while ((!endDate || current <= endDate) && finalDates.length < MAX_DATES) {
      finalDates.push(new Date(current.getTime()));
      current.setUTCDate(current.getUTCDate() + interval);
    }
  } else if (recurrenceType === 'weekly') {
    console.log('[calculateRecurringDates] Weekly recurrence logic.');

    // If no days are selected for weekly recurrence, return empty
    if (selectedDaysOfWeek.length === 0) {
        console.log('[calculateRecurringDates] Weekly: No selected days, returning empty array.');
        return [];
    }

    // Generate dates for each selected day of the week independently
    for (const dayOfWeek of selectedDaysOfWeek) {
      let currentDaySeries = new Date(startDate.getTime());
      let safetyCounter = 0;
      const MAX_SEARCH_DAYS = 365 * 2; // Search up to 2 years for the first occurrence of this specific day of week

      // Find the first occurrence of 'dayOfWeek' on or after startDate
      let firstOccurrence = null;
      while (safetyCounter < MAX_SEARCH_DAYS) {
        if (currentDaySeries.getUTCDay() === dayOfWeek && currentDaySeries >= startDate) {
          firstOccurrence = new Date(currentDaySeries.getTime());
          break;
        }
        currentDaySeries.setUTCDate(currentDaySeries.getUTCDate() + 1);
        safetyCounter++;
      }

      if (firstOccurrence) {
        let dateToAdd = firstOccurrence;
        while ((!endDate || dateToAdd <= endDate) && finalDates.length < MAX_DATES) {
          finalDates.push(new Date(dateToAdd.getTime()));
          dateToAdd.setUTCDate(dateToAdd.getUTCDate() + (interval * 7)); // Advance by interval weeks
        }
      }
    }

  } else if (recurrenceType === 'monthly') {
    console.log('[calculateRecurringDates] Monthly recurrence logic.');
    while ((!endDate || current <= endDate) && finalDates.length < MAX_DATES) {
      let targetDate = null;
      if (monthlyPattern.type === 'dayOfMonth') {
        targetDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), monthlyPattern.day));
      } else if (monthlyPattern.type === 'nthDayOfWeek') {
        targetDate = getNthDayOfWeekInMonth(current.getUTCFullYear(), current.getUTCMonth(), monthlyPattern.nth, monthlyPattern.dayOfWeek);
      }

      if (targetDate && targetDate >= startDate && (!endDate || targetDate <= endDate) && targetDate.getUTCMonth() === current.getUTCMonth()) {
          finalDates.push(new Date(targetDate.getTime()));
      }
      current.setUTCMonth(current.getUTCMonth() + interval);
    }
  } else if (recurrenceType === 'yearly') {
    console.log('[calculateRecurringDates] Yearly recurrence logic.');
    while ((!endDate || current <= endDate) && finalDates.length < MAX_DATES) {
      const targetDate = new Date(Date.UTC(current.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
      if (targetDate >= startDate && (!endDate || targetDate <= endDate)) {
        finalDates.push(new Date(targetDate.getTime()));
      }
      current.setUTCFullYear(current.getUTCFullYear() + interval);
    }
  }

  // Ensure dates are unique and sorted, and within the range
  const uniqueDates = Array.from(new Set(finalDates.map(d => d.toISOString().split('T')[0])))
                            .map(d => parseDate(d))
                            .filter(d => d && d >= startDate && (!endDate || d <= endDate)) // Added d && to filter out nulls from parseDate
                            .sort((a, b) => a.getTime() - b.getTime());

  console.log(`[calculateRecurringDates] End: Generated ${uniqueDates.length} dates.`);
  return uniqueDates;
};


// --- Unit Tests for Helper Functions and Core Logic ---
describe('Date Helper Functions', () => {
  test('formatDate should format a Date object to YYYY-MM-DD string', () => {
    const date = new Date(Date.UTC(2025, 6, 19)); // July 19, 2025
    expect(formatDate(date)).toBe('2025-07-19');
    expect(formatDate(null)).toBe('');
  });

  test('parseDate should parse a YYYY-MM-DD string to a Date object (UTC)', () => {
    const dateString = '2025-07-19';
    const expectedDate = new Date(Date.UTC(2025, 6, 19));
    expect(parseDate(dateString)).toEqual(expectedDate);
    expect(parseDate('')).toBeNull();
    expect(parseDate('invalid')).toBeNull(); // Should return null for invalid date strings
  });

  test('getNthDayOfWeekInMonth should return the correct Nth day of the week in a month', () => {
    // Second Tuesday of July 2025 (July 8th)
    const secondTuesdayJuly = new Date(Date.UTC(2025, 6, 8));
    expect(getNthDayOfWeekInMonth(2025, 6, 2, 2)).toEqual(secondTuesdayJuly);

    // First Sunday of August 2025 (August 3rd)
    const firstSundayAugust = new Date(Date.UTC(2025, 7, 3));
    expect(getNthDayOfWeekInMonth(2025, 7, 1, 0)).toEqual(firstSundayAugust);

    // 5th Friday of February 2025 (does not exist, Feb 2025 has 4 Fridays)
    expect(getNthDayOfWeekInMonth(2025, 1, 5, 5)).toBeNull();
  });
});

describe('calculateRecurringDates', () => {
  // Mock Date.now() to ensure consistent test results for dates relative to "today"
  const MOCK_DATE = new Date(Date.UTC(2025, 6, 19)); // July 19, 2025 (Saturday)
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should calculate daily recurring dates correctly', () => {
    const options = {
      recurrenceType: 'daily',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-07-22'),
      interval: 1,
      selectedDaysOfWeek: [], monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    expect(dates).toEqual(['2025-07-19', '2025-07-20', '2025-07-21', '2025-07-22']);
  });

  test('should calculate daily recurring dates with interval > 1', () => {
    const options = {
      recurrenceType: 'daily',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-07-25'),
      interval: 2,
      selectedDaysOfWeek: [], monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    expect(dates).toEqual(['2025-07-19', '2025-07-21', '2025-07-23', '2025-07-25']);
  });

  test('should calculate weekly recurring dates on selected days', () => {
    // Start on a Saturday (July 19, 2025)
    const options = {
      recurrenceType: 'weekly',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-08-05'),
      interval: 1,
      selectedDaysOfWeek: [1, 3], // Monday (1), Wednesday (3)
      monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    // Expected dates: July 21 (Mon), July 23 (Wed), July 28 (Mon), July 30 (Wed), Aug 4 (Mon)
    expect(dates).toEqual(['2025-07-21', '2025-07-23', '2025-07-28', '2025-07-30', '2025-08-04']);
  });

  test('should calculate weekly recurring dates with interval > 1', () => {
    // Start on a Saturday (July 19, 2025)
    const options = {
      recurrenceType: 'weekly',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-08-31'),
      interval: 2, // Every 2 weeks
      selectedDaysOfWeek: [0, 6], // Sunday (0), Saturday (6)
      monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    // Corrected Expected dates based on the logic:
    // July 19 (Sat), July 20 (Sun)
    // Aug 2 (Sat), Aug 3 (Sun)
    // Aug 16 (Sat), Aug 17 (Sun)
    // Aug 30 (Sat), Aug 31 (Sun)
    expect(dates).toEqual(['2025-07-19', '2025-07-20', '2025-08-02', '2025-08-03', '2025-08-16', '2025-08-17', '2025-08-30', '2025-08-31']);
  });

  test('should return empty array for weekly if no days are selected', () => {
    const options = {
      recurrenceType: 'weekly',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-08-31'),
      interval: 1,
      selectedDaysOfWeek: [], // No days selected
      monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options);
    expect(dates).toEqual([]);
  });

  test('should calculate monthly recurring dates by day of month', () => {
    const options = {
      recurrenceType: 'monthly',
      startDate: parseDate('2025-01-15'),
      endDate: parseDate('2025-04-15'),
      interval: 1,
      selectedDaysOfWeek: [],
      monthlyPattern: { type: 'dayOfMonth', day: 15 }
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    expect(dates).toEqual(['2025-01-15', '2025-02-15', '2025-03-15', '2025-04-15']);
  });

  test('should calculate monthly recurring dates by Nth day of week', () => {
    // Second Tuesday of the month
    const options = {
      recurrenceType: 'monthly',
      startDate: parseDate('2025-01-01'), // Start date can be irrelevant for this pattern
      endDate: parseDate('2025-03-31'),
      interval: 1,
      selectedDaysOfWeek: [],
      monthlyPattern: { type: 'nthDayOfWeek', nth: 2, dayOfWeek: 2 } // 2nd Tuesday
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    // Jan 2025: 2nd Tuesday is Jan 14
    // Feb 2025: 2nd Tuesday is Feb 11
    // Mar 2025: 2nd Tuesday is Mar 11
    expect(dates).toEqual(['2025-01-14', '2025-02-11', '2025-03-11']);
  });

  test('should calculate yearly recurring dates', () => {
    const options = {
      recurrenceType: 'yearly',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2027-07-19'),
      interval: 1,
      selectedDaysOfWeek: [], monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    expect(dates).toEqual(['2025-07-19', '2026-07-19', '2027-07-19']);
  });

  test('should respect the end date', () => {
    const options = {
      recurrenceType: 'daily',
      startDate: parseDate('2025-07-19'),
      endDate: parseDate('2025-07-20'),
      interval: 1,
      selectedDaysOfWeek: [], monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options).map(formatDate);
    expect(dates).toEqual(['2025-07-19', '2025-07-20']);
  });

  test('should return empty array if no start date', () => {
    const options = {
      recurrenceType: 'daily',
      startDate: null,
      endDate: parseDate('2025-07-20'),
      interval: 1,
      selectedDaysOfWeek: [], monthlyPattern: {}
    };
    const dates = calculateRecurringDates(options);
    expect(dates).toEqual([]);
  });
});

// --- Integration Tests for React Component Interaction ---

describe('RecurringDatePicker Component Integration Tests', () => {
  // Mock Date.now() for consistent current date in tests
  const MOCK_DATE_APP = new Date(Date.UTC(2025, 6, 19)); // July 19, 2025 (Saturday)
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_DATE_APP);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render the component and display default options', () => {
    render(<App />);

    // Check for main title
    expect(screen.getByText(/recurring date picker/i)).toBeInTheDocument();

    // Check for default recurrence type (Daily)
    expect(screen.getByRole('button', { name: /daily/i })).toHaveClass('btn-primary');

    // Check for current date in Start Date input (July 19, 2025)
    expect(screen.getByLabelText(/start date:/i)).toHaveValue('2025-07-19');

    // Check if today's date is highlighted in the calendar
    expect(screen.getByText('19')).toHaveClass('bg-primary');
    expect(screen.getByText('19')).toHaveClass('border-success'); // Should also have start date border
  });

  test('should switch recurrence type and display relevant options', async () => {
    render(<App />);

    // Click on Weekly
    fireEvent.click(screen.getByRole('button', { name: /weekly/i }));

    // Assert that weekly options appear
    expect(screen.getByLabelText(/repeat on:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mon/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/day \d+ of the month/i)).not.toBeInTheDocument(); // Monthly option should not be visible

    // Click on Monthly
    fireEvent.click(screen.getByRole('button', { name: /monthly/i }));

    // Assert that monthly options appear
    expect(screen.getByLabelText(/day \d+ of the month/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/the \w+ \w+ of the month/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/repeat on:/i)).not.toBeInTheDocument(); // Weekly option should not be visible
  });

  test('should update generated dates and calendar when weekly days are selected', async () => {
    render(<App />);

    // Set recurrence to Weekly
    fireEvent.click(screen.getByRole('button', { name: /weekly/i }));

    // Click Monday (1) and Wednesday (3)
    fireEvent.click(screen.getByRole('button', { name: /mon/i }));
    fireEvent.click(screen.getByRole('button', { name: /wed/i }));

    // Verify calendar highlights
    await waitFor(() => {
      // Current date is July 19 (Sat). First Monday is July 21. First Wednesday is July 23.
      expect(screen.getByText('21')).toHaveClass('bg-primary');
      expect(screen.getByText('23')).toHaveClass('bg-primary');
      expect(screen.getByText('19')).not.toHaveClass('bg-primary'); // Original start date should no longer be highlighted as recurring
    });

    // Verify generated dates list
    expect(screen.getByText('2025-07-21')).toBeInTheDocument();
    expect(screen.getByText('2025-07-23')).toBeInTheDocument();
    expect(screen.queryByText('2025-07-19')).not.toBeInTheDocument();
  });

  test('should update generated dates and calendar when start date changes', async () => {
    render(<App />);

    const startDateInput = screen.getByLabelText(/start date:/i);

    // Change start date to August 1, 2025 (Friday)
    fireEvent.change(startDateInput, { target: { value: '2025-08-01' } });

    // Wait for the calendar to update and display August
    await waitFor(() => {
      expect(screen.getByText(/august 2025/i)).toBeInTheDocument();
      // Check if the new start date (Aug 1) is bordered and highlighted (as daily is default)
      expect(screen.getByText('1')).toHaveClass('border-success');
      expect(screen.getByText('1')).toHaveClass('bg-primary');
    });

    // Check if the generated dates list starts from the new date
    expect(screen.getByText('2025-08-01')).toBeInTheDocument();
    expect(screen.queryByText('2025-07-19')).not.toBeInTheDocument(); // Old start date should be gone
  });

  test('should navigate calendar months and retain highlights', async () => {
    render(<App />);

    // Default is July 2025, with 19th highlighted
    expect(screen.getByText(/july 2025/i)).toBeInTheDocument();
    expect(screen.getByText('19')).toHaveClass('bg-primary');

    // Click next month button
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));

    // Should now be August 2025
    await waitFor(() => {
      expect(screen.getByText(/august 2025/i)).toBeInTheDocument();
    });

    // Since default is daily, 19th of August should also be highlighted
    expect(screen.getByText('19')).toHaveClass('bg-primary'); // 19th of Aug
    expect(screen.getByText('19')).toHaveClass('border-success'); // Still the start date (if not changed)

    // Click previous month button
    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));

    // Should be back to July 2025
    await waitFor(() => {
      expect(screen.getByText(/july 2025/i)).toBeInTheDocument();
    });
    expect(screen.getByText('19')).toHaveClass('bg-primary');
  });

  test('should handle monthly patterns correctly', async () => {
    render(<App />);

    // Change to Monthly recurrence
    fireEvent.click(screen.getByRole('button', { name: /monthly/i }));

    // Default monthly is "Day X of the month" (Day 19 for July 19 start)
    expect(screen.getByLabelText(/day 19 of the month/i)).toBeChecked();

    // Change start date to July 1, 2025
    const startDateInput = screen.getByLabelText(/start date:/i);
    fireEvent.change(startDateInput, { target: { value: '2025-07-01' } });

    // Now the default monthly should be "Day 1 of the month"
    await waitFor(() => {
      expect(screen.getByLabelText(/day 1 of the month/i)).toBeChecked();
      expect(screen.getByText('1')).toHaveClass('bg-primary'); // 1st of July highlighted
    });

    // Click on "The Nth Day of Week" option (e.g., The first Tuesday of the month for July 1)
    fireEvent.click(screen.getByLabelText(/the \w+ \w+ of the month/i));

    // For July 1, 2025 (Tuesday), "The first Tuesday" is July 1st.
    // So the 1st should still be highlighted.
    await waitFor(() => {
      expect(screen.getByText('1')).toHaveClass('bg-primary');
      expect(screen.getByText('1')).toHaveClass('border-success');
    });

    // Let's change start date to July 19 (Saturday) again, and check monthly pattern
    fireEvent.change(startDateInput, { target: { value: '2025-07-19' } }); // July 19 is a Saturday
    fireEvent.click(screen.getByRole('button', { name: /monthly/i })); // Re-select monthly to update pattern option

    // Now it should be "Day 19 of the month" by default
    await waitFor(() => {
      expect(screen.getByLabelText(/day 19 of the month/i)).toBeChecked();
      expect(screen.getByText('19')).toHaveClass('bg-primary');
    });

    // Click on "The Nth Day of Week" option. July 19 is the 3rd Saturday of July 2025.
    fireEvent.click(screen.getByLabelText(/the \w+ \w+ of the month/i));

    await waitFor(() => {
      // The 3rd Saturday of July 2025 is July 19th. So 19th should remain highlighted.
      expect(screen.getByText('19')).toHaveClass('bg-primary');
      expect(screen.getByText('19')).toHaveClass('border-success');
    });
  });

  test('should filter generated dates by end date', async () => {
    render(<App />);

    // Default daily recurrence from July 19, 2025
    expect(screen.getByText('2025-07-19')).toBeInTheDocument();
    expect(screen.getByText('2025-07-20')).toBeInTheDocument();

    const endDateInput = screen.getByLabelText(/end date \(optional\):/i);
    fireEvent.change(endDateInput, { target: { value: '2025-07-20' } });

    // Verify that dates after July 20 are no longer in the list or highlighted
    await waitFor(() => {
      expect(screen.getByText('2025-07-19')).toBeInTheDocument();
      expect(screen.getByText('2025-07-20')).toBeInTheDocument();
      expect(screen.queryByText('2025-07-21')).not.toBeInTheDocument(); // July 21 should be gone
      expect(screen.getByText('21')).not.toHaveClass('bg-primary'); // July 21 not highlighted in calendar
    });
  });
});
