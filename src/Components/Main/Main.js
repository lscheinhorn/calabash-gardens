import './Main.css'
import Banner from '../Banner/Banner'
import HighlightedProducts from '../HighlightedProducts/HighlightedProducts'
import Offerings from '../Offerings/Offerings'
import About from '../About/About'
import Parallax from '../Parallax/Parallax'
import Team from '../Team/Team'
import Media from '../Media/Media'
import Experience from '../Experience/Experience'


export default function Main () {
    return (
        <div className='main'>
            <Banner />
            <div>
                <HighlightedProducts />
                {/*<Offerings />*/}
                <Experience />

                <Media />
                <Parallax />
                <About />
                <Team />
                
            </div>
        </div>
    )
}