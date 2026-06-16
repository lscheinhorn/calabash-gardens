import './Banner.css'
import { content } from '../../data/siteData'

export default function Banner ({ bannerContent = content.home.banner }) {

    document.querySelector("body").onscroll = function slowScroll() {  
        let scrolltotop = document.scrollingElement.scrollTop
        const target = document.getElementById("banner")
        if (!target) {
            return
        }
        const xvalue = "center"
        const factor = .05;
        let yvalue = scrolltotop * factor - 400
        target.style.backgroundPosition = xvalue + " " + yvalue +"px"
      }

    return (
        <div id='banner'>
            <h1>{ bannerContent.title }</h1>
            <h4>{ bannerContent.subtitle_1 }<br>
                </br>{ bannerContent.subtitle_2 }
            </h4>
            <div className='banner_p'>
                <p>{ bannerContent.paragraph }</p>
            </div>
            <div className='learn_more'>
                <button>{ bannerContent.button }</button>
            </div>
        </div>
    )
}
