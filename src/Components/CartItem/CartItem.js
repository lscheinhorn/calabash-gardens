import './CartItem.css'
import { removeCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'

export default function CartItem (props) {
    const dispatch = useDispatch()
    const { product } = props
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, price, key } = product

    const handleRemoveCartItem = () => {
        dispatch(removeCartItem(product))
    }

    return (
        <div className="cartItem_container">
            <img src={ featured } alt={ featured } />
            <h4>{ title }</h4>
            <p>{ info }</p>
            <p>{ price }</p>
            <button className="remove_from_cart" onClick={ handleRemoveCartItem } >Remove From Cart</button>
            
        </div>
    )
}