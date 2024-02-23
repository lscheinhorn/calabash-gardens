import './HighlightedProducts.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'
import {  Link } from 'react-router-dom'

export default function HighlightedProducts () {
    
    
    return (
        
        <div id="highlighted-products">
            {
                products.map( product => {
                    if ( product.isHighlighted && product.isActive === true ) {
                        return <Product product={ product } key={ product.key } />
                    }
                    return null
                })
            }
            <Link className="btn btn-primary" to="../shop">Shop All</Link>

        </div>
    )
}