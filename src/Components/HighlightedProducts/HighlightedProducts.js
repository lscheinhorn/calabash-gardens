import './HighlightedProducts.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'

export default function HighlightedProducts () {
    
    
    return (
        <div id="highlighted_products">
            <h1>Highlighted Products</h1>
            {
                products.map( product => {
                    if ( product.isHighlighted ) {
                        return <Product product={ product } key={ product.key } />
                    }
                })
            }
        </div>
    )
}