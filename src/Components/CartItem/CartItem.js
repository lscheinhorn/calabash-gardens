import './CartItem.css'
import { removeCartItem, decrementCartItem, addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'

export default function CartItem (props) {
    const dispatch = useDispatch()
    const { product } = props
    console.log("cartItem", product)
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, price, quantity, key } = product

    const handleAddCartItem = () => {
        dispatch(addCartItem(product))
    }

    const handleRemoveCartItem = () => {
        dispatch(removeCartItem(product))
    }

    const handleDecrementCartItem = () => {
        dispatch(decrementCartItem(product))
    }

    return (
        <div className="cart-items-container">
            <div className="cart-item">
                <img src={ featured } alt={ featured } />
                <div id="cart-item-title-price">
                    <h4 id="cart-item-title">{ title }</h4>
                    <div id="cart-item-quantity-price-trash">
                        <div id="quantity-container" className="d-flex m-4">
                            <button className="btn btn-primary" onClick={ handleDecrementCartItem }>-</button>
                            <p className="m-2">{ quantity }</p>
                            <button className="btn btn-primary" onClick={ handleAddCartItem }>+</button>
                        </div>
                        
                        <p id="cart-item-price" className="m-2">${ price * quantity }</p>
                        
                        <button id="trash-can" className="remove_from_cart " onClick={ handleRemoveCartItem } ><i className="fa-solid fa-trash-can fa-xl"></i></button>

                    </div>
                    
                </div>
                
            </div>
            
            
        </div>
    )
}