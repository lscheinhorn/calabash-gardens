import './Product.css'
import { Link } from 'react-router-dom' 
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import { useState } from 'react'

export default function Product (props) {
    const { product } = props
    const dispatch = useDispatch()

    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    const featured = photos[0]
    const { title, info, info1, info2, link, price, key, inStock } = product
    const toLink = `/products/${key}`

    const handleAddCartItem = () => {
        dispatch(addCartItem(product))
    }

    const [ hidden, setHidden ] = useState({
        span: true,
        readMore: false,
        readLess: true
    })

    const readMore = () => {
        setHidden({
            span: false,
            readMore: true,
            readLess: false
        })
        
    }

    const readLess = () => {
        setHidden({
            span: true,
            readMore: false,
            readLess: true
        })
    }

    return (
        <div className="product_container">
            <Link to={ toLink } className="product-img-title">
                <img src={ featured } alt={ featured } />
                <h4>{ title }</h4>
            </Link>
            {
                info1 ?
                <p>{ info1 }
                    <span hidden={ hidden.span } >{ info2 }</span> 
                    <button className="readMoreLess" hidden={ hidden.readMore } onClick={readMore}>...read more</button>
                    <button className="readMoreLess" hidden={ hidden.readLess } onClick={readLess}>...read less</button>
                    { link ? 
                    <a href={link} target="blank"><br></br><br></br>Check out our tasting menu here</a> 
                    : null 
                }</p>
                : <p>{ info }{ link ? 
                    <a href={link} target="blank"><br></br><br></br>Check out our tasting menu here</a> 
                    : null 
                }</p>
            }
            
            {
                inStock ? 
                <>
                    <p>${ price }</p>
                    <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
                </> : <p> Out of Stock </p>
            
            }
            
        </div>
    )
}