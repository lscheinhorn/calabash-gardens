import './Cart.css'
import CartItem from '../CartItem/CartItem'
import Paypal from '../Paypal/Paypal'
import { useSelector } from 'react-redux'
import { selectCart } from './cartSlice'
import {  Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Cart () {
    const cartItems = useSelector(selectCart)
    console.log('cart =>', cartItems)
    const [ shippingState, setShippingState ] = useState({
        pref: "",
        shipping: ""
    })
    const [ totalState, setTotalState ] = useState("")
    const [ subtotalState, setSubtotalState ] = useState("")


    const promoCode = ""

    const getSubtotal = (cartItems) => {
        let subtotal = 0
        for ( let i = 0 ; i < cartItems.length ; i++ ) {
            const quantity = Number(cartItems[i].quantity)
            const price = Number(cartItems[i].price)
            subtotal += (price * quantity)
        }
        if ( subtotal !== subtotalState ) {
            setSubtotalState( subtotal )
        }
        return subtotal
    }



    const getShipping = (cartItems) => {
        let shippingTotal = 0
        for ( let i = 0 ; i < cartItems.length ; i++ ) {
            const shipping = Number(cartItems[i].shipping)
            shippingTotal += shipping
        }
        if( shippingTotal > 15 ) {
            shippingTotal = 15
        }
        if(shippingTotal === 0 && shippingState.pref !== 'NO_SHIPPING') {
            setShippingState( prev => {
                return{
                    ...prev,
                    pref: 'NO_SHIPPING'
                }
            })
        } else if (shippingTotal && shippingState.pref !== 'GET_FROM_FILE') {
            setShippingState( prev => {
                return{
                    ...prev,
                    pref: 'GET_FROM_FILE'
                }
            })
        }
        if( shippingState.shipping !== shippingTotal ) {
            setShippingState( prev => {
                return{
                    ...prev,
                    shipping: shippingTotal
                }
            })
        }
        return shippingTotal
    }

    const getDiscount = (promoCode) => {
        const discount = Number(promoCode)
        return discount
    }

    const getTotal = (subtotal, shipping, discount) => {
        const total = subtotal * (( 100 - discount ) /100 ) + shipping
        if ( total !== totalState ) {
            setTotalState( total )
        }
        return total
    }

    const subtotal = getSubtotal(cartItems)
    const shipping = getShipping(cartItems)
    const discount = getDiscount(promoCode)
    const total = getTotal(subtotal, shipping, discount)
    
    const isCartEmpty = () => {
        if ( cartItems.length < 1 ) {
            return (
                <div id="empty-cart">
                    <h4>Your cart is empty</h4>
                    <Link className="continue-shopping btn btn-secondary" to="../shop">Continue Shopping</Link>
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
                
                <Paypal  
                    shipping={ shippingState }
                    total={ totalState }
                    subtotal={ subtotalState }
                />
                <Link className="continue-shopping  btn btn-secondary" to="../shop">Continue Shopping</Link>

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