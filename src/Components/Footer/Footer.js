import './Footer.css'
import { content } from '../../data/siteData'
import { Link } from 'react-router-dom'
import largeLogo from '../../resources/images/large_logo_no_purple_square.png';

export default function Footer ({ footerContent = content.home.header }) {
    return (
        <div className='footer footer_color'>
                <div className='title_container footer_color' >
                <div className='logo footer_color'>
                    <img 
                        alt='purple flower logo' 
                        src={ largeLogo }
                    />
                    </div>
                    <div className='title footer_color'>
                        <h1 className='footer_color'>{ footerContent.title }</h1>
                        <p className='footer_color'>{ footerContent.subtitle }</p>
                    </div>
                    
                </div>
                <div className='get_in_touch_footer footer_color'>
                    <Link to="/contact">
                        <button>{ footerContent.button }</button>
                    </Link>

                </div>
            </div>
    )
}
