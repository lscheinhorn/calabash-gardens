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
    const toLink = `/calabash-gardens/products/${key}`

    const handleAddCartItem = () => {
        dispatch(addCartItem(product))
    }

    return (
        <div className="product_container">
            <Link to={ toLink } className="product-img-title">
                <img src={ featured } alt={ featured } />
                <h4>{ title }</h4>
            </Link>
            <p>{ info }</p>
            <p>${ price }</p>
            <Link to="/calabash-gardens/cart" className="product-img-title">
                <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
            </Link>
        </div>
    )
}