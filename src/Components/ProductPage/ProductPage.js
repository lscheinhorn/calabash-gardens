import './ProductPage.css'
import { useParams } from 'react-router-dom'
import { products } from '../../resources/products'
import { addCartItem } from '../../Store'
import { useDispatch } from 'react-redux'

export default function ProductPage () {
    const dispatch = useDispatch()
    const { key } = useParams()

    const getProduct = (productKey) => {
        for( let i = 0; i < products.length ; i++) {
            const product = products[i]
            if ( product.key === productKey ) {
                return product
            } 
        }
        console.log("getProduct() function failed to find a product matching the key")
        return "There was a problem loading this page!"
    }

    
    
    const product = getProduct(key) 
    
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    
    const featured = photos[0]
    const { title, info, price } = product

   

    const handleAddToCart = (product) => {
        dispatch(addCartItem(product))
    }

    return (
        <div>
            <h2>{ title }</h2>
            <img src={ featured } alt={ featured } />
            <p>{ info }</p>
            <p>${ price }</p>
            <button className="add_to_cart" onClick={ handleAddToCart(product) } >Add To Cart</button>
        </div>
    )
}