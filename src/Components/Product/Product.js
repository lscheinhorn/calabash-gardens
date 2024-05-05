import './Product.css'
import { Link } from 'react-router-dom' 
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'

export default function Product (props) {
    const { product } = props
    const dispatch = useDispatch()
    const { title, info, info1, info2, link, priceOptions, key, inStock } = product
    const [ priceOption, setPriceOption ] = useState( priceOptions[0] )
    const [ productInfo, setProductInfo ] = useState({...product, price: priceOptions[0].price , key: product.key + "0"} )
    const photos = product.photos.map(photo => {
        return `${photo}`
    })
    // const featured = photos[0]
    const productKey = key
    // console.log("productKey", productKey)
    const toLink = `/products/${productKey}`

    const handleAddCartItem = () => {
        dispatch(addCartItem(productInfo))
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

    const handleChange = (event) => {
        setPriceOption( JSON.parse(event.target.value) )
    }

    useEffect(() => {
        // console.log({priceOption})

        setProductInfo({ 
            ...product, 
            price: priceOption.price,
            title: title + (priceOption.option ? " " + priceOption.option : ""),
            key: product.key.slice(0, -1) + priceOptions.findIndex(({ option }) => { return option === priceOption.option }).toString()
        })
        // console.log("productInfo", productInfo )
    }, [ priceOption, product, title ])
  
    // console.log(priceOptions)


    const [ photoIdx, setPhotoIdx ] = useState( 0 )

    const handlePhotoLeft = () => {
        if(photoIdx === 0 ) {
            return
        }
        setPhotoIdx(photoIdx - 1)
    }

    const handlePhotoRight = () => {
        if(photoIdx === photos.length - 1 ) {
            return
        }
        setPhotoIdx(photoIdx + 1)
    }


    return (
        <div className="product_container">
            <Link to={ toLink } className="product-img-title">
                <h4>{ title }</h4>
                <img src={ photos[ photoIdx ] } alt={ photos[ photoIdx ] } />
            </Link>
            <div hidden={ photos.length === 1 } className="flex m-2">
                <button aria-label="Previous Photo" className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoLeft } >&lt;</button>
                <button aria-label="Next Photo" className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoRight }>&gt;</button>
            </div>  

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
                priceOptions.length > 1 ? 
                    <>
                        <select
                            className="mb-3"
                            onChange={ handleChange }
                            value={ JSON.stringify(priceOption) }
                        >
                            
                            {
                                priceOptions.map( option  => {
                                    // console.log({option})
                                    return <option key={option.option} value={ JSON.stringify(option) }>{ option.option } is ${ option.price }</option>
                                })
                            }
                        </select>
                    </> : 
                    <p>${priceOptions[0].price}</p>
            }      
            {
                !inStock ? <p> Out of Stock </p> :
                <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
            }
        </div>
    )
}