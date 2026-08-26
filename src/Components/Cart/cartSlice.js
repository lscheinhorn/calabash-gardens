import { createSlice } from '@reduxjs/toolkit'
import { eventsInventory } from '../../data/siteData';


export const cartSlice = createSlice({
    name: 'cart',
    initialState: [],
    reducers: {
        addCartItem: (state, action) => {
            console.log("addCartItem state", state)
            console.log("addCartItem action.payload", action.payload)

            function removeDietarySuffix(str) {
                // Regular expression to match "Vegetarian", "Gluten Free", or "Vegetarian Gluten Free" at the end of a string
                const regex = /( Vegetarian Gluten Free| Gluten Free| Vegetarian)\s*$/;

                // Replace the matched pattern with an empty string
                return String(str || "").replace(regex, '');
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

            const title = removeDietarySuffix(action.payload.title)
            const isEvent = action.payload.category === "Experience"
            const eventCapacityGroupKey = action.payload.capacityGroupKey || action.payload.key || title
            const payloadMaxQuantity = Number(action.payload.maxQuantity)
            const fallbackMaxQuantity = Number(eventsInventory[title]?.stock)
            const eventMaxQuantity = action.payload.maxQuantity !== null
                && action.payload.maxQuantity !== undefined
                && Number.isFinite(payloadMaxQuantity)
                ? payloadMaxQuantity
                : fallbackMaxQuantity
            const hasEventMaxQuantity = isEvent && Number.isFinite(eventMaxQuantity)
            const requestedEventSeats = eventSeatCount(action.payload)
            const currentEventSeats = state.reduce((seatTotal, item) => {
                const itemCapacityGroupKey = item.capacityGroupKey || item.key || removeDietarySuffix(item.title || "")

                if (item.category !== "Experience" || itemCapacityGroupKey !== eventCapacityGroupKey) {
                    return seatTotal
                }

                return seatTotal + eventSeatCount(item) * (Number(item.quantity) || 1)
            }, 0)

            if (hasEventMaxQuantity && currentEventSeats + requestedEventSeats > eventMaxQuantity) {
                return state
            }


            const key = action.payload.key
            const findItem = (key) => {
                return state.find( item => {
                    console.log("find key", item.key === key)
                    return item.key === key
                })
            }
            const itemInCart = findItem(key)
            if ( itemInCart && Array.isArray(action.payload.priceOptions) && action.payload.priceOptions.length === 1 ) {

            //     const filtered = state.filter( item => item.key !== key)
            //     return [
            //         ...filtered,
            //         {
            //             ...itemInCart,
            //             quantity: itemInCart.category === "Experience" && itemInCart.quantity === 30 ? itemInCart.quantity : itemInCart.quantity + 1
            //         }
            //     ]  
                return state.map((item,el) => {
                    let newItem = {...item}
                    if (item.key === action.payload.key) {
                        newItem.quantity++
                    }
                    return newItem
                })

            } else {

                return [
                    ...state,
                    {
                        ...action.payload,
                        quantity: action.payload.quantity ? action.payload.quantity : 1
                    }
                ]
            }
        },
        decrementCartItem: (state, action) => {

            if( action.payload.quantity > 1 ) {
               
                // THIS WORKS
                // MODIFY ORIGINAL
                // state.forEach((item,el) => {
                //     if (item.key === action.payload.key) {
                //         console.log({item, el})
                //         item.quantity--
                //     }
                // })

                return state.map((item,el) => {
                    let newItem = {...item}
                    if (item.key === action.payload.key) {
                        // console.log({item, el})
                        newItem.quantity--
                    }
                    return newItem
                })

                
            } else {
                return state.filter( item => item.key !== action.payload.key)
            }
            
        },
        removeCartItem: (state, action) => {
            
            return state.filter( item => item.key !== action.payload.key)
            
            
        }
    }
})


export const selectCart = state => state.cart 

export const { addCartItem, decrementCartItem, removeCartItem } = cartSlice.actions
export default cartSlice.reducer
