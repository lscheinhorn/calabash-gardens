import './HighlightedProducts.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'

export default function HighlightedProducts () {
    
    
    return (
        
        <div id="highlighted-products">
            {
                products.map( product => {
                    if ( product.isHighlighted && product.inStock === true ) {
                        return <Product product={ product } key={ product.key } />
                    }
                })
            }
        </div>
    )
}