import './About.css'
import { content } from '../../resources/content'
import { Link } from 'react-router-dom'

export default function About () {
    return (
        <div id="about">
            <h1>{ content.home.about.title }</h1>
            <p>{ content.home.about.paragraph_1 }</p>
            <p>{ content.home.about.paragraph_2 }</p>
            <Link to="contact">
                <button className="btn btn-primary" aria-label="Get In Touch" >{ content.home.about.button }</button>
            </Link>
        </div>
    )
}