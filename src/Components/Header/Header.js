import './Header.css'
import Navbar from '../Navbar/Navbar'
import { content } from '../../resources/content'
import { Link } from 'react-router-dom'
import largeLogo from '../../resources/images/large_logo_no_purple_square.png';


export default function Header () {
   
    return (
        <div>
            <div className='above_nav header_color'>
                <div className='title_container header_color' >
                    <div className='logo header_color'>
                        <img 
                            alt='purple flower logo' 
                            src={ largeLogo }
                        />
                    </div>
                    <div className='title header_color'>
                        <h1 className='header_color'>{ content.home.header.title }</h1>
                        <p className='header_color'>{ content.home.header.subtitle }</p>
                    </div>
                    
                </div>
                <div className='get_in_touch header_color'>
                    <Link id="contact-Link" to="/contact">
                        <button>{ content.home.header.button }</button>
                    </Link>

                </div>
            </div>
            
            <Navbar />
        </div>
    )
}

