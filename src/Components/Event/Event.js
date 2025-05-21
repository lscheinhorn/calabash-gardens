import './Event.css'
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import { eventsInventory } from '../../resources/inventory'
import { createKey } from '../../resources/products'
import { Link } from 'react-router-dom'; 

export default function Event (props) {
    const { event } = props
    const dispatch = useDispatch()
    const { title, info, eventDates, link, priceOptions, key, inStock } = event
    const [ quantity, setQuantity ] = useState( 1 )
    const [ dateOption, setDateOption ] = useState( eventDates[0] )
    const [ photoIdx, setPhotoIdx ] = useState( 0 )
    const [ veg, setVeg ]  = useState( false )
    const [ vegOption, setVegOption ]  = useState( "I am vegetarian" )

    const [ gFree, setGFree ]  = useState( false )
    const [ gFreeOption, setGFreeOption ]  = useState( "I am gluten free" )
    
    // console.log("price of event", priceOptions[0])
    const [ eventInfo, setEventInfo ] = useState({
        ...event, 
        price: (veg || gFree) ? Number(priceOptions[0]) + 20 : priceOptions[0], 
        key: event.key, 
        quantity: quantity, 
        option: eventDates[0],
        title: (veg || gFree) ? (title + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")) : title + (dateOption ? " " + dateOption : ""),

    } )
    const [ addedToCart, setAddToCart ]  = useState( false )
    


    const photos = event.photos.map(photo => {
        return `${photo}`
    })
    // const featured = photos[0]
    const eventKey = key
    // console.log("productKey", productKey)

    useEffect(() => {
        setDateOption(eventDates[0])
    }, [ eventDates ])

    useEffect(() => {
        setPhotoIdx(0)
    }, [ title ])

    useEffect(() => {
        setAddToCart( false )
    }, [ title, dateOption ])

    useEffect(() => {
        
        setEventInfo({ 
            ...eventInfo,
            photos: event.photos,
            price: (veg || gFree) ? Number(priceOptions[0]) + 10 : priceOptions[0], 
            quantity: quantity,
            title: (veg || gFree) ? (title + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")) : title + (dateOption ? " " + dateOption : ""),
            key: event.key.slice(0, -1) + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")
        })
        // console.log("eventInfo", eventInfo )
    }, [dateOption, event, title, quantity, eventInfo, priceOptions, eventDates])

    const handleAddCartItem = () => {
        setAddToCart( true )
        // console.log("eventInfo", eventInfo)
        setEventInfo({ 
            ...eventInfo, 
            price: priceOptions[0],
            quantity: quantity,
            title: (veg || gFree) ? (title + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")) : title + (dateOption ? " " + dateOption : ""),
            key: event.key.slice(0, -1) + (dateOption ? createKey(dateOption) : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")        
        })
        console.log("eventInfo", eventInfo)
        // console.log("eventInfo.title", eventInfo.title)
        dispatch(addCartItem(eventInfo))
    }

    const handleIncrement = () => {
        console.log("eventsInventory[ eventInfo.title].stock", eventsInventory,  eventInfo.title )
        if( quantity >= eventsInventory[ eventInfo.title].stock ) {
            return
        }
        setQuantity( quantity + 1 )
    }
    const handleDecrement = () => {
        if( quantity === 1 ) {
            return
        }
        setQuantity( quantity - 1 )
    }

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

    const handleChange = ({ target }) => {
        setQuantity(1)
        setDateOption( target.value )
    }

    // useEffect(() => {
    //     // console.log({priceOption})

    //     setEventInfo({ 
    //         ...event, 
    //         price: price,
    //         title: title,
    //         key: event.key
    //     })
    //     // console.log("eventInfo", eventInfo )
    // }, [ dateOption, event, title ])

    const handleVeg = () => {
        if(veg) {
            setVeg(false)
            setVegOption("I am vegetarian")
        } else {
            setVeg(true)
            setVegOption("I eat meat")

        }
    }

    const handleGFree = () => {
        if(gFree) {
            setGFree(false)
            setGFreeOption("I am gluten free")
        } else {
            setGFree(true)
            setGFreeOption("I eat gluten")
        }
        setEventInfo((eventInfo) => ({
            ...eventInfo,
            price: Number(eventInfo.price) + 20,
            title: (veg || gFree) ? (title + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")) : title + (dateOption ? " " + dateOption : ""),
            key: event.key.slice(0, -1) + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")
        }));
    }

    // useEffect(() => {
    //     if (veg || gFree) {
    //         console.log("Updating price...");
    //         setEventInfo(prevEventInfo => {
    //             console.log("prevEventInfo.price", prevEventInfo.price);

    //             const newPrice = Number(prevEventInfo.price) + 20;
    //             console.log("Number(prevEventInfo.price)", Number(prevEventInfo.price));
    //             console.log("newPrice", newPrice);

    //             return {
    //                 ...prevEventInfo,
    //                 price: `${newPrice}`,
    //                 title: prevEventInfo.title + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : ""),
    //                 key: event.key.slice(0, -1) + (dateOption ? " " + dateOption : "") + (veg ? " Vegetarian" : "") + (gFree ? " Gluten Free" : "")
    //             };
    //         });
    //     }
    // }, [veg, gFree]);

    return (
        <div className="productPage_container">
            
            <h3 style={{ whiteSpace: 'pre-wrap', textAlign: 'center' }}>{ title }</h3>

            {
                
                eventDates.length > 1 ? 
                    <>
                        <label 
                            htmlFor = "eventDateSelector"
                            className = "fs-4"
                        >
                            Please select a date below
                        </label>
                        <select
                            id="eventDateSelector"
                            className="mb-3 eventDate"
                            onChange={ handleChange }
                            value={ dateOption }
                        >
                            
                            {
                                eventDates.map( option  => {
                                    // console.log({option})
                                    return <option key={ option } value={ option }>{ option }</option>
                                })
                            }
                        </select>
                    </> : 
                    <p className="fs-3">{eventDates[0]}</p>
            }      

            <img src={ photos[ photoIdx ] } alt={ photos[ photoIdx ] } />
            <div hidden={ photos.length === 1 } className="flex m-2">
                <button aria-label="Previous Photo" className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoLeft } >&lt;</button>
                <button aria-label="Next Photo" className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoRight }>&gt;</button>
            </div>  

            
            
            {
                info.map((p, index) => (
                <p 
                    key={index}
                    style={{ textIndent: '2em' }}
                >
                    {p}
                    <br />
                </p>
                ))}
                {link ? 
                <div style={{ textAlign: 'center' }} >
                    <a href={link} target="_blank" rel="noopener noreferrer">
                        <br />
                        Check out the band bio here
                    </a> 
                </div>
                    

                : null 
            }
            

            <button className="btn btn-warning btn-lg mt-2" onClick={ handleVeg }>
                <i className="fas fa-leaf"></i> { vegOption }
            </button>

            <button className="btn btn-warning btn-lg mt-2" onClick={handleGFree}>
                <i className="fas fa-bread-slice"></i> { gFreeOption }
            </button>
           


            <p>${ eventInfo.price  * quantity   }</p>


            <div id="quantity-selector" className="d-flex justify-content-center align-items-center m-2">
                <button className="btn btn-secondary" onClick={ handleDecrement } aria-label="Decrease quantity">-</button>
                <span className="mx-3">{ quantity }</span>
                <button className="btn btn-secondary" onClick={ handleIncrement } aria-label="Increase quantity">+</button>

            </div>

            {
                !inStock ? <p> Out of Stock </p> :
                <button className="btn btn-success btn-lg" onClick={handleAddCartItem}>
                    <i className="fa fa-ticket-alt"></i> Buy Tickets
                </button>
            
            }
            {   
                addedToCart ?
                <Link to="/cart" className="btn btn-warning btn-lg mt-2">
                    <i className="fas fa-shopping-cart"></i> Go to Cart
                </Link> : null
            }
            
        </div>
    )
}