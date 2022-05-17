import './CartItem.css'
import { Link } from 'react-router-dom' 

export default function CartItem (props) {
    const { product } = props
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, price, key } = product
    const toLink = `/products/${key}`


    return (
        <div className="cartItem_container">
            <Link to={ toLink }>
                <img src={ featured } alt={ featured } />
                <h4>{ title }</h4>
                <p>{ info }</p>
                <p>{ price }</p>
            </Link>
            
        </div>
    )
}