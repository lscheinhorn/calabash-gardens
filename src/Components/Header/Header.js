import './Header.css'
import Navbar from '../Navbar/Navbar'
import { content } from '../../data/siteData'
import { Link } from 'react-router-dom'
import largeLogo from '../../resources/images/large_logo_no_purple_square.png';

const renderStaticContent = (fieldPath, label, children) => children;

export default function Header ({
    headerContent = content.home.header,
    renderEditableContent = renderStaticContent,
    showNav = true
}) {
   
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
                        <h1 className='header_color'>
                            { renderEditableContent('header.title', 'Header title', headerContent.title) }
                        </h1>
                        <p className='header_color'>
                            { renderEditableContent('header.subtitle', 'Header subtitle', headerContent.subtitle) }
                        </p>
                    </div>
                    
                </div>
                <div className='get_in_touch header_color'>
                    <Link id="contact-Link" to="/contact">
                        <button>{ headerContent.button }</button>
                    </Link>

                </div>
            </div>
            
            {showNav ? <Navbar /> : null}
        </div>
    )
}
