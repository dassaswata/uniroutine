import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import './routines.css';

function Routines() {
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(false);
  
  const daysToFetch = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  const dayDisplayNames = {
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday'
  };
  
  const timeSlots = [
    { period: 1, time: '9:00 - 10:00' },
    { period: 2, time: '10:00 - 11:00' },
    { period: 3, time: '11:00 - 12:00' },
    { period: 4, time: '12:00 - 1:00', isLunch: true },
    { period: 5, time: '1:00 - 2:00' },
    { period: 6, time: '2:00 - 3:00' },
    { period: 7, time: '3:00 - 4:00' },
    { period: 8, time: '4:00 - 5:00' }
  ];

  const routineOptions = routines.map(routine => ({
    value: routine.id,
    label: routine.name || routine.id,
    data: routine
  }));

  const selectedOption = selectedRoutine 
    ? routineOptions.find(opt => opt.value === selectedRoutine.id) 
    : null;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'routines'),
      (snapshot) => {
        if (!snapshot.empty) {
          const routinesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRoutines(routinesList);
          
          if (routinesList.length > 0 && !selectedRoutine) {
            setSelectedRoutine(routinesList[0]);
          }
        } else {
          setRoutines([]);
        }
      },
      () => {}
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedRoutine) return;

    setLoading(true);
    const unsubscribers = [];

    daysToFetch.forEach(day => {
      const dayRef = collection(db, 'routines', selectedRoutine.id, day);
      
      const unsubscribe = onSnapshot(dayRef, (snapshot) => {
        if (!snapshot.empty) {
          const periods = [];
          snapshot.forEach(doc => {
            periods.push({
              id: doc.id,
              periodNumber: parseInt(doc.id),
              ...doc.data()
            });
          });
          
          periods.sort((a, b) => a.periodNumber - b.periodNumber);
          
          setScheduleData(prev => ({
            ...prev,
            [day]: periods
          }));
        }
        setLoading(false);
      }, () => {
        setLoading(false);
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
      setScheduleData({});
    };
  }, [selectedRoutine]);

  const getPeriodData = (day, periodNumber) => {
    const dayKey = day.toLowerCase().substring(0, 3);
    const daySchedule = scheduleData[dayKey];
    
    if (!daySchedule) return null;
    
    const period = daySchedule.find(p => p.periodNumber === periodNumber);
    
    if (!period) return null;
    
    return {
      subject: period.sname || period.subject || period.name || '',
      teacher: period.tname || period.teacher || period.faculty || '',
      code: period.scode || period.code || '',
      room: period.room || period.venue || ''
    };
  };

  const handleRoutineSelect = (option) => {
    if (option) {
      setSelectedRoutine(option.data);
    }
  };

  return (
    <div className="routines-container">
      <div className="routines-header">
        <h1>Class Routine</h1>
        <p>Weekly Schedule</p>
      </div>

      {routines.length > 0 && (
        <div className="routine-selector">
          <label>Select Class:</label>
          <Select
            value={selectedOption}
            onChange={handleRoutineSelect}
            options={routineOptions}
            className="routine-select"
            classNamePrefix="routine-select"
            placeholder="Choose a class..."
            isSearchable={true}
            isDisabled={loading}
            noOptionsMessage={() => "No classes found"}
          />
        </div>
      )}

      {loading && (
        <div className="loading-box">Loading schedule...</div>
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
                    <th 
                      key={idx} 
                      className={slot.isLunch ? 'lunch-header' : 'period-header'}
                    >
                      {slot.time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daysToFetch.map((day) => (
                  <tr key={day}>
                    <td className="day-cell">
                      <div className="day-name">{dayDisplayNames[day]}</div>
                    </td>
                    {timeSlots.map((slot, idx) => {
                      if (slot.isLunch) {
                        return (
                          <td key={idx} className="lunch-cell">
                            <div className="lunch-content">
                              <span className="lunch-text">Lunch Break</span>
                            </div>
                          </td>
                        );
                      }
                      
                      const periodData = getPeriodData(dayDisplayNames[day], slot.period);
                      
                      return (
                        <td key={idx} className="subject-cell">
                          {periodData && periodData.subject ? (
                            <div className="cell-content">
                              <div className="subject-name">{periodData.subject}</div>
                              {periodData.code && (
                                <div className="subject-code">{periodData.code}</div>
                              )}
                              {periodData.teacher && (
                                <div className="teacher-name">{periodData.teacher}</div>
                              )}
                              {periodData.room && (
                                <div className="room-name">{periodData.room}</div>
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
            <p>Schedule updates automatically when changes are made.</p>
          </div>
        </div>
      )}

      {!selectedRoutine && routines.length > 0 && !loading && (
        <div className="no-selection">
          <h3>Select a Class</h3>
          <p>Choose your class from the dropdown to view the routine</p>
        </div>
      )}
    </div>
  );
}

export default Routines;