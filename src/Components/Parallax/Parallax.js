import './Parallax.css'

export default function Parallax () {
    
document.querySelector("body").onscroll = function slowScroll() {  
    let scrolltotop = document.scrollingElement.scrollTop
    const target = document.getElementById("parallax_container")
    if (!target) {
        return
    }
    const xvalue = "center"
    const factor = -.5;
    let yvalue = scrolltotop * factor + 1000
    target.style.backgroundPosition = xvalue + " " + yvalue +"px"
  }

    
    return (
        <div id="parallax_container">
        
        </div>
    )
}
