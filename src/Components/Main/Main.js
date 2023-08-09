import './Main.css'
import Banner from '../Banner/Banner'
import HighlightedProducts from '../HighlightedProducts/HighlightedProducts'
import Offerings from '../Offerings/Offerings'
import About from '../About/About'
import Parallax from '../Parallax/Parallax'
import Team from '../Team/Team'


export default function Main () {
    return (
        <div className='main'>
            <Banner />
            <div>
                <HighlightedProducts />
                {/*<Offerings />*/}
                <Parallax />
                <About />
                <Team />
                
            </div>
        </div>
    )
}