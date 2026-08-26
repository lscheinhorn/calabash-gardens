import './Event.css'
import { addCartItem, selectCart } from '../Cart/cartSlice'
import {
    addDoc,
    collection,
    serverTimestamp,
} from 'firebase/firestore'
import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'; 
import { db, isFirebaseConfigured } from '../../firebase-config'

const todayStart = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
}

const normalizeEventDate = (value) => {
    if (value?.toDate) {
        return value.toDate()
    }

    if (value instanceof Date) {
        return value
    }

    const parsedDate = new Date(value)
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const numericValue = (value) => {
    const number = Number(value)
    return Number.isFinite(number) ? number : null
}

const eventSeatCount = (cartItem) => {
    const seatsPerCartUnit = Number(cartItem.seatsPerCartUnit)

    if (Number.isFinite(seatsPerCartUnit) && seatsPerCartUnit > 0) {
        return seatsPerCartUnit
    }

    const ticketCount = Number(cartItem.ticketCount)

    if (Number.isFinite(ticketCount) && ticketCount > 0) {
        return ticketCount
    }

    return 1
}

const eventAvailability = (event) => {
    const eventDate = normalizeEventDate(event.date)
    const isPast = eventDate ? eventDate < todayStart() : false
    const capacity = numericValue(event.capacity)
    const ticketsSold = numericValue(event.ticketsSold) || 0
    const reservedSeats = numericValue(event.manualSeatsReserved) || 0
    const remainingSeats = capacity === null ? null : Math.max(0, capacity - ticketsSold - reservedSeats)

    if (isPast) {
        return {
            canBuyTickets: false,
            canJoinWaitlist: false,
            capacity,
            label: 'This event has passed.',
            remainingSeats,
            status: 'past',
        }
    }

    if (remainingSeats !== null && remainingSeats <= 0) {
        return {
            canBuyTickets: false,
            canJoinWaitlist: event.waitlistEnabled === true,
            capacity,
            label: event.waitlistEnabled === true ? 'This event is sold out. Join the waitlist below.' : 'This event is sold out.',
            remainingSeats,
            status: event.waitlistEnabled === true ? 'waitlist' : 'sold-out',
        }
    }

    if (event.inStock === false) {
        return {
            canBuyTickets: false,
            canJoinWaitlist: false,
            capacity,
            label: 'Tickets are not available for this event.',
            remainingSeats,
            status: 'closed',
        }
    }

    return {
        canBuyTickets: true,
        canJoinWaitlist: false,
        capacity,
        label: remainingSeats === null ? 'Tickets available.' : `${remainingSeats} of ${capacity} available.`,
        remainingSeats,
        status: 'available',
    }
}

export default function Event (props) {
    const { event } = props
    const dispatch = useDispatch()
    const cartItems = useSelector(selectCart)
    const { title, info = [], eventDates = [], link, priceOptions = [] } = event
    const [ quantity, setQuantity ] = useState( {
        adult: 0,
        child: 0
    } )
    const [ dateOption, setDateOption ] = useState( eventDates[0] )
    const [ photoIdx, setPhotoIdx ] = useState( 0 )
    const [ veg, setVeg ]  = useState( false )
    const [ vegOption, setVegOption ]  = useState( "I am vegetarian (+$10)" )

    const [ gFree, setGFree ]  = useState( false )
    const [ gFreeOption, setGFreeOption ]  = useState( "I am gluten free (+$10)" )
    const [ addedToCart, setAddToCart ]  = useState( false )
    const [ waitlistForm, setWaitlistForm ] = useState({
        email: '',
        message: '',
        name: '',
        phone: ''
    })
    const [ waitlistStatus, setWaitlistStatus ] = useState('')
    const [ isJoiningWaitlist, setIsJoiningWaitlist ] = useState(false)

    const photos = (Array.isArray(event.photos) ? event.photos : []).map(photo => {
        return `${photo}`
    })
    const availability = eventAvailability(event)
    const selectedTickets = quantity.adult + quantity.child
    const basePrice = Number(priceOptions[0] || 0)
    const adultPrice = (veg || gFree) ? basePrice + 10 : basePrice
    const childTotal = quantity.child * 10
    const ticketTotal = adultPrice * quantity.adult + childTotal
    const capacityGroupKey = `${event.id || event.key || title}${dateOption ? ` ${dateOption}` : ''}`
    const cartSeatsForEvent = cartItems.reduce((totalSeats, cartItem) => {
        if (cartItem.category !== 'Experience' || cartItem.capacityGroupKey !== capacityGroupKey) {
            return totalSeats
        }

        return totalSeats + eventSeatCount(cartItem) * (Number(cartItem.quantity) || 1)
    }, 0)
    const remainingSeatsForSelection = availability.remainingSeats === null
        ? null
        : Math.max(0, availability.remainingSeats - cartSeatsForEvent)
    const ticketSummary = [
        quantity.adult ? `${quantity.adult} Adult${quantity.adult === 1 ? '' : 's'}` : '',
        quantity.child ? `${quantity.child} Child${quantity.child === 1 ? '' : 'ren'}` : '',
    ].filter(Boolean).join(', ')
    const dietarySummary = `${veg ? ' Vegetarian' : ''}${gFree ? ' Gluten Free' : ''}`
    const eventCartKey = `${capacityGroupKey}${dietarySummary}${quantity.adult ? ` ${quantity.adult} Adults` : ''}${quantity.child ? ` ${quantity.child} Children` : ''}`
    const eventInfo = useMemo(() => ({
        ...event,
        adultTickets: quantity.adult,
        capacityGroupKey,
        childTickets: quantity.child,
        maxQuantity: availability.remainingSeats,
        eventId: event.id || event.slug || "",
        glutenFree: gFree,
        option: dateOption,
        photos: event.photos,
        price: ticketTotal,
        quantity: 1,
        seatsPerCartUnit: selectedTickets,
        ticketCount: selectedTickets,
        title: `${title}${dateOption ? ` ${dateOption}` : ''}${dietarySummary}${ticketSummary ? ` (${ticketSummary})` : ''}`,
        vegetarian: veg,
        key: eventCartKey,
    }), [availability.remainingSeats, capacityGroupKey, dateOption, dietarySummary, event, eventCartKey, gFree, quantity.adult, quantity.child, selectedTickets, ticketSummary, ticketTotal, title, veg])
    const descriptionBlocks = Array.isArray(event.descriptionBlocks)
        ? event.descriptionBlocks
            .map(block => ({
                body: `${block?.body || ''}`.trim(),
                subtitle: `${block?.subtitle || ''}`.trim()
            }))
            .filter(block => block.body || block.subtitle)
        : []
    const hasDescriptionBlocks = descriptionBlocks.length > 0

    useEffect(() => {
        setDateOption(eventDates[0])
    }, [ eventDates ])

    useEffect(() => {
        setPhotoIdx(0)
    }, [ title ])

    useEffect(() => {
        setAddToCart( false )
    }, [ title, dateOption ])

    const handleAddCartItem = () => {
        if (!availability.canBuyTickets || quantity.adult <= 0) {
            return
        }

        if (remainingSeatsForSelection !== null && selectedTickets > remainingSeatsForSelection) {
            return
        }

        setAddToCart( true )
        dispatch(addCartItem(eventInfo))
    }

    const handleIncrement = ( event ) => {
        const type = event.target.getAttribute("tickettype")

        if (!availability.canBuyTickets) {
            return
        }

        if( remainingSeatsForSelection !== null && selectedTickets >= remainingSeatsForSelection ) {
            return
        }

        setQuantity({...quantity, [ type ]: quantity[ type ] + 1 })
    }
    const handleDecrement = ( event ) => {
        const type = event.target.getAttribute("tickettype")
        if( quantity[ type ] === 0 ) {
            return
        }
        setQuantity({...quantity, [ type ]: quantity[ type ] - 1 })
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
        setQuantity({
            adult: 0,
            child: 0
        })
        setDateOption( target.value )
    }

    const handleVeg = () => {
        if(veg) {
            setVeg(false)
            setVegOption("I am vegetarian (+$10)")
        } else {
            setVeg(true)
            setVegOption("I eat meat")

        }
    }

    const handleGFree = () => {
        if(gFree) {
            setGFree(false)
            setGFreeOption("I am gluten free (+$10)")
        } else {
            setGFree(true)
            setGFreeOption("I eat gluten")
        }
    }

    const updateWaitlistForm = (field, value) => {
        setWaitlistForm((currentForm) => ({
            ...currentForm,
            [field]: value
        }))
    }

    const submitWaitlist = async (eventSubmit) => {
        eventSubmit.preventDefault()

        if (!waitlistForm.name.trim() || !waitlistForm.email.trim()) {
            setWaitlistStatus('Name and email are required for the waitlist.')
            return
        }

        if (!isFirebaseConfigured || !db) {
            setWaitlistStatus('The waitlist is not connected yet. Please contact Calabash Gardens directly.')
            return
        }

        setIsJoiningWaitlist(true)
        setWaitlistStatus('')

        try {
            await addDoc(collection(db, 'eventWaitlist'), {
                createdAt: serverTimestamp(),
                email: waitlistForm.email.trim(),
                eventDate: dateOption || '',
                eventId: event.id || event.key || title,
                eventTitle: title,
                message: waitlistForm.message.trim(),
                name: waitlistForm.name.trim(),
                phone: waitlistForm.phone.trim(),
                status: 'new',
            })
            setWaitlistStatus('You are on the waitlist. Thank you.')
            setWaitlistForm({
                email: '',
                message: '',
                name: '',
                phone: ''
            })
        } catch (error) {
            setWaitlistStatus('The waitlist could not be saved. Please contact Calabash Gardens directly.')
        } finally {
            setIsJoiningWaitlist(false)
        }
    }

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

            
            
            {hasDescriptionBlocks
                ? descriptionBlocks.map((block, index) => (
                    <div className="event_description_block" key={`${block.subtitle}-${index}`}>
                        {block.subtitle ? (
                            <h4 className="event_description_subtitle">{block.subtitle}</h4>
                        ) : null}
                        {block.body ? (
                            <p style={{ textIndent: '2em', whiteSpace: 'pre-line' }}>
                                {block.body}
                                <br />
                            </p>
                        ) : null}
                    </div>
                ))
                : info.map((p, index) => (
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
                        Check out the tasting menu here
                    </a> 
                </div>
                    

                : null 
            }
            

            <div className={`event_availability event_availability_${availability.status}`}>
                <p>{availability.label}</p>
            </div>

            {availability.canBuyTickets ? (
                <div className="event_ticket_panel">
                    <button className="btn btn-warning btn-lg mt-2" onClick={ handleVeg }>
                        <i className="fas fa-leaf"></i> { vegOption }
                    </button>

                    <button className="btn btn-warning btn-lg mt-2" onClick={handleGFree}>
                        <i className="fas fa-bread-slice"></i> { gFreeOption }
                    </button>

                    <p>${ ticketTotal }</p>

                    <div style={{ textAlign: 'center' }} >
                       <p>Children 12 & under</p>
                    </div>
                    <div id="quantity-selector" className="d-flex justify-content-center align-items-center m-2">
                        <button tickettype="child" className="btn btn-secondary" onClick={ handleDecrement } aria-label="Decrease child quantity">-</button>
                        <span className="mx-3">{ quantity.child }</span>
                        <button
                            disabled={remainingSeatsForSelection !== null && selectedTickets >= remainingSeatsForSelection}
                            tickettype="child"
                            className="btn btn-secondary"
                            onClick={ handleIncrement }
                            aria-label="Increase child quantity"
                        >
                            +
                        </button>

                    </div>

                    <div style={{ textAlign: 'center' }} >
                       <p>Adults</p>
                    </div>
                    <div id="quantity-selector" className="d-flex justify-content-center align-items-center m-2">
                        <button tickettype="adult" className="btn btn-secondary" onClick={ handleDecrement } aria-label="Decrease adult quantity">-</button>
                        <span className="mx-3">{ quantity.adult }</span>
                        <button
                            disabled={remainingSeatsForSelection !== null && selectedTickets >= remainingSeatsForSelection}
                            tickettype="adult"
                            className="btn btn-secondary"
                            onClick={ handleIncrement }
                            aria-label="Increase adult quantity"
                        >
                            +
                        </button>

                    </div>

                    <button
                        className="btn btn-success btn-lg"
                        disabled={quantity.adult <= 0}
                        onClick={handleAddCartItem}
                    >
                        <i className="fa fa-ticket-alt"></i> Buy Tickets
                    </button>

                    {quantity.adult <= 0 ? (
                        <p className="event_ticket_hint">Choose at least one adult ticket.</p>
                    ) : null}

                    {addedToCart ? (
                        <Link to="/cart" className="btn btn-warning btn-lg mt-2">
                            <i className="fas fa-shopping-cart"></i> Go to Cart
                        </Link>
                    ) : null}
                </div>
            ) : null}

            {availability.canJoinWaitlist ? (
                <form className="event_waitlist_form" onSubmit={submitWaitlist}>
                    <h4>Join the waitlist</h4>
                    <label>
                        Name
                        <input
                            disabled={isJoiningWaitlist}
                            onChange={(event) => updateWaitlistForm('name', event.target.value)}
                            required
                            value={waitlistForm.name}
                        />
                    </label>
                    <label>
                        Email
                        <input
                            disabled={isJoiningWaitlist}
                            onChange={(event) => updateWaitlistForm('email', event.target.value)}
                            required
                            type="email"
                            value={waitlistForm.email}
                        />
                    </label>
                    <label>
                        Phone
                        <input
                            disabled={isJoiningWaitlist}
                            onChange={(event) => updateWaitlistForm('phone', event.target.value)}
                            value={waitlistForm.phone}
                        />
                    </label>
                    <label>
                        Note
                        <textarea
                            disabled={isJoiningWaitlist}
                            onChange={(event) => updateWaitlistForm('message', event.target.value)}
                            rows={3}
                            value={waitlistForm.message}
                        />
                    </label>
                    <button className="btn btn-success btn-lg" disabled={isJoiningWaitlist} type="submit">
                        {isJoiningWaitlist ? 'Joining...' : 'Join Waitlist'}
                    </button>
                    {waitlistStatus ? <p className="event_waitlist_status">{waitlistStatus}</p> : null}
                </form>
            ) : null}
            
        </div>
    )
}
