import './Navbar.css'
import {  NavLink } from 'react-router-dom'


export default function Navbar () {
    return (
        <div className="topnav">
            <NavLink to="">Home</NavLink>
            <NavLink to="book-online">Book Online</NavLink>
            <NavLink to="shop">Shop</NavLink>
            <NavLink to="blog">Blog</NavLink>
            <NavLink id="cart-navlink" to="cart">Cart</NavLink>

        </div>
    )
}