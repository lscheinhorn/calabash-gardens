import './Banner.css'
import { content } from '../../resources/content'

export default function Banner () {

    document.querySelector("body").onscroll = function slowScroll() {  
        let scrolltotop = document.scrollingElement.scrollTop
        const target = document.getElementById("banner")
        const xvalue = "center"
        const factor = .05;
        let yvalue = scrolltotop * factor - 400
        target.style.backgroundPosition = xvalue + " " + yvalue +"px"
      }

    return (
        <div id='banner'>
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