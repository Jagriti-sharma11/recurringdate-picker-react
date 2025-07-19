import React, { useState, createContext, useContext, useEffect } from 'react';
// import 'bootstrap/dist/css/bootstrap.min.css'; // REMOVED: Bootstrap CSS is loaded via CDN in public/index.html
import './App.css'; // Import custom CSS for calendar styling

// --- Helper Functions (copied from App.test.js for consistency) ---
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
    if (date.getUTCMonth() !== month) break;
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

  const finalDates = [];
  let current = new Date(startDate.getTime());
  const MAX_DATES = 500; // Safety limit

  if (recurrenceType === 'daily') {
    while ((!endDate || current <= endDate) && finalDates.length < MAX_DATES) {
      finalDates.push(new Date(current.getTime()));
      current.setUTCDate(current.getUTCDate() + interval);
    }
  } else if (recurrenceType === 'weekly') {
    if (selectedDaysOfWeek.length === 0) {
      return [];
    }

    for (const dayOfWeek of selectedDaysOfWeek) {
      let currentDaySeries = new Date(startDate.getTime());
      let safetyCounter = 0;
      const MAX_SEARCH_DAYS = 365 * 2;

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
          dateToAdd.setUTCDate(dateToAdd.getUTCDate() + (interval * 7));
        }
      }
    }
  } else if (recurrenceType === 'monthly') {
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
    while ((!endDate || current <= endDate) && finalDates.length < MAX_DATES) {
      const targetDate = new Date(Date.UTC(current.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
      if (targetDate >= startDate && (!endDate || targetDate <= endDate)) {
        finalDates.push(new Date(targetDate.getTime()));
      }
      current.setUTCFullYear(current.getUTCFullYear() + interval);
    }
  }

  const uniqueDates = Array.from(new Set(finalDates.map(d => d.toISOString().split('T')[0])))
                            .map(d => parseDate(d))
                            .filter(d => d && d >= startDate && (!endDate || d <= endDate))
                            .sort((a, b) => a.getTime() - b.getTime());

  return uniqueDates;
};

// --- Context API for State Management ---
const RecurringDateContext = createContext();

const RecurringDateProvider = ({ children }) => {
  const today = new Date();
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(null);
  const [interval, setInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState([]); // For weekly
  const [monthlyPattern, setMonthlyPattern] = useState({ type: 'dayOfMonth', day: today.getUTCDate() }); // For monthly

  // State for generated dates
  const [generatedDates, setGeneratedDates] = useState([]);

  // Effect to recalculate dates whenever options change
  useEffect(() => {
    const dates = calculateRecurringDates({
      recurrenceType,
      startDate,
      endDate,
      interval,
      selectedDaysOfWeek,
      monthlyPattern,
    });
    setGeneratedDates(dates);
  }, [recurrenceType, startDate, endDate, interval, selectedDaysOfWeek, monthlyPattern]);

  // Effect to update monthly pattern day when start date changes
  useEffect(() => {
    if (startDate && monthlyPattern.type === 'dayOfMonth') {
      setMonthlyPattern(prev => ({ ...prev, day: startDate.getUTCDate() }));
    }
  }, [startDate, monthlyPattern.type]);


  const value = {
    recurrenceType, setRecurrenceType,
    startDate, setStartDate,
    endDate, setEndDate,
    interval, setInterval,
    selectedDaysOfWeek, setSelectedDaysOfWeek,
    monthlyPattern, setMonthlyPattern,
    generatedDates,
  };

  return (
    <RecurringDateContext.Provider value={value}>
      {children}
    </RecurringDateContext.Provider>
  );
};

// --- Child Components ---

const RecurrenceOptions = () => {
  const { recurrenceType, setRecurrenceType, interval, setInterval, selectedDaysOfWeek, setSelectedDaysOfWeek, monthlyPattern, setMonthlyPattern, startDate } = useContext(RecurringDateContext);

  const handleDayToggle = (dayIndex) => {
    setSelectedDaysOfWeek(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="mb-4 p-3 border rounded">
      <h5 className="mb-3">Recurrence Type</h5>
      <div className="btn-group w-100 mb-3" role="group">
        {['daily', 'weekly', 'monthly', 'yearly'].map(type => (
          <button
            key={type}
            type="button"
            className={`btn ${recurrenceType === type ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setRecurrenceType(type)}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="mb-3">
        <label htmlFor="intervalInput" className="form-label">
          Every {interval} {recurrenceType}
          {interval > 1 && 's'}
        </label>
        <input
          type="number"
          id="intervalInput"
          className="form-control"
          value={interval}
          onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
        />
      </div>

      {recurrenceType === 'weekly' && (
        <div className="mb-3">
          <label className="form-label">Repeat on:</label>
          <div className="d-flex justify-content-between">
            {dayNames.map((day, index) => (
              <button
                key={index}
                type="button"
                className={`btn btn-sm ${selectedDaysOfWeek.includes(index) ? 'btn-info text-white' : 'btn-outline-info'}`}
                onClick={() => handleDayToggle(index)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {recurrenceType === 'monthly' && (
        <div className="mb-3">
          <label className="form-label">Monthly Pattern:</label>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="monthlyPattern"
              id="dayOfMonth"
              value="dayOfMonth"
              checked={monthlyPattern.type === 'dayOfMonth'}
              onChange={() => setMonthlyPattern({ type: 'dayOfMonth', day: startDate ? startDate.getUTCDate() : 1 })}
            />
            <label className="form-check-label" htmlFor="dayOfMonth">
              Day {startDate ? startDate.getUTCDate() : '--'} of the month
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="monthlyPattern"
              id="nthDayOfWeek"
              value="nthDayOfWeek"
              checked={monthlyPattern.type === 'nthDayOfWeek'}
              onChange={() => setMonthlyPattern({ type: 'nthDayOfWeek', nth: 1, dayOfWeek: 0 })} // Default to 1st Sunday
            />
            <label className="form-check-label" htmlFor="nthDayOfWeek">
              The
              <select
                className="form-select-sm mx-1"
                value={monthlyPattern.nth || 1}
                onChange={(e) => setMonthlyPattern(prev => ({ ...prev, nth: parseInt(e.target.value) }))}
                disabled={monthlyPattern.type !== 'nthDayOfWeek'}
              >
                {[1, 2, 3, 4, 5].map(num => (
                  <option key={num} value={num}>
                    {num === 1 ? 'first' : num === 2 ? 'second' : num === 3 ? 'third' : num === 4 ? 'fourth' : 'last'}
                  </option>
                ))}
              </select>
              <select
                className="form-select-sm mx-1"
                value={monthlyPattern.dayOfWeek || 0}
                onChange={(e) => setMonthlyPattern(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                disabled={monthlyPattern.type !== 'nthDayOfWeek'}
              >
                {dayNames.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
              of the month
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

const DateRangePicker = () => {
  const { startDate, setStartDate, endDate, setEndDate } = useContext(RecurringDateContext);

  return (
    <div className="mb-4 p-3 border rounded">
      <h5 className="mb-3">Date Range</h5>
      <div className="mb-3">
        <label htmlFor="startDate" className="form-label">Start Date:</label>
        <input
          type="date"
          id="startDate"
          className="form-control"
          value={formatDate(startDate)}
          onChange={(e) => setStartDate(parseDate(e.target.value))}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="endDate" className="form-label">End Date (Optional):</label>
        <input
          type="date"
          id="endDate"
          className="form-control"
          value={endDate ? formatDate(endDate) : ''}
          onChange={(e) => setEndDate(parseDate(e.target.value))}
        />
      </div>
    </div>
  );
};

const CalendarPreview = () => {
  const { startDate, generatedDates } = useContext(RecurringDateContext);
  const [currentMonth, setCurrentMonth] = useState(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)));

  useEffect(() => {
    if (startDate) {
      setCurrentMonth(new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), 1)));
    }
  }, [startDate]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev.getTime());
      newMonth.setUTCMonth(newMonth.getUTCMonth() - 1);
      return newMonth;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev.getTime());
      newMonth.setUTCMonth(newMonth.getUTCMonth() + 1);
      return newMonth;
    });
  };

  const firstDayOfMonth = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
  const daysInMonth = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)).getUTCDate();
  const startDayOfWeek = firstDayOfMonth.getUTCDay(); // 0 for Sunday, 6 for Saturday

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = [];
  // Add empty cells for days before the 1st of the month
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="col-calendar-day"></div>);
  }

  // Add actual date cells
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    const isRecurring = generatedDates.some(d => d.getUTCFullYear() === date.getUTCFullYear() && d.getUTCMonth() === date.getUTCMonth() && d.getUTCDate() === date.getUTCDate());
    const isStartDate = startDate && date.getUTCFullYear() === startDate.getUTCFullYear() && date.getUTCMonth() === startDate.getUTCMonth() && date.getUTCDate() === startDate.getUTCDate();

    let cellClasses = "col-calendar-day rounded-md";
    if (isRecurring) {
      cellClasses += " bg-primary text-white";
    }
    if (isStartDate) {
      cellClasses += " border-2 border-success";
    }

    calendarDays.push(
      <div key={day} className={cellClasses}>
        {day}
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 border rounded">
      <h5 className="mb-3">Calendar Preview</h5>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button className="btn btn-sm btn-outline-secondary" onClick={goToPreviousMonth}>
          &lt;
        </button>
        <h6 className="mb-0">{monthName}</h6>
        <button className="btn btn-sm btn-outline-secondary" onClick={goToNextMonth}>
          &gt;
        </button>
      </div>
      <div className="calendar-grid row row-cols-7 g-0">
        {/* Day headers */}
        {dayNames.map(day => (
          <div key={day} className="col-calendar-day fw-bold text-center py-2">
            {day}
          </div>
        ))}
        {/* Dates */}
        {calendarDays}
      </div>
      <small className="d-block mt-3">Highlighted dates are recurring dates.</small>
      <small className="d-block">Bordered date is the start date.</small>
    </div>
  );
};

const GeneratedDatesList = () => {
  const { generatedDates } = useContext(RecurringDateContext);

  return (
    <div className="mb-4 p-3 border rounded">
      <h5 className="mb-3">Selected Recurring Dates</h5>
      {generatedDates.length > 0 ? (
        <ul className="list-group">
          {generatedDates.map((date, index) => (
            <li key={index} className="list-group-item">
              {formatDate(date)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No recurring dates generated yet. Please select options above.</p>
      )}
    </div>
  );
};

// --- Main App Component ---
function App() {
  return (
    <RecurringDateProvider>
      <div className="App container mt-5">
        <h1 className="text-center mb-4">Recurring Date Picker</h1>
        <div className="row">
          <div className="col-md-6">
            <RecurrenceOptions />
            <DateRangePicker />
          </div>
          <div className="col-md-6">
            <CalendarPreview />
            <GeneratedDatesList />
          </div>
        </div>
      </div>
    </RecurringDateProvider>
  );
}

export default App;
