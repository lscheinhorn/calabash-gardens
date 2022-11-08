import './Navbar.css'
import {  NavLink } from 'react-router-dom'


export default function Navbar () {
    return (
        <div className="topnav">
            <NavLink to="calabash-gardens/">Home</NavLink>
            <NavLink to="calabash-gardens/book-online">Book Online</NavLink>
            <NavLink to="calabash-gardens/shop">Shop</NavLink>
            <NavLink to="calabash-gardens/blog">Blog</NavLink>
            <NavLink id="cart-navlink" to="calabash-gardens/cart">Cart</NavLink>

        </div>
    )
}