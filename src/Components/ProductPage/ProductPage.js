import './ProductPage.css'
import { useParams } from 'react-router-dom'
import { products } from '../../resources/products'
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import {  Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

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
        alert("There was a problem loading this page!")
    }

    
    
    const product = getProduct(key) 
    
    const photos = product.photos.map(photo => {
        return `${photo}`
    })

    const featured = photos[0]
    const { title, info, link, priceOptions, inStock  } = product

    const [ priceOption, setPriceOption ] = useState( priceOptions[0] )
    const [ productInfo, setProductInfo ] = useState({...product, price: priceOptions[0].price , key: product.key + "0"} )

    const handleAddCartItem = () => {
        dispatch(addCartItem(productInfo))
    }


    const handleChange = (event) => {
        setPriceOption( JSON.parse(event.target.value) )
    }

    useEffect(() => {
        // console.log({priceOption})

        setProductInfo({ 
            ...product, 
            price: priceOption.price,
            title: priceOption.option + "" + title,
            key: product.key.slice(0, -1) + priceOptions.findIndex(({ option }) => { return option === priceOption.option }).toString()
        })
        // console.log("productInfo", productInfo )
    }, [ priceOption, product, title, priceOptions  ])
  
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

        <div className="productPage_container">
            
            <h4>{ title }</h4>
            <img src={ photos[ photoIdx ] } alt={ photos[ photoIdx ] } />
            <div className="flex m-2">
                <button className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoLeft } >&lt;</button>
                <button className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoRight }>&gt;</button>
            </div>
            
            
            {/*photos.map( photo => {
                return  <img src={ photo } alt={ photo } />
            })*/}
            <p>{ info }{ link ? 
                <a href={link} target="blank"><br></br><br></br>Check out our tasting menu here</a> 
                : null 
            }</p>
            <>
            {
                !inStock ? <p> Out of Stock </p> :
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
                            <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
                        </> 
                        :
                        <>
                            <p>${priceOptions[0].price}</p>
                            <button className="add_to_cart btn btn-outline-primary" onClick={ handleAddCartItem } >Add To Cart</button>
                        </>
            }
            </>
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