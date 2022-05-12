import './Banner.css'
import { content } from '../../resources/content'

export default function Banner () {
    return (
        <div className='banner'>
            <h1>{ content.home.banner.title }</h1>
            <h4>{ content.home.banner.subtitle_1 }<br>
                </br>{ content.home.banner.subtitle_2 }
            </h4>
            <div className='banner_p'>
                <p>{ content.home.banner.paragraph }</p>
            </div>
            <div className='learn_more'>
                <button>{ content.home.banner.button }</button>
            </div>
        </div>
    )
}