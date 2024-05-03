import './Event.css'
import { addCartItem } from '../Cart/cartSlice'
import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'

export default function Event (props) {
    const { event } = props
    const dispatch = useDispatch()
    const { title, info, eventDates, link, priceOptions, key, inStock } = event
    const [ quantity, setQuantity ] = useState( 1 )
    const [ dateOption, setDateOption ] = useState(eventDates.length > 1 ? eventDates[0] : null)
    const [ photoIdx, setPhotoIdx ] = useState( 0 )
    const [ eventInfo, setEventInfo ] = useState({
        ...event, 
        price: priceOptions[0], 
        key: event.key, 
        quantity: quantity, 
        option: eventDates[0],
        title: title + (dateOption ? " " + dateOption : ""),

    } )

    const photos = event.photos.map(photo => {
        return `${photo}`
    })
    // const featured = photos[0]
    const eventKey = key
    // console.log("productKey", productKey)

    useEffect(() => {
        setEventInfo({ 
            ...eventInfo, 
            quantity: quantity,
            title: title + (dateOption ? " " + dateOption : ""),
            key: event.key.slice(0, -1) + dateOption
        })
        // console.log("productInfo", productInfo )
    }, [dateOption, event, title, quantity, eventInfo.price])

    const handleAddCartItem = () => {
        console.log("eventInfo", eventInfo)
        dispatch(addCartItem(eventInfo))
    }

    const handleIncrement = () => {
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

    return (
        <div className="productPage_container">
            
            <h3>{ title }</h3>

            {
                
                eventDates.length > 1 ? 
                    <>
                        <label 
                            for="eventDateSelector"
                            className="fs-4"
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
                <button className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoLeft } >&lt;</button>
                <button className="d-inline-block btn btn-outline-primary" onClick={ handlePhotoRight }>&gt;</button>
            </div>  

            
            <p>
                {info.map((p, index) => (
                <div key={index}>
                    {p}
                    <br />
                </div>
                ))}
                {link ? 
                <a href={link} target="_blank" rel="noopener noreferrer">
                    <br />
                    Check out our tasting menu here
                </a> 
                : null 
                }
            </p>


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
        </div>
    )
}