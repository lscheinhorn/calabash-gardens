import './ProductPage.css'
import { useParams } from 'react-router-dom'
import { usePublicProductByKey } from '../../data/usePublicProducts'
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import {  Link } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'

export default function ProductPage () {
    const dispatch = useDispatch()
    const { key } = useParams()
    const { product } = usePublicProductByKey(key)
    const safeProduct = useMemo(() => product || {
        photos: [],
        priceOptions: [{ price: "0.00" }],
        key: "",
        title: "",
        info: "",
        inStock: false
    }, [product])
    
    const photos = safeProduct.photos.map(photo => {
        return `${photo}`
    })

    const featured = photos[0]
    const { title, info, link, priceOptions, inStock  } = safeProduct

    const [ priceOption, setPriceOption ] = useState( priceOptions[0] )
    const [ productInfo, setProductInfo ] = useState({...safeProduct, price: priceOptions[0].price , key: safeProduct.key + "0"} )
    const [ photoIdx, setPhotoIdx ] = useState( 0 )

    const handleAddCartItem = () => {
        dispatch(addCartItem(productInfo))
    }


    const handleChange = (event) => {
        setPriceOption( JSON.parse(event.target.value) )
    }

    useEffect(() => {
        // console.log({priceOption})

        setProductInfo({ 
            ...safeProduct,
            price: priceOption.price,
            title: title + (priceOption.option ? " " + priceOption.option : ""),
            key: safeProduct.key.slice(0, -1) + priceOptions.findIndex(({ option }) => { return option === priceOption.option }).toString()
        })
        // console.log("productInfo", productInfo )
    }, [ priceOption, safeProduct, title, priceOptions  ])

    useEffect(() => {
        setPriceOption(priceOptions[0])
        setPhotoIdx(0)
    }, [safeProduct.key, priceOptions])

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

    if (!product) {
        return <p>There was a problem loading this page!</p>
    }

    return (

        <div className="productPage_container">
            
            <h4>{ title }</h4>
            <img src={ photos[ photoIdx ] } alt={ photos[ photoIdx ] } />
            <div hidden={ photos.length === 1 } className="flex m-2">
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
