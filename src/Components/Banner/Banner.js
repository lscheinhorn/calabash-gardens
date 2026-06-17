import './Banner.css'
import { content } from '../../data/siteData'

const renderStaticContent = (fieldPath, label, children) => children;

export default function Banner ({
    bannerContent = content.home.banner,
    renderEditableContent = renderStaticContent
}) {

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
            <h1>{ renderEditableContent('title', 'Banner title', bannerContent.title) }</h1>
            <h4>{ renderEditableContent('subtitle_1', 'Banner first subtitle', bannerContent.subtitle_1) }<br>
                </br>{ renderEditableContent('subtitle_2', 'Banner second subtitle', bannerContent.subtitle_2) }
            </h4>
            <div className='banner_p'>
                <p>{ renderEditableContent('paragraph', 'Banner paragraph', bannerContent.paragraph) }</p>
            </div>
            <div className='learn_more'>
                <button>{ bannerContent.button }</button>
            </div>
        </div>
    )
}
