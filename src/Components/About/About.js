import './About.css'
import { content } from '../../resources/content'

export default function About () {
    return (
        <div id="about">
            <h1>{ content.home.about.title }</h1>
            <p>{ content.home.about.paragraph_1 }</p>
            <p>{ content.home.about.paragraph_2 }</p>
            <button>{ content.home.about.button }</button>
        </div>
    )
}