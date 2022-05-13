import './Main.css'
import Banner from '../Banner/Banner'
import HighlightedProducts from '../HighlightedProducts/HighlightedProducts'
import Offerings from '../Offerings/Offerings'
import About from '../About/About'
import Parallax from '../Parallax/Parallax'

export default function Main () {
    return (
        <div className='main'>
            <Banner />
            <div>
                <h1>Main</h1>
                <HighlightedProducts />
                <Offerings />
                <div id='parallax-region'>
                    <About />
                    <Parallax />
                </div>
                
            </div>
        </div>
    )
}