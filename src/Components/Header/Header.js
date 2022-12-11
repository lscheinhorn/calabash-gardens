import './Header.css'
import Navbar from '../Navbar/Navbar'
import { content } from '../../resources/content'
import { Link } from 'react-router-dom'



export default function Header () {
    return (
        <div className='container'>
            <div className='above_nav header_color'>
                <div className='title_container header_color' >
                    <div className='purple_logo header_color'>
                        <img 
                            alt='purple flower logo' 
                            src='https://static.wixstatic.com/media/a339f1_08e8e62aa51141dca62b8ae7529790e1~mv2.png/v1/fill/w_146,h_80,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/purple%20logo%20.png'                         />
                    </div>
                    <div className='title header_color'>
                        <h1 className='header_color'>{ content.home.header.title }</h1>
                        <p className='header_color'>{ content.home.header.subtitle }</p>
                    </div>
                    
                </div>
                <div className='get_in_touch header_color'>
                    <Link id="contact-Link" to="calabash-gardens/contact">
                        <button>{ content.home.header.button }</button>
                    </Link>

                </div>
            </div>
            
            <Navbar />
        </div>
    )
}

