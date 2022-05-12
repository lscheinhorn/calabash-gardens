import './Highlighted_Products.css'
import { products } from '../../resources/products'
import Product from '../Product/Product'

export default function Highlighted_Products () {
    
    
    return (
        <div>
            {
                products.map( product => {
                    <Product product=product />
                })
            }
        </div>
    )
}