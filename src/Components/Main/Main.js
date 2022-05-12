import './Main.css'
import Banner from '../Banner/Banner'
import HighlightedProducts from '../HighlightedProducts/HighlightedProducts'

export default function Main () {
    return (
        <div className='main'>
            <Banner />
            <div>
                <h1>Main</h1>
                <HighlightedProducts />
            </div>
        </div>
    )
}