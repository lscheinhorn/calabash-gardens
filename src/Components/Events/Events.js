import './Events.css'
import '../Shop/Shop.css';  // Make sure your paths are correct
import { events, experienceBlurb } from '../../resources/events';
import Event from '../Event/Event';
import { useState } from 'react';

export default function Events() {
    const [eventIdx, setEventIdx] = useState(events.length - 3);

    const handlePrevious = () => {
        if (eventIdx > 0) {
            setEventIdx(eventIdx - 1);
        }
    };

    const handleNext = () => {
        if (eventIdx < events.length - 1) {
            setEventIdx(eventIdx + 1);
        }
    };

    return (
        <div className="productPage_container">
            <div id="events">
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
                <Event event={events[eventIdx]} />
            </div>
        </div>
    );
}