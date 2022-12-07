import './Product.css'
import { Link } from 'react-router-dom' 
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'

export default function Product (props) {
    const { product } = props
    const dispatch = useDispatch()

    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, price, key } = product
    const toLink = `/products/${key}`

    const handleAddCartItem = () => {
        dispatch(addCartItem(product))
    }

    return (
        <div className="product_container">
            <Link to={ toLink }>
                <img src={ featured } alt={ featured } />
                <h4>{ title }</h4>
                <p>{ info }</p>
                <p>${ price }</p>
                <button className="add_to_cart" onClick={ handleAddCartItem } >Add To Cart</button>
            </Link>
            
        </div>
    )
}