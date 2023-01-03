import './Cart.css'
import CartItem from '../CartItem/CartItem'
import Paypal from '../Paypal/Paypal'
import { useSelector } from 'react-redux'
import { selectCart } from './cartSlice'
import {  Link } from 'react-router-dom'

export default function Cart () {
    const cartItems = useSelector(selectCart)
    console.log('cart =>', cartItems)

    const promoCode = ""

    const getSubtotal = (cartItems) => {
        let subtotal = 0
        for ( let i = 0 ; i < cartItems.length ; i++ ) {
            const price = Number(cartItems[i].price)
            subtotal += price
        }
        console.log('subtotal', subtotal)
        return subtotal
    }

    const getShipping = () => {
        return 15
    }

    const getDiscount = (promoCode) => {
        const discount = Number(promoCode)
        return discount
    }

    const getTotal = (subtotal, shipping, discount) => {
        const total = subtotal * (( 100 - discount ) /100 ) + shipping
        return total
    }

    const subtotal = getSubtotal(cartItems)
    const shipping = getShipping()
    const discount = getDiscount(promoCode)
    const total = getTotal(subtotal, shipping, discount)
    console.log('subtotal', subtotal, 'shipping', shipping, 'discount', discount, 'total', total)
    
    const isCartEmpty = () => {
        if ( cartItems.length < 1 ) {
            return (
                <div id="empty-cart">
                    <h4>Your cart is empty</h4>
                    <Link className="btn btn-secondary" to="../calabash-gardens/shop">Continue Shopping</Link>
                </div>
            )
        }
        return (
            <div id="total-paypal">
                <div id="total-container">
                    <div><h4>Subtotal</h4><h4>${ subtotal }</h4></div>
                    <div><h4>Shipping</h4><h4>${ shipping }</h4></div>
                    <div><h4>Total</h4><h4>${ total }</h4></div>

                </div>
                
                <Paypal />
                <Link className="btn btn-secondary" to="../calabash-gardens/shop">Continue Shopping</Link>

            </div>
        )
    }



    return (
        <div id="cart">
            <h1>Cart</h1>
            {
                cartItems.map(item => {
                    return <CartItem product={ item } />
                })
            }
            { isCartEmpty()}
            
            
        </div>
    )
}