import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import './home.css';

function Routines() {
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(false);

  /* =========================
     OFFLINE DETECTION
     ========================= */
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  /* =========================
     CONSTANTS
     ========================= */
  const daysToFetch = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const dayDisplayNames = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
  };

  const timeSlots = [
    { period: 1, time: '9:00 - 10:00' },
    { period: 2, time: '10:00 - 11:00' },
    { period: 3, time: '11:00 - 12:00' },
    { period: 4, time: '12:00 - 1:00', isLunch: true },
    { period: 5, time: '1:00 - 2:00' },
    { period: 6, time: '2:00 - 3:00' },
    { period: 7, time: '3:00 - 4:00' },
    { period: 8, time: '4:00 - 5:00' },
  ];

  /* =========================
     ROUTINE OPTIONS
     ========================= */
  const routineOptions = routines.map((routine) => ({
    value: routine.id,
    label: routine.name || routine.id,
    data: routine,
  }));

  const selectedOption = selectedRoutine
    ? routineOptions.find((opt) => opt.value === selectedRoutine.id)
    : null;

  /* =========================
     FETCH ROUTINES (NO AUTO-SELECT)
     ========================= */
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'routines'),
      (snapshot) => {
        const routinesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRoutines(routinesList);

        // Preserve selection ONLY if it still exists
        setSelectedRoutine((prevSelected) => {
          if (!prevSelected) return null;

          const stillExists = routinesList.find(
            (r) => r.id === prevSelected.id
          );

          return stillExists || null;
        });
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================
     FETCH SCHEDULE
     ========================= */
  useEffect(() => {
    if (!selectedRoutine) return;

    setLoading(true);
    const unsubscribers = [];

    daysToFetch.forEach((day) => {
      const dayRef = collection(db, 'routines', selectedRoutine.id, day);

      const unsubscribe = onSnapshot(
        dayRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const periods = [];
            snapshot.forEach((doc) => {
              periods.push({
                id: doc.id,
                periodNumber: parseInt(doc.id, 10),
                ...doc.data(),
              });
            });

            periods.sort((a, b) => a.periodNumber - b.periodNumber);

            setScheduleData((prev) => ({
              ...prev,
              [day]: periods,
            }));
          }
          setLoading(false);
        },
        () => setLoading(false)
      );

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      setScheduleData({});
    };
  }, [selectedRoutine]);

  /* =========================
     HELPERS
     ========================= */
  const getPeriodData = (day, periodNumber) => {
    const dayKey = day.toLowerCase().substring(0, 3);
    const daySchedule = scheduleData[dayKey];
    if (!daySchedule) return null;

    const period = daySchedule.find(
      (p) => p.periodNumber === periodNumber
    );
    if (!period) return null;

    return {
      subject: period.sname || '',
      teacher: period.tname || '',
      code: period.scode || '',
      room: period.room || '',
    };
  };

  const handleRoutineSelect = (option) => {
    setSelectedRoutine(option ? option.data : null);
  };

  /* =========================
     RENDER
     ========================= */
  return (
    <>
      {isOffline && (
        <div className="offline-overlay">
          <div className="offline-dialog">
            <div className="offline-icon">🚫</div>
            <h2>You’re offline</h2>
            <p>Please check your network connection</p>
          </div>
        </div>
      )}

      <div className="routines-container">
        <div className="routines-header">
          <h1>Uniroutine</h1>
          <p>The universal routine manager</p>
        </div>

        <div className="routine-selector">
          <label>Select Class:</label>
          <Select
            value={selectedOption}
            onChange={handleRoutineSelect}
            options={routineOptions}
            className="routine-select"
            classNamePrefix="routine-select"
            placeholder="Select your class"
            isSearchable
            isClearable
            isDisabled={loading}
          />
        </div>

        {loading && (
          <div className="loading-box">
            <div className="throbber-ring" />
            <div className="loading-text">Loading schedule…</div>
          </div>
        )}

        {!selectedRoutine && !loading && (
          <div className="table-container">
            <div className="no-selection">
              <h3>Select your class first</h3>
              <p>
                To view your class schedule, please select it from the dropdown
                menu above.
              </p>
            </div>
          </div>
        )}

        {selectedRoutine && !loading && (
          <div className="table-container">
            <h2 className="table-title">
              {selectedRoutine.name || selectedRoutine.id}
            </h2>

            <div className="table-wrapper">
              <table className="routine-table">
                <thead>
                  <tr>
                    <th className="day-column">Day / Time</th>
                    {timeSlots.map((slot, idx) => (
                      <th key={idx} className={slot.isLunch ? 'lunch-header' : ''}>
                        {slot.time}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysToFetch.map((day) => (
                    <tr key={day}>
                      <td className="day-cell">
                        {dayDisplayNames[day]}
                      </td>

                      {timeSlots.map((slot, idx) => {
                        if (slot.isLunch) {
                          return (
                            <td key={idx} className="lunch-cell">
                              <span className="lunch-text">Lunch Break</span>
                            </td>
                          );
                        }

                        const periodData = getPeriodData(
                          dayDisplayNames[day],
                          slot.period
                        );

                        return (
                          <td key={idx} className="subject-cell">
                            {periodData ? (
                              <div className="cell-content">
                                <div className="subject-name">
                                  {periodData.subject}
                                </div>
                                {periodData.code && (
                                  <div className="subject-code">
                                    {periodData.code}
                                  </div>
                                )}
                                {periodData.teacher && (
                                  <div className="teacher-name">
                                    {periodData.teacher}
                                  </div>
                                )}
                                {periodData.room && (
                                  <div className="room-name">
                                    {periodData.room}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="cell-empty">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="info-footer">
              <p>Please contact your HOD in case of any discrepancy</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Routines;
