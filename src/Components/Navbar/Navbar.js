import './Navbar.css'
import {  NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCart } from '../Cart/cartSlice'

export default function Navbar () {
    const cartItems = useSelector(selectCart)
    const getCartQuantity = () => {
        if ( cartItems.length < 1 ) {
            return
        }
        return (
            <p>{ cartItems.length }</p> 
        )
    }

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
                        <i  className="fa-solid fa-bars fa-2xl"  ></i>
                    </button>
                    <button tabIndex='0' id='close-navbar-icon' onClick={ handleCollaps } aria-label='close navigation menu' >                   
                        <i  className="fa-solid fa-xmark fa-2xl" ></i>
                    </button>
                </div>
                
                
            

            <section id="navlinks" onClick={handleCollaps} >
                <NavLink to="/">Home</NavLink>
                {/*<NavLink to="/book-online">Book Online</NavLink>*/}
                <NavLink to="/shop">Shop</NavLink>
                {/*<NavLink to="/blog">Blog</NavLink>*/}
                <NavLink to="/contact">Contact Us</NavLink>

            </section>
    
            <NavLink id="cart-navlink" to="calabash-gardens/cart" onClick={handleCollaps} className="">
                <i className="fa-solid fa-cart-shopping fa-xl" type='button' aria-label='cart' ></i>  
                { getCartQuantity() } 
   
            </NavLink>
        </div>
    )
}