import './CartItem.css'
import { removeCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CartItem (props) {
    const dispatch = useDispatch()
    const { product } = props
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, price, quantity, key } = product

    const handleRemoveCartItem = () => {
        dispatch(removeCartItem(product))
    }

    return (
        <div className="cart-items-container">
            <div className="cart-item">
                <img src={ featured } alt={ featured } />
                <div id="cart-item-title-price">
                    <h4>{ title }</h4>
                    <div className="d-flex m-4">
                        <button className="btn btn-primary">-</button>
                        <p className="m-2">{ quantity }</p>
                        <button className="btn btn-primary">+</button>
                    </div>
                    
                    <p className="m-2">${ price }</p>
                    
                </div>
                
                <button className="remove_from_cart " onClick={ handleRemoveCartItem } ><i className="fa-solid fa-trash-can fa-xl"></i></button>
            </div>
            
            
        </div>
    )
}