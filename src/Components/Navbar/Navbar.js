import './Navbar.css'
import {  NavLink } from 'react-router-dom'


export default function Navbar () {
    
    const handleHamburger = () => {
        
        document.getElementById("navlinks").style.display = 'flex'
        document.getElementById("navlinks").style.flexDirection = 'column'
        document.getElementById("hamburger-icon").style.display = 'none'
        document.getElementById("close-navbar-icon").style.display = 'block'
    }

    const handleCollaps = () => {
        document.getElementById("navlinks").style.display = 'none'
        document.getElementById("hamburger-icon").style.display = 'block'
        document.getElementById("close-navbar-icon").style.display = 'none'
    }

    return (
        <div className="topnav">
            <div id='burger-cart-container'>
                <div id="hamburger-container" aria-label='toggle navigation'  >
                    <i id="hamburger-icon" type='button' className="fa-solid fa-bars fa-xl" onClick={ handleHamburger } aria-hidden='true' ></i>
                    <i id='close-navbar-icon' type='button' className="fa-solid fa-xmark fa-xl" onClick={ handleCollaps } aria-hidden='true' ></i>
                </div>
                
                <NavLink id="cart-navlink" to="calabash-gardens/cart">
                    <i className="fa-solid fa-cart-shopping" type='button' aria-label='cart' ></i>            
                </NavLink>
            </div>
            

            <section id="navlinks" onClick={handleCollaps} >
                <NavLink to="calabash-gardens/">Home</NavLink>
                <NavLink to="calabash-gardens/book-online">Book Online</NavLink>
                <NavLink to="calabash-gardens/shop">Shop</NavLink>
                <NavLink to="calabash-gardens/blog">Blog</NavLink>
            </section>
    
        </div>
    )
}