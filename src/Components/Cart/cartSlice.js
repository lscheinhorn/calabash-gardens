import { createSlice } from '@reduxjs/toolkit'


export const cartSlice = createSlice({
    name: 'cart',
    initialState: [],
    reducers: {
        addCartItem: (state, action) => {
            const key = action.payload.key
            const findItem = (key) => {
                return state.find( item => {
                    return item.key === key
                })
            }
            const itemInCart = findItem(key)
            if ( itemInCart ) {
                
                const filtered = state.filter( item => item.key !== key)
                return [
                    ...filtered,
                    {
                        ...itemInCart,
                        quantity: itemInCart.quantity + 1
                    }
                ]  
            } else {

                return [
                    ...state,
                    {
                        ...action.payload,
                        quantity: 1
                    }
                ]  
            }
        },
        removeCartItem: (state, action) => {
            if( action.payload.quantity > 1 ) {
                return [
                    ...state.filter( item => item.key !== action.payload.key),
                    {
                        ...action.payload,
                        quantity: action.payload.quantity - 1
                    }
                ]
            } else {
                return state.filter( item => item.key !== action.payload.key)
            }
            
        }
    }
})


export const selectCart = state => state.cart 

export const { addCartItem, removeCartItem } = cartSlice.actions
export default cartSlice.reducer