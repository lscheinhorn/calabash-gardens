import './About.css'
import { content } from '../../data/siteData'
import { Link } from 'react-router-dom'

export default function About ({ aboutContent = content.home.about }) {
    return (
        <div id="about">
            <h1>{ aboutContent.title }</h1>
            <p>{ aboutContent.paragraph_1 }</p>
            <p>{ aboutContent.paragraph_2 }</p>
            <Link to="contact">
                <button className="btn btn-primary" aria-label="Get In Touch" >{ aboutContent.button }</button>
            </Link>
        </div>
    )
}
