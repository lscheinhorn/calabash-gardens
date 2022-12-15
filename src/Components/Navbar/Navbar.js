import './Navbar.css'
import {  NavLink } from 'react-router-dom'


export default function Navbar () {
    
    const handleHamburger = () => {
        
        document.getElementById("navlinks").style.display = 'flex'
        document.getElementById("navlinks").style.flexDirection = 'column'
        document.getElementById("navlinks").style.border = '1px solid black'

        document.getElementById("hamburger-icon").style.display = 'none'
        document.getElementById("close-navbar-icon").style.display = 'block'
    }

    const handleCollaps = () => {
        const vWidth = window.innerWidth
        if( vWidth >= 480) {
            return
        }
        document.getElementById("navlinks").style.display = 'none'
        document.getElementById("hamburger-icon").style.display = 'block'
        document.getElementById("close-navbar-icon").style.display = 'none'
    }

    return (
        <div className="topnav">
                <div id="hamburger-container"  >
                    <button tabIndex='0' id="hamburger-icon" onClick={ handleHamburger } aria-label='open navigation menu'>                    
                        <i  className="fa-solid fa-bars fa-xl"  ></i>
                    </button>
                    <button tabIndex='0' id='close-navbar-icon' onClick={ handleCollaps } aria-label='close navigation menu' >                   
                        <i  className="fa-solid fa-xmark fa-xl" ></i>
                    </button>
                </div>
                
                
            

            <section id="navlinks" onClick={handleCollaps} >
                <NavLink to="calabash-gardens/">Home</NavLink>
                <NavLink to="calabash-gardens/book-online">Book Online</NavLink>
                <NavLink to="calabash-gardens/shop">Shop</NavLink>
                <NavLink to="calabash-gardens/blog">Blog</NavLink>
            </section>
    
            <NavLink id="cart-navlink" to="calabash-gardens/cart" onClick={handleCollaps} >
                <i className="fa-solid fa-cart-shopping" type='button' aria-label='cart' ></i>            
            </NavLink>
        </div>
    )
}