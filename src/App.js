import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// --- Bootstrap CSS CDN ---
// Add this to your public/index.html <head> section for global Bootstrap styling:
// <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" xintegrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
// You might also want Bootstrap JS for some components, but for this, CSS is enough.
// <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" xintegrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>


// --- Context Definition ---
const RecurringDateContext = createContext();

// --- Helper Functions for Date Calculations ---

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
  // Using UTC to avoid timezone issues for date calculations
  return new Date(Date.UTC(year, month - 1, day));
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
  if (!startDate) return [];

  const dates = [];
  let currentDate = new Date(startDate.getTime()); // Start from the selected start date

  while ((!endDate || currentDate <= endDate) && dates.length < 500) { // Limit to 500 dates to prevent infinite loops
    let addDate = false;

    switch (recurrenceType) {
      case 'daily':
        addDate = true;
        break;
      case 'weekly':
        if (selectedDaysOfWeek.includes(currentDate.getUTCDay())) {
          addDate = true;
        }
        break;
      case 'monthly':
        if (monthlyPattern.type === 'dayOfMonth' && monthlyPattern.day === currentDate.getUTCDate()) {
          addDate = true;
        } else if (monthlyPattern.type === 'nthDayOfWeek') {
          const firstDayOfMonth = new Date(Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1));
          let count = 0;
          let tempDate = new Date(firstDayOfMonth.getTime());
          while (tempDate.getUTCMonth() === currentDate.getUTCMonth()) {
            if (tempDate.getUTCDay() === monthlyPattern.dayOfWeek) {
              count++;
            }
            if (count === monthlyPattern.nth && tempDate.getUTCDate() === currentDate.getUTCDate()) {
              addDate = true;
              break;
            }
            tempDate.setUTCDate(tempDate.getUTCDate() + 1);
          }
        }
        break;
      case 'yearly':
        if (currentDate.getUTCMonth() === startDate.getUTCMonth() && currentDate.getUTCDate() === startDate.getUTCDate()) {
          addDate = true;
        }
        break;
      default:
        break;
    }

    if (addDate) {
      dates.push(new Date(currentDate.getTime())); // Add a copy of the date
    }

    // Advance to the next date for checking
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Filter and adjust dates based on interval and actual recurrence logic
  const finalDates = [];
  // The original logic for `finalDates` after the first loop was a bit complex and might lead to
  // inconsistencies depending on how `currentDate` was advanced in the first loop vs. the second.
  // Let's simplify and ensure the interval logic is applied correctly from the start date.

  if (recurrenceType === 'daily') {
    let current = new Date(startDate.getTime());
    while ((!endDate || current <= endDate) && finalDates.length < 500) {
      finalDates.push(new Date(current.getTime()));
      current.setUTCDate(current.getUTCDate() + interval);
    }
  } else if (recurrenceType === 'weekly') {
    let current = new Date(startDate.getTime());
    // Find the first selected day on or after the start date
    let firstValidDateFound = false;
    while (!firstValidDateFound && current.getUTCFullYear() < startDate.getUTCFullYear() + 2) { // Limit search to avoid infinite loop
        if (selectedDaysOfWeek.includes(current.getUTCDay()) && current >= startDate) {
            firstValidDateFound = true;
            break;
        }
        current.setUTCDate(current.getUTCDate() + 1);
    }

    if (!firstValidDateFound) return []; // No valid start day found within a reasonable range

    // Now, generate dates based on interval and selected days
    while ((!endDate || current <= endDate) && finalDates.length < 500) {
        if (selectedDaysOfWeek.includes(current.getUTCDay())) {
            finalDates.push(new Date(current.getTime()));
        }
        current.setUTCDate(current.getUTCDate() + 1); // Move to the next day
        // If we've passed all selected days in the current week, advance by (interval - 1) weeks
        // This logic needs to be carefully managed to avoid over-advancing or missing days.
        // A simpler approach for weekly is to iterate day by day and check if it's a selected day.
        // Then, after a full week, jump by (interval - 1) weeks.
        // Let's refine this to be more precise for "Every X weeks on selected days".
    }

    // Re-implementing weekly recurrence more robustly:
    finalDates.length = 0; // Clear previous dates
    current = new Date(startDate.getTime());
    // Adjust current to the first selected day of the week on or after startDate
    while(current.getUTCDay() !== selectedDaysOfWeek[0] && current.getUTCFullYear() < startDate.getUTCFullYear() + 2) {
        current.setUTCDate(current.getUTCDate() + 1);
    }
    if(current.getUTCFullYear() >= startDate.getUTCFullYear() + 2) return []; // Safety break

    while ((!endDate || current <= endDate) && finalDates.length < 500) {
      for (const dayIndex of selectedDaysOfWeek) {
        let tempDate = new Date(current.getTime());
        // Adjust tempDate to the correct day of the week within the current week interval
        tempDate.setUTCDate(tempDate.getUTCDate() + (dayIndex - tempDate.getUTCDay() + 7) % 7);

        if (tempDate >= startDate && (!endDate || tempDate <= endDate)) {
          finalDates.push(new Date(tempDate.getTime()));
        }
      }
      current.setUTCDate(current.getUTCDate() + (interval * 7)); // Advance by interval weeks
    }
    // Sort and unique the dates as the above logic might add duplicates or out of order
    const uniqueDates = Array.from(new Set(finalDates.map(d => d.toISOString().split('T')[0])))
                            .map(d => parseDate(d))
                            .filter(d => d >= startDate && (!endDate || d <= endDate))
                            .sort((a, b) => a.getTime() - b.getTime());
    return uniqueDates;

  } else if (recurrenceType === 'monthly') {
    let current = new Date(startDate.getTime());
    while ((!endDate || current <= endDate) && finalDates.length < 500) {
      let targetDate = null;
      if (monthlyPattern.type === 'dayOfMonth') {
        targetDate = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), monthlyPattern.day));
      } else if (monthlyPattern.type === 'nthDayOfWeek') {
        targetDate = getNthDayOfWeekInMonth(current.getUTCFullYear(), current.getUTCMonth(), monthlyPattern.nth, monthlyPattern.dayOfWeek);
      }

      if (targetDate && targetDate >= startDate && (!endDate || targetDate <= endDate) && targetDate.getUTCMonth() === current.getUTCMonth()) {
          finalDates.push(new Date(targetDate.getTime()));
      }
      // Advance by interval months
      current.setUTCMonth(current.getUTCMonth() + interval);
    }
    // Filter out dates before startDate and after endDate, and remove duplicates
    const uniqueDates = Array.from(new Set(finalDates.map(d => d.toISOString().split('T')[0])))
                            .map(d => parseDate(d))
                            .filter(d => d >= startDate && (!endDate || d <= endDate))
                            .sort((a, b) => a.getTime() - b.getTime());
    return uniqueDates;

  } else if (recurrenceType === 'yearly') {
    let current = new Date(startDate.getTime());
    while ((!endDate || current <= endDate) && finalDates.length < 500) {
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
                            .filter(d => d >= startDate && (!endDate || d <= endDate))
                            .sort((a, b) => a.getTime() - b.getTime());

  return uniqueDates;
};


// --- Provider Component ---
const RecurringDateProvider = ({ children }) => {
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [startDate, setStartDate] = useState(parseDate(formatDate(new Date()))); // Default to today
  const [endDate, setEndDate] = useState(null);
  const [interval, setInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([]); // [0, 1, ..., 6] for Sun-Sat
  const [monthlyPattern, setMonthlyPattern] = useState({ type: 'dayOfMonth', day: 1 }); // dayOfMonth or nthDayOfWeek
  const [generatedDates, setGeneratedDates] = useState([]);

  // Effect to update generated dates whenever options change
  useEffect(() => {
    const options = {
      recurrenceType,
      startDate,
      endDate,
      interval,
      selectedDaysOfWeek,
      monthlyPattern,
    };
    const calculatedDates = calculateRecurringDates(options);
    setGeneratedDates(calculatedDates);
  }, [recurrenceType, startDate, endDate, interval, selectedDaysOfWeek, monthlyPattern]);

  const contextValue = useMemo(() => ({
    recurrenceType, setRecurrenceType,
    startDate, setStartDate,
    endDate, setEndDate,
    interval, setInterval,
    selectedDaysOfWeek, setSelectedDaysOfWeek,
    monthlyPattern, setMonthlyPattern,
    generatedDates,
  }), [recurrenceType, startDate, endDate, interval, selectedDaysOfWeek, monthlyPattern, generatedDates]);

  return (
    <RecurringDateContext.Provider value={contextValue}>
      {children}
    </RecurringDateContext.Provider>
  );
};

// --- Sub-Components ---

const RecurrenceOptions = () => {
  const { recurrenceType, setRecurrenceType } = useContext(RecurringDateContext);

  const options = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  return (
    <div className="d-flex justify-content-start mb-4 p-2 bg-light rounded">
      {options.map((option) => (
        <button
          key={option.value}
          className={`btn me-2 ${
            recurrenceType === option.value
              ? 'btn-primary'
              : 'btn-outline-primary'
          }`}
          onClick={() => setRecurrenceType(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

const IntervalInput = ({ unit }) => {
  const { interval, setInterval } = useContext(RecurringDateContext);
  return (
    <div className="d-flex align-items-center mb-3">
      <label htmlFor="interval-input" className="form-label me-2">Every</label>
      <input
        type="number"
        id="interval-input"
        min="1"
        value={interval}
        onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
        className="form-control w-auto me-2"
        style={{ maxWidth: '80px' }}
      />
      <span className="text-muted">{unit}(s)</span>
    </div>
  );
};

const DailyOptions = () => {
  return <IntervalInput unit="day" />;
};

const WeeklyOptions = () => {
  const { selectedDaysOfWeek, setSelectedDaysOfWeek } = useContext(RecurringDateContext);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayToggle = (dayIndex) => {
    setSelectedDaysOfWeek((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  return (
    <div className="mb-4">
      <IntervalInput unit="week" />
      <div>
        <label className="form-label d-block mb-2">Repeat on:</label>
        <div className="d-flex flex-wrap gap-2">
          {days.map((day, index) => (
            <button
              key={index}
              className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center
                ${selectedDaysOfWeek.includes(index) ? 'btn-primary' : 'btn-outline-secondary'}`
              }
              style={{ width: '40px', height: '40px' }}
              onClick={() => handleDayToggle(index)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MonthlyOptions = () => {
  const { monthlyPattern, setMonthlyPattern, startDate } = useContext(RecurringDateContext);
  const currentDayOfMonth = startDate ? startDate.getUTCDate() : 1;
  const currentDayOfWeek = startDate ? startDate.getUTCDay() : 0; // 0 for Sunday

  const daysOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Calculate the Nth occurrence of the start date's day of week in its month
  const getNthOccurrence = useCallback((date) => {
    if (!date) return { nth: 1, dayOfWeek: 0 };
    const day = date.getUTCDate();
    const dayOfWeek = date.getUTCDay();
    const month = date.getUTCMonth();
    const year = date.getUTCFullYear();

    let count = 0;
    for (let i = 1; i <= day; i++) {
      const d = new Date(Date.UTC(year, month, i));
      if (d.getUTCDay() === dayOfWeek) {
        count++;
      }
    }
    return { nth: count, dayOfWeek: dayOfWeek };
  }, []);

  const { nth, dayOfWeek } = useMemo(() => getNthOccurrence(startDate), [startDate, getNthOccurrence]);

  return (
    <div className="mb-4">
      <IntervalInput unit="month" />
      <div className="form-check mb-2">
        <input
          type="radio"
          id="monthly-day-of-month"
          name="monthly-pattern"
          value="dayOfMonth"
          checked={monthlyPattern.type === 'dayOfMonth'}
          onChange={() => setMonthlyPattern({ type: 'dayOfMonth', day: currentDayOfMonth })}
          className="form-check-input"
        />
        <label htmlFor="monthly-day-of-month" className="form-check-label">
          Day {currentDayOfMonth} of the month
        </label>
      </div>
      <div className="form-check">
        <input
          type="radio"
          id="monthly-nth-day-of-week"
          name="monthly-pattern"
          value="nthDayOfWeek"
          checked={monthlyPattern.type === 'nthDayOfWeek'}
          onChange={() => setMonthlyPattern({ type: 'nthDayOfWeek', nth: nth, dayOfWeek: dayOfWeek })}
          className="form-check-input"
        />
        <label htmlFor="monthly-nth-day-of-week" className="form-check-label">
          The {nth === 1 ? 'first' : nth === 2 ? 'second' : nth === 3 ? 'third' : nth === 4 ? 'fourth' : 'last'} {daysOfWeekNames[dayOfWeek]} of the month
        </label>
      </div>
    </div>
  );
};

const YearlyOptions = () => {
  const { startDate } = useContext(RecurringDateContext);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = startDate ? monthNames[startDate.getUTCMonth()] : '';
  const displayDay = startDate ? startDate.getUTCDate() : '';

  return (
    <div className="mb-4">
      <IntervalInput unit="year" />
      <p className="text-muted">
        Repeats every year on {displayMonth} {displayDay}.
      </p>
    </div>
  );
};

const DateRangePicker = () => {
  const { startDate, setStartDate, endDate, setEndDate } = useContext(RecurringDateContext);

  return (
    <div className="row mb-4">
      <div className="col-md-6 mb-3 mb-md-0">
        <label htmlFor="start-date" className="form-label">Start Date:</label>
        <input
          type="date"
          id="start-date"
          value={formatDate(startDate)}
          onChange={(e) => setStartDate(parseDate(e.target.value))}
          className="form-control"
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="end-date" className="form-label">End Date (Optional):</label>
        <input
          type="date"
          id="end-date"
          value={formatDate(endDate)}
          onChange={(e) => setEndDate(parseDate(e.target.value))}
          className="form-control"
        />
      </div>
    </div>
  );
};

const CalendarPreview = () => {
  const { startDate, generatedDates } = useContext(RecurringDateContext);

  const [currentMonth, setCurrentMonth] = useState(startDate ? startDate.getUTCMonth() : new Date().getUTCMonth());
  const [currentYear, setCurrentYear] = useState(startDate ? startDate.getUTCFullYear() : new Date().getUTCFullYear());

  useEffect(() => {
    if (startDate) {
      setCurrentMonth(startDate.getUTCMonth());
      setCurrentYear(startDate.getUTCFullYear());
    }
  }, [startDate]);

  const daysInMonth = (year, month) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const firstDayOfMonth = (year, month) => new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0-6, Sun-Sat

  const renderCalendarDays = () => {
    const totalDays = daysInMonth(currentYear, currentMonth);
    const startDay = firstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Fill leading empty days
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="col border-0"></div>);
    }

    // Fill days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(Date.UTC(currentYear, currentMonth, day));
      const isHighlighted = generatedDates.some(
        (d) => d.getUTCFullYear() === date.getUTCFullYear() &&
               d.getUTCMonth() === date.getUTCMonth() &&
               d.getUTCDate() === date.getUTCDate()
      );
      const isStartDate = startDate &&
                          startDate.getUTCFullYear() === date.getUTCFullYear() &&
                          startDate.getUTCMonth() === date.getUTCMonth() &&
                          startDate.getUTCDate() === date.getUTCDate();

      days.push(
        <div
          key={`${currentYear}-${currentMonth}-${day}`}
          className={`col d-flex align-items-center justify-content-center rounded-lg fw-semibold
            ${isHighlighted ? 'bg-primary text-white shadow' : 'text-dark'}
            ${isStartDate ? 'border border-success border-2' : ''}
            ${!isHighlighted && !isStartDate ? 'bg-light' : ''}
          `}
          style={{ height: '40px' }}
        >
          {day}
        </div>
      );
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear(currentYear - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear(currentYear + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  return (
    <div className="card p-4 mb-4">
      <h3 className="card-title h5 text-dark mb-3">Calendar Preview</h3>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button onClick={handlePrevMonth} className="btn btn-light rounded-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-left" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
        </button>
        <span className="h4 fw-bold text-dark">
          {monthNames[currentMonth]} {currentYear}
        </span>
        <button onClick={handleNextMonth} className="btn btn-light rounded-circle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-right" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>
      <div className="row row-cols-7 g-1 text-center text-muted fw-semibold mb-2">
        {dayNamesShort.map((day, index) => (
          <div key={index} className="col">
            {day}
          </div>
        ))}
      </div>
      <div className="row row-cols-7 g-1">
        {renderCalendarDays()}
      </div>
      <div className="mt-4 small text-muted">
        <p><span className="badge bg-primary me-2"></span>Highlighted dates are recurring dates.</p>
        <p><span className="badge bg-success border border-success border-2 me-2" style={{ width: '1rem', height: '1rem' }}></span>Bordered date is the start date.</p>
      </div>
    </div>
  );
};

// --- Main Component ---
const RecurringDatePicker = () => {
  const { recurrenceType, generatedDates } = useContext(RecurringDateContext);

  const renderRecurrenceOptions = () => {
    switch (recurrenceType) {
      case 'daily':
        return <DailyOptions />;
      case 'weekly':
        return <WeeklyOptions />;
      case 'monthly':
        return <MonthlyOptions />;
      case 'yearly':
        return <YearlyOptions />;
      default:
        return null;
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-lg p-4 mx-auto" style={{ maxWidth: '600px' }}>
        <h2 className="card-title text-center mb-4">Recurring Date Picker</h2>

        <DateRangePicker />

        <div className="mb-4">
          <label className="form-label d-block mb-2">Recurrence Pattern:</label>
          <RecurrenceOptions />
          <div className="card card-body bg-light border-0">
            {renderRecurrenceOptions()}
          </div>
        </div>

        <CalendarPreview />

        <div className="card bg-info bg-opacity-10 border border-info mt-4">
          <div className="card-body">
            <h3 className="card-title h5 text-info mb-2">Selected Recurring Dates:</h3>
            <ul className="list-unstyled text-info small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
              {generatedDates.length > 0 ? (
                generatedDates.map((date, index) => (
                  <li key={index}>{formatDate(date)}</li>
                ))
              ) : (
                <li>No dates generated. Please select a start date and recurrence pattern.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Component (Root) ---
export default function App() {
  return (
    <RecurringDateProvider>
      <div className="bg-light min-vh-100 d-flex align-items-center justify-content-center">
        <RecurringDatePicker />
      </div>
    </RecurringDateProvider>
  );
}
