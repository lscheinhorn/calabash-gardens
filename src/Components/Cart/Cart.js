import './Cart.css'
import CartItem from '../CartItem/CartItem'
import Paypal from '../Paypal/Paypal'
import { useSelector } from 'react-redux'
import { selectCart } from './cartSlice'


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
        return 0
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
    
 

    return (
        <div id="cart">
            <h2>My Cart</h2>
            {
                cartItems.map(item => {
                    return <CartItem product={ item } />
                })
            }
            <p id="subtotal">Subtotal ${ subtotal }</p>
            <p id="shipping">Shipping ${ shipping }</p>
            <p id="total">Total ${ total }</p>
            <Paypal />
        </div>
    )
}