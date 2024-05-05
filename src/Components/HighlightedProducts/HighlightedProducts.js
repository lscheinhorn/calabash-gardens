import './HighlightedProducts.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'
import {  Link } from 'react-router-dom'

export default function HighlightedProducts () {
    
    
    return (
        <div className="text-center">
            <div id="highlighted-products">
                {
                    products.map( product => {
                        if ( product.isHighlighted && product.isActive === true ) {
                            return <Product product={ product } key={ product.key } />
                        }
                        return null
                    })
                }

            </div>
            <Link id="product-button" className="btn btn-primary" to="../shop">Shop All</Link>
        </div>
        
    )
}