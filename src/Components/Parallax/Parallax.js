import './Parallax.css'

export default function Parallax () {
    
document.querySelector("body").onscroll = function slowScroll() {  
    let scrolltotop = document.scrollingElement.scrollTop
    const target = document.getElementById("parallax_container")
    const xvalue = "center"
    const factor = .05;
    let yvalue = scrolltotop * factor - 200
    target.style.backgroundPosition = xvalue + " " + yvalue +"px"
  }

    
    return (
        <div id="parallax_container">
        
        </div>
    )
}