import './About.css'
import { content } from '../../data/siteData'
import { Link } from 'react-router-dom'

const renderStaticContent = (fieldPath, label, children) => children;

export default function About ({
    aboutContent = content.home.about,
    renderEditableContent = renderStaticContent
}) {
    return (
        <div id="about">
            <h1>{ renderEditableContent('title', 'About title', aboutContent.title) }</h1>
            <p>{ renderEditableContent('paragraph_1', 'About first paragraph', aboutContent.paragraph_1) }</p>
            <p>{ renderEditableContent('paragraph_2', 'About second paragraph', aboutContent.paragraph_2) }</p>
            <Link to="contact">
                <button className="btn btn-primary" aria-label="Get In Touch" >{ aboutContent.button }</button>
            </Link>
        </div>
    )
}
