import './ProductPage.css'
import { useParams } from 'react-router-dom'
import { products } from '../../resources/products'
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import {  Link } from 'react-router-dom'

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
    const { title, info, link, priceOptions, inStock } = product

   

    const handleAddCartItem = () => {
        dispatch(addCartItem(product))
    }

    return (

        <div className="productPage_container">
            <img src={ featured } alt={ featured } />
            <h4>{ title }</h4>
            <p>{ info }{ link ? 
                <a href={link} target="blank"><br></br><br></br>Check out our tasting menu here</a> 
                : null 
            }</p>
            {
                inStock ? 
                <>
                    <p>${ priceOptions }</p>
                    <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
                </> : <p> Out of Stock </p>
            
            }
            <Link id="proguctPage-continue-shopping" className="continue-shopping  btn btn-secondary" to="../shop">Continue Shopping</Link>

        </div>

        // <div>
        //     <h2>{ title }</h2>
        //     <img src={ featured } alt={ featured } />
        //     <p>{ info }</p>
        //     <p>${ priceOptions }</p>
        //     <button className="add_to_cart" onClick={ handleAddToCart } >Add To Cart</button>
        // </div>
    )
}