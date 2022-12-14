import './Footer.css'
import { content } from '../../resources/content'
import { Link } from 'react-router-dom'

export default function Footer () {
    return (
        <div className='footer footer_color'>
                <div className='title_container footer_color' >
                    <div className='purple_logo footer_color'>
                        <img 
                            alt='purple flower logo' 
                            src='https://static.wixstatic.com/media/a339f1_08e8e62aa51141dca62b8ae7529790e1~mv2.png/v1/fill/w_146,h_80,al_c,q_85,usm_0.66_1.00_0.01,enc_auto/purple%20logo%20.png'                         />
                    </div>
                    <div className='title footer_color'>
                        <h1 className='footer_color'>{ content.home.header.title }</h1>
                        <p className='footer_color'>{ content.home.header.subtitle }</p>
                    </div>
                    
                </div>
                <div className='get_in_touch footer_color'>
                    <Link to="calabash-gardens/contact">
                        <button>{ content.home.header.button }</button>
                    </Link>

                </div>
            </div>
    )
}