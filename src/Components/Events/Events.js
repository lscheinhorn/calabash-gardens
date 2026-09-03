import './Events.css'
import '../Shop/Shop.css';  // Make sure your paths are correct
import { getActiveEvents, experienceBlurb } from '../../data/siteData';
import Event from '../Event/Event';
import SiteContentBlocks from '../SiteContentBlocks/SiteContentBlocks';
import { useState, useEffect, useMemo } from 'react';

const renderStaticContent = (fieldPath, label, children) => children;
const renderStaticEventItem = (event, children) => children;

export default function Events({
    eventsOverride = null,
    experienceBlurbBlocksOverride = null,
    experienceBlurbOverride = null,
    isPreview = false,
    renderEventPreviewItem = renderStaticEventItem,
    renderExperienceBlurbContent = renderStaticContent
}) {
    const activeEvents = useMemo(() => (
        eventsOverride
            ? eventsOverride.filter(event => event.isActive === true)
            : getActiveEvents()
    ), [eventsOverride])
    const blurb = experienceBlurbOverride || experienceBlurb
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
                {blurb.map((p, index) => (
                    <p 
                        key={index}
                        style={{ textIndent: '2em' }}
                    >
                        {renderExperienceBlurbContent(
                            `paragraphs.paragraph_${index + 1}`,
                            `Experience blurb paragraph ${index + 1}`,
                            p
                        )}
                    </p>
                ))}
                <SiteContentBlocks
                    blocks={experienceBlurbBlocksOverride}
                    labelPrefix="Experience blurb"
                    renderEditableContent={renderExperienceBlurbContent}
                    variant="experience"
                />
                <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%' }}>
                    <button className="btn btn-outline-primary" onClick={handlePrevious}>Previous Experience</button>
                    <button className="btn btn-outline-primary" onClick={handleNext}>Next Experience</button>

                </div>
                { activeEvents.length ? renderEventPreviewItem(
                    activeEvents[eventIdx],
                    <Event event={activeEvents[eventIdx]} isPreview={isPreview} />
                ) : null }
            </div>
        </div>
    );
}
