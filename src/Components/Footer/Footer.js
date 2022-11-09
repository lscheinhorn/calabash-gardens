import './Footer.css'
import { content } from '../../resources/content'


export default function Footer () {
    return (
        <div className='footer footer_color'>
                    
                    <div className='title footer_color'>
                        <h1 className='footer_color'>{ content.home.header.title }</h1>
                        <p className='footer_color'>{ content.home.header.subtitle }</p>
                    </div>
                    
                <div className='get_in_touch_footer footer_color'>
                    <button>{ content.home.header.button }</button>
                </div>
            
        </div>
    )
}