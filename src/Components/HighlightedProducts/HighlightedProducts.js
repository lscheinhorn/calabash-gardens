import './HighlightedProducts.css'
import { getHighlightedProducts } from '../../data/siteData'
import Product from '../Product/Product'
import {  Link } from 'react-router-dom'

export default function HighlightedProducts () {
    
    
    return (
        <div className="text-center">
            <div id="highlighted-products">
                {
                    getHighlightedProducts().map( product => {
                        return <Product product={ product } key={ product.key } />
                    })
                }

            </div>
            <Link id="product-button" className="btn btn-primary" to="../shop">Shop All</Link>
        </div>
        
    )
}
