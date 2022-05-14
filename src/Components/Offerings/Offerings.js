import { content } from '../../resources/content'
import './Offerings.css'

export default function Offerings () {
    return (
        <div id="offerings">
            <h1>Offerings</h1>
            <p>{ content.home.offerings.paragraph }</p>
            <div>
                <h3>{ content.home.offerings.box_1.title }</h3>
                <p>{ content.home.offerings.box_1.paragraph }</p>
            </div>
            <div>
                <h3>{ content.home.offerings.box_2.title }</h3>
                <p>{ content.home.offerings.box_2.paragraph }</p>
            </div>
            <div>
                <h3>{ content.home.offerings.box_3.title }</h3>
                <p>{ content.home.offerings.box_3.paragraph }</p>
            </div>
            <div>
                <h3>{ content.home.offerings.box_4.title }</h3>
                <p>{ content.home.offerings.box_4.paragraph }</p>
            </div>
            <div>
                <p>{ content.home.offerings.more_info }</p>
            </div>

        </div>
    )
}