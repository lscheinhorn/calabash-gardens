import './Navbar.css'
import {  NavLink } from 'react-router-dom'


export default function Navbar (props) {
    
    return (
        <div className="topnav">
            <section id="navlink-words" >
                <NavLink to="calabash-gardens/">Home</NavLink>
                <NavLink to="calabash-gardens/book-online">Book Online</NavLink>
                <NavLink to="calabash-gardens/shop">Shop</NavLink>
                <NavLink to="calabash-gardens/blog">Blog</NavLink>
            </section>
            <i id="hamburger-icon" className="fas fa-bars"></i>
            <NavLink id="cart-navlink" to="calabash-gardens/cart">Cart</NavLink>
    
        </div>
    )
}