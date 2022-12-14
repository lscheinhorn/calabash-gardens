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
            <i id='close-navbar-icon' className="fa-solid fa-xmark" onClick={ handleCollaps }></i>
            <NavLink id="cart-navlink" to="calabash-gardens/cart">Cart</NavLink>

            <section id="navlinks" >
                <NavLink to="calabash-gardens/">Home</NavLink>
                <NavLink to="calabash-gardens/book-online">Book Online</NavLink>
                <NavLink to="calabash-gardens/shop">Shop</NavLink>
                <NavLink to="calabash-gardens/blog">Blog</NavLink>
            </section>
            <i id="hamburger-icon" className="fas fa-bars" onClick={ handleHamburger }></i>
    
        </div>
    )
}