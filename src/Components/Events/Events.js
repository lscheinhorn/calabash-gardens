import './Events.css'
import '../Shop/Shop.css';  // Make sure your paths are correct
import { events, experienceBlurb } from '../../resources/events';
import Event from '../Event/Event';
import { useState, useEffect, useMemo } from 'react';

export default function Events() {
    const activeEvents = useMemo(() => events.filter(event => event.isActive), [])
    const [eventIdx, setEventIdx] = useState(activeEvents.length - 1);

    useEffect(() => {
        const today = new Date()
        const nextEventIdx = activeEvents.findIndex( event => event.date > today )
        if( nextEventIdx !== -1 ) {
            setEventIdx( nextEventIdx )
        } else (
            setEventIdx( activeEvents.length - 1 )
        )
    }, [activeEvents])

    const handlePrevious = () => {
        if (eventIdx > 0) {
            setEventIdx(eventIdx - 1);
        }
    };

    const handleNext = () => {
        if (eventIdx < activeEvents.length - 1) {
            setEventIdx(eventIdx + 1);
        }
    };

    return (
        <div className="productPage_container">
            <div className="events">
                <h1 style={{ textAlign: 'center' }}>The Calabash Experience</h1>
                {experienceBlurb.map((p, index) => (
                    <p 
                        key={index}
                        style={{ textIndent: '2em' }}
                    >
                        {p}
                    </p>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                    <button className="btn btn-outline-primary" onClick={handlePrevious}>Previous Experience</button>
                    <button className="btn btn-outline-primary" onClick={handleNext}>Next Experience</button>

                </div>
                { activeEvents.length ? <Event event={activeEvents[eventIdx]} /> : null }
            </div>
        </div>
    );
}
